"use client";

import React, { forwardRef } from "react";
import { clsx } from "clsx";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helper, className, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={clsx(
            "block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm",
            error && "border-red-300 focus:ring-red-500 focus:border-red-500",
            className
          )}
          {...props}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {helper && !error && <p className="text-sm text-gray-500">{helper}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
