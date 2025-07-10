"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui";
import { useAuthStore } from "@/store/authStore";
import Navigation from "@/components/Navigation";
import axios from "axios";

interface Queue {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  maxTokens: number;
  currentTokens: number;
  createdAt: string;
}

interface DashboardStats {
  totalQueues: number;
  activeQueues: number;
  totalTokensToday: number;
  averageWaitTime: number;
}

const DashboardPage: React.FC = () => {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [queues, setQueues] = useState<Queue[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalQueues: 0,
    activeQueues: 0,
    totalTokensToday: 0,
    averageWaitTime: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth/login");
      return;
    }
    fetchDashboardData();
  }, [isAuthenticated, router]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [queuesResponse, analyticsResponse] = await Promise.all([
        axios.get("/queues"),
        axios.get("/analytics/dashboard"),
      ]);

      setQueues(queuesResponse.data.data.queues || []);
      setStats(analyticsResponse.data.data || stats);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <Navigation>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </Navigation>
    );
  }

  return (
    <Navigation>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Welcome back, {user?.name}! Here's your queue management overview.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500">
                    Total Queues
                  </h3>
                  <p className="text-2xl font-semibold text-gray-900">
                    {stats.totalQueues}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg
                    className="w-6 h-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500">
                    Active Queues
                  </h3>
                  <p className="text-2xl font-semibold text-gray-900">
                    {stats.activeQueues}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <svg
                    className="w-6 h-6 text-yellow-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500">
                    Tokens Today
                  </h3>
                  <p className="text-2xl font-semibold text-gray-900">
                    {stats.totalTokensToday}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <svg
                    className="w-6 h-6 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500">
                    Avg Wait Time
                  </h3>
                  <p className="text-2xl font-semibold text-gray-900">
                    {stats.averageWaitTime}m
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Queues */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Queues</CardTitle>
                <Button size="sm" onClick={() => router.push("/queues/create")}>
                  Create Queue
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {queues.length === 0 ? (
                <div className="text-center py-8">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    No queues
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Get started by creating a new queue.
                  </p>
                  <div className="mt-6">
                    <Button onClick={() => router.push("/queues/create")}>
                      Create Queue
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {queues
                    .filter((queue) => queue._id)
                    .slice(0, 5)
                    .map((queue) => (
                      <div
                        key={queue._id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                        onClick={() => {
                          if (queue._id) {
                            router.push(`/queues/${queue._id}`);
                          }
                        }}
                      >
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {queue.name}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {queue.currentTokens}/{queue.maxTokens} tokens
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              queue.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {queue.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </div>
                    ))}
                  {queues.length > 5 && (
                    <div className="text-center">
                      <Button
                        variant="outline"
                        onClick={() => router.push("/queues")}
                      >
                        View All Queues
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={() => router.push("/queues/create")}
                >
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Create New Queue
                </Button>
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={() => router.push("/queues")}
                >
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  Manage Queues
                </Button>
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={() => router.push("/analytics")}
                >
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  View Analytics
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Navigation>
  );
};

export default DashboardPage;
