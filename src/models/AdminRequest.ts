/**
 * @module AdminRequest
 * @description Handles elevated requests that require super-admin approval,
 * such as creating new admin accounts or changing a user's section/stream.
 */
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAdminRequest extends Document {
  _id: mongoose.Types.ObjectId;
  type: "create_admin" | "change_section_stream";
  requestedBy: mongoose.Types.ObjectId;
  targetUser: mongoose.Types.ObjectId | null;
  data: Record<string, unknown>;
  status: "pending" | "approved" | "denied";
  admin_note: string;
  createdAt: Date;
  updatedAt: Date;
}

const AdminRequestSchema = new Schema<IAdminRequest>(
  {
    type: {
      type: String,
      enum: ["create_admin", "change_section_stream"],
      required: true,
    },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    targetUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    data: {
      type: Schema.Types.Mixed,
      required: true,
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

AdminRequestSchema.index({ status: 1, createdAt: -1 });
AdminRequestSchema.index({ requestedBy: 1 });

const AdminRequest: Model<IAdminRequest> =
  mongoose.models.AdminRequest ||
  mongoose.model<IAdminRequest>("AdminRequest", AdminRequestSchema);

export default AdminRequest;
