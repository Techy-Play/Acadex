import mongoose, { Schema, Document, Model } from "mongoose";

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
  must_change_password: boolean;
  theme: string;
  accentColor: string;
  mobileNavPosition: "top" | "bottom" | "left";
  dashboardView: "grid" | "list" | "detail";
  status: "active" | "banned" | "suspended";
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
    status: {
      type: String,
      enum: ["active", "banned", "suspended"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

// Prevent model recompilation in development (hot reload)
const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
