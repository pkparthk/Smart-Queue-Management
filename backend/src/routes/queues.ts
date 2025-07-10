import express from "express";
import { body } from "express-validator";
import {
  getQueues,
  getQueue,
  createQueue,
  updateQueue,
  deleteQueue,
  getQueueStats,
} from "../controllers/queueController";
import { authenticateToken, authorize } from "../middleware/auth";
import Queue from "../models/Queue";

const router = express.Router();

// Public routes (no authentication required)
// Get all active queues for public access
router.get("/public", async (req: express.Request, res: express.Response) => {
  try {
    const queues = await Queue.find({
      isActive: true,
    }).select("name description isActive maxCapacity currentLength createdAt");

    // Transform the data to match frontend expectations
    const transformedQueues = queues.map((queue) => ({
      _id: queue._id,
      name: queue.name,
      description: queue.description,
      isActive: queue.isActive,
      maxTokens: queue.maxCapacity || 50, // Default to 50 if not set
      currentTokens: queue.currentLength,
      priority: "medium", // Default priority
      estimatedWaitTime: queue.currentLength * 5, // 5 minutes per person
      createdAt: queue.createdAt,
    }));

    res.json({
      success: true,
      data: transformedQueues,
    });
  } catch (error) {
    console.error("Error fetching public queues:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch queues",
    });
  }
});

// Apply authentication to all other routes
router.use(authenticateToken);

// Get all queues for the authenticated manager
router.get("/", getQueues);

// Get queue statistics
router.get("/:id/stats", getQueueStats);

// Get single queue
router.get("/:id", getQueue);

// Create new queue
router.post(
  "/",
  [
    body("name")
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage("Queue name must be between 2 and 100 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Description cannot exceed 500 characters"),
    body("maxCapacity")
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage("Max capacity must be between 1 and 1000"),
  ],
  createQueue
);

// Update queue
router.put(
  "/:id",
  [
    body("name")
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage("Queue name must be between 2 and 100 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Description cannot exceed 500 characters"),
    body("maxCapacity")
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage("Max capacity must be between 1 and 1000"),
    body("isActive")
      .optional()
      .isBoolean()
      .withMessage("isActive must be a boolean value"),
  ],
  updateQueue
);

// Delete queue
router.delete("/:id", deleteQueue);

export default router;
