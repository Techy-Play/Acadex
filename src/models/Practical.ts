import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPractical extends Document {
  _id: mongoose.Types.ObjectId;
  subject: mongoose.Types.ObjectId;
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

const Practical: Model<IPractical> =
  mongoose.models.Practical ||
  mongoose.model<IPractical>("Practical", PracticalSchema);

export default Practical;
