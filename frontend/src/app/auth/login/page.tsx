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

interface LoginFormData {
  email: string;
  password: string;
}

const LoginPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const login = useAuthStore((state) => state.login);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const success = await login(data.email, data.password);
      if (success) {
        router.push("/dashboard");
      }
    } catch (error) {
      toast.error("Invalid credentials");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            SmartQueue
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to your manager account
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                {...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Invalid email address",
                  },
                })}
                type="email"
                label="Email Address"
                placeholder="Enter your email"
                error={errors.email?.message}
              />

              <Input
                {...register("password", {
                  required: "Password is required",
                  minLength: {
                    value: 6,
                    message: "Password must be at least 6 characters",
                  },
                })}
                type="password"
                label="Password"
                placeholder="Enter your password"
                error={errors.password?.message}
              />

              <Button type="submit" className="w-full" loading={isLoading}>
                Sign In
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{" "}
                <button
                  onClick={() => router.push("/auth/register")}
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Sign up
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
