import { useEffect, useRef, useState } from "react";
import { PhoneOff, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { useCallStore } from "../store/useCallStore";
import { useAuthStore } from "../store/useAuthStore";
import toast from "react-hot-toast";

const CallInterface = () => {
  const { currentCall, isInCall, endCall, localStream, remoteStream, setLocalStream, setRemoteStream, setPeerConnection } = useCallStore();
  const { authUser } = useAuthStore();
  const { socket } = useAuthStore.getState();
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const timerRef = useRef(null);
  
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    if (isInCall && currentCall) {
      initializeWebRTC();
      startCallTimer();
    }

    return () => {
      cleanupWebRTC();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isInCall, currentCall]);

  const initializeWebRTC = async () => {
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: false 
      });
      
      setLocalStream(stream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create peer connection
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      peerConnectionRef.current = peerConnection;
      setPeerConnection(peerConnection);

      // Add local stream
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("iceCandidate", {
            callId: currentCall._id,
            candidate: event.candidate
          });
        }
      };

      // Join call room
      socket.emit("joinCall", currentCall._id);

      // Create and send offer if caller
      if (currentCall.callerId === authUser._id) {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        
        socket.emit("offer", {
          callId: currentCall._id,
          offer: offer
        });
      }

    } catch (error) {
      console.error("Failed to initialize WebRTC:", error);
      toast.error("Failed to initialize call audio");
    }
  };

  const cleanupWebRTC = () => {
    // Stop all tracks
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop());
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Clear streams
    setLocalStream(null);
    setRemoteStream(null);
    setPeerConnection(null);

    // Leave call room
    if (currentCall) {
      socket.emit("leaveCall", currentCall._id);
    }
  };

  const startCallTimer = () => {
    setCallDuration(0);
    timerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
    // Implementation for speaker toggle would go here
  };

  const handleEndCall = async () => {
    cleanupWebRTC();
    await endCall();
  };

  if (!isInCall || !currentCall) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-base-100 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="text-center space-y-6">
          {/* Call Status */}
          <div>
            <h3 className="text-xl font-semibold">Audio Call</h3>
            <p className="text-base-content/60">{formatDuration(callDuration)}</p>
          </div>

          {/* Audio Streams */}
          <div className="space-y-4">
            {/* Local Audio (hidden but active) */}
            <audio ref={localVideoRef} autoPlay muted />
            
            {/* Remote Audio */}
            <audio ref={remoteVideoRef} autoPlay />
          </div>

          {/* Call Controls */}
          <div className="flex justify-center gap-4">
            <button
              onClick={toggleMute}
              className={`btn btn-circle btn-lg ${
                isMuted ? "btn-error" : "btn-primary"
              }`}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>

            <button
              onClick={toggleSpeaker}
              className={`btn btn-circle btn-lg ${
                isSpeakerOn ? "btn-primary" : "btn-ghost"
              }`}
              title={isSpeakerOn ? "Speaker On" : "Speaker Off"}
            >
              {isSpeakerOn ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
            </button>

            <button
              onClick={handleEndCall}
              className="btn btn-circle btn-error btn-lg"
              title="End call"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          </div>

          {/* Call Info */}
          <div className="text-sm text-base-content/60">
            <p>Connected to: {currentCall.callerId === authUser._id ? "Receiver" : "Caller"}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallInterface;
