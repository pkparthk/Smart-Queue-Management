"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
} from "@/components/ui";
import { useAuthStore } from "@/store/authStore";
import { useSocket } from "@/hooks/useSocket";
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

interface Token {
  _id: string;
  tokenNumber: string;
  customerName?: string;
  priority: "normal" | "high" | "urgent";
  status: "waiting" | "in_service" | "served" | "cancelled" | "no_show";
  position: number;
  estimatedWaitTime?: number;
  createdAt: string;
  assignedTo?: string;
  contactInfo?: {
    email?: string;
    phone?: string;
  };
  notes?: string;
  timestamps?: {
    created?: string;
    called?: string;
    served?: string;
    completed?: string;
    cancelled?: string;
  };
}

const QueueDetailsPage: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const queueId = params.id as string;
  const { isAuthenticated } = useAuthStore();
  const { socket } = useSocket();

  // Helper function to get API base URL
  const getApiBaseUrl = () => {
    return process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
  };

  // Create a custom axios instance with proper configuration
  const apiClient = axios.create({
    baseURL: getApiBaseUrl(),
    timeout: 10000, // 10 second timeout
  });

  // Add request interceptor for authentication
  apiClient.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // Add response interceptor for error handling
  apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
      console.error("API Error:", error.response?.data || error.message);
      return Promise.reject(error);
    }
  );

  const [queue, setQueue] = useState<Queue | null>(null);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTokenName, setNewTokenName] = useState("");
  const [newTokenEmail, setNewTokenEmail] = useState("");
  const [newTokenPhone, setNewTokenPhone] = useState("");
  const [newTokenNotes, setNewTokenNotes] = useState("");
  const [newTokenPriority, setNewTokenPriority] = useState<
    "normal" | "high" | "urgent"
  >("normal");
  const [addingToken, setAddingToken] = useState(false);

  // Utility function to safely get token ID
  const getTokenId = (token: Token): string | null => {
    // Try multiple possible ID fields
    const id = token._id || (token as any).id || (token as any).tokenId;
    if (!id) {
      console.error("Token missing ID field:", token);
      return null;
    }
    return id;
  };

  // Utility function to validate token ID
  const isValidTokenId = (tokenId: string | null | undefined): boolean => {
    return !!(
      tokenId &&
      tokenId !== "undefined" &&
      tokenId !== "null" &&
      tokenId.length > 0
    );
  };

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth/login");
      return;
    }

    if (queueId) {
      fetchQueueDetails();
      fetchTokens();
    }
  }, [queueId, isAuthenticated]);

  useEffect(() => {
    if (socket && queueId) {
      socket.emit("join-queue", queueId);

      socket.on("token-created", (newToken: Token) => {
        console.log("New token received:", newToken);
        const tokenId = getTokenId(newToken);
        console.log("Token ID:", tokenId);
        setTokens((prev) => [...prev, newToken]);
      });

      socket.on("token-updated", (updatedToken: Token) => {
        console.log("Token updated:", updatedToken);
        const tokenId = getTokenId(updatedToken);
        console.log("Updated token ID:", tokenId);
        setTokens((prev) =>
          prev.map((token) => {
            const currentTokenId = getTokenId(token);
            return currentTokenId === tokenId ? updatedToken : token;
          })
        );
      });

      socket.on("token-deleted", (deletedTokenId: string) => {
        console.log("Token deleted:", deletedTokenId);
        setTokens((prev) =>
          prev.filter((token) => {
            const currentTokenId = getTokenId(token);
            return currentTokenId !== deletedTokenId;
          })
        );
      });

      socket.on("queue-updated", (updatedQueue: Queue) => {
        setQueue(updatedQueue);
      });

      return () => {
        socket.off("token-created");
        socket.off("token-updated");
        socket.off("token-deleted");
        socket.off("queue-updated");
        socket.emit("leave-queue", queueId);
      };
    }
  }, [socket, queueId]);

  const fetchQueueDetails = async () => {
    try {
      const response = await apiClient.get(`/queues/${queueId}`);
      setQueue(response.data);
    } catch (error) {
      console.error("Error fetching queue details:", error);
      toast.error("Failed to load queue details");
    }
  };

  const fetchTokens = async () => {
    try {
      const response = await apiClient.get(`/tokens/queue/${queueId}`);
      console.log("Fetched tokens:", response.data);

      // Extract tokens from the response structure
      const tokensData =
        response.data.data?.tokens || response.data.tokens || response.data;

      // Debug: Log token IDs
      tokensData.forEach((token: Token, index: number) => {
        const tokenId = getTokenId(token);
        console.log(`Token ${index}:`, {
          tokenNumber: token.tokenNumber,
          id: tokenId,
        });
      });

      setTokens(tokensData);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching tokens:", error);
      toast.error("Failed to load tokens");
      setLoading(false);
    }
  };

  const handleCreateToken = async () => {
    if (!newTokenName.trim()) {
      toast.error("Customer name is required");
      return;
    }
    if (!newTokenEmail.trim()) {
      toast.error("Email is required");
      return;
    }

    setAddingToken(true);
    try {
      const tokenData = {
        queueId: queueId,
        customerName: newTokenName.trim(),
        priority: newTokenPriority,
        contactInfo: {
          email: newTokenEmail.trim(),
          phone: newTokenPhone.trim() || undefined,
        },
        notes: newTokenNotes.trim() || undefined,
      };

      const response = await apiClient.post(`/tokens`, tokenData);

      // Reset form
      setNewTokenName("");
      setNewTokenEmail("");
      setNewTokenPhone("");
      setNewTokenNotes("");
      setNewTokenPriority("normal");

      toast.success("Token created successfully");

      // Refresh tokens list
      await fetchTokens();
    } catch (error: any) {
      console.error("Error creating token:", error);
      toast.error(error.response?.data?.message || "Failed to create token");
    } finally {
      setAddingToken(false);
    }
  };

  const updateTokenStatus = async (
    tokenId: string,
    status: Token["status"]
  ) => {
    if (!isValidTokenId(tokenId)) {
      toast.error("Invalid token ID");
      return;
    }

    try {
      await apiClient.patch(`/tokens/${tokenId}`, { status });
      toast.success(`Token ${status} successfully`);
      await fetchTokens();
    } catch (error: any) {
      console.error("Error updating token status:", error);
      toast.error(
        error.response?.data?.message || "Failed to update token status"
      );
    }
  };

  const moveTokenToTop = async (tokenId: string) => {
    if (!isValidTokenId(tokenId)) {
      toast.error("Invalid token ID");
      return;
    }

    try {
      await apiClient.put(`/tokens/${tokenId}/position`, { newPosition: 1 });
      toast.success("Token moved to top successfully");
      await fetchTokens();
    } catch (error: any) {
      console.error("Error moving token to top:", error);
      toast.error(
        error.response?.data?.message || "Failed to move token to top"
      );
    }
  };

  const moveTokenUp = async (tokenId: string, currentPosition: number) => {
    if (!isValidTokenId(tokenId)) {
      toast.error("Invalid token ID");
      return;
    }

    if (currentPosition <= 1) {
      toast.error("Token is already at the top");
      return;
    }

    try {
      await apiClient.put(`/tokens/${tokenId}/position`, {
        newPosition: currentPosition - 1,
      });
      toast.success("Token moved up successfully");
      await fetchTokens();
    } catch (error: any) {
      console.error("Error moving token up:", error);
      toast.error(error.response?.data?.message || "Failed to move token up");
    }
  };

  const moveTokenDown = async (tokenId: string, currentPosition: number) => {
    if (!isValidTokenId(tokenId)) {
      toast.error("Invalid token ID");
      return;
    }

    const waitingTokens = tokens.filter((t) => t.status === "waiting");
    if (currentPosition >= waitingTokens.length) {
      toast.error("Token is already at the bottom");
      return;
    }

    try {
      await apiClient.put(`/tokens/${tokenId}/position`, {
        newPosition: currentPosition + 1,
      });
      toast.success("Token moved down successfully");
      await fetchTokens();
    } catch (error: any) {
      console.error("Error moving token down:", error);
      toast.error(error.response?.data?.message || "Failed to move token down");
    }
  };

  const deleteToken = async (tokenId: string) => {
    if (!isValidTokenId(tokenId)) {
      toast.error("Invalid token ID");
      return;
    }

    if (!confirm("Are you sure you want to delete this token?")) {
      return;
    }

    try {
      await apiClient.delete(`/tokens/${tokenId}`);
      toast.success("Token deleted successfully");
      await fetchTokens();
    } catch (error: any) {
      console.error("Error deleting token:", error);
      toast.error(error.response?.data?.message || "Failed to delete token");
    }
  };

  const sendTokenMessage = async (tokenId: string, message: string) => {
    if (!isValidTokenId(tokenId)) {
      toast.error("Invalid token ID");
      return;
    }

    if (!message.trim()) {
      toast.error("Message cannot be empty");
      return;
    }

    try {
      await apiClient.post(`/tokens/${tokenId}/message`, {
        message: message.trim(),
      });
      toast.success("Message sent successfully");
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  };

  const callNextToken = async () => {
    try {
      const response = await apiClient.put(
        `/tokens/queue/${queueId}/call-next`
      );

      if (response.data.success) {
        toast.success(
          `Token #${response.data.data.token.tokenNumber} called for service`
        );
        await fetchTokens(); // Refresh the tokens list
      } else {
        toast.error(response.data.message || "No tokens available to call");
      }
    } catch (error: any) {
      console.error("Error calling next token:", error);
      toast.error(error.response?.data?.message || "Failed to call next token");
    }
  };

  if (loading) {
    return (
      <Navigation>
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading queue details...</p>
          </div>
        </div>
      </Navigation>
    );
  }

  if (!queue) {
    return (
      <Navigation>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Queue Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            The queue you're looking for doesn't exist.
          </p>
          <Button onClick={() => router.push("/queues")}>Back to Queues</Button>
        </div>
      </Navigation>
    );
  }

  // Filter tokens by status
  const waitingTokens = tokens.filter((token) => token.status === "waiting");
  const inServiceTokens = tokens.filter(
    (token) => token.status === "in_service"
  );
  const completedTokens = tokens.filter((token) => token.status === "served");
  const cancelledTokens = tokens.filter(
    (token) => token.status === "cancelled"
  );

  return (
    <Navigation>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Queue Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{queue.name}</h1>
              {queue.description && (
                <p className="text-gray-600 mt-1">{queue.description}</p>
              )}
              <div className="flex items-center space-x-4 mt-2">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    queue.isActive
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {queue.isActive ? "Active" : "Inactive"}
                </span>
                <span className="text-sm text-gray-500">
                  {queue.currentTokens} / {queue.maxTokens} tokens
                </span>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    queue.priority === "high"
                      ? "bg-red-100 text-red-800"
                      : queue.priority === "medium"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {queue.priority} priority
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                onClick={callNextToken}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2"
                disabled={waitingTokens.length === 0}
              >
                Next Call
              </Button>
              <Button onClick={() => router.push("/queues")}>
                Back to Queues
              </Button>
            </div>
          </div>
        </div>

        {/* Create Token Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Add New Token</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input
                type="text"
                placeholder="Customer Name *"
                value={newTokenName}
                onChange={(e) => setNewTokenName(e.target.value)}
                className="w-full"
              />
              <Input
                type="email"
                placeholder="Email *"
                value={newTokenEmail}
                onChange={(e) => setNewTokenEmail(e.target.value)}
                className="w-full"
                required
              />
              <Input
                type="tel"
                placeholder="Phone (Optional)"
                value={newTokenPhone}
                onChange={(e) => setNewTokenPhone(e.target.value)}
                className="w-full"
              />
              <select
                value={newTokenPriority}
                onChange={(e) =>
                  setNewTokenPriority(
                    e.target.value as "normal" | "high" | "urgent"
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="normal">Normal Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent Priority</option>
              </select>
            </div>
            <div className="mt-4">
              <Input
                type="text"
                placeholder="Notes (Optional)"
                value={newTokenNotes}
                onChange={(e) => setNewTokenNotes(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="mt-4">
              <Button
                onClick={handleCreateToken}
                disabled={
                  addingToken || !newTokenName.trim() || !newTokenEmail.trim()
                }
                className="w-full md:w-auto"
              >
                {addingToken ? "Creating..." : "Create Token"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Active Tokens */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Waiting Tokens */}
          <Card>
            <CardHeader>
              <CardTitle>Waiting ({waitingTokens.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {waitingTokens.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No tokens waiting
                </p>
              ) : (
                <div className="space-y-3">
                  {waitingTokens
                    .sort((a, b) => a.position - b.position)
                    .map((token, index) => {
                      const tokenId = getTokenId(token);
                      return (
                        <div
                          key={tokenId || token.tokenNumber}
                          className="border rounded-lg p-4 hover:bg-gray-50"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-lg">
                                  #{token.tokenNumber}
                                </span>
                                <span
                                  className={`px-2 py-1 rounded text-xs font-medium ${
                                    token.priority === "urgent"
                                      ? "bg-red-100 text-red-800"
                                      : token.priority === "high"
                                      ? "bg-orange-100 text-orange-800"
                                      : "bg-gray-100 text-gray-800"
                                  }`}
                                >
                                  {token.priority}
                                </span>
                                <span className="text-sm text-gray-500">
                                  Position: {token.position}
                                </span>
                              </div>
                              <p className="text-gray-900 font-medium">
                                {token.customerName}
                              </p>
                              {token.contactInfo?.email && (
                                <p className="text-sm text-gray-600">
                                  {token.contactInfo.email}
                                </p>
                              )}
                              {token.contactInfo?.phone && (
                                <p className="text-sm text-gray-600">
                                  Phone: {token.contactInfo.phone}
                                </p>
                              )}
                              {token.notes && (
                                <p className="text-sm text-gray-600 mt-1">
                                  {token.notes}
                                </p>
                              )}
                              <p className="text-xs text-gray-400 mt-1">
                                Created:{" "}
                                {new Date(token.createdAt).toLocaleString()}
                              </p>
                            </div>
                            <div className="flex flex-col space-y-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  const tokenId = getTokenId(token);
                                  if (!tokenId) {
                                    toast.error(
                                      "Cannot move token: missing ID"
                                    );
                                    return;
                                  }
                                  moveTokenToTop(tokenId);
                                }}
                                className="text-xs"
                              >
                                Move to Top
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const tokenId = getTokenId(token);
                                  if (!tokenId) {
                                    toast.error(
                                      "Cannot move token: missing ID"
                                    );
                                    return;
                                  }
                                  moveTokenUp(tokenId, token.position);
                                }}
                                disabled={index === 0}
                                className="text-xs w-8 h-8 p-0 flex items-center justify-center text-lg"
                                title="Move Up"
                              >
                                ↑
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const tokenId = getTokenId(token);
                                  if (!tokenId) {
                                    toast.error(
                                      "Cannot move token: missing ID"
                                    );
                                    return;
                                  }
                                  moveTokenDown(tokenId, token.position);
                                }}
                                disabled={index === waitingTokens.length - 1}
                                className="text-xs w-8 h-8 p-0 flex items-center justify-center text-lg"
                                title="Move Down"
                              >
                                ↓
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => {
                                  const tokenId = getTokenId(token);
                                  if (!tokenId) {
                                    toast.error(
                                      "Cannot serve token: missing ID"
                                    );
                                    return;
                                  }
                                  updateTokenStatus(tokenId, "in_service");
                                }}
                                className="text-xs bg-blue-600 hover:bg-blue-700"
                              >
                                Serve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const tokenId = getTokenId(token);
                                  if (!tokenId) {
                                    toast.error(
                                      "Cannot cancel token: missing ID"
                                    );
                                    return;
                                  }
                                  updateTokenStatus(tokenId, "cancelled");
                                }}
                                className="text-xs text-red-600 hover:text-red-700"
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const message = prompt(
                                    "Enter message to send:"
                                  );
                                  if (message) {
                                    const tokenId = getTokenId(token);
                                    if (!tokenId) {
                                      toast.error(
                                        "Cannot send message: missing token ID"
                                      );
                                      return;
                                    }
                                    sendTokenMessage(tokenId, message);
                                  }
                                }}
                                className="text-xs"
                              >
                                Message
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* In Service Tokens */}
          <Card>
            <CardHeader>
              <CardTitle>In Service ({inServiceTokens.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {inServiceTokens.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No tokens in service
                </p>
              ) : (
                <div className="space-y-3">
                  {inServiceTokens.map((token) => {
                    const tokenId = getTokenId(token);
                    return (
                      <div
                        key={tokenId || token.tokenNumber}
                        className="border rounded-lg p-4 bg-blue-50 hover:bg-blue-100"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-lg">
                                #{token.tokenNumber}
                              </span>
                              <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                In Service
                              </span>
                            </div>
                            <p className="text-gray-900 font-medium">
                              {token.customerName}
                            </p>
                            {token.assignedTo && (
                              <p className="text-sm text-gray-600">
                                Assigned to: {token.assignedTo}
                              </p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">
                              Started:{" "}
                              {token.timestamps?.called
                                ? new Date(
                                    token.timestamps.called
                                  ).toLocaleString()
                                : "N/A"}
                            </p>
                          </div>
                          <div className="flex flex-col space-y-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                const tokenId = getTokenId(token);
                                if (!tokenId) {
                                  toast.error(
                                    "Cannot complete token: missing ID"
                                  );
                                  return;
                                }
                                updateTokenStatus(tokenId, "served");
                              }}
                              className="text-xs bg-green-600 hover:bg-green-700"
                            >
                              Complete
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const tokenId = getTokenId(token);
                                if (!tokenId) {
                                  toast.error(
                                    "Cannot return token: missing ID"
                                  );
                                  return;
                                }
                                updateTokenStatus(tokenId, "waiting");
                              }}
                              className="text-xs"
                            >
                              Return to Queue
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Completed and Cancelled Tokens */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          {/* Completed Tokens */}
          <Card>
            <CardHeader>
              <CardTitle>Completed Today ({completedTokens.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {completedTokens.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No completed tokens today
                </p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {completedTokens
                    .sort(
                      (a, b) =>
                        new Date(
                          b.timestamps?.completed || b.createdAt
                        ).getTime() -
                        new Date(
                          a.timestamps?.completed || a.createdAt
                        ).getTime()
                    )
                    .map((token) => {
                      const tokenId = getTokenId(token);
                      return (
                        <div
                          key={tokenId || token.tokenNumber}
                          className="border rounded-lg p-3 bg-green-50"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-bold">
                                  #{token.tokenNumber}
                                </span>
                                <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                                  Completed
                                </span>
                              </div>
                              <p className="font-medium">
                                {token.customerName}
                              </p>
                              <p className="text-xs text-gray-500">
                                Completed:{" "}
                                {token.timestamps?.completed
                                  ? new Date(
                                      token.timestamps.completed
                                    ).toLocaleString()
                                  : "N/A"}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const tokenId = getTokenId(token);
                                if (!tokenId) {
                                  toast.error(
                                    "Cannot delete token: missing ID"
                                  );
                                  return;
                                }
                                deleteToken(tokenId);
                              }}
                              className="text-xs text-red-600 hover:text-red-700"
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cancelled Tokens */}
          <Card>
            <CardHeader>
              <CardTitle>Cancelled Today ({cancelledTokens.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {cancelledTokens.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No cancelled tokens today
                </p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {cancelledTokens
                    .sort(
                      (a, b) =>
                        new Date(
                          b.timestamps?.cancelled || b.createdAt
                        ).getTime() -
                        new Date(
                          a.timestamps?.cancelled || a.createdAt
                        ).getTime()
                    )
                    .map((token) => {
                      const tokenId = getTokenId(token);
                      return (
                        <div
                          key={tokenId || token.tokenNumber}
                          className="border rounded-lg p-3 bg-red-50"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-bold">
                                  #{token.tokenNumber}
                                </span>
                                <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                                  Cancelled
                                </span>
                              </div>
                              <p className="font-medium">
                                {token.customerName}
                              </p>
                              <p className="text-xs text-gray-500">
                                Cancelled:{" "}
                                {token.timestamps?.cancelled
                                  ? new Date(
                                      token.timestamps.cancelled
                                    ).toLocaleString()
                                  : "N/A"}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const tokenId = getTokenId(token);
                                if (!tokenId) {
                                  toast.error(
                                    "Cannot delete token: missing ID"
                                  );
                                  return;
                                }
                                deleteToken(tokenId);
                              }}
                              className="text-xs text-red-600 hover:text-red-700"
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Navigation>
  );
};

export default QueueDetailsPage;
