import { useEffect, useRef, useState } from "react";
import { PhoneOff, Mic, MicOff, Video, VideoOff } from "lucide-react";
import { useCallStore } from "../store/useCallStore";
import { useAuthStore } from "../store/useAuthStore";
import toast from "react-hot-toast";

const VideoCallInterface = () => {
  const { currentCall, isInCall, endCall, setLocalStream, setRemoteStream, setPeerConnection, localStream, remoteStream } = useCallStore();
  const { authUser } = useAuthStore();
  const { socket } = useAuthStore.getState();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const timerRef = useRef(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const isVideoCall = currentCall?.type === 'video';

  useEffect(() => {
    if (!(isInCall && currentCall && isVideoCall)) return;
    // Initialize only for caller to avoid double peer connections
    if (currentCall.callerId === authUser._id) {
      initializeWebRTC();
    }
    startCallTimer();

    return () => {
      cleanupWebRTC();
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInCall, isVideoCall, currentCall?._id]);

  useEffect(() => {
    if (!isVideoCall) return;
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, isVideoCall]);

  useEffect(() => {
    if (!isVideoCall) return;
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isVideoCall]);

  const initializeWebRTC = async () => {
    try {
      // Check permissions
      try {
        const camPerm = await navigator.permissions?.query?.({ name: 'camera' });
        const micPerm = await navigator.permissions?.query?.({ name: 'microphone' });
        if (camPerm && camPerm.state === 'denied') {
          toast.error('Camera access denied. Enable it in browser settings.');
          return;
        }
        if (micPerm && micPerm.state === 'denied') {
          toast.error('Microphone access denied. Enable it in browser settings.');
          return;
        }
      } catch (_) {
        // ignore if not supported
      }

      // Try constraints progressively
      let stream = null;
      const constraintsList = [
        { audio: true, video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } },
        { audio: true, video: { width: 640, height: 360, facingMode: 'user' } },
        { audio: true, video: true },
      ];
      for (const constraints of constraintsList) {
        try {
          // eslint-disable-next-line no-await-in-loop
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          break;
        } catch (e) {
          console.warn('getUserMedia failed with constraints', constraints, e);
        }
      }
      if (!stream) {
        toast.error('Could not access camera. Check permissions or in-use by other app.');
        return;
      }

      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        // Try to ensure playback starts
        localVideoRef.current.onloadedmetadata = () => {
          localVideoRef.current?.play?.().catch(() => {});
        };
      }

      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' }
        ]
      });

      peerConnectionRef.current = peerConnection;
      setPeerConnection(peerConnection);

      // Add tracks; if renegotiation is required, handle it
      stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

      // No onnegotiationneeded to avoid duplicate offers; we control offer flow

      peerConnection.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
          remoteVideoRef.current.onloadedmetadata = () => {
            remoteVideoRef.current?.play?.().catch(() => {});
          };
        }
      };

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("iceCandidate", { callId: currentCall._id, candidate: event.candidate });
        }
      };

      // Join signaling room early (before offer) to ensure other side receives our messages
      socket.emit("joinCall", currentCall._id);

      if (currentCall.callerId === authUser._id) {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit("offer", { callId: currentCall._id, offer });
      }
    } catch (error) {
      console.error("Failed to initialize video call:", error);
      toast.error("Failed to start video");
    }
  };

  const cleanupWebRTC = () => {
    if (localStream) localStream.getTracks().forEach(t => t.stop());
    if (remoteStream) remoteStream.getTracks().forEach(t => t.stop());
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setPeerConnection(null);
    if (currentCall) socket.emit("leaveCall", currentCall._id);
  };

  const startCallTimer = () => {
    setCallDuration(0);
    timerRef.current = setInterval(() => setCallDuration(prev => prev + 1), 1000);
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleMute = () => {
    if (!localStream) return;
    const track = localStream.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setIsMuted(!track.enabled);
    }
  };

  const toggleCamera = () => {
    if (!localStream) return;
    const track = localStream.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setIsCameraOff(!track.enabled);
    }
  };

  const handleEndCall = async () => {
    cleanupWebRTC();
    await endCall();
  };

  if (!isInCall || !currentCall || !isVideoCall) return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
      <div className="bg-base-100 rounded-lg p-4 md:p-6 w-full max-w-5xl mx-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold">Video Call</h3>
              <p className="text-base-content/60">{formatDuration(callDuration)}</p>
            </div>
          </div>

          {/* Videos */}
          <div className="relative grid grid-cols-1 md:grid-cols-4 gap-3 h-[60vh]">
            <div className="col-span-1 md:col-span-3 bg-black rounded-lg overflow-hidden relative">
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
              {!remoteStream && (
                <div className="absolute inset-0 flex items-center justify-center text-base-content/40">Waiting for remote video...</div>
              )}
            </div>
            <div className="col-span-1 bg-black rounded-lg overflow-hidden relative">
              <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
              {!localStream && (
                <div className="absolute inset-0 flex items-center justify-center text-base-content/40">Starting camera...</div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-3 mt-2">
            <button onClick={toggleMute} className={`btn btn-circle ${isMuted ? 'btn-error' : 'btn-primary'}`} title={isMuted ? 'Unmute' : 'Mute'}>
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>
            <button onClick={toggleCamera} className={`btn btn-circle ${isCameraOff ? 'btn-error' : 'btn-primary'}`} title={isCameraOff ? 'Camera On' : 'Camera Off'}>
              {isCameraOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
            </button>
            <button onClick={handleEndCall} className="btn btn-circle btn-error" title="End call">
              <PhoneOff className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoCallInterface;


