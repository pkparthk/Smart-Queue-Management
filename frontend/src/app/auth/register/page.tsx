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

interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const RegisterPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const register_user = useAuthStore((state) => state.register);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegisterFormData>();

  const password = watch("password");

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      const success = await register_user({
        name: data.name,
        email: data.email,
        password: data.password,
        role: "manager",
      });
      if (success) {
        toast.success("Registration successful! Please login.");
        router.push("/auth/login");
      }
    } catch (error: any) {
      toast.error(error.message || "Registration failed");
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
            Create your manager account
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign Up</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                {...register("name", {
                  required: "Name is required",
                  minLength: {
                    value: 2,
                    message: "Name must be at least 2 characters",
                  },
                })}
                type="text"
                label="Full Name"
                placeholder="Enter your full name"
                error={errors.name?.message}
              />

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

              <Input
                {...register("confirmPassword", {
                  required: "Please confirm your password",
                  validate: (value) =>
                    value === password || "Passwords do not match",
                })}
                type="password"
                label="Confirm Password"
                placeholder="Confirm your password"
                error={errors.confirmPassword?.message}
              />

              <Button type="submit" className="w-full" loading={isLoading}>
                Sign Up
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{" "}
                <button
                  onClick={() => router.push("/auth/login")}
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Sign in
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;
