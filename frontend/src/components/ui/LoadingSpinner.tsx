import React from "react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  color?: string;
  text?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "md",
  color = "border-blue-600",
  text,
}) => {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <div
        className={`animate-spin rounded-full border-b-2 ${color} ${sizeClasses[size]} mb-2`}
      />
      {text && <p className="text-gray-600 text-sm">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;
