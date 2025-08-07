import { Phone, PhoneOff, User } from "lucide-react";
import { useCallStore } from "../store/useCallStore";

const IncomingCallModal = () => {
  const { incomingCall, answerCall, declineCall } = useCallStore();

  if (!incomingCall) return null;

  const handleAnswer = async () => {
    try {
      await answerCall(incomingCall.callId);
    } catch (error) {
      console.error("Failed to answer call:", error);
    }
  };

  const handleDecline = async () => {
    try {
      await declineCall(incomingCall.callId);
    } catch (error) {
      console.error("Failed to decline call:", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-base-100 rounded-lg p-6 max-w-sm w-full mx-4">
        <div className="text-center space-y-4">
          {/* Caller Avatar */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                {incomingCall.caller.profilePic ? (
                  <img
                    src={incomingCall.caller.profilePic}
                    alt={incomingCall.caller.fullName}
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : (
                  <User className="w-10 h-10 text-primary" />
                )}
              </div>
              {/* Ringing animation */}
              <div className="absolute inset-0 rounded-full border-2 border-primary animate-ping"></div>
            </div>
          </div>

          {/* Caller Info */}
          <div>
            <h3 className="text-lg font-semibold">{incomingCall.caller.fullName}</h3>
            <p className="text-base-content/60">Incoming call...</p>
          </div>

          {/* Call Actions */}
          <div className="flex justify-center gap-4">
            <button
              onClick={handleAnswer}
              className="btn btn-circle btn-success btn-lg"
              title="Answer call"
            >
              <Phone className="w-6 h-6" />
            </button>
            
            <button
              onClick={handleDecline}
              className="btn btn-circle btn-error btn-lg"
              title="Decline call"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;
