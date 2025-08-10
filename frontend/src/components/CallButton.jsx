import { Phone, PhoneOff, Video } from "lucide-react";
import { useCallStore } from "../store/useCallStore";
import { useAuthStore } from "../store/useAuthStore";

const CallButton = ({ user }) => {
  const { initializeCall, initializeVideoCall, isCalling, isInCall, checkCurrentCallStatus, forceCleanupCalls } = useCallStore();
  const { authUser } = useAuthStore();

  const handleCall = async () => {
    if (isCalling || isInCall) {
      return;
    }

    try {
      // Check for existing calls and cleanup if needed
      await checkCurrentCallStatus();
      
      // If there are stuck calls, try to cleanup
      if (useCallStore.getState().currentCall || 
          useCallStore.getState().isInCall || 
          useCallStore.getState().isCalling || 
          useCallStore.getState().isRinging) {
        
        console.log("Found stuck call state, cleaning up...");
        await forceCleanupCalls();
        
        // Wait a bit for cleanup
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      await initializeCall(user._id);
    } catch (error) {
      console.error("Failed to initiate call:", error);
    }
  };

  const handleVideoCall = async () => {
    if (isCalling || isInCall) return;
    try {
      await checkCurrentCallStatus();
      if (useCallStore.getState().currentCall || 
          useCallStore.getState().isInCall || 
          useCallStore.getState().isCalling || 
          useCallStore.getState().isRinging) {
        await forceCleanupCalls();
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      await initializeVideoCall(user._id);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={handleCall}
        disabled={isCalling || isInCall}
        className={`btn btn-circle btn-sm ${
          isCalling || isInCall 
            ? "btn-error" 
            : "btn-primary"
        }`}
        title={isCalling ? "Calling..." : isInCall ? "In call" : "Call"}
      >
        {isCalling || isInCall ? (
          <PhoneOff className="w-4 h-4" />
        ) : (
          <Phone className="w-4 h-4" />
        )}
      </button>
      <button
        onClick={handleVideoCall}
        disabled={isCalling || isInCall}
        className={`btn btn-circle btn-sm ${
          isCalling || isInCall 
            ? "btn-error" 
            : "btn-secondary"
        }`}
        title={isCalling ? "Calling..." : isInCall ? "In call" : "Video Call"}
      >
        <Video className="w-4 h-4" />
      </button>
    </div>
  );
};

export default CallButton;
