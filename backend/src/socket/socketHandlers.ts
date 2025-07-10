import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../models/User";

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export const setupSocketHandlers = (io: Server): void => {
  // Socket authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error("Authentication error"));
      }

      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        return next(new Error("JWT secret not configured"));
      }

      const decoded = jwt.verify(token, jwtSecret) as { userId: string };

      // Verify user exists
      const user = await User.findById(decoded.userId);
      if (!user || !user.isActive) {
        return next(new Error("User not found or inactive"));
      }

      socket.userId = decoded.userId;
      next();
    } catch (error) {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket: AuthenticatedSocket) => {
    console.log(`User ${socket.userId} connected`);

    // Join queue rooms for real-time updates
    socket.on("joinQueue", (queueId: string) => {
      socket.join(`queue_${queueId}`);
      console.log(`User ${socket.userId} joined queue ${queueId}`);
    });

    // Leave queue room
    socket.on("leaveQueue", (queueId: string) => {
      socket.leave(`queue_${queueId}`);
      console.log(`User ${socket.userId} left queue ${queueId}`);
    });

    // Join manager dashboard for analytics updates
    socket.on("joinDashboard", () => {
      socket.join(`manager_${socket.userId}`);
      console.log(`Manager ${socket.userId} joined dashboard`);
    });

    // Handle queue updates (for admin notifications)
    socket.on("queueUpdate", (data) => {
      // Broadcast to other managers if needed
      socket.broadcast.emit("queueUpdated", data);
    });

    // Handle token status updates
    socket.on("tokenStatusUpdate", (data) => {
      // Broadcast to queue room
      socket.to(`queue_${data.queueId}`).emit("tokenStatusChanged", data);
    });

    // Ping/Pong for connection health
    socket.on("ping", () => {
      socket.emit("pong");
    });

    socket.on("disconnect", () => {
      console.log(`User ${socket.userId} disconnected`);
    });

    // Error handling
    socket.on("error", (error) => {
      console.error(`Socket error for user ${socket.userId}:`, error);
    });
  });

  // Broadcast system-wide notifications
  const broadcastNotification = (notification: any) => {
    io.emit("notification", notification);
  };

  // Broadcast queue-specific updates
  const broadcastQueueUpdate = (queueId: string, data: any) => {
    io.to(`queue_${queueId}`).emit("queueUpdate", data);
  };

  // Broadcast to specific manager
  const broadcastToManager = (managerId: string, event: string, data: any) => {
    io.to(`manager_${managerId}`).emit(event, data);
  };

  // Export broadcast functions for use in controllers
  (io as any).broadcastNotification = broadcastNotification;
  (io as any).broadcastQueueUpdate = broadcastQueueUpdate;
  (io as any).broadcastToManager = broadcastToManager;
};
