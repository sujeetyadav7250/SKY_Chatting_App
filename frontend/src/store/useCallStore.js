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

  // Initialize call
  initializeCall: async (receiverId) => {
    const { authUser } = useAuthStore.getState();
    
    try {
      set({ isCalling: true });
      
      const response = await axiosInstance.post(`/calls/initiate/${receiverId}`);
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
      toast.error(errorMessage);
      
      // If it's a "Call already in progress" error, clear any stale call state
      if (errorMessage.includes("Call already in progress")) {
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
    socket.on("offer", (data) => {
      // Handle incoming offer
      console.log("Received offer:", data);
    });

    socket.on("answer", (data) => {
      // Handle incoming answer
      console.log("Received answer:", data);
    });

    socket.on("iceCandidate", (data) => {
      // Handle incoming ICE candidate
      console.log("Received ICE candidate:", data);
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
