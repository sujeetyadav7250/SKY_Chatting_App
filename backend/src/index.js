import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";

import { connectDB } from "./lib/db.js";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import callRoutes from "./routes/call.route.js";
import { app, server } from "./lib/socket.js";
import { cleanupOldCalls } from "./controllers/call.controller.js";

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5001;
const __dirname = path.resolve();

// Middleware
app.use(express.json());
app.use(cookieParser());

// ✅ Updated CORS: include localhost and deployed frontend
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5175",
  "https://sky-chatting-app.onrender.com",
];

app.use(
  cors({
    origin: function (origin, callback) {
      console.log("CORS Origin Request:", origin); // for debugging
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/calls", callRoutes);

// Serve frontend in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/dist", "index.html"));
  });
}

// Start the server
server.listen(PORT, () => {
  console.log("server is running on PORT:" + PORT);
  connectDB();
  
  // Clean up old calls every 5 minutes
  setInterval(cleanupOldCalls, 5 * 60 * 1000);
});
