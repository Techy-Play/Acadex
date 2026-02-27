import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILibraryResource extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  subject: mongoose.Types.ObjectId;
  section: mongoose.Types.ObjectId | null;
  semester: number;
  academicYear: string;
  resourceType: "notes" | "assignments" | "practicals" | "oldyearpapers" | "reference";
  uploadedBy: mongoose.Types.ObjectId | null;
  tags: string[];
  fileUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

const LibraryResourceSchema = new Schema<ILibraryResource>(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: 255,
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },
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
    semester: {
      type: Number,
      required: [true, "Semester is required"],
      min: 1,
      max: 8,
    },
    academicYear: {
      type: String,
      required: [true, "Academic year is required"],
      trim: true,
      maxlength: 20,
    },
    resourceType: {
      type: String,
      enum: ["notes", "assignments", "practicals", "oldyearpapers", "reference"],
      required: [true, "Resource type is required"],
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    tags: [
      {
        type: String,
        trim: true,
        maxlength: 50,
      },
    ],
    fileUrl: {
      type: String,
      required: [true, "File URL is required"],
    },
  },
  {
    timestamps: true,
  }
);

// Index for common queries
LibraryResourceSchema.index({ subject: 1, semester: 1 });
LibraryResourceSchema.index({ resourceType: 1 });
LibraryResourceSchema.index({ academicYear: 1 });
LibraryResourceSchema.index({ section: 1 });

const LibraryResource: Model<ILibraryResource> =
  mongoose.models.LibraryResource ||
  mongoose.model<ILibraryResource>("LibraryResource", LibraryResourceSchema);

export default LibraryResource;
