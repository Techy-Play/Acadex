/**
 * @module AuditLog
 * @description Dedicated collection and schema for detailed activity and audit logs in Acadex.
 * Stores structured user and administrative events with actor details, target records,
 * before/after diffs, and security metadata.
 * Enforces a strict maximum of 500 logs globally across the entire application.
 */
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAuditActor {
  id: string;
  name: string;
  collegeId?: string;
  role: "superadmin" | "admin" | "student" | "system" | "anonymous";
  email?: string;
  ip?: string;
  userAgent?: string;
}

export interface IAuditTarget {
  id?: string;
  type:
    | "note"
    | "assignment"
    | "practical"
    | "library"
    | "student"
    | "user"
    | "subject"
    | "section"
    | "stream"
    | "access_request"
    | "admin_request"
    | "user_request"
    | "auth"
    | "system";
  name?: string;
  section?: mongoose.Types.ObjectId | string | null;
  subject?: mongoose.Types.ObjectId | string | null;
}

export interface IAuditDiff {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  changedFields?: string[];
}

export interface IAuditLog extends Document {
  _id: mongoose.Types.ObjectId;
  logId: string;
  user: mongoose.Types.ObjectId | null;
  actor: IAuditActor;
  action: string;
  actionCategory: "auth" | "resource" | "admin" | "system" | "security";
  description: string;
  target: IAuditTarget;
  route?: string;
  status: "success" | "failure";
  statusCode?: number;
  diff?: IAuditDiff;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    logId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    actor: {
      id: { type: String, required: true, index: true },
      name: { type: String, required: true },
      collegeId: { type: String, default: "" },
      role: {
        type: String,
        enum: ["superadmin", "admin", "student", "system", "anonymous"],
        default: "student",
        index: true,
      },
      email: { type: String, default: "" },
      ip: { type: String, default: "" },
      userAgent: { type: String, default: "" },
    },
    action: {
      type: String,
      required: [true, "Action code is required"],
      maxlength: 100,
      index: true,
    },
    actionCategory: {
      type: String,
      enum: ["auth", "resource", "admin", "system", "security"],
      default: "admin",
      index: true,
    },
    description: {
      type: String,
      required: true,
      maxlength: 500,
    },
    target: {
      id: { type: String, default: "", index: true },
      type: {
        type: String,
        enum: [
          "note",
          "assignment",
          "practical",
          "library",
          "student",
          "user",
          "subject",
          "section",
          "stream",
          "access_request",
          "admin_request",
          "user_request",
          "auth",
          "system",
        ],
        default: "system",
        index: true,
      },
      name: { type: String, default: "" },
      section: {
        type: Schema.Types.ObjectId,
        ref: "Section",
        default: null,
        index: true,
      },
      subject: {
        type: Schema.Types.ObjectId,
        ref: "Subject",
        default: null,
      },
    },
    route: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["success", "failure"],
      default: "success",
      index: true,
    },
    statusCode: {
      type: Number,
      default: 200,
    },
    diff: {
      before: { type: Schema.Types.Mixed, default: undefined },
      after: { type: Schema.Types.Mixed, default: undefined },
      changedFields: { type: [String], default: undefined },
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    collection: "auditlogs",
  }
);

// Performance compound indexes for filtering, sorting, pagination, and retention enforcement
AuditLogSchema.index({ createdAt: -1, _id: -1 });
AuditLogSchema.index({ "actor.id": 1, createdAt: -1 });
AuditLogSchema.index({ actionCategory: 1, createdAt: -1 });
AuditLogSchema.index({ "target.type": 1, createdAt: -1 });
AuditLogSchema.index({ status: 1, createdAt: -1 });
AuditLogSchema.index({ "target.section": 1, createdAt: -1 });

// Full text index for fast server-side search across actor, target, action and description
AuditLogSchema.index(
  {
    description: "text",
    "actor.name": "text",
    "actor.collegeId": "text",
    "target.name": "text",
    action: "text",
  },
  {
    weights: {
      description: 10,
      "target.name": 8,
      "actor.name": 6,
      action: 4,
      "actor.collegeId": 3,
    },
    name: "AuditLogTextIndex",
  }
);

const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog ||
  mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);

export default AuditLog;
