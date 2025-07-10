"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
} from "@/components/ui";
import { useAuthStore } from "@/store/authStore";
import Navigation from "@/components/Navigation";
import axios from "axios";
import { toast } from "react-hot-toast";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface OverviewData {
  totalQueues: number;
  totalTokens: number;
  tokensServed: number;
  tokensCancelled: number;
  avgWaitTime: number;
  avgServiceTime: number;
  efficiency: number;
  dailyStats: Array<{
    date: string;
    totalTokens: number;
    tokensServed: number;
    tokensCancelled: number;
    avgWaitTime: number;
    avgServiceTime: number;
  }>;
  queuePerformance: Array<{
    queueName: string;
    totalTokens: number;
    tokensServed: number;
    tokensCancelled: number;
    avgWaitTime: number;
    avgServiceTime: number;
    efficiency: number;
  }>;
}

interface RealtimeData {
  queues: Array<{
    queueId: string;
    queueName: string;
    waitingTokens: number;
    inServiceTokens: number;
    totalLength: number;
    nextToken?: {
      tokenNumber: string;
      customerName?: string;
      position: number;
    };
  }>;
}

const AnalyticsPage: React.FC = () => {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [realtimeData, setRealtimeData] = useState<RealtimeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(30);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth/login");
      return;
    }

    fetchAnalytics();
    fetchRealtimeData();

    // Set up periodic refresh for realtime data
    const interval = setInterval(fetchRealtimeData, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [isAuthenticated, router, timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/analytics/overview?days=${timeRange}`);
      setOverviewData(response.data.data);
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
      toast.error("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  const fetchRealtimeData = async () => {
    try {
      const response = await axios.get(`/analytics/realtime`);
      setRealtimeData(response.data.data);
    } catch (error) {
      console.error("Failed to fetch realtime data:", error);
    }
  };

  if (loading) {
    return (
      <Navigation>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading analytics...</div>
        </div>
      </Navigation>
    );
  }

  if (!overviewData) {
    return (
      <Navigation>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">No analytics data available</div>
        </div>
      </Navigation>
    );
  }

  const pieData = [
    { name: "Served", value: overviewData.tokensServed, color: "#10B981" },
    {
      name: "Cancelled",
      value: overviewData.tokensCancelled,
      color: "#EF4444",
    },
    {
      name: "Waiting",
      value:
        overviewData.totalTokens -
        overviewData.tokensServed -
        overviewData.tokensCancelled,
      color: "#F59E0B",
    },
  ].filter((item) => item.value > 0);

  return (
    <Navigation>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Analytics Dashboard
          </h1>
          <div className="flex space-x-2">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <Button onClick={fetchAnalytics} variant="outline">
              Refresh
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">
                {overviewData.totalQueues}
              </div>
              <p className="text-sm text-gray-500">Total Queues</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">
                {overviewData.totalTokens}
              </div>
              <p className="text-sm text-gray-500">Total Tokens</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-purple-600">
                {overviewData.efficiency}%
              </div>
              <p className="text-sm text-gray-500">Efficiency</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-orange-600">
                {overviewData.avgWaitTime} min
              </div>
              <p className="text-sm text-gray-500">Avg Wait Time</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Token Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Token Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Daily Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Token Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={overviewData.dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="totalTokens"
                    stroke="#3B82F6"
                    name="Total"
                  />
                  <Line
                    type="monotone"
                    dataKey="tokensServed"
                    stroke="#10B981"
                    name="Served"
                  />
                  <Line
                    type="monotone"
                    dataKey="tokensCancelled"
                    stroke="#EF4444"
                    name="Cancelled"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Queue Performance */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Queue Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={overviewData.queuePerformance}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="queueName"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="totalTokens" fill="#3B82F6" name="Total Tokens" />
                <Bar dataKey="tokensServed" fill="#10B981" name="Served" />
                <Bar dataKey="efficiency" fill="#8B5CF6" name="Efficiency %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Real-time Status */}
        {realtimeData && (
          <Card>
            <CardHeader>
              <CardTitle>Real-time Queue Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {realtimeData.queues.map((queue) => (
                  <Card
                    key={queue.queueId}
                    className="border-l-4 border-l-blue-500"
                  >
                    <CardContent className="pt-6">
                      <h3 className="font-semibold text-lg mb-2">
                        {queue.queueName}
                      </h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            Waiting:
                          </span>
                          <span className="font-medium">
                            {queue.waitingTokens}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            In Service:
                          </span>
                          <span className="font-medium">
                            {queue.inServiceTokens}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            Total Length:
                          </span>
                          <span className="font-medium">
                            {queue.totalLength}
                          </span>
                        </div>
                        {queue.nextToken && (
                          <div className="pt-2 border-t">
                            <p className="text-sm text-gray-600">Next Token:</p>
                            <p className="font-medium">
                              {queue.nextToken.tokenNumber}
                              {queue.nextToken.customerName &&
                                ` - ${queue.nextToken.customerName}`}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Navigation>
  );
};

export default AnalyticsPage;
