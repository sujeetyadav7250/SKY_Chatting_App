import { Phone, PhoneOff } from "lucide-react";
import { useCallStore } from "../store/useCallStore";
import { useAuthStore } from "../store/useAuthStore";

const CallButton = ({ user }) => {
  const { initializeCall, isCalling, isInCall } = useCallStore();
  const { authUser } = useAuthStore();

  const handleCall = async () => {
    if (isCalling || isInCall) {
      return;
    }

    try {
      await initializeCall(user._id);
    } catch (error) {
      console.error("Failed to initiate call:", error);
    }
  };

  return (
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
  );
};

export default CallButton;
