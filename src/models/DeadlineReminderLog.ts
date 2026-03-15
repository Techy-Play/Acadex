import mongoose, { Document, Model, Schema } from "mongoose";

export interface IDeadlineReminderLog extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  resourceType: "assignment" | "practical";
  resourceId: mongoose.Types.ObjectId;
  windowKey: string;
  sentAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DeadlineReminderLogSchema = new Schema<IDeadlineReminderLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    resourceType: {
      type: String,
      enum: ["assignment", "practical"],
      required: true,
    },
    resourceId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    windowKey: {
      type: String,
      required: true,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

DeadlineReminderLogSchema.index(
  { userId: 1, resourceType: 1, resourceId: 1, windowKey: 1 },
  { unique: true }
);

const DeadlineReminderLog: Model<IDeadlineReminderLog> =
  mongoose.models.DeadlineReminderLog ||
  mongoose.model<IDeadlineReminderLog>("DeadlineReminderLog", DeadlineReminderLogSchema);

export default DeadlineReminderLog;
