/**
 * @module Stream
 * @description Represents an academic stream/branch (e.g., "B.Tech CSE").
 * Each stream has a list of associated subjects.
 */
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStream extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  subjects: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const StreamSchema = new Schema<IStream>(
  {
    name: {
      type: String,
      required: [true, "Stream name is required"],
      unique: true,
      trim: true,
      maxlength: 150,
    },
    subjects: [
      {
        type: Schema.Types.ObjectId,
        ref: "Subject",
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Stream: Model<IStream> =
  mongoose.models.Stream || mongoose.model<IStream>("Stream", StreamSchema);

export default Stream;
