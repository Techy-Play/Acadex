import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISubject extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  type: "theory" | "practical";
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
});

const Subject: Model<ISubject> =
  mongoose.models.Subject || mongoose.model<ISubject>("Subject", SubjectSchema);

export default Subject;
