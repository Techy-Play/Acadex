import mongoose, { Schema, Document, Model } from "mongoose";

export interface IOTP extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  code: string;
  purpose: "password_change" | "email_change";
  newEmail?: string;
  expiresAt: Date;
  verified: boolean;
  createdAt: Date;
}

const OTPSchema = new Schema<IOTP>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    code: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      enum: ["password_change", "email_change"],
      required: true,
    },
    newEmail: {
      type: String,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL index — auto-delete when expired
    },
    verified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent model recompilation in development (hot reload)
const OTP: Model<IOTP> =
  mongoose.models.OTP || mongoose.model<IOTP>("OTP", OTPSchema);

export default OTP;
