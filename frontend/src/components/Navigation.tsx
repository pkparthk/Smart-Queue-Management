"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { useAuthStore } from "@/store/authStore";

interface NavigationProps {
  children: React.ReactNode;
}

const Navigation: React.FC<NavigationProps> = ({ children }) => {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push("/auth/login");
  };

  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push("/dashboard")}
                className="text-xl font-bold text-gray-900"
              >
                SmartQueue
              </button>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <button
                  onClick={() => router.push("/dashboard")}
                  className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => router.push("/queues")}
                  className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Queues
                </button>
                <button
                  onClick={() => router.push("/analytics")}
                  className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Analytics
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Welcome, {user.name}
              </span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>
      <main className="py-8">{children}</main>
    </div>
  );
};

export default Navigation;
