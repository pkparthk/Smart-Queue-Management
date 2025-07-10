import express from "express";
import { Response } from "express";
import Queue from "../models/Queue";
import Token from "../models/Token";
import { asyncHandler } from "../middleware/errorHandler";
import { AuthRequest, authenticateToken } from "../middleware/auth";

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// @desc    Get overall analytics for manager's queues
// @route   GET /api/analytics/overview
// @access  Private
const getOverviewAnalytics = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const managerId = req.user!._id;

    // Get date range from query params (default to last 30 days)
    const days = parseInt(req.query.days as string) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get manager's queues
    const queues = await Queue.find({ managerId }).select("_id name");
    const queueIds = queues.map((q) => q._id);

    if (queueIds.length === 0) {
      res.status(200).json({
        success: true,
        data: {
          totalQueues: 0,
          totalTokens: 0,
          tokensServed: 0,
          tokensCancelled: 0,
          avgWaitTime: 0,
          avgServiceTime: 0,
          efficiency: 0,
          dailyStats: [],
          queuePerformance: [],
        },
      });
      return;
    }

    // Aggregate statistics
    const stats = await Token.aggregate([
      {
        $match: {
          queueId: { $in: queueIds },
          "timestamps.created": { $gte: startDate },
        },
      },
      {
        $group: {
          _id: null,
          totalTokens: { $sum: 1 },
          tokensServed: {
            $sum: { $cond: [{ $eq: ["$status", "served"] }, 1, 0] },
          },
          tokensCancelled: {
            $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
          },
          avgWaitTime: { $avg: "$waitTime" },
          avgServiceTime: { $avg: "$serviceTime" },
        },
      },
    ]);

    // Daily statistics
    const dailyStats = await Token.aggregate([
      {
        $match: {
          queueId: { $in: queueIds },
          "timestamps.created": { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$timestamps.created" },
            month: { $month: "$timestamps.created" },
            day: { $dayOfMonth: "$timestamps.created" },
          },
          date: {
            $first: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$timestamps.created",
              },
            },
          },
          totalTokens: { $sum: 1 },
          tokensServed: {
            $sum: { $cond: [{ $eq: ["$status", "served"] }, 1, 0] },
          },
          tokensCancelled: {
            $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
          },
          avgWaitTime: { $avg: "$waitTime" },
          avgServiceTime: { $avg: "$serviceTime" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]);

    // Queue performance
    const queuePerformance = await Token.aggregate([
      {
        $match: {
          queueId: { $in: queueIds },
          "timestamps.created": { $gte: startDate },
        },
      },
      {
        $group: {
          _id: "$queueId",
          totalTokens: { $sum: 1 },
          tokensServed: {
            $sum: { $cond: [{ $eq: ["$status", "served"] }, 1, 0] },
          },
          tokensCancelled: {
            $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
          },
          avgWaitTime: { $avg: "$waitTime" },
          avgServiceTime: { $avg: "$serviceTime" },
        },
      },
      {
        $lookup: {
          from: "queues",
          localField: "_id",
          foreignField: "_id",
          as: "queue",
        },
      },
      {
        $unwind: "$queue",
      },
      {
        $project: {
          queueName: "$queue.name",
          totalTokens: 1,
          tokensServed: 1,
          tokensCancelled: 1,
          avgWaitTime: { $round: ["$avgWaitTime", 1] },
          avgServiceTime: { $round: ["$avgServiceTime", 1] },
          efficiency: {
            $round: [
              {
                $multiply: [
                  { $divide: ["$tokensServed", "$totalTokens"] },
                  100,
                ],
              },
              1,
            ],
          },
        },
      },
    ]);

    const result = stats[0] || {
      totalTokens: 0,
      tokensServed: 0,
      tokensCancelled: 0,
      avgWaitTime: 0,
      avgServiceTime: 0,
    };

    const efficiency =
      result.totalTokens > 0
        ? Math.round((result.tokensServed / result.totalTokens) * 100 * 10) / 10
        : 0;

    res.status(200).json({
      success: true,
      data: {
        totalQueues: queues.length,
        totalTokens: result.totalTokens,
        tokensServed: result.tokensServed,
        tokensCancelled: result.tokensCancelled,
        avgWaitTime: Math.round((result.avgWaitTime || 0) * 10) / 10,
        avgServiceTime: Math.round((result.avgServiceTime || 0) * 10) / 10,
        efficiency,
        dailyStats,
        queuePerformance,
      },
    });
  }
);

// @desc    Get real-time queue status
// @route   GET /api/analytics/realtime
// @access  Private
const getRealtimeStatus = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const managerId = req.user!._id;

    const queues = await Queue.find({ managerId, isActive: true }).select(
      "name currentLength"
    );

    const realtimeStats = await Promise.all(
      queues.map(async (queue) => {
        const waitingTokens = await Token.countDocuments({
          queueId: queue._id,
          status: "waiting",
        });

        const inServiceTokens = await Token.countDocuments({
          queueId: queue._id,
          status: "in_service",
        });

        const nextToken = await Token.findOne({
          queueId: queue._id,
          status: "waiting",
        })
          .sort({ position: 1 })
          .select("tokenNumber customerName position");

        return {
          queueId: queue._id,
          queueName: queue.name,
          waitingTokens,
          inServiceTokens,
          totalLength: queue.currentLength,
          nextToken,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: { queues: realtimeStats },
    });
  }
);

// @desc    Get dashboard analytics for manager
// @route   GET /api/analytics/dashboard
// @access  Private
const getDashboardAnalytics = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const managerId = req.user!._id;

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get manager's queues
    const totalQueues = await Queue.countDocuments({ managerId });
    const activeQueues = await Queue.countDocuments({
      managerId,
      isActive: true,
    });

    // Get today's tokens for this manager's queues
    const managerQueues = await Queue.find({ managerId }).select("_id");
    const queueIds = managerQueues.map((q) => q._id);

    let totalTokensToday = 0;
    let averageWaitTime = 0;

    if (queueIds.length > 0) {
      // Count tokens created today
      totalTokensToday = await Token.countDocuments({
        queueId: { $in: queueIds },
        createdAt: { $gte: today, $lt: tomorrow },
      });

      // Calculate average wait time for tokens served today
      const servedTokensToday = await Token.find({
        queueId: { $in: queueIds },
        status: "served",
        "timestamps.served": { $gte: today, $lt: tomorrow },
      }).select("createdAt timestamps");

      if (servedTokensToday.length > 0) {
        const totalWaitTime = servedTokensToday.reduce((sum, token) => {
          if (token.timestamps.served) {
            const waitTime =
              token.timestamps.served.getTime() - token.createdAt.getTime();
            return sum + waitTime;
          }
          return sum;
        }, 0);
        averageWaitTime = Math.round(
          totalWaitTime / servedTokensToday.length / (1000 * 60)
        ); // Convert to minutes
      }
    }

    res.status(200).json({
      success: true,
      data: {
        totalQueues,
        activeQueues,
        totalTokensToday,
        averageWaitTime,
      },
    });
  }
);

// Routes
router.get("/overview", getOverviewAnalytics);
router.get("/realtime", getRealtimeStatus);
router.get("/dashboard", getDashboardAnalytics);

export default router;
