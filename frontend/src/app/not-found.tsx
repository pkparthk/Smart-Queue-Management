"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent } from "@/components/ui";

const NotFoundPage: React.FC = () => {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6 text-center">
          <div className="text-6xl font-bold text-gray-400 mb-4">404</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Page Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            Sorry, the page you are looking for doesn't exist.
          </p>
          <div className="space-y-3">
            <Button
              onClick={() => router.push("/dashboard")}
              className="w-full"
            >
              Go to Dashboard
            </Button>
            <Button
              onClick={() => router.back()}
              variant="outline"
              className="w-full"
            >
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFoundPage;
