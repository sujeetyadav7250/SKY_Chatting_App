import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useCallStore = create((set, get) => ({
  // Call state
  currentCall: null,
  incomingCall: null,
  isInCall: false,
  isCalling: false,
  isRinging: false,

  // WebRTC
  localStream: null,
  remoteStream: null,
  peerConnection: null,

  // Call history
  callHistory: [],
  isHistoryLoading: false,

  // Initialize call (audio by default)
  initializeCall: async (receiverId) => {
    const { authUser } = useAuthStore.getState();

    try {
      set({ isCalling: true });

      // First, check if there are any stuck calls and clean them up
      await get().checkCurrentCallStatus();

      // If there's still an active call, try to force cleanup
      if (get().currentCall || get().isInCall || get().isCalling || get().isRinging) {
        console.log("Found active call state, attempting cleanup...");
        await get().forceCleanupCalls();

        // Wait a bit for cleanup to complete
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const response = await axiosInstance.post(`/calls/initiate/${receiverId}`, { type: 'audio' });
      const call = response.data;

      set({
        currentCall: call,
        isCalling: false,
        isRinging: true
      });

      toast.success("Calling...");

    } catch (error) {
      set({ isCalling: false });
      const errorMessage = error.response?.data?.error || "Failed to initiate call";

      // Handle specific error types
      if (errorMessage.includes("Call already in progress") ||
        errorMessage.includes("already in another call") ||
        errorMessage.includes("currently in another call")) {

        toast.error("Call blocked: " + errorMessage);

        // Try to get current status and cleanup
        await get().checkCurrentCallStatus();
        if (get().currentCall) {
          toast.info("Attempting to cleanup existing call...");
          await get().forceCleanupCalls();
        }
      } else {
        toast.error(errorMessage);
      }

      // Clear any stale call state
      if (errorMessage.includes("Call already in progress") ||
        errorMessage.includes("already in another call")) {
        set({
          currentCall: null,
          isInCall: false,
          isCalling: false,
          isRinging: false,
          localStream: null,
          remoteStream: null,
          peerConnection: null
        });
      }
    }
  },

  // Initialize video call
  initializeVideoCall: async (receiverId) => {
    try {
      set({ isCalling: true });

      await get().checkCurrentCallStatus();
      if (get().currentCall || get().isInCall || get().isCalling || get().isRinging) {
        await get().forceCleanupCalls();
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const response = await axiosInstance.post(`/calls/initiate/${receiverId}`, { type: 'video' });
      const call = response.data;

      set({
        currentCall: call,
        isCalling: false,
        isRinging: true
      });

      toast.success("Video calling...");
    } catch (error) {
      set({ isCalling: false });
      const errorMessage = error.response?.data?.error || "Failed to initiate video call";
      toast.error(errorMessage);
    }
  },

  // Answer incoming call
  answerCall: async (callId) => {
    try {
      const response = await axiosInstance.put(`/calls/answer/${callId}`);
      const call = response.data;

      set({
        currentCall: call,
        incomingCall: null,
        isInCall: true,
        isRinging: false
      });

      // Initialize WebRTC for the receiver based on call type
      if (call.type === 'video') {
        await get().initializeWebRTCForReceiverVideo();
      } else {
        await get().initializeWebRTCForReceiver();
      }

      toast.success("Call connected!");

    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to answer call");
      // Clear incoming call on error
      set({ incomingCall: null, isRinging: false });
    }
  },

  // Decline incoming call
  declineCall: async (callId) => {
    try {
      await axiosInstance.put(`/calls/decline/${callId}`);

      set({
        incomingCall: null,
        isRinging: false
      });

      toast.success("Call declined");

    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to decline call");
      // Clear incoming call on error
      set({ incomingCall: null, isRinging: false });
    }
  },

  // End current call
  endCall: async () => {
    const { currentCall } = get();

    if (!currentCall) return;

    try {
      await axiosInstance.put(`/calls/end/${currentCall._id}`);

      set({
        currentCall: null,
        isInCall: false,
        isCalling: false,
        isRinging: false,
        localStream: null,
        remoteStream: null,
        peerConnection: null
      });

      toast.success("Call ended");

    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to end call");
      // Clear call state even on error
      set({
        currentCall: null,
        isInCall: false,
        isCalling: false,
        isRinging: false,
        localStream: null,
        remoteStream: null,
        peerConnection: null
      });
    }
  },

  // Set incoming call
  setIncomingCall: (callData) => {
    set({ incomingCall: callData });
  },

  // Clear incoming call
  clearIncomingCall: () => {
    set({ incomingCall: null });
  },

  // Clear all call state (for cleanup)
  clearCallState: () => {
    set({
      currentCall: null,
      incomingCall: null,
      isInCall: false,
      isCalling: false,
      isRinging: false,
      localStream: null,
      remoteStream: null,
      peerConnection: null
    });
  },

  // Force cleanup stuck calls from backend
  forceCleanupCalls: async () => {
    try {
      const response = await axiosInstance.post('/calls/cleanup');
      const { cleanedCount } = response.data;

      if (cleanedCount > 0) {
        toast.success(`Cleaned up ${cleanedCount} stuck call(s)`);
        // Also clear local state
        get().clearCallState();
      } else {
        toast.info("No stuck calls found");
      }

      return response.data;
    } catch (error) {
      console.error("Failed to force cleanup calls:", error);
      toast.error("Failed to cleanup calls: " + (error.response?.data?.error || error.message));
      return null;
    }
  },

  // Check current call status from backend
  checkCurrentCallStatus: async () => {
    try {
      const response = await axiosInstance.get('/calls/status');
      const { hasActiveCall, call, userRole } = response.data;

      if (hasActiveCall) {
        // Update local state to match backend
        set({
          currentCall: call,
          isInCall: call.status === "ongoing",
          isCalling: call.status === "ringing" && userRole === "caller",
          isRinging: call.status === "ringing" && userRole === "receiver"
        });

        console.log("Found active call from backend:", call);
        return call;
      } else {
        // Clear local state if no active call
        get().clearCallState();
        return null;
      }
    } catch (error) {
      console.error("Failed to check call status:", error);
      return null;
    }
  },

  // Start periodic cleanup to prevent stuck calls
  startPeriodicCleanup: () => {
    const intervalId = setInterval(async () => {
      try {
        // Check if we have any local state that might be stuck
        const { currentCall, isInCall, isCalling, isRinging } = get();

        if (currentCall || isInCall || isCalling || isRinging) {
          // Check with backend to see if call is still valid
          await get().checkCurrentCallStatus();
        }
      } catch (error) {
        console.warn("Periodic cleanup check failed:", error);
      }
    }, 30000); // Check every 30 seconds

    return intervalId;
  },

  // Stop periodic cleanup
  stopPeriodicCleanup: (intervalId) => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  },

  // Set call status
  setCallStatus: (status) => {
    set({
      isInCall: status === "ongoing",
      isCalling: status === "ringing" && get().currentCall?.callerId === useAuthStore.getState().authUser._id,
      isRinging: status === "ringing" && get().currentCall?.receiverId === useAuthStore.getState().authUser._id
    });
  },

  // WebRTC functions
  setLocalStream: (stream) => {
    set({ localStream: stream });
  },

  setRemoteStream: (stream) => {
    set({ remoteStream: stream });
  },

  setPeerConnection: (connection) => {
    set({ peerConnection: connection });
  },

  // Initialize WebRTC for receiver (when answering call)
  initializeWebRTCForReceiver: async () => {
    const { currentCall } = get();
    const { authUser } = useAuthStore.getState();
    const { socket } = useAuthStore.getState();

    if (!currentCall || currentCall.callerId === authUser._id) {
      return; // Only for receiver
    }

    try {
      console.log("Initializing WebRTC for receiver");

      // Get user media
      let stream = null;

      // First, try to enumerate devices to see what's available
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioDevices = devices.filter(device => device.kind === 'audioinput');
        console.log("Available audio devices for receiver:", audioDevices);

        if (audioDevices.length === 0) {
          toast.error("No audio input devices found. Please connect a microphone and refresh the page.");
          return;
        }
      } catch (enumError) {
        console.warn("Could not enumerate devices:", enumError);
      }

      // Try different audio constraints
      try {
        // First try with default constraints
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        console.log("Receiver successfully got user media with default constraints");
      } catch (defaultError) {
        console.log("Receiver default constraints failed, trying alternative:", defaultError);

        // Try with specific audio constraints
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              sampleRate: 44100,
              channelCount: 1
            },
            video: false
          });
          console.log("Receiver successfully got user media with specific constraints");
        } catch (specificError) {
          console.log("Receiver specific constraints failed, trying basic audio:", specificError);

          // Try with just basic audio
          try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: {}, video: false });
            console.log("Receiver successfully got user media with basic audio");
          } catch (basicError) {
            console.error("Receiver all audio constraints failed:", basicError);

            // Check if it's a device not found error
            if (basicError.name === 'NotFoundError') {
              toast.error("No microphone found. Please:\n1. Connect a microphone\n2. Check if it's enabled in your system\n3. Refresh the page and try again");
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

      set({ localStream: stream });

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

      set({ peerConnection });

      // Monitor connection state
      peerConnection.onconnectionstatechange = () => {
        console.log("Receiver connection state:", peerConnection.connectionState);
        if (peerConnection.connectionState === 'connected') {
          console.log("Receiver WebRTC connection established successfully!");
        } else if (peerConnection.connectionState === 'failed') {
          console.error("Receiver WebRTC connection failed");
          toast.error("Call connection failed. Please try again.");
        }
      };

      // Monitor ICE connection state
      peerConnection.oniceconnectionstatechange = () => {
        console.log("Receiver ICE connection state:", peerConnection.iceConnectionState);
      };

      // Add local stream
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        console.log("Receiver received remote stream:", event.streams[0]);
        set({ remoteStream: event.streams[0] });
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log("Receiver sending ICE candidate:", event.candidate);
          socket.emit("iceCandidate", {
            callId: currentCall._id,
            candidate: event.candidate
          });
        }
      };

      // Join call room
      socket.emit("joinCall", currentCall._id);
      console.log("Receiver joined call room and WebRTC initialized");

    } catch (error) {
      console.error("Failed to initialize WebRTC for receiver:", error);
      if (error.name === 'NotAllowedError') {
        toast.error("Microphone access denied. Please allow microphone access and try again.");
      } else if (error.name === 'NotFoundError') {
        toast.error("No microphone found. Please connect a microphone and try again.");
      } else {
        toast.error("Failed to initialize call audio: " + error.message);
      }
    }
  },

  // Initialize WebRTC for receiver (video call)
  initializeWebRTCForReceiverVideo: async () => {
    const { currentCall } = get();
    const { authUser } = useAuthStore.getState();
    const { socket } = useAuthStore.getState();

    if (!currentCall || currentCall.callerId === authUser._id) {
      return; // Only for receiver
    }

    try {
      // Get user media with video
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      });

      set({ localStream: stream });

      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' }
        ]
      });

      set({ peerConnection });

      stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

      peerConnection.ontrack = (event) => {
        set({ remoteStream: event.streams[0] });
      };

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('iceCandidate', { callId: currentCall._id, candidate: event.candidate });
        }
      };

      socket.emit('joinCall', currentCall._id);
    } catch (error) {
      console.error('Failed to initialize WebRTC for receiver (video):', error);
      toast.error('Failed to start camera');
    }
  },

  // Get call history
  getCallHistory: async () => {
    set({ isHistoryLoading: true });

    try {
      const response = await axiosInstance.get("/calls/history");
      set({ callHistory: response.data });
    } catch (error) {
      toast.error("Failed to load call history");
    } finally {
      set({ isHistoryLoading: false });
    }
  },

  // Subscribe to call events
  subscribeToCallEvents: () => {
    const socket = useAuthStore.getState().socket;
    const { authUser } = useAuthStore.getState();

    // Incoming call
    socket.on("incomingCall", (data) => {
      get().setIncomingCall(data);
      toast.success(`Incoming call from ${data.caller.fullName}`);
    });

    // Call answered
    socket.on("callAnswered", (data) => {
      get().setCallStatus("ongoing");
      toast.success("Call answered!");
    });

    // Call declined
    socket.on("callDeclined", (data) => {
      set({
        currentCall: null,
        isCalling: false,
        isRinging: false
      });
      toast.error("Call declined");
    });

    // Call ended
    socket.on("callEnded", (data) => {
      set({
        currentCall: null,
        isInCall: false,
        isCalling: false,
        isRinging: false,
        localStream: null,
        remoteStream: null,
        peerConnection: null
      });
      toast.success(`Call ended (${Math.floor(data.duration / 60)}:${(data.duration % 60).toString().padStart(2, '0')})`);
    });

    // WebRTC signaling
    socket.on("offer", async (data) => {
      console.log("Received offer:", data);
      const { currentCall, peerConnection } = get();

      if (!currentCall) {
        console.error("No active call for offer");
        return;
      }

      try {
        let currentPeerConnection = peerConnection;

        // If receiver doesn't have peer connection yet, initialize it
        if (!currentPeerConnection && currentCall.receiverId === authUser._id) {
          if (currentCall.type === 'video') {
            await get().initializeWebRTCForReceiverVideo();
          } else {
            await get().initializeWebRTCForReceiver();
          }
          currentPeerConnection = get().peerConnection;
        }

        if (!currentPeerConnection) {
          console.error("No peer connection available for offer");
          return;
        }

        // Set the remote description (offer) from the caller
        const remoteOffer = new RTCSessionDescription(data.offer);
        if (!currentPeerConnection.currentRemoteDescription) {
          await currentPeerConnection.setRemoteDescription(remoteOffer);
        }

        // Create and send answer back to the caller if we don't already have local desc
        if (!currentPeerConnection.currentLocalDescription) {
          const answer = await currentPeerConnection.createAnswer();
          await currentPeerConnection.setLocalDescription(answer);
          socket.emit("answer", {
            callId: currentCall._id,
            answer: answer
          });
        }
      } catch (error) {
        console.error("Error handling offer:", error);
        toast.error("Failed to establish call connection");
      }
    });

    socket.on("answer", async (data) => {
      console.log("Received answer:", data);
      const { currentCall, peerConnection } = get();

      if (!currentCall || !peerConnection) {
        console.error("No active call or peer connection for answer");
        return;
      }

      try {
        // Guard against duplicate/late answers
        if (peerConnection.signalingState !== 'have-local-offer') {
          console.warn('Skipping answer; unexpected signalingState:', peerConnection.signalingState);
          return;
        }
        if (peerConnection.currentRemoteDescription) {
          console.warn('Skipping answer; remote description already set');
          return;
        }
        const remoteDesc = new RTCSessionDescription(data.answer);
        await peerConnection.setRemoteDescription(remoteDesc);
      } catch (error) {
        console.error("Error handling answer:", error);
      }
    });

    socket.on("iceCandidate", async (data) => {
      console.log("Received ICE candidate:", data);
      const { currentCall, peerConnection } = get();

      if (!currentCall || !peerConnection) {
        console.error("No active call or peer connection for ICE candidate");
        return;
      }

      try {
        const candidate = new RTCIceCandidate(data.candidate);
        // Ensure remote description is set before adding ICE
        if (!peerConnection.remoteDescription) {
          console.warn('Delaying ICE candidate until remoteDescription is set');
          const attemptAdd = async (retries = 5) => {
            if (peerConnection.remoteDescription) {
              try { await peerConnection.addIceCandidate(candidate); } catch (e) { console.warn('ICE add failed', e); }
              return;
            }
            if (retries <= 0) return;
            setTimeout(() => attemptAdd(retries - 1), 200);
          };
          attemptAdd();
        } else {
          await peerConnection.addIceCandidate(candidate);
        }
      } catch (error) {
        console.error("Error handling ICE candidate:", error);
      }
    });
  },

  // Unsubscribe from call events
  unsubscribeFromCallEvents: () => {
    const socket = useAuthStore.getState().socket;

    socket.off("incomingCall");
    socket.off("callAnswered");
    socket.off("callDeclined");
    socket.off("callEnded");
    socket.off("offer");
    socket.off("answer");
    socket.off("iceCandidate");
  },
}));
