import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5175"], // ✅ Allow both
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// used to store online users
const userSocketMap = {}; // { userId: socketId }

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  const userId = socket.handshake.query.userId;
  if (userId) userSocketMap[userId] = socket.id;

  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // Handle call signaling
  socket.on("joinCall", (callId) => {
    socket.join(callId);
    console.log(`User ${userId} joined call ${callId}`);
  });

  socket.on("leaveCall", (callId) => {
    socket.leave(callId);
    console.log(`User ${userId} left call ${callId}`);
  });

  // WebRTC signaling
  socket.on("offer", (data) => {
    console.log(`User ${userId} sending offer for call ${data.callId}`);
    socket.to(data.callId).emit("offer", {
      offer: data.offer,
      from: userId,
    });
  });

  socket.on("answer", (data) => {
    console.log(`User ${userId} sending answer for call ${data.callId}`);
    socket.to(data.callId).emit("answer", {
      answer: data.answer,
      from: userId,
    });
  });

  socket.on("iceCandidate", (data) => {
    console.log(`User ${userId} sending ICE candidate for call ${data.callId}`);
    socket.to(data.callId).emit("iceCandidate", {
      candidate: data.candidate,
      from: userId,
    });
  });

  // optional: allow renegotiation triggers in case of adding video later
  socket.on('renegotiate', (data) => {
    socket.to(data.callId).emit('renegotiate', { from: userId });
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.id);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server };
