/**
 * @module Section
 * @description Represents a class section (e.g., "Section C").
 * Users and resources are scoped to sections for content isolation.
 */
import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISection extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const SectionSchema = new Schema<ISection>(
  {
    name: {
      type: String,
      required: [true, "Section name is required"],
      unique: true,
      trim: true,
      maxlength: 50,
    },
  },
  {
    timestamps: true,
  }
);

const Section: Model<ISection> =
  mongoose.models.Section || mongoose.model<ISection>("Section", SectionSchema);

export default Section;
