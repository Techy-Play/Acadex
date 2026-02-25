import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  college_id: string;
  email: string | null;
  password_hash: string;
  role: "admin" | "student";
  stream: mongoose.Types.ObjectId | null;
  must_change_password: boolean;
  theme: string;
  accentColor: string;
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
    stream: {
      type: Schema.Types.ObjectId,
      ref: "Stream",
      default: null,
    },
    must_change_password: {
      type: Boolean,
      default: false,
    },
    theme: {
      type: String,
      enum: ["light", "dark", "system"],
      default: "system",
    },
    accentColor: {
      type: String,
      enum: ["default", "pink", "magenta", "cyan", "navy", "emerald", "sunset", "purple"],
      default: "default",
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
