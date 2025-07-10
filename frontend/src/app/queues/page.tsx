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
import { toast } from "react-hot-toast";

interface Queue {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  maxTokens: number;
  currentTokens: number;
  priority: "low" | "medium" | "high";
  createdAt: string;
}

const QueuesPage: React.FC = () => {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth/login");
      return;
    }
    fetchQueues();
  }, [isAuthenticated, router]);

  const fetchQueues = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/queues");
      setQueues(response.data.data.queues || []);
    } catch (error) {
      console.error("Failed to fetch queues:", error);
      toast.error("Failed to load queues");
    } finally {
      setLoading(false);
    }
  };

  const toggleQueueStatus = async (queueId: string, currentStatus: boolean) => {
    try {
      await axios.patch(`/queues/${queueId}`, {
        isActive: !currentStatus,
      });

      setQueues(
        queues.map((queue) =>
          queue._id === queueId ? { ...queue, isActive: !currentStatus } : queue
        )
      );

      toast.success(
        `Queue ${!currentStatus ? "activated" : "deactivated"} successfully`
      );
    } catch (error) {
      toast.error("Failed to update queue status");
    }
  };

  const deleteQueue = async (queueId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this queue? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await axios.delete(`/queues/${queueId}`);
      setQueues(queues.filter((queue) => queue._id !== queueId));
      toast.success("Queue deleted successfully");
    } catch (error) {
      toast.error("Failed to delete queue");
    }
  };

  const filteredQueues = queues.filter((queue) => {
    if (filter === "active") return queue.isActive;
    if (filter === "inactive") return !queue.isActive;
    return true;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
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
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Queue Management
            </h1>
            <p className="mt-2 text-gray-600">
              Manage all your queues and monitor their performance.
            </p>
          </div>
          <Button onClick={() => router.push("/queues/create")}>
            Create Queue
          </Button>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-1 mb-6">
          {(["all", "active", "inactive"] as const).map((filterType) => (
            <button
              key={filterType}
              onClick={() => setFilter(filterType)}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                filter === filterType
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
              {filterType === "all" && ` (${queues.length})`}
              {filterType === "active" &&
                ` (${queues.filter((q) => q.isActive).length})`}
              {filterType === "inactive" &&
                ` (${queues.filter((q) => !q.isActive).length})`}
            </button>
          ))}
        </div>

        {/* Queues Grid */}
        {filteredQueues.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
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
                No queues found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {filter === "all"
                  ? "Get started by creating your first queue."
                  : `No ${filter} queues found.`}
              </p>
              {filter === "all" && (
                <div className="mt-6">
                  <Button onClick={() => router.push("/queues/create")}>
                    Create Queue
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredQueues
              .filter((queue) => queue._id)
              .map((queue) => (
                <Card
                  key={queue._id}
                  className="hover:shadow-lg transition-shadow"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{queue.name}</CardTitle>
                        {queue.description && (
                          <p className="text-sm text-gray-600 mt-1">
                            {queue.description}
                          </p>
                        )}
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
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(
                            queue.priority
                          )}`}
                        >
                          {queue.priority}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Tokens</span>
                        <span className="text-sm font-medium">
                          {queue.currentTokens}/{queue.maxTokens}
                        </span>
                      </div>

                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            queue.currentTokens / queue.maxTokens > 0.8
                              ? "bg-red-500"
                              : queue.currentTokens / queue.maxTokens > 0.6
                              ? "bg-yellow-500"
                              : "bg-green-500"
                          }`}
                          style={{
                            width: `${Math.min(
                              (queue.currentTokens / queue.maxTokens) * 100,
                              100
                            )}%`,
                          }}
                        ></div>
                      </div>

                      <div className="flex justify-between items-center text-sm text-gray-500">
                        <span>Created</span>
                        <span>
                          {new Date(queue.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex space-x-2 pt-2">
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            if (queue._id) {
                              router.push(`/queues/${queue._id}`);
                            }
                          }}
                        >
                          View Details
                        </Button>
                        <Button
                          size="sm"
                          variant={queue.isActive ? "danger" : "secondary"}
                          onClick={() =>
                            toggleQueueStatus(queue._id, queue.isActive)
                          }
                        >
                          {queue.isActive ? "Deactivate" : "Activate"}
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => deleteQueue(queue._id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </div>
    </Navigation>
  );
};

export default QueuesPage;
