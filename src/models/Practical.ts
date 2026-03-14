/**
 * @module Practical
 * @description Represents a practical/lab exercise uploaded by an admin for a subject.
 * Students can track completion via the PracticalCompletion model.
 */
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPractical extends Document {
  _id: mongoose.Types.ObjectId;
  subject: mongoose.Types.ObjectId;
  section: mongoose.Types.ObjectId | null;
  uploadedBy: mongoose.Types.ObjectId | null;
  title: string;
  description: string;
  file_url: string;
  createdAt: Date;
  updatedAt: Date;
}

const PracticalSchema = new Schema<IPractical>(
  {
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
      default: null,
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: 255,
    },
    description: {
      type: String,
      default: "",
    },
    file_url: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Common list/query patterns for dashboard and admin tables.
PracticalSchema.index({ section: 1, subject: 1, createdAt: -1 });
PracticalSchema.index({ uploadedBy: 1, createdAt: -1 });

const Practical: Model<IPractical> =
  mongoose.models.Practical ||
  mongoose.model<IPractical>("Practical", PracticalSchema);

export default Practical;
