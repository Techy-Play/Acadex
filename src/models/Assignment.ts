/**
 * @module Assignment
 * @description Represents an assignment uploaded by an admin for a specific subject.
 * Students can view assignments and mark them as completed via the Completion model.
 */
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAssignment extends Document {
  _id: mongoose.Types.ObjectId;
  subject: mongoose.Types.ObjectId;
  section: mongoose.Types.ObjectId | null;
  sections?: mongoose.Types.ObjectId[];
  uploadedBy: mongoose.Types.ObjectId | null;
  title: string;
  description: string;
  file_url: string;
  deadline: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const AssignmentSchema = new Schema<IAssignment>(
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
    sections: [
      {
        type: Schema.Types.ObjectId,
        ref: "Section",
      },
    ],
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
    deadline: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Common list/query patterns for dashboard and admin tables.
AssignmentSchema.index({ section: 1, subject: 1, createdAt: -1 });
AssignmentSchema.index({ sections: 1, subject: 1, createdAt: -1 });
AssignmentSchema.index({ uploadedBy: 1, createdAt: -1 });
AssignmentSchema.index({ deadline: 1 });

const Assignment: Model<IAssignment> =
  mongoose.models.Assignment ||
  mongoose.model<IAssignment>("Assignment", AssignmentSchema);

export default Assignment;
