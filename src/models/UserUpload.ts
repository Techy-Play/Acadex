import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUserUpload extends Document {
  _id: mongoose.Types.ObjectId;
  type: "note" | "assignment" | "practical";
  requestKind: "create" | "edit" | "delete";
  reqType: "Upload" | "edit" | "remove";
  resourceId: mongoose.Types.ObjectId | null;
  title: string;
  description: string;
  file_url: string;
  subject: mongoose.Types.ObjectId;
  section: mongoose.Types.ObjectId | null;
  uploadedBy: mongoose.Types.ObjectId;
  status: "pending" | "approved" | "denied";
  admin_note: string;
  reviewedBy: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserUploadSchema = new Schema<IUserUpload>(
  {
    type: {
      type: String,
      enum: ["note", "assignment", "practical"],
      required: true,
    },
    requestKind: {
      type: String,
      enum: ["create", "edit", "delete"],
      default: "create",
    },
    reqType: {
      type: String,
      enum: ["Upload", "edit", "remove"],
      default: "Upload",
    },
    resourceId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    title: {
      type: String,
      required: true,
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
      required: true,
      trim: true,
    },
    subject: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    section: {
      type: Schema.Types.ObjectId,
      ref: "Section",
      default: null,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
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
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

UserUploadSchema.index({ status: 1, createdAt: -1 });
UserUploadSchema.index({ uploadedBy: 1 });
UserUploadSchema.index({ section: 1 });
UserUploadSchema.index({ uploadedBy: 1, requestKind: 1, resourceId: 1, status: 1 });
UserUploadSchema.index({ uploadedBy: 1, reqType: 1, status: 1 });

const UserUpload: Model<IUserUpload> =
  mongoose.models.UserUpload ||
  mongoose.model<IUserUpload>("UserUpload", UserUploadSchema);

export default UserUpload;
