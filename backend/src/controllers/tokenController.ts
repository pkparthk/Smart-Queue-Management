import { Response } from "express";
import { validationResult } from "express-validator";
import Token from "../models/Token";
import Queue from "../models/Queue";
import { asyncHandler } from "../middleware/errorHandler";
import { AuthRequest } from "../middleware/auth";
import emailService from "../utils/emailService";

export const getTokensByQueue = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { queueId } = req.params;
    const status = req.query.status as string;

    const queue = await Queue.findOne({
      _id: queueId,
      managerId: req.user!._id,
    });

    if (!queue) {
      res.status(404).json({
        success: false,
        message: "Queue not found",
      });
      return;
    }

    const filter: any = { queueId };
    if (status) {
      filter.status = status;
    }

    const tokens = await Token.find(filter)
      .populate("queueId", "name")
      .sort({ position: 1, "timestamps.created": 1 });

    res.status(200).json({
      success: true,
      data: { tokens },
    });
  }
);

export const createToken = asyncHandler(
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

    const { queueId, customerName, priority, contactInfo, notes } = req.body;

    const queue = await Queue.findOne({
      _id: queueId,
      managerId: req.user!._id,
      isActive: true,
    });

    if (!queue) {
      res.status(404).json({
        success: false,
        message: "Queue not found or inactive",
      });
      return;
    }

    if (queue.maxCapacity && queue.currentLength >= queue.maxCapacity) {
      res.status(400).json({
        success: false,
        message: "Queue is at maximum capacity",
      });
      return;
    }

    const lastToken = await Token.findOne({
      queueId,
      status: { $in: ["waiting", "in_service"] },
    }).sort({ position: -1 });

    const nextPosition = lastToken ? lastToken.position + 1 : 1;

    const tokenNumber = `${queue.name.substring(0, 3).toUpperCase()}-${String(
      nextPosition
    ).padStart(3, "0")}`;

    const token = await Token.create({
      tokenNumber,
      customerName,
      queueId,
      position: nextPosition,
      priority: priority || "normal",
      contactInfo,
      notes,
    });

    queue.currentLength += 1;
    await queue.save();

    await token.populate("queueId", "name");

    const io = req.app.get("io");
    io.to(`queue_${queueId}`).emit("tokenAdded", {
      token,
      queueId,
      currentLength: queue.currentLength,
    });

    res.status(201).json({
      success: true,
      message: "Token created successfully",
      data: { token },
    });
  }
);

export const updateTokenPosition = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { newPosition } = req.body;
    const tokenId = req.params.id;

    if (!newPosition || newPosition < 1) {
      res.status(400).json({
        success: false,
        message: "Invalid position",
      });
      return;
    }

    const token = await Token.findById(tokenId).populate("queueId");
    if (!token) {
      res.status(404).json({
        success: false,
        message: "Token not found",
      });
      return;
    }

    const queue = await Queue.findOne({
      _id: token.queueId,
      managerId: req.user!._id,
    });

    if (!queue) {
      res.status(404).json({
        success: false,
        message: "Queue not found",
      });
      return;
    }

    if (token.status !== "waiting") {
      res.status(400).json({
        success: false,
        message: "Can only reorder waiting tokens",
      });
      return;
    }

    const oldPosition = token.position;

    if (newPosition > oldPosition) {
      await Token.updateMany(
        {
          queueId: token.queueId,
          position: { $gt: oldPosition, $lte: newPosition },
          status: "waiting",
          _id: { $ne: tokenId },
        },
        { $inc: { position: -1 } }
      );
    } else {
      await Token.updateMany(
        {
          queueId: token.queueId,
          position: { $gte: newPosition, $lt: oldPosition },
          status: "waiting",
          _id: { $ne: tokenId },
        },
        { $inc: { position: 1 } }
      );
    }

    token.position = newPosition;
    await token.save();

    const updatedTokens = await Token.find({
      queueId: token.queueId,
      status: { $in: ["waiting", "in_service"] },
    }).sort({ position: 1 });

    const io = req.app.get("io");
    io.to(`queue_${token.queueId}`).emit("tokensReordered", {
      tokens: updatedTokens,
      queueId: token.queueId,
    });

    res.status(200).json({
      success: true,
      message: "Token position updated successfully",
      data: { tokens: updatedTokens },
    });
  }
);

export const callNextToken = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { queueId } = req.params;

    const queue = await Queue.findOne({
      _id: queueId,
      managerId: req.user!._id,
    });

    if (!queue) {
      res.status(404).json({
        success: false,
        message: "Queue not found",
      });
      return;
    }

    const nextToken = await Token.findOne({
      queueId,
      status: "waiting",
    }).sort({ position: 1 });

    if (!nextToken) {
      res.status(404).json({
        success: false,
        message: "No waiting tokens found",
      });
      return;
    }

    nextToken.status = "in_service";
    await nextToken.save();

    await nextToken.populate("queueId", "name");

    const io = req.app.get("io");
    io.to(`queue_${queueId}`).emit("tokenCalled", {
      token: nextToken,
      queueId,
    });

    res.status(200).json({
      success: true,
      message: "Token called for service",
      data: { token: nextToken },
    });
  }
);

export const completeToken = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const tokenId = req.params.id;
    const { notes } = req.body;

    const token = await Token.findById(tokenId).populate("queueId");
    if (!token) {
      res.status(404).json({
        success: false,
        message: "Token not found",
      });
      return;
    }

    const queue = await Queue.findOne({
      _id: token.queueId,
      managerId: req.user!._id,
    });

    if (!queue) {
      res.status(404).json({
        success: false,
        message: "Queue not found",
      });
      return;
    }

    if (token.status !== "in_service") {
      res.status(400).json({
        success: false,
        message: "Token is not currently in service",
      });
      return;
    }

    token.status = "served";
    if (notes) token.notes = notes;
    await token.save();

    queue.totalServed += 1;
    queue.currentLength = Math.max(0, queue.currentLength - 1);
    await queue.save();

    const io = req.app.get("io");
    io.to(`queue_${token.queueId}`).emit("tokenCompleted", {
      token,
      queueId: token.queueId,
      currentLength: queue.currentLength,
    });

    res.status(200).json({
      success: true,
      message: "Token service completed",
      data: { token },
    });
  }
);

export const cancelToken = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const tokenId = req.params.id;

    const token = await Token.findById(tokenId).populate("queueId");
    if (!token) {
      res.status(404).json({
        success: false,
        message: "Token not found",
      });
      return;
    }

    const queue = await Queue.findOne({
      _id: token.queueId,
      managerId: req.user!._id,
    });

    if (!queue) {
      res.status(404).json({
        success: false,
        message: "Queue not found",
      });
      return;
    }

    if (!["waiting", "in_service"].includes(token.status)) {
      res.status(400).json({
        success: false,
        message: "Can only cancel waiting or in-service tokens",
      });
      return;
    }

    const wasWaiting = token.status === "waiting";
    const tokenPosition = token.position;

    token.status = "cancelled";
    await token.save();

    if (wasWaiting) {
      await Token.updateMany(
        {
          queueId: token.queueId,
          position: { $gt: tokenPosition },
          status: "waiting",
        },
        { $inc: { position: -1 } }
      );
    }

    queue.totalCancelled += 1;
    queue.currentLength = Math.max(0, queue.currentLength - 1);
    await queue.save();

    const updatedTokens = await Token.find({
      queueId: token.queueId,
      status: { $in: ["waiting", "in_service"] },
    }).sort({ position: 1 });

    const io = req.app.get("io");
    io.to(`queue_${token.queueId}`).emit("tokenCancelled", {
      token,
      tokens: updatedTokens,
      queueId: token.queueId,
      currentLength: queue.currentLength,
    });

    res.status(200).json({
      success: true,
      message: "Token cancelled successfully",
      data: { token, tokens: updatedTokens },
    });
  }
);

export const updateTokenStatus = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const tokenId = req.params.id;
    const { status, notes } = req.body;

    const token = await Token.findById(tokenId).populate("queueId");
    if (!token) {
      res.status(404).json({
        success: false,
        message: "Token not found",
      });
      return;
    }

    const queue = await Queue.findOne({
      _id: token.queueId,
      managerId: req.user!._id,
    });

    if (!queue) {
      res.status(404).json({
        success: false,
        message: "Queue not found",
      });
      return;
    }

    const oldStatus = token.status;

    if (status) {
      token.status = status;

      if (status === "in_service" && oldStatus === "waiting") {
        token.timestamps.called = new Date();
      } else if (status === "served" && oldStatus === "in_service") {
        token.timestamps.served = new Date();
        token.timestamps.completed = new Date();
        queue.totalServed += 1;
        queue.currentLength = Math.max(0, queue.currentLength - 1);
      } else if (status === "cancelled") {
        token.timestamps.cancelled = new Date();
        queue.totalCancelled += 1;
        queue.currentLength = Math.max(0, queue.currentLength - 1);
      }
    }

    if (notes !== undefined) {
      token.notes = notes;
    }

    await token.save();
    await queue.save();

    const io = req.app.get("io");
    io.to(`queue_${token.queueId}`).emit("tokenUpdated", {
      token,
      queueId: token.queueId,
      currentLength: queue.currentLength,
    });

    res.status(200).json({
      success: true,
      message: "Token updated successfully",
      data: { token },
    });
  }
);

export const assignToken = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const tokenId = req.params.id;
    const { assignedTo } = req.body;

    const token = await Token.findById(tokenId).populate("queueId");
    if (!token) {
      res.status(404).json({
        success: false,
        message: "Token not found",
      });
      return;
    }

    const queue = await Queue.findOne({
      _id: token.queueId,
      managerId: req.user!._id,
    });

    if (!queue) {
      res.status(404).json({
        success: false,
        message: "Queue not found",
      });
      return;
    }

    token.assignedTo = assignedTo;
    const assignmentNote = `[${new Date().toLocaleTimeString()}] Assigned to: ${assignedTo}`;
    token.notes = token.notes
      ? `${token.notes}\n${assignmentNote}`
      : assignmentNote;

    await token.save();

    const io = req.app.get("io");
    io.to(`queue_${token.queueId}`).emit("tokenAssigned", {
      token,
      assignedTo,
      queueId: token.queueId,
    });

    res.status(200).json({
      success: true,
      message: "Token assigned successfully",
      data: { token, assignedTo },
    });
  }
);

export const reorderToken = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const tokenId = req.params.id;
    const { newPosition } = req.body;

    const token = await Token.findById(tokenId).populate("queueId");
    if (!token) {
      res.status(404).json({
        success: false,
        message: "Token not found",
      });
      return;
    }

    const queue = await Queue.findOne({
      _id: token.queueId,
      managerId: req.user!._id,
    });

    if (!queue) {
      res.status(404).json({
        success: false,
        message: "Queue not found",
      });
      return;
    }

    if (token.status !== "waiting") {
      res.status(400).json({
        success: false,
        message: "Can only reorder waiting tokens",
      });
      return;
    }

    const oldPosition = token.position;

    if (newPosition > oldPosition) {
      await Token.updateMany(
        {
          queueId: token.queueId,
          position: { $gt: oldPosition, $lte: newPosition },
          status: "waiting",
          _id: { $ne: tokenId },
        },
        { $inc: { position: -1 } }
      );
    } else {
      await Token.updateMany(
        {
          queueId: token.queueId,
          position: { $gte: newPosition, $lt: oldPosition },
          status: "waiting",
          _id: { $ne: tokenId },
        },
        { $inc: { position: 1 } }
      );
    }

    token.position = newPosition;
    await token.save();

    const updatedTokens = await Token.find({
      queueId: token.queueId,
      status: { $in: ["waiting", "in_service"] },
    }).sort({ position: 1 });

    const io = req.app.get("io");
    io.to(`queue_${token.queueId}`).emit("tokenReordered", {
      token,
      tokens: updatedTokens,
      queueId: token.queueId,
    });

    res.status(200).json({
      success: true,
      message: "Token reordered successfully",
      data: { token, tokens: updatedTokens },
    });
  }
);

export const sendMessageToCustomer = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const tokenId = req.params.id;
    const { message, customerEmail } = req.body;

    if (!message || !message.trim()) {
      res.status(400).json({
        success: false,
        message: "Message content is required",
      });
      return;
    }

    const token = await Token.findById(tokenId).populate("queueId");
    if (!token) {
      res.status(404).json({
        success: false,
        message: "Token not found",
      });
      return;
    }

    const queue = await Queue.findOne({
      _id: token.queueId,
      managerId: req.user!._id,
    });

    if (!queue) {
      res.status(404).json({
        success: false,
        message: "Queue not found",
      });
      return;
    }

    const customerEmailToUse = customerEmail || token.contactInfo?.email;
    if (!customerEmailToUse) {
      res.status(400).json({
        success: false,
        message: "Customer email not available",
      });
      return;
    }

    try {
      const emailSent = await emailService.sendQueueMessage(
        customerEmailToUse,
        token.customerName || "Customer",
        req.user!.name || "Queue Manager",
        message,
        queue.name
      );

      if (!emailSent) {
        console.warn(
          `Failed to send email to ${customerEmailToUse}, but continuing with note update`
        );
      }

      const timestampedMessage = `[${new Date().toLocaleTimeString()}] Manager: ${message}`;
      token.notes = token.notes
        ? `${token.notes}\n${timestampedMessage}`
        : timestampedMessage;

      await token.save();

      const io = req.app.get("io");
      io.to(`queue_${token.queueId}`).emit("messageToCustomer", {
        token,
        message,
        customerEmail: customerEmailToUse,
        queueId: token.queueId,
      });

      res.status(200).json({
        success: true,
        message: emailSent
          ? "Message sent to customer's email successfully"
          : "Message saved to notes (email sending failed)",
        data: {
          token,
          sentTo: customerEmailToUse,
          messageContent: message,
          emailSent,
        },
      });
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({
        success: false,
        message: "Failed to send message to customer",
      });
    }
  }
);
