import mongoose, { Schema, Document, Model } from "mongoose";

export type NotificationType =
  | "new_note"
  | "new_assignment"
  | "new_practical"
  | "deadline_alert"
  | "new_access_request"
  | "contact_message"
  | "profile_update"
  | "admin_message";

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  targetRole: "student" | "admin" | null;
  targetUsers: mongoose.Types.ObjectId[];
  readBy: mongoose.Types.ObjectId[];
  dismissedBy: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    type: {
      type: String,
      enum: [
        "new_note",
        "new_assignment",
        "new_practical",
        "deadline_alert",
        "new_access_request",
        "contact_message",
        "profile_update",
        "admin_message",
      ],
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
      enum: ["student", "admin", null],
      default: null,
    },
    targetUsers: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    readBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    dismissedBy: [
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
NotificationSchema.index({ targetUsers: 1, createdAt: -1 });

// Prevent model recompilation in development (hot reload)
const Notification: Model<INotification> =
  mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema);

export default Notification;
