import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    return NextResponse.json(
      {
        status: "OK",
        timestamp: new Date().toISOString(),
        service: "SmartQueue Frontend",
        version: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: "ERROR",
        timestamp: new Date().toISOString(),
        error: "Health check failed",
      },
      { status: 500 }
    );
  }
}
