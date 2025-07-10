import express from "express";
import { body, validationResult } from "express-validator";
import {
  getTokensByQueue,
  createToken,
  updateTokenPosition,
  updateTokenStatus,
  assignToken,
  reorderToken,
  callNextToken,
  completeToken,
  cancelToken,
  sendMessageToCustomer,
} from "../controllers/tokenController";
import { authenticateToken } from "../middleware/auth";
import Queue from "../models/Queue";
import Token from "../models/Token";
import emailService from "../utils/emailService";

const router = express.Router();

// Public routes (no authentication required)
// Create token for public users
router.post(
  "/public",
  [
    body("queueId").isMongoId().withMessage("Invalid queue ID"),
    body("customerName")
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage("Customer name must be between 2 and 100 characters"),
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Please provide a valid email address"),
    body("phone")
      .optional()
      .trim()
      .isLength({ min: 0 })
      .withMessage("Phone number must be valid"),
    body("priority")
      .optional()
      .isIn(["low", "medium", "high"])
      .withMessage("Priority must be low, medium, or high"),
  ],
  async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
        return;
      }

      const {
        queueId,
        customerName,
        email,
        phone,
        priority = "medium",
      } = req.body;

      console.log("📋 Public token creation request received:", {
        queueId,
        customerName,
        email,
        phone,
        priority,
        hasPhone: !!phone,
        phoneLength: phone?.length || 0,
      });

      // Check if queue exists and is active
      const queue = await Queue.findById(queueId);
      if (!queue) {
        res.status(404).json({
          success: false,
          message: "Queue not found",
        });
        return;
      }

      if (!queue.isActive) {
        res.status(400).json({
          success: false,
          message: "Queue is currently not accepting new tokens",
        });
        return;
      }

      // Check if queue is full
      if (queue.maxCapacity && queue.currentLength >= queue.maxCapacity) {
        res.status(400).json({
          success: false,
          message: "Queue is currently full",
        });
        return;
      }

      // Get the next position
      const lastToken = await Token.findOne({ queueId }).sort({ position: -1 });
      const position = lastToken ? lastToken.position + 1 : 1;

      // Generate token number
      const tokenNumber = `${queue.name.substring(0, 2).toUpperCase()}${String(
        position
      ).padStart(3, "0")}`;

      // Convert priority to match Token schema
      const tokenPriority =
        priority === "high"
          ? "high"
          : priority === "medium"
          ? "normal"
          : "normal";

      // Create the token
      const tokenData = {
        queueId,
        tokenNumber,
        customerName,
        contactInfo: {
          email,
          phone: phone || undefined, // Only include phone if provided
        },
        priority: tokenPriority,
        position,
        status: "waiting",
        timestamps: {
          created: new Date(),
        },
      };

      console.log("📋 Creating token with data:", {
        ...tokenData,
        contactInfo: {
          email: tokenData.contactInfo.email,
          phone: tokenData.contactInfo.phone,
          hasPhone: !!tokenData.contactInfo.phone,
        },
      });

      const token = new Token(tokenData);

      await token.save();

      // Update queue current length count
      await Queue.findByIdAndUpdate(queueId, {
        $inc: { currentLength: 1 },
      });

      // Calculate estimated wait time (simple calculation)
      const estimatedWaitTime = position * 5; // 5 minutes per position

      // Send welcome email to customer
      try {
        await emailService.sendWelcomeEmail(
          email,
          customerName,
          queue.name,
          position,
          `${estimatedWaitTime} minutes`,
          tokenNumber
        );
        console.log(
          `📧 Welcome email sent to ${email} for token ${tokenNumber}`
        );
      } catch (emailError) {
        console.error(`Failed to send welcome email to ${email}:`, emailError);
        // Don't fail the request if email fails
      }

      res.status(201).json({
        success: true,
        data: {
          tokenNumber,
          position,
          estimatedWaitTime,
        },
      });
    } catch (error) {
      console.error("Error creating public token:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create token",
      });
    }
  }
);

// Apply authentication to all other routes
router.use(authenticateToken);

// Get tokens for a specific queue
router.get("/queue/:queueId", getTokensByQueue);

// Call next token for service
router.put("/queue/:queueId/call-next", callNextToken);

// Create new token
router.post(
  "/",
  [
    body("queueId").isMongoId().withMessage("Invalid queue ID"),
    body("customerName")
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage("Customer name must be between 2 and 100 characters"),
    body("priority")
      .optional()
      .isIn(["normal", "high", "urgent"])
      .withMessage("Priority must be normal, high, or urgent"),
    body("contactInfo.phone")
      .optional()
      .isMobilePhone("any")
      .withMessage("Please provide a valid phone number"),
    body("contactInfo.email")
      .notEmpty()
      .isEmail()
      .normalizeEmail()
      .withMessage("Please provide a valid email address"),
    body("notes")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Notes cannot exceed 500 characters"),
  ],
  createToken
);

// Update token position (reorder)
router.put(
  "/:id/position",
  [
    body("newPosition")
      .isInt({ min: 1 })
      .withMessage("New position must be a positive integer"),
  ],
  updateTokenPosition
);

// Update token status
router.patch("/:id", updateTokenStatus);

// Send message to customer
router.post(
  "/:id/message",
  [
    body("message")
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage("Message must be between 1 and 500 characters"),
    body("customerEmail")
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage("Please provide a valid email address"),
  ],
  sendMessageToCustomer
);

// Assign token to staff member
router.patch("/:id/assign", assignToken);

// Reorder token
router.patch("/:id/reorder", reorderToken);

// Complete token service
router.put(
  "/:id/complete",
  [
    body("notes")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Notes cannot exceed 500 characters"),
  ],
  completeToken
);

// Cancel token
router.delete("/:id", cancelToken);

export default router;
