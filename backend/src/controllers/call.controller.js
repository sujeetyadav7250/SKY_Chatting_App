import Call from "../models/call.model.js";
import User from "../models/user.model.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const initiateCall = async (req, res) => {
  try {
    const { receiverId } = req.params;
    const callerId = req.user._id;

    // Check if receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if there's already an active call for either user
    const activeCall = await Call.findOne({
      $or: [
        { callerId, status: { $in: ["ringing", "ongoing"] } },
        { receiverId, status: { $in: ["ringing", "ongoing"] } },
        { callerId: receiverId, status: { $in: ["ringing", "ongoing"] } },
        { receiverId: callerId, status: { $in: ["ringing", "ongoing"] } },
      ],
    });

    if (activeCall) {
      // If there's an old call that's still marked as active, update it to ended
      if (activeCall.status === "ringing" && 
          (activeCall.callerId.toString() === callerId.toString() || 
           activeCall.receiverId.toString() === callerId.toString())) {
        activeCall.status = "ended";
        activeCall.endTime = new Date();
        await activeCall.save();
      } else {
        return res.status(400).json({ error: "Call already in progress" });
      }
    }

    // Create new call
    const newCall = new Call({
      callerId,
      receiverId,
      status: "ringing",
    });

    await newCall.save();

    // Emit socket event to receiver
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("incomingCall", {
        callId: newCall._id,
        caller: {
          _id: req.user._id,
          fullName: req.user.fullName,
          profilePic: req.user.profilePic,
        },
      });
    }

    res.status(201).json(newCall);
  } catch (error) {
    console.log("Error in initiateCall controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const answerCall = async (req, res) => {
  try {
    const { callId } = req.params;
    const receiverId = req.user._id;

    const call = await Call.findById(callId);
    if (!call) {
      return res.status(404).json({ error: "Call not found" });
    }

    if (call.receiverId.toString() !== receiverId.toString()) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (call.status !== "ringing") {
      return res.status(400).json({ error: "Call is not ringing" });
    }

    // Update call status
    call.status = "ongoing";
    call.startTime = new Date();
    await call.save();

    // Emit socket event to caller
    const callerSocketId = getReceiverSocketId(call.callerId);
    if (callerSocketId) {
      io.to(callerSocketId).emit("callAnswered", {
        callId: call._id,
        receiver: {
          _id: req.user._id,
          fullName: req.user.fullName,
          profilePic: req.user.profilePic,
        },
      });
    }

    res.status(200).json(call);
  } catch (error) {
    console.log("Error in answerCall controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const declineCall = async (req, res) => {
  try {
    const { callId } = req.params;
    const receiverId = req.user._id;

    const call = await Call.findById(callId);
    if (!call) {
      return res.status(404).json({ error: "Call not found" });
    }

    if (call.receiverId.toString() !== receiverId.toString()) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Update call status
    call.status = "declined";
    call.endTime = new Date();
    await call.save();

    // Emit socket event to caller
    const callerSocketId = getReceiverSocketId(call.callerId);
    if (callerSocketId) {
      io.to(callerSocketId).emit("callDeclined", {
        callId: call._id,
      });
    }

    res.status(200).json(call);
  } catch (error) {
    console.log("Error in declineCall controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const endCall = async (req, res) => {
  try {
    const { callId } = req.params;
    const userId = req.user._id;

    const call = await Call.findById(callId);
    if (!call) {
      return res.status(404).json({ error: "Call not found" });
    }

    if (call.callerId.toString() !== userId.toString() && call.receiverId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Calculate duration
    const endTime = new Date();
    const duration = call.startTime ? Math.floor((endTime - call.startTime) / 1000) : 0;

    // Update call status
    call.status = "ended";
    call.endTime = endTime;
    call.duration = duration;
    await call.save();

    // Emit socket event to both parties
    const callerSocketId = getReceiverSocketId(call.callerId);
    const receiverSocketId = getReceiverSocketId(call.receiverId);

    if (callerSocketId) {
      io.to(callerSocketId).emit("callEnded", {
        callId: call._id,
        duration,
      });
    }

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("callEnded", {
        callId: call._id,
        duration,
      });
    }

    res.status(200).json(call);
  } catch (error) {
    console.log("Error in endCall controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getCallHistory = async (req, res) => {
  try {
    const userId = req.user._id;

    const calls = await Call.find({
      $or: [{ callerId: userId }, { receiverId: userId }],
    })
      .populate("callerId", "fullName profilePic")
      .populate("receiverId", "fullName profilePic")
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json(calls);
  } catch (error) {
    console.log("Error in getCallHistory controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Clean up old calls that might be stuck in ringing state
export const cleanupOldCalls = async () => {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    await Call.updateMany(
      {
        status: "ringing",
        createdAt: { $lt: oneHourAgo }
      },
      {
        status: "missed",
        endTime: new Date()
      }
    );
  } catch (error) {
    console.log("Error in cleanupOldCalls: ", error.message);
  }
};
