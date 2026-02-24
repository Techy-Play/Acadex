import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAssignment extends Document {
  _id: mongoose.Types.ObjectId;
  subject: mongoose.Types.ObjectId;
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

const Assignment: Model<IAssignment> =
  mongoose.models.Assignment ||
  mongoose.model<IAssignment>("Assignment", AssignmentSchema);

export default Assignment;
