import mongoose, { Schema, Document, Model } from "mongoose";

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  type: "new_note" | "new_assignment" | "new_practical" | "deadline_alert" | "new_access_request";
  title: string;
  message: string;
  link: string | null;
  targetRole: "student" | "admin";
  readBy: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    type: {
      type: String,
      enum: ["new_note", "new_assignment", "new_practical", "deadline_alert", "new_access_request"],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    link: {
      type: String,
      default: null,
    },
    targetRole: {
      type: String,
      enum: ["student", "admin"],
      required: true,
    },
    readBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
NotificationSchema.index({ targetRole: 1, createdAt: -1 });

// Prevent model recompilation in development (hot reload)
const Notification: Model<INotification> =
  mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema);

export default Notification;
