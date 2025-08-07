import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { 
  initiateCall, 
  answerCall, 
  declineCall, 
  endCall, 
  getCallHistory 
} from "../controllers/call.controller.js";

const router = express.Router();

router.get("/history", protectRoute, getCallHistory);
router.post("/initiate/:receiverId", protectRoute, initiateCall);
router.put("/answer/:callId", protectRoute, answerCall);
router.put("/decline/:callId", protectRoute, declineCall);
router.put("/end/:callId", protectRoute, endCall);

export default router;
