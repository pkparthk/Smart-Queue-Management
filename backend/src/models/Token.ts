import mongoose, { Document, Schema } from "mongoose";

export interface IToken extends Document {
  tokenNumber: string;
  customerName: string;
  queueId: mongoose.Types.ObjectId;
  status: "waiting" | "in_service" | "served" | "cancelled" | "no_show";
  position: number;
  priority: "normal" | "high" | "urgent";
  contactInfo?: {
    phone?: string;
    email?: string;
  };
  timestamps: {
    created: Date;
    called?: Date;
    served?: Date;
    completed?: Date;
    cancelled?: Date;
  };
  serviceTime?: number; // in minutes
  waitTime?: number; // in minutes
  notes?: string;
  assignedTo?: string; // Staff member assigned to handle this token
  createdAt: Date;
  updatedAt: Date;
}

const tokenSchema = new Schema<IToken>(
  {
    tokenNumber: {
      type: String,
      required: [true, "Token number is required"],
      trim: true,
    },
    customerName: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true,
      maxlength: [100, "Customer name cannot be more than 100 characters"],
    },
    queueId: {
      type: Schema.Types.ObjectId,
      ref: "Queue",
      required: [true, "Queue ID is required"],
    },
    status: {
      type: String,
      enum: ["waiting", "in_service", "served", "cancelled", "no_show"],
      default: "waiting",
    },
    position: {
      type: Number,
      required: [true, "Position is required"],
      min: [1, "Position must be at least 1"],
    },
    priority: {
      type: String,
      enum: ["normal", "high", "urgent"],
      default: "normal",
    },
    contactInfo: {
      phone: {
        type: String,
        trim: true,
        match: [/^[\+]?[1-9][\d]{0,15}$/, "Please enter a valid phone number"],
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
        match: [
          /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
          "Please enter a valid email",
        ],
      },
    },
    timestamps: {
      created: {
        type: Date,
        default: Date.now,
      },
      called: Date,
      served: Date,
      completed: Date,
      cancelled: Date,
    },
    serviceTime: {
      type: Number,
      min: [0, "Service time cannot be negative"],
    },
    waitTime: {
      type: Number,
      min: [0, "Wait time cannot be negative"],
    },
    notes: {
      type: String,
      maxlength: [500, "Notes cannot be more than 500 characters"],
    },
    assignedTo: {
      type: String,
      trim: true,
      maxlength: [100, "Assigned to name cannot be more than 100 characters"],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc: any, ret: any) {
        // Keep _id but add id field for compatibility
        ret.id = ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes for better performance
tokenSchema.index({ queueId: 1, status: 1 });
tokenSchema.index({ queueId: 1, position: 1 });
tokenSchema.index({ status: 1 });
tokenSchema.index({ "timestamps.created": -1 });
tokenSchema.index({ queueId: 1, status: 1, position: 1 });

// Compound unique index to prevent duplicate positions in the same queue for active tokens
tokenSchema.index(
  { queueId: 1, position: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["waiting", "in_service"] } },
  }
);

// Virtual for estimated wait time based on position and average service time
tokenSchema.virtual("estimatedWaitTime").get(function () {
  if (this.status !== "waiting") return 0;

  // This would typically be calculated based on queue analytics
  // For now, we'll use a simple estimation: position * average service time
  const avgServiceTime = 5; // 5 minutes average
  return (this.position - 1) * avgServiceTime;
});

// Pre-save middleware to calculate wait time when status changes
tokenSchema.pre("save", function (next: any) {
  if (this.isModified("status")) {
    const now = new Date();

    switch (this.status) {
      case "in_service":
        this.timestamps.called = now;
        if (this.timestamps.created) {
          this.waitTime = Math.round(
            (now.getTime() - this.timestamps.created.getTime()) / (1000 * 60)
          );
        }
        break;
      case "served":
        this.timestamps.completed = now;
        if (this.timestamps.called) {
          this.serviceTime = Math.round(
            (now.getTime() - this.timestamps.called.getTime()) / (1000 * 60)
          );
        }
        break;
      case "cancelled":
      case "no_show":
        this.timestamps.cancelled = now;
        break;
    }
  }

  next();
});

const Token = mongoose.model<IToken>("Token", tokenSchema);

export default Token;
