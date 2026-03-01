/**
 * @module Subject
 * @description Represents an academic subject (e.g., "Data Structures").
 * Subjects are categorized as theory or practical and belong to a semester.
 */
import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISubject extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  type: "theory" | "practical";
  semester: number;
}

const SubjectSchema = new Schema<ISubject>({
  name: {
    type: String,
    required: [true, "Subject name is required"],
    unique: true,
    trim: true,
    maxlength: 100,
  },
  type: {
    type: String,
    enum: ["theory", "practical"],
    default: "theory",
  },
  semester: {
    type: Number,
    required: [true, "Semester is required"],
    min: [1, "Semester must be between 1 and 8"],
    max: [8, "Semester must be between 1 and 8"],
  },
});

const Subject: Model<ISubject> =
  mongoose.models.Subject || mongoose.model<ISubject>("Subject", SubjectSchema);

export default Subject;
