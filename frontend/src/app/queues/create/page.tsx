"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui";
import { useAuthStore } from "@/store/authStore";
import Navigation from "@/components/Navigation";
import axios from "axios";

interface QueueFormData {
  name: string;
  description: string;
  maxTokens: number;
  priority: "low" | "medium" | "high";
}

const CreateQueuePage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<QueueFormData>({
    defaultValues: {
      priority: "medium",
    },
  });

  React.useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth/login");
    }
  }, [isAuthenticated, router]);

  const onSubmit = async (data: QueueFormData) => {
    setIsLoading(true);
    try {
      const response = await axios.post("/queues", {
        ...data,
        isActive: true,
      });

      if (response.data.success) {
        toast.success("Queue created successfully!");
        router.push(`/queues/${response.data.data._id}`);
      }
    } catch (error: any) {
      const message = error.response?.data?.message || "Failed to create queue";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Navigation>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Create New Queue</h1>
          <p className="mt-2 text-gray-600">
            Set up a new queue to manage your customers efficiently.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Queue Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <Input
                {...register("name", {
                  required: "Queue name is required",
                  minLength: {
                    value: 3,
                    message: "Queue name must be at least 3 characters",
                  },
                })}
                type="text"
                label="Queue Name"
                placeholder="e.g., Customer Service, Premium Support"
                error={errors.name?.message}
              />

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  {...register("description")}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  rows={3}
                  placeholder="Brief description of what this queue handles..."
                />
              </div>

              <Input
                {...register("maxTokens", {
                  required: "Maximum tokens is required",
                  min: {
                    value: 1,
                    message: "Maximum tokens must be at least 1",
                  },
                  max: {
                    value: 1000,
                    message: "Maximum tokens cannot exceed 1000",
                  },
                })}
                type="number"
                label="Maximum Tokens"
                placeholder="50"
                error={errors.maxTokens?.message}
                helper="Maximum number of tokens that can be in this queue at once"
              />

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Priority Level
                </label>
                <select
                  {...register("priority")}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
                <p className="text-sm text-gray-500">
                  Determines the default priority for tokens in this queue
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={isLoading}>
                  Create Queue
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Navigation>
  );
};

export default CreateQueuePage;
