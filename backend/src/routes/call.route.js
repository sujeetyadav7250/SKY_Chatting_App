import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  initiateCall,
  answerCall,
  declineCall,
  endCall,
  getCallHistory,
  forceCleanupCalls,
  getCurrentCallStatus
} from "../controllers/call.controller.js";

const router = express.Router();

router.get("/history", protectRoute, getCallHistory);
router.get("/status", protectRoute, getCurrentCallStatus);
router.post("/initiate/:receiverId", protectRoute, initiateCall);
router.put("/answer/:callId", protectRoute, answerCall);
router.put("/decline/:callId", protectRoute, declineCall);
router.put("/end/:callId", protectRoute, endCall);
router.post("/cleanup", protectRoute, forceCleanupCalls);

export default router;
