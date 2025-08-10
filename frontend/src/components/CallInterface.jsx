import { useEffect, useRef, useState } from "react";
import { PhoneOff, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { useCallStore } from "../store/useCallStore";
import { useAuthStore } from "../store/useAuthStore";
import toast from "react-hot-toast";

const CallInterface = () => {
  const { 
    currentCall, 
    isInCall, 
    endCall, 
    localStream, 
    remoteStream, 
    setLocalStream, 
    setRemoteStream, 
    setPeerConnection,
    forceCleanupCalls,
    checkCurrentCallStatus
  } = useCallStore();
  const { authUser } = useAuthStore();
  const { socket } = useAuthStore.getState();
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const timerRef = useRef(null);
  
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [connectionRetries, setConnectionRetries] = useState(0);
  const [microphoneStatus, setMicrophoneStatus] = useState('unknown');
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const maxRetries = 3;

  // Test microphone function
  const testMicrophone = async () => {
    try {
      setMicrophoneStatus('testing');
      toast.info("Testing microphone...");
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      console.log("Microphone test successful:", stream);
      
      // Stop the test stream
      stream.getTracks().forEach(track => track.stop());
      
      setMicrophoneStatus('working');
      toast.success("Microphone is working! You can now make calls.");
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => setMicrophoneStatus('working'), 3000);
    } catch (error) {
      console.error("Microphone test failed:", error);
      setMicrophoneStatus('failed');
      
      if (error.name === 'NotFoundError') {
        toast.error("No microphone detected. Please connect a microphone and try again.");
      } else if (error.name === 'NotAllowedError') {
        toast.error("Microphone access denied. Please allow microphone access.");
      } else if (error.name === 'NotReadableError') {
        toast.error("Microphone is in use by another application.");
      } else {
        toast.error("Microphone test failed: " + error.message);
      }
    }
  };

  // Check microphone status on component mount
  useEffect(() => {
    const checkMicrophoneStatus = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioDevices = devices.filter(device => device.kind === 'audioinput');
        
        if (audioDevices.length === 0) {
          setMicrophoneStatus('none');
        } else {
          setMicrophoneStatus('available');
        }
      } catch (error) {
        console.warn("Could not check microphone status:", error);
        setMicrophoneStatus('unknown');
      }
    };
    
    checkMicrophoneStatus();
  }, []);

  // Refresh microphone status
  const refreshMicrophoneStatus = async () => {
    try {
      setMicrophoneStatus('checking');
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioDevices = devices.filter(device => device.kind === 'audioinput');
      
      if (audioDevices.length === 0) {
        setMicrophoneStatus('none');
        toast.info("No microphone detected. Please connect a microphone and try again.");
      } else {
        setMicrophoneStatus('available');
        toast.success(`Found ${audioDevices.length} microphone(s)`);
      }
    } catch (error) {
      console.warn("Could not refresh microphone status:", error);
      setMicrophoneStatus('unknown');
      toast.error("Could not check microphone status");
    }
  };

  // Cleanup stuck calls
  const handleCleanupCalls = async () => {
    try {
      setIsCleaningUp(true);
      toast.info("Cleaning up stuck calls...");
      
      // First check current status
      await checkCurrentCallStatus();
      
      // Then force cleanup
      const result = await forceCleanupCalls();
      
      if (result && result.cleanedCount > 0) {
        toast.success(`Successfully cleaned up ${result.cleanedCount} stuck call(s)`);
        // Refresh the page or component to reset state
        window.location.reload();
      } else {
        toast.info("No stuck calls found to cleanup");
      }
    } catch (error) {
      console.error("Cleanup failed:", error);
      toast.error("Failed to cleanup calls: " + error.message);
    } finally {
      setIsCleaningUp(false);
    }
  };

  const retryConnection = async () => {
    if (connectionRetries < maxRetries) {
      setConnectionRetries(prev => prev + 1);
      toast.info(`Retrying connection... (${connectionRetries + 1}/${maxRetries})`);
      
      // Clean up existing connection
      cleanupWebRTC();
      
      // Wait a bit before retrying
      setTimeout(() => {
        initializeWebRTC();
      }, 1000);
    } else {
      toast.error("Connection failed after multiple attempts. Please try again later.");
    }
  };

  useEffect(() => {
    // Skip audio WebRTC setup during video calls
    if (currentCall?.type === 'video') return;
    if (isInCall && currentCall) {
      initializeWebRTC();
      startCallTimer();
    }

    return () => {
      if (currentCall?.type === 'video') return;
      cleanupWebRTC();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isInCall, currentCall]);

  // Check call status on mount to prevent stale state
  useEffect(() => {
    const checkStatus = async () => {
      try {
        await checkCurrentCallStatus();
      } catch (error) {
        console.warn("Failed to check call status on mount:", error);
      }
    };
    
    checkStatus();
  }, []);

  // Handle remote stream changes
  useEffect(() => {
    if (currentCall?.type === 'video') return;
    if (remoteStream && remoteVideoRef.current) {
      console.log("Setting remote stream to audio element:", remoteStream);
      remoteVideoRef.current.srcObject = remoteStream;
      // Try to play the audio
      remoteVideoRef.current.play().catch(error => {
        console.log("Auto-play failed, user interaction required:", error);
      });
    }
  }, [remoteStream, currentCall?.type]);

  // Handle local stream changes
  useEffect(() => {
    if (currentCall?.type === 'video') return;
    if (localStream && localVideoRef.current) {
      console.log("Setting local stream to audio element:", localStream);
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, currentCall?.type]);

  const ensureRemoteAudioPlays = async () => {
    if (remoteVideoRef.current && remoteStream) {
      try {
        await remoteVideoRef.current.play();
        console.log("Remote audio playing successfully");
      } catch (error) {
        console.error("Failed to play remote audio:", error);
        toast.error("Click the play button to hear the other person");
      }
    }
  };

  const initializeWebRTC = async () => {
    try {
      // Check microphone permission first
      const permission = await navigator.permissions.query({ name: 'microphone' });
      if (permission.state === 'denied') {
        toast.error("Microphone access denied. Please enable it in your browser settings.");
        return;
      }

      // First, try to enumerate devices to see what's available
      let devices = [];
      try {
        devices = await navigator.mediaDevices.enumerateDevices();
        const audioDevices = devices.filter(device => device.kind === 'audioinput');
        console.log("Available audio devices:", audioDevices);
        
        if (audioDevices.length === 0) {
          toast.error("No audio input devices found. Please connect a microphone and refresh the page.");
          return;
        }
      } catch (enumError) {
        console.warn("Could not enumerate devices:", enumError);
      }

      // Try different audio constraints
      let stream = null;
      let audioConstraints = { audio: true, video: false };
      
      try {
        // First try with default constraints
        stream = await navigator.mediaDevices.getUserMedia(audioConstraints);
        console.log("Successfully got user media with default constraints");
      } catch (defaultError) {
        console.log("Default constraints failed, trying alternative:", defaultError);
        
        // Try with specific audio constraints
        try {
          audioConstraints = {
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              sampleRate: 44100,
              channelCount: 1
            },
            video: false
          };
          stream = await navigator.mediaDevices.getUserMedia(audioConstraints);
          console.log("Successfully got user media with specific constraints");
        } catch (specificError) {
          console.log("Specific constraints failed, trying basic audio:", specificError);
          
          // Try with just basic audio
          try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: {}, video: false });
            console.log("Successfully got user media with basic audio");
          } catch (basicError) {
            console.error("All audio constraints failed:", basicError);
            
            // Check if it's a device not found error
            if (basicError.name === 'NotFoundError') {
              // Try to get any available media device
              try {
                const allDevices = await navigator.mediaDevices.enumerateDevices();
                const hasAudioInput = allDevices.some(device => device.kind === 'audioinput');
                
                if (!hasAudioInput) {
                  toast.error("No microphone detected. Please:\n1. Connect a microphone\n2. Check if it's enabled in your system\n3. Refresh the page and try again");
                } else {
                  toast.error("Microphone detected but can't access it. Please check permissions and try again.");
                }
              } catch (enumError) {
                toast.error("Unable to detect audio devices. Please check your microphone connection and browser permissions.");
              }
              return;
            } else if (basicError.name === 'NotAllowedError') {
              toast.error("Microphone access denied. Please allow microphone access and try again.");
            } else if (basicError.name === 'NotReadableError') {
              toast.error("Microphone is in use by another application. Please close other apps using the microphone and try again.");
            } else {
              toast.error("Failed to access microphone: " + basicError.message);
            }
            return;
          }
        }
      }

      if (!stream) {
        toast.error("Failed to get microphone access. Please check your microphone and try again.");
        return;
      }

      setLocalStream(stream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create peer connection
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

      // Monitor connection state
      peerConnection.onconnectionstatechange = () => {
        console.log("Connection state:", peerConnection.connectionState);
        if (peerConnection.connectionState === 'connected') {
          console.log("WebRTC connection established successfully!");
        } else if (peerConnection.connectionState === 'failed') {
          console.error("WebRTC connection failed");
          toast.error("Call connection failed. Please try again.");
        }
      };

      // Monitor ICE connection state
      peerConnection.oniceconnectionstatechange = () => {
        console.log("ICE connection state:", peerConnection.iceConnectionState);
      };

      // Add local stream
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        console.log("Received remote stream:", event.streams[0]);
        setRemoteStream(event.streams[0]);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log("Sending ICE candidate:", event.candidate);
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
        console.log("Creating and sending offer as caller");
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        
        socket.emit("offer", {
          callId: currentCall._id,
          offer: offer
        });
      }

    } catch (error) {
      console.error("Failed to initialize WebRTC:", error);
      
      // Handle specific error types
      if (error.name === 'NotFoundError') {
        toast.error("No microphone found. Please:\n1. Connect a microphone\n2. Check if it's enabled in your system\n3. Refresh the page and try again");
      } else if (error.name === 'NotAllowedError') {
        toast.error("Microphone access denied. Please allow microphone access and try again.");
      } else if (error.name === 'NotReadableError') {
        toast.error("Microphone is in use by another application. Please close other apps using the microphone and try again.");
      } else if (error.name === 'OverconstrainedError') {
        toast.error("Microphone doesn't meet the required specifications. Please try a different microphone.");
      } else if (error.name === 'AbortError') {
        toast.error("Microphone access was aborted. Please try again.");
      } else {
        toast.error("Failed to initialize call audio: " + error.message);
      }
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

  // Do not render for video calls
  if (!isInCall || !currentCall || currentCall.type === 'video') return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-base-100 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="text-center space-y-6">
          {/* Call Status */}
          <div>
            <h3 className="text-xl font-semibold">Audio Call</h3>
            <p className="text-base-content/60">{formatDuration(callDuration)}</p>
            
            {/* Microphone Status */}
            <div className="mt-2 p-2 bg-base-200 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm">Microphone:</span>
                <div className="flex items-center gap-2">
                  <span className={`badge ${
                    microphoneStatus === 'working' ? 'badge-success' :
                    microphoneStatus === 'available' ? 'badge-info' :
                    microphoneStatus === 'none' ? 'badge-error' :
                    microphoneStatus === 'failed' ? 'badge-warning' :
                    'badge-neutral'
                  }`}>
                    {microphoneStatus === 'working' ? 'Working' :
                     microphoneStatus === 'available' ? 'Available' :
                     microphoneStatus === 'none' ? 'None' :
                     microphoneStatus === 'failed' ? 'Failed' :
                     'Unknown'}
                  </span>
                  <button
                    onClick={testMicrophone}
                    className="btn btn-xs btn-outline"
                    disabled={microphoneStatus === 'testing'}
                  >
                    {microphoneStatus === 'testing' ? 'Testing...' : 'Test'}
                  </button>
                  <button
                    onClick={refreshMicrophoneStatus}
                    className="btn btn-xs btn-outline"
                    disabled={microphoneStatus === 'checking'}
                  >
                    {microphoneStatus === 'checking' ? 'Checking...' : 'Refresh'}
                  </button>
                </div>
              </div>
            </div>
            
            {peerConnectionRef.current && (
              <div className="text-xs text-base-content/40 mt-2">
                <p>Connection: {peerConnectionRef.current.connectionState}</p>
                <p>ICE: {peerConnectionRef.current.iceConnectionState}</p>
              </div>
            )}
          </div>

          {/* Audio Streams */}
          <div className="space-y-4">
            {/* Local Audio (hidden but active) */}
            <audio 
              ref={localVideoRef} 
              autoPlay 
              muted 
              playsInline
              onError={(e) => console.error("Local audio error:", e)}
            />
            
            {/* Remote Audio */}
            <audio 
              ref={remoteVideoRef} 
              autoPlay 
              playsInline
              onError={(e) => console.error("Remote audio error:", e)}
              onLoadedMetadata={() => console.log("Remote audio loaded")}
            />
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

            {remoteStream && (
              <button
                onClick={ensureRemoteAudioPlays}
                className="btn btn-circle btn-lg btn-secondary"
                title="Play remote audio"
              >
                <Volume2 className="w-6 h-6" />
              </button>
            )}

            {peerConnectionRef.current?.connectionState === 'failed' && (
              <button
                onClick={retryConnection}
                className="btn btn-circle btn-lg btn-warning"
                title="Retry connection"
                disabled={connectionRetries >= maxRetries}
              >
                <PhoneOff className="w-6 h-6" />
              </button>
            )}

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

          {/* Debug Info (only in development) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-base-content/40 border-t pt-4">
              <details>
                <summary className="cursor-pointer">Debug Info</summary>
                <div className="mt-2 space-y-1">
                  <p>Local Stream: {localStream ? 'Active' : 'None'}</p>
                  <p>Remote Stream: {remoteStream ? 'Active' : 'None'}</p>
                  <p>Peer Connection: {peerConnectionRef.current ? 'Active' : 'None'}</p>
                  {peerConnectionRef.current && (
                    <>
                      <p>Connection State: {peerConnectionRef.current.connectionState}</p>
                      <p>ICE State: {peerConnectionRef.current.iceConnectionState}</p>
                      <p>Signaling State: {peerConnectionRef.current.signalingState}</p>
                    </>
                  )}
                </div>
              </details>
              
              {/* Troubleshooting Tips */}
              <details className="mt-2">
                <summary className="cursor-pointer text-warning">Troubleshooting Tips</summary>
                <div className="mt-2 space-y-1 text-warning/80">
                  <p>• If microphone shows "None": Check if microphone is connected and enabled in system</p>
                  <p>• If microphone shows "Failed": Try refreshing the page and allowing permissions</p>
                  <p>• If connection fails: Check your internet connection and firewall settings</p>
                  <p>• If no audio: Try clicking the play button or check browser audio settings</p>
                  <p>• Make sure no other apps are using the microphone</p>
                  <p>• If you get "Call already in progress": Use the cleanup button below</p>
                </div>
              </details>

              {/* Cleanup Button */}
              <div className="mt-4 p-3 bg-warning/10 rounded-lg border border-warning/20">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-warning font-medium">Call State Issues?</h4>
                    <p className="text-sm text-warning/80">If you're experiencing call problems, try cleaning up stuck calls</p>
                  </div>
                  <button
                    onClick={handleCleanupCalls}
                    disabled={isCleaningUp}
                    className="btn btn-warning btn-sm"
                  >
                    {isCleaningUp ? "Cleaning..." : "Cleanup Calls"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallInterface;
