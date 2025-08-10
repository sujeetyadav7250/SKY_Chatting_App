import Call from "../models/call.model.js";
import User from "../models/user.model.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const initiateCall = async (req, res) => {
  try {
    const { receiverId } = req.params;
    const { type } = req.body || {};
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
      // Check if this is an old call that needs cleanup
      const isOldCall = activeCall.status === "ringing" &&
        (activeCall.callerId.toString() === callerId.toString() ||
          activeCall.receiverId.toString() === callerId.toString());

      const isCallerInvolved = activeCall.callerId.toString() === callerId.toString() ||
        activeCall.receiverId.toString() === callerId.toString();

      if (isOldCall) {
        // Update old ringing call to ended
        activeCall.status = "ended";
        activeCall.endTime = new Date();
        await activeCall.save();
        console.log(`Cleaned up old ringing call: ${activeCall._id}`);
      } else if (isCallerInvolved) {
        // User is involved in another active call
        return res.status(400).json({ error: "You are already in another call" });
      } else if (activeCall.status === "ongoing") {
        // There's an ongoing call between other users
        return res.status(400).json({ error: "One of the users is currently in another call" });
      } else {
        // Generic fallback
        return res.status(400).json({ error: "Call already in progress" });
      }
    }

    // Create new call
    const newCall = new Call({
      callerId,
      receiverId,
      type: type === 'video' ? 'video' : 'audio',
      status: "ringing",
    });

    await newCall.save();

    // Emit socket event to receiver
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("incomingCall", {
        callId: newCall._id,
        type: newCall.type,
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

// Force cleanup stuck calls for a user
export const forceCleanupCalls = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find and end any stuck calls for this user
    const stuckCalls = await Call.updateMany(
      {
        $or: [
          { callerId: userId, status: { $in: ["ringing", "ongoing"] } },
          { receiverId: userId, status: { $in: ["ringing", "ongoing"] } }
        ]
      },
      {
        status: "ended",
        endTime: new Date(),
        duration: 0
      }
    );

    console.log(`Force cleaned up ${stuckCalls.modifiedCount} stuck calls for user: ${userId}`);

    res.status(200).json({
      message: `Cleaned up ${stuckCalls.modifiedCount} stuck calls`,
      cleanedCount: stuckCalls.modifiedCount
    });
  } catch (error) {
    console.log("Error in forceCleanupCalls: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get current call status for a user
export const getCurrentCallStatus = async (req, res) => {
  try {
    const userId = req.user._id;

    const currentCall = await Call.findOne({
      $or: [
        { callerId: userId, status: { $in: ["ringing", "ongoing"] } },
        { receiverId: userId, status: { $in: ["ringing", "ongoing"] } }
      ]
    });

    if (currentCall) {
      res.status(200).json({
        hasActiveCall: true,
        call: currentCall,
        userRole: currentCall.callerId.toString() === userId.toString() ? "caller" : "receiver"
      });
    } else {
      res.status(200).json({ hasActiveCall: false, call: null });
    }
  } catch (error) {
    console.log("Error in getCurrentCallStatus: ", error.message);
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
