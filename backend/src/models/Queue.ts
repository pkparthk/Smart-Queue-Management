import mongoose, { Document, Schema } from "mongoose";

export interface IQueue extends Document {
  name: string;
  managerId: mongoose.Types.ObjectId;
  description?: string;
  isActive: boolean;
  maxCapacity?: number;
  currentLength: number;
  totalServed: number;
  totalCancelled: number;
  createdAt: Date;
  updatedAt: Date;
}

const queueSchema = new Schema<IQueue>(
  {
    name: {
      type: String,
      required: [true, "Queue name is required"],
      trim: true,
      maxlength: [100, "Queue name cannot be more than 100 characters"],
    },
    managerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Manager ID is required"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot be more than 500 characters"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    maxCapacity: {
      type: Number,
      min: [1, "Max capacity must be at least 1"],
      max: [1000, "Max capacity cannot exceed 1000"],
    },
    currentLength: {
      type: Number,
      default: 0,
      min: [0, "Current length cannot be negative"],
    },
    totalServed: {
      type: Number,
      default: 0,
      min: [0, "Total served cannot be negative"],
    },
    totalCancelled: {
      type: Number,
      default: 0,
      min: [0, "Total cancelled cannot be negative"],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc: any, ret: any) {
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes for better performance
queueSchema.index({ managerId: 1 });
queueSchema.index({ isActive: 1 });
queueSchema.index({ createdAt: -1 });
queueSchema.index({ managerId: 1, isActive: 1 });

// Virtual for queue efficiency (served / total tokens)
queueSchema.virtual("efficiency").get(function () {
  const total = this.totalServed + this.totalCancelled;
  return total > 0 ? (this.totalServed / total) * 100 : 0;
});

const Queue = mongoose.model<IQueue>("Queue", queueSchema);

export default Queue;
