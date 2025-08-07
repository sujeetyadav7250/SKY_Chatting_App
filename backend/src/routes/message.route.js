import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { 
  getMessages, 
  getUsersForSidebar, 
  sendMessage, 
  markMessageAsSeen, 
  markAllMessagesAsSeen, 
  deleteMessage 
} from "../controllers/message.controller.js";

const router = express.Router();

router.get("/users", protectRoute, getUsersForSidebar);
router.get("/:id", protectRoute, getMessages);

router.post("/send/:id", protectRoute, sendMessage);
router.put("/seen/:messageId", protectRoute, markMessageAsSeen);
router.put("/seen-all/:senderId", protectRoute, markAllMessagesAsSeen);
router.delete("/:messageId", protectRoute, deleteMessage);

export default router;
