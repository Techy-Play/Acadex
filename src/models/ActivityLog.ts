/**
 * @module ActivityLog
 * @description Tracks admin and system actions for audit purposes.
 * Logs events like user creation, content uploads, request approvals, etc.
 */
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IActivityLog extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  action: string;
  details: string;
  section: mongoose.Types.ObjectId | null;
  createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    action: {
      type: String,
      required: [true, "Action is required"],
      maxlength: 255,
    },
    details: {
      type: String,
      default: "",
    },
    section: {
      type: Schema.Types.ObjectId,
      ref: "Section",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const ActivityLog: Model<IActivityLog> =
  mongoose.models.ActivityLog ||
  mongoose.model<IActivityLog>("ActivityLog", ActivityLogSchema);

export default ActivityLog;
