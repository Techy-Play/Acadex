import mongoose, { Schema, Document, Model } from "mongoose";

/* ------------------------------------------------------------------ */
/*  UserRequest — a student's request to add / update / remove a      */
/*  resource (note, assignment, or practical). Admins review these.   */
/* ------------------------------------------------------------------ */

export interface IUserRequest extends Document {
  _id: mongoose.Types.ObjectId;

  /** What the student wants to do — single source of truth, NO default */
  action: "add" | "update" | "remove";

  /** Which kind of resource the request targets */
  resourceType: "note" | "assignment" | "practical";

  /** For update/remove: ObjectId of the live Note/Assignment/Practical */
  resourceId: mongoose.Types.ObjectId | null;

  title: string;
  description: string;
  file_url: string;

  subject: mongoose.Types.ObjectId;
  section: mongoose.Types.ObjectId | null;

  /** The student who submitted the request */
  uploadedBy: mongoose.Types.ObjectId;

  status: "pending" | "approved" | "denied";

  /** Message left by admin when reviewing */
  reviewNote: string;

  /** Admin who reviewed the request */
  reviewedBy: mongoose.Types.ObjectId | null;

  /** Only used for assignment requests */
  deadline: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

const UserRequestSchema = new Schema<IUserRequest>(
  {
    /* ---------- action — REQUIRED, no default ---------- */
    action: {
      type: String,
      enum: ["add", "update", "remove"],
      required: [true, "Action is required (add | update | remove)"],
    },

    /* ---------- resource metadata ---------- */
    resourceType: {
      type: String,
      enum: ["note", "assignment", "practical"],
      required: [true, "Resource type is required"],
    },
    resourceId: {
      type: Schema.Types.ObjectId,
      default: null,
    },

    /* ---------- content ---------- */
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      default: "",
      maxlength: 1000,
    },
    file_url: {
      type: String,
      required: [true, "File URL is required"],
      trim: true,
    },

    /* ---------- relations ---------- */
    subject: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      required: [true, "Subject is required"],
    },
    section: {
      type: Schema.Types.ObjectId,
      ref: "Section",
      default: null,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Uploader is required"],
    },

    /* ---------- review ---------- */
    status: {
      type: String,
      enum: ["pending", "approved", "denied"],
      default: "pending",
    },
    reviewNote: {
      type: String,
      default: "",
      maxlength: 500,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    /* ---------- extras ---------- */
    deadline: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/* ---------- indexes ---------- */
UserRequestSchema.index({ status: 1, createdAt: -1 });
UserRequestSchema.index({ uploadedBy: 1 });
UserRequestSchema.index({ section: 1 });
// Prevent duplicate pending requests for the same action + resource
UserRequestSchema.index(
  { uploadedBy: 1, action: 1, resourceId: 1, status: 1 },
  { name: "unique_pending_check" }
);

const UserRequest: Model<IUserRequest> =
  mongoose.models.UserRequest ||
  mongoose.model<IUserRequest>("UserRequest", UserRequestSchema);

export default UserRequest;
