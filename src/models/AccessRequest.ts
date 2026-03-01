/**
 * @module AccessRequest
 * @description Stores access requests from prospective students wanting to join Acadex.
 * When a student submits the /apply form, a record is created here with status "pending".
 * Admins can approve (creating a User account) or deny the request.
 */
import mongoose, { Schema, Document } from "mongoose";

export interface IAccessRequest extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  college_id: string;
  email: string;
  stream: mongoose.Types.ObjectId | null;
  section: mongoose.Types.ObjectId | null;
  semester: number | null;
  reason: string;
  status: "pending" | "approved" | "denied";
  admin_note: string;
  createdAt: Date;
  updatedAt: Date;
}

const AccessRequestSchema = new Schema<IAccessRequest>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: 100,
    },
    college_id: {
      type: String,
      required: [true, "College ID is required"],
      trim: true,
      maxlength: 50,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      maxlength: 255,
    },
    stream: {
      type: Schema.Types.ObjectId,
      ref: "Stream",
      default: null,
    },
    section: {
      type: Schema.Types.ObjectId,
      ref: "Section",
      default: null,
    },
    semester: {
      type: Number,
      default: null,
      min: [1, "Semester must be between 1 and 8"],
      max: [8, "Semester must be between 1 and 8"],
    },
    reason: {
      type: String,
      default: "",
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "denied"],
      default: "pending",
    },
    admin_note: {
      type: String,
      default: "",
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

// Index for quick lookups
AccessRequestSchema.index({ status: 1, createdAt: -1 });
AccessRequestSchema.index({ college_id: 1 });

const AccessRequest: mongoose.Model<IAccessRequest> =
  mongoose.models.AccessRequest ||
  mongoose.model<IAccessRequest>("AccessRequest", AccessRequestSchema);

export default AccessRequest;
