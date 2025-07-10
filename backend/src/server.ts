import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";

import connectDB from "./config/database";
import authRoutes from "./routes/auth";
import queueRoutes from "./routes/queues";
import tokenRoutes from "./routes/tokens";
import analyticsRoutes from "./routes/analytics";
import { errorHandler } from "./middleware/errorHandler";
import { setupSocketHandlers } from "./socket/socketHandlers";
import emailService from "./utils/emailService";

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"),
  message: "Too many requests from this IP, please try again later.",
});
app.use("/api/", limiter);

// General middleware
app.use(compression());
app.use(morgan("combined"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Email test endpoint
app.post("/api/test-email", async (req, res) => {
  try {
    const { to, subject, message } = req.body;

    const testEmail = {
      to: to || process.env.GMAIL_USER || "test@example.com",
      subject: subject || "SmartQueue Email Test",
      text: message || `Test email sent at ${new Date().toLocaleString()}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">✅ SmartQueue Email Test</h2>
          <p>This is a test email to verify that your email configuration is working correctly.</p>
          <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Message:</strong> ${message || "Test email"}</p>
          <p>If you received this email, your Gmail configuration is working! 🎉</p>
        </div>
      `,
    };

    const result = await emailService.sendMessage(testEmail);

    if (result) {
      res.status(200).json({
        success: true,
        message: "Test email sent successfully",
        to: testEmail.to,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Failed to send test email",
      });
    }
  } catch (error: any) {
    console.error("Email test endpoint error:", error);
    res.status(500).json({
      success: false,
      message: "Email test failed",
      error: error.message,
    });
  }
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/queues", queueRoutes);
app.use("/api/tokens", tokenRoutes);
app.use("/api/analytics", analyticsRoutes);

// Socket.IO setup
setupSocketHandlers(io);

// Make io accessible to routes
app.set("io", io);

// Error handling middleware (must be last)
app.use(errorHandler);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ message: "Route not found" });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(
    `🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`
  );
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  server.close(() => {
    console.log("Process terminated");
  });
});

export default app;
