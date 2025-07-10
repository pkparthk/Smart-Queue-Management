"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/store/authStore";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinQueue: (queueId: string) => void;
  leaveQueue: (queueId: string) => void;
  joinDashboard: () => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  joinQueue: () => {},
  leaveQueue: () => {},
  joinDashboard: () => {},
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { token } = useAuthStore();

  useEffect(() => {
    if (token) {
      const socketUrl =
        process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";
      const newSocket = io(socketUrl, {
        auth: {
          token,
        },
      });

      newSocket.on("connect", () => {
        console.log("Connected to server");
        setIsConnected(true);
      });

      newSocket.on("disconnect", () => {
        console.log("Disconnected from server");
        setIsConnected(false);
      });

      newSocket.on("connect_error", (error) => {
        console.error("Connection error:", error);
        setIsConnected(false);
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    } else {
      if (socket) {
        socket.close();
        setSocket(null);
        setIsConnected(false);
      }
    }
  }, [token]);

  const joinQueue = (queueId: string) => {
    if (socket) {
      socket.emit("joinQueue", queueId);
    }
  };

  const leaveQueue = (queueId: string) => {
    if (socket) {
      socket.emit("leaveQueue", queueId);
    }
  };

  const joinDashboard = () => {
    if (socket) {
      socket.emit("joinDashboard");
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        joinQueue,
        leaveQueue,
        joinDashboard,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
}
