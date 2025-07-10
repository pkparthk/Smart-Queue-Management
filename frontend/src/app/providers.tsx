"use client";

import { SocketProvider } from "@/hooks/useSocket";

export function Providers({ children }: { children: React.ReactNode }) {
  return <SocketProvider>{children}</SocketProvider>;
}
