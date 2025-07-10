import { Response } from "express";
import { validationResult } from "express-validator";
import Token from "../models/Token";
import Queue from "../models/Queue";
import { asyncHandler } from "../middleware/errorHandler";
import { AuthRequest } from "../middleware/auth";
import emailService from "../utils/emailService";

// @desc    Get tokens for a queue
// @route   GET /api/tokens/queue/:queueId
// @access  Private
export const getTokensByQueue = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { queueId } = req.params;
    const status = req.query.status as string;

    // Verify queue belongs to user
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

// @desc    Create new token
// @route   POST /api/tokens
// @access  Private
export const createToken = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    // Check validation errors
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

    // Verify queue belongs to user and is active
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

    // Check if queue is at capacity
    if (queue.maxCapacity && queue.currentLength >= queue.maxCapacity) {
      res.status(400).json({
        success: false,
        message: "Queue is at maximum capacity",
      });
      return;
    }

    // Get next position
    const lastToken = await Token.findOne({
      queueId,
      status: { $in: ["waiting", "in_service"] },
    }).sort({ position: -1 });

    const nextPosition = lastToken ? lastToken.position + 1 : 1;

    // Generate token number
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

    // Update queue current length
    queue.currentLength += 1;
    await queue.save();

    await token.populate("queueId", "name");

    // Emit socket event for real-time updates
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

// @desc    Update token position (reorder)
// @route   PUT /api/tokens/:id/position
// @access  Private
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

    // Verify queue belongs to user
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

    // Only allow reordering of waiting tokens
    if (token.status !== "waiting") {
      res.status(400).json({
        success: false,
        message: "Can only reorder waiting tokens",
      });
      return;
    }

    const oldPosition = token.position;

    // Update positions of other tokens
    if (newPosition > oldPosition) {
      // Moving down: decrease position of tokens between old and new position
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
      // Moving up: increase position of tokens between new and old position
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

    // Update the token's position
    token.position = newPosition;
    await token.save();

    // Get updated token list
    const updatedTokens = await Token.find({
      queueId: token.queueId,
      status: { $in: ["waiting", "in_service"] },
    }).sort({ position: 1 });

    // Emit socket event for real-time updates
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

// @desc    Call next token (assign for service)
// @route   PUT /api/tokens/queue/:queueId/call-next
// @access  Private
export const callNextToken = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { queueId } = req.params;

    // Verify queue belongs to user
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

    // Find the next waiting token
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

    // Update token status to in_service
    nextToken.status = "in_service";
    await nextToken.save();

    await nextToken.populate("queueId", "name");

    // Emit socket event for real-time updates
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

// @desc    Complete token service
// @route   PUT /api/tokens/:id/complete
// @access  Private
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

    // Verify queue belongs to user
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

    // Only allow completing tokens that are in service
    if (token.status !== "in_service") {
      res.status(400).json({
        success: false,
        message: "Token is not currently in service",
      });
      return;
    }

    // Update token status
    token.status = "served";
    if (notes) token.notes = notes;
    await token.save();

    // Update queue statistics
    queue.totalServed += 1;
    queue.currentLength = Math.max(0, queue.currentLength - 1);
    await queue.save();

    // Emit socket event for real-time updates
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

// @desc    Cancel token
// @route   DELETE /api/tokens/:id
// @access  Private
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

    // Verify queue belongs to user
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

    // Can only cancel waiting or in_service tokens
    if (!["waiting", "in_service"].includes(token.status)) {
      res.status(400).json({
        success: false,
        message: "Can only cancel waiting or in-service tokens",
      });
      return;
    }

    const wasWaiting = token.status === "waiting";
    const tokenPosition = token.position;

    // Update token status
    token.status = "cancelled";
    await token.save();

    // If token was waiting, adjust positions of subsequent tokens
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

    // Update queue statistics
    queue.totalCancelled += 1;
    queue.currentLength = Math.max(0, queue.currentLength - 1);
    await queue.save();

    // Get updated token list
    const updatedTokens = await Token.find({
      queueId: token.queueId,
      status: { $in: ["waiting", "in_service"] },
    }).sort({ position: 1 });

    // Emit socket event for real-time updates
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

// @desc    Update token status
// @route   PATCH /api/tokens/:id
// @access  Private
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

    // Verify queue belongs to user
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

    // Update status if provided
    if (status) {
      token.status = status;

      // Handle status-specific logic
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

    // Update notes if provided
    if (notes !== undefined) {
      token.notes = notes;
    }

    await token.save();
    await queue.save();

    // Emit socket event for real-time updates
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

// @desc    Assign token to staff member
// @route   PATCH /api/tokens/:id/assign
// @access  Private
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

    // Verify queue belongs to user
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

    // Set assignedTo field and add assignment note
    token.assignedTo = assignedTo;
    const assignmentNote = `[${new Date().toLocaleTimeString()}] Assigned to: ${assignedTo}`;
    token.notes = token.notes
      ? `${token.notes}\n${assignmentNote}`
      : assignmentNote;

    await token.save();

    // Emit socket event for real-time updates
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

// @desc    Reorder token position
// @route   PATCH /api/tokens/:id/reorder
// @access  Private
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

    // Verify queue belongs to user
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

    // Only allow reordering of waiting tokens
    if (token.status !== "waiting") {
      res.status(400).json({
        success: false,
        message: "Can only reorder waiting tokens",
      });
      return;
    }

    const oldPosition = token.position;

    // Update positions of other tokens
    if (newPosition > oldPosition) {
      // Moving down: decrease position of tokens between old and new position
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
      // Moving up: increase position of tokens between new and old position
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

    // Update token position
    token.position = newPosition;
    await token.save();

    // Get updated token list
    const updatedTokens = await Token.find({
      queueId: token.queueId,
      status: { $in: ["waiting", "in_service"] },
    }).sort({ position: 1 });

    // Emit socket event for real-time updates
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

// @desc    Send message to customer via email
// @route   POST /api/tokens/:id/message
// @access  Private
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

    // Verify queue belongs to user
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
      // Send email to customer
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

      // Add message to token notes with timestamp
      const timestampedMessage = `[${new Date().toLocaleTimeString()}] Manager: ${message}`;
      token.notes = token.notes
        ? `${token.notes}\n${timestampedMessage}`
        : timestampedMessage;

      await token.save();

      // Emit socket event for real-time updates
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
