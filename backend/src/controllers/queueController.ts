import { Request, Response } from "express";
import { validationResult } from "express-validator";
import Queue from "../models/Queue";
import Token from "../models/Token";
import { asyncHandler } from "../middleware/errorHandler";
import { AuthRequest } from "../middleware/auth";

export const getQueues = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const filter: any = { managerId: req.user!._id };

    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === "true";
    }

    const queues = await Queue.find(filter)
      .populate("managerId", "name email")
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const transformedQueues = queues.map((queue) => ({
      _id: queue._id,
      name: queue.name,
      description: queue.description,
      isActive: queue.isActive,
      maxTokens: queue.maxCapacity || 50,
      currentTokens: queue.currentLength,
      createdAt: queue.createdAt,
      managerId: queue.managerId,
    }));

    const total = await Queue.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        queues: transformedQueues,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: queues.length,
          totalRecords: total,
        },
      },
    });
  }
);

export const getQueue = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const queueId = req.params.id;

    if (!queueId || queueId === "undefined" || queueId.length !== 24) {
      res.status(400).json({
        success: false,
        message: "Invalid queue ID",
      });
      return;
    }

    const queue = await Queue.findOne({
      _id: queueId,
      managerId: req.user!._id,
    }).populate("managerId", "name email");

    if (!queue) {
      res.status(404).json({
        success: false,
        message: "Queue not found",
      });
      return;
    }

    const tokens = await Token.find({
      queueId: queue._id,
    }).sort({ position: 1, createdAt: 1 });

    res.status(200).json({
      success: true,
      data: {
        queue,
        tokens,
      },
    });
  }
);

export const createQueue = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
      return;
    }

    const { name, description, maxCapacity } = req.body;

    const queue = await Queue.create({
      name,
      description,
      maxCapacity,
      managerId: req.user!._id,
    });

    await queue.populate("managerId", "name email");

    res.status(201).json({
      success: true,
      message: "Queue created successfully",
      data: { queue },
    });
  }
);

export const updateQueue = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
      return;
    }

    const { name, description, maxCapacity, isActive } = req.body;

    const queue = await Queue.findOneAndUpdate(
      {
        _id: req.params.id,
        managerId: req.user!._id,
      },
      { name, description, maxCapacity, isActive },
      { new: true, runValidators: true }
    ).populate("managerId", "name email");

    if (!queue) {
      res.status(404).json({
        success: false,
        message: "Queue not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Queue updated successfully",
      data: { queue },
    });
  }
);

export const deleteQueue = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const queue = await Queue.findOne({
      _id: req.params.id,
      managerId: req.user!._id,
    });

    if (!queue) {
      res.status(404).json({
        success: false,
        message: "Queue not found",
      });
      return;
    }

    const activeTokens = await Token.countDocuments({
      queueId: queue._id,
      status: { $in: ["waiting", "in_service"] },
    });

    if (activeTokens > 0) {
      res.status(400).json({
        success: false,
        message:
          "Cannot delete queue with active tokens. Please complete or cancel all tokens first.",
      });
      return;
    }

    await Queue.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Queue deleted successfully",
    });
  }
);

export const getQueueStats = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const queue = await Queue.findOne({
      _id: req.params.id,
      managerId: req.user!._id,
    });

    if (!queue) {
      res.status(404).json({
        success: false,
        message: "Queue not found",
      });
      return;
    }

    const stats = await Token.aggregate([
      { $match: { queueId: queue._id } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          avgWaitTime: { $avg: "$waitTime" },
          avgServiceTime: { $avg: "$serviceTime" },
        },
      },
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayStats = await Token.aggregate([
      {
        $match: {
          queueId: queue._id,
          "timestamps.created": { $gte: today },
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          avgWaitTime: { $avg: "$waitTime" },
          avgServiceTime: { $avg: "$serviceTime" },
        },
      },
    ]);

    const hourlyStats = await Token.aggregate([
      {
        $match: {
          queueId: queue._id,
          "timestamps.created": { $gte: today },
        },
      },
      {
        $group: {
          _id: { $hour: "$timestamps.created" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        queue,
        overall: stats,
        today: todayStats,
        hourlyDistribution: hourlyStats,
      },
    });
  }
);
