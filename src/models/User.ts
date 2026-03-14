/**
 * @module User
 * @description Core user model for both students and admins.
 * Stores credentials, role, preferences (theme, accent color, dashboard layout),
 * notification settings, and admin permission flags.
 * Email uses a sparse unique index (allows multiple null, enforces uniqueness otherwise).
 */
import mongoose, { Schema, Document, Model } from "mongoose";

/** Per-user notification opt-in preferences */
export interface INotificationPreferences {
  new_note: boolean;
  new_assignment: boolean;
  new_practical: boolean;
  deadline_alert: boolean;
  admin_message: boolean;
  request_approved: boolean;
  request_denied: boolean;
}

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  college_id: string;
  email: string | null;
  password_hash: string;
  role: "admin" | "student";
  isSuperAdmin: boolean;
  adminAlias: string | null;
  stream: mongoose.Types.ObjectId | null;
  section: mongoose.Types.ObjectId | null;
  semester: number | null;
  must_change_password: boolean;
  theme: string;
  accentColor: string;
  mobileNavPosition: "top" | "bottom" | "left";
  dashboardView: "grid" | "list" | "detail";
  notificationPreferences: INotificationPreferences;
  savedFilters: Record<string, unknown>;
  status: "active" | "banned" | "suspended";
  isAdminSubject: boolean;
  isAdminStream: boolean;
  isAdminSection: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
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
      unique: true,
      trim: true,
      maxlength: 50,
    },
    email: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
      maxlength: 255,
    },
    password_hash: {
      type: String,
      required: [true, "Password is required"],
    },
    role: {
      type: String,
      enum: ["admin", "student"],
      default: "student",
    },
    isSuperAdmin: {
      type: Boolean,
      default: false,
    },
    adminAlias: {
      type: String,
      default: null,
      trim: true,
      maxlength: 100,
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
    must_change_password: {
      type: Boolean,
      default: false,
    },
    theme: {
      type: String,
      enum: ["light", "dark", "system"],
      default: "dark",
    },
    accentColor: {
      type: String,
      enum: ["default", "rose", "ocean", "emerald", "violet", "sunset", "amoled", "pastel", "contrast"],
      default: "amoled",
    },
    mobileNavPosition: {
      type: String,
      enum: ["top", "bottom", "left"],
      default: "bottom",
    },
    dashboardView: {
      type: String,
      enum: ["grid", "list", "detail"],
      default: "list",
    },
    notificationPreferences: {
      new_note: { type: Boolean, default: true },
      new_assignment: { type: Boolean, default: true },
      new_practical: { type: Boolean, default: true },
      deadline_alert: { type: Boolean, default: true },
      admin_message: { type: Boolean, default: true },
      request_approved: { type: Boolean, default: true },
      request_denied: { type: Boolean, default: true },
    },
    savedFilters: {
      type: Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ["active", "banned", "suspended"],
      default: "active",
    },
    isAdminSubject: {
      type: Boolean,
      default: false,
    },
    isAdminStream: {
      type: Boolean,
      default: false,
    },
    isAdminSection: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Sparse unique index — allows multiple null emails but enforces uniqueness for non-null
UserSchema.index({ email: 1 }, { unique: true, sparse: true });

// Prevent model recompilation in development (hot reload)
const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
