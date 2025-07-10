"use client";

import React, { useEffect, useState } from "react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
} from "@/components/ui";
import axios from "axios";
import { toast } from "react-hot-toast";
import { emailService } from "@/utils/emailService";

interface Queue {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  maxTokens: number;
  currentTokens: number;
  priority: "low" | "medium" | "high";
  estimatedWaitTime?: number;
}

interface JoinResult {
  success: boolean;
  token?: {
    tokenNumber: string;
    position: number;
    estimatedWaitTime: number;
  };
}

const JoinQueuePage: React.FC = () => {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQueue, setSelectedQueue] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [joiningQueue, setJoiningQueue] = useState(false);
  const [joinResult, setJoinResult] = useState<JoinResult | null>(null);

  useEffect(() => {
    fetchActiveQueues();
  }, []);

  const fetchActiveQueues = async () => {
    try {
      setLoading(true);
      
      const publicAxios = axios.create({
        baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
      });

      const response = await publicAxios.get("/queues/public");
      setQueues(response.data.data || []);
    } catch (error) {
      console.error("Failed to fetch queues:", error);
      toast.error("Failed to load available queues");
    } finally {
      setLoading(false);
    }
  };

  const joinQueue = async () => {
    console.log("joinQueue function called");
    console.log("Form state:", {
      selectedQueue,
      customerName: customerName.trim(),
      email: email.trim(),
      priority,
    });

    if (!selectedQueue) {
      console.log("Validation failed: No queue selected");
      toast.error("Please select a queue");
      return;
    }

    if (!customerName.trim()) {
      console.log("Validation failed: No customer name");
      toast.error("Please enter your name");
      return;
    }

    if (!email.trim()) {
      console.log("Validation failed: No email");
      toast.error("Please enter your email address");
      return;
    }

    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      console.log(
        "Validation failed: Invalid email format. Email:",
        email.trim()
      );
      toast.error("Please enter a valid email address");
      return;
    }

    console.log("All validations passed, starting API call");
    setJoiningQueue(true);
    try {
      
      const publicAxios = axios.create({
        baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
      });

      console.log("Making API call to:", "/tokens/public");
      const response = await publicAxios.post("/tokens/public", {
        queueId: selectedQueue,
        customerName: customerName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        priority,
      });

      console.log("API response:", response.data);

      if (response.data.success) {
        console.log("Join queue successful");
        const tokenData = response.data.data;

        setJoinResult({
          success: true,
          token: tokenData,
        });

        toast.success("Successfully joined the queue!");

        // Send welcome email via EmailJS
        try {
          const selectedQueueData = queues.find((q) => q._id === selectedQueue);
          const queueName = selectedQueueData?.name || "Queue";

          console.log("Sending welcome email...");
          const emailSent = await emailService.sendWelcomeEmail(
            email.trim(),
            customerName.trim(),
            queueName,
            tokenData.position,
            `${tokenData.estimatedWaitTime} minutes`,
            tokenData.tokenNumber
          );

          if (emailSent) {
            toast.success("Welcome email sent successfully! 📧");
          } else {
            console.warn("Welcome email could not be sent");
            toast("Queue joined successfully! (Email service unavailable)", {
              icon: "⚠️",
            });
          }
        } catch (emailError) {
          console.error("Error sending welcome email:", emailError);
          toast("Queue joined successfully! (Email failed to send)", {
            icon: "⚠️",
          });
        }

        // Don't reset form here since we show success page
        // The reset will happen when user clicks "Join Another Queue"
      }
    } catch (error: any) {
      console.error("API call failed:", error);
      const message = error.response?.data?.message || "Failed to join queue";
      toast.error(message);
      setJoinResult({ success: false });
    } finally {
      console.log("Setting joiningQueue to false");
      setJoiningQueue(false);
    }
  };

  const resetForm = () => {
    setJoinResult(null);
    setSelectedQueue("");
    setCustomerName("");
    setEmail("");
    setPhone("");
    setPriority("medium");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (joinResult?.success) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">SmartQueue</h1>
            <p className="mt-2 text-gray-600">Queue Management System</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-center text-green-600">
                🎫 Queue Joined Successfully!
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-800">
                  Your Token: {joinResult.token?.tokenNumber}
                </h3>
                <p className="text-green-700">
                  Position: #{joinResult.token?.position}
                </p>
                <p className="text-green-700">
                  Estimated Wait: {joinResult.token?.estimatedWaitTime || 0}{" "}
                  minutes
                </p>
              </div>

              <div className="text-sm text-gray-600 space-y-2">
                <p>📱 Please save your token number</p>
                <p>⏰ Keep checking back for updates</p>
                <p>🏪 Arrive at the service counter when called</p>
              </div>

              <Button onClick={resetForm} className="w-full">
                Join Another Queue
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">SmartQueue</h1>
          <p className="mt-2 text-gray-600">Join a Queue</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Available Queues</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {queues.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p>No active queues available at the moment.</p>
                <Button
                  onClick={fetchActiveQueues}
                  className="mt-4"
                  variant="outline"
                >
                  Refresh
                </Button>
              </div>
            ) : (
              <>
                {/* Queue Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Queue *
                  </label>
                  <div className="space-y-2">
                    {queues
                      .filter((queue) => queue._id)
                      .map((queue) => (
                        <div
                          key={queue._id}
                          className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                            selectedQueue === queue._id
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                          onClick={() => setSelectedQueue(queue._id)}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900">
                                {queue.name}
                              </h3>
                              {queue.description && (
                                <p className="text-sm text-gray-600 mt-1">
                                  {queue.description}
                                </p>
                              )}
                              <div className="flex items-center mt-2 space-x-4 text-xs text-gray-500">
                                <span>Current: {queue.currentTokens}</span>
                                <span>Max: {queue.maxTokens}</span>
                                {queue.estimatedWaitTime && (
                                  <span>
                                    Wait: ~{queue.estimatedWaitTime}min
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="ml-2">
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  queue.currentTokens >= queue.maxTokens
                                    ? "bg-red-100 text-red-800"
                                    : "bg-green-100 text-green-800"
                                }`}
                              >
                                {queue.currentTokens >= queue.maxTokens
                                  ? "Full"
                                  : "Available"}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  label="Your Name *"
                  placeholder="Enter your full name"
                />
                
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  label="Email Address *"
                  placeholder="Enter your email address"
                  type="email"
                />
                
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  label="Phone Number (Optional)"
                  placeholder="Enter your phone number"
                  type="tel"
                />
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority Level
                  </label>
                  <select
                    value={priority}
                    onChange={(e) =>
                      setPriority(e.target.value as "low" | "medium" | "high")
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>
                
                <div>
                  <Button
                    onClick={joinQueue}
                    className="w-full"
                    loading={joiningQueue}
                    disabled={
                      !selectedQueue ||
                      !customerName.trim() ||
                      !email.trim() ||
                      joiningQueue
                    }
                  >
                    Join Queue
                  </Button>
                </div>
                
                <div className="text-center pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    Are you a manager?{" "}
                    <a
                      href="/auth/login"
                      className="font-medium text-blue-600 hover:text-blue-500"
                    >
                      Sign in here
                    </a>
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default JoinQueuePage;