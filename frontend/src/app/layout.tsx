import "./globals.css";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "SmartQueue - Queue Management System",
  description: "A modern, efficient queue management system for businesses",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: "#363636",
                color: "#fff",
              },
              success: {
                duration: 3000,
                style: {
                  background: "#059669",
                },
              },
              error: {
                duration: 5000,
                style: {
                  background: "#DC2626",
                },
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
