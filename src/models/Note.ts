/**
 * @module Note
 * @description Represents a study note uploaded by an admin for a specific subject.
 * Notes are displayed on the student dashboard grouped by subject.
 */
import mongoose, { Schema, Document, Model } from "mongoose";

export interface INote extends Document {
  _id: mongoose.Types.ObjectId;
  subject: mongoose.Types.ObjectId;
  section: mongoose.Types.ObjectId | null;
  uploadedBy: mongoose.Types.ObjectId | null;
  title: string;
  file_url: string;
  uploadedAt: Date;
}

const NoteSchema = new Schema<INote>({
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
  file_url: {
    type: String,
    required: [true, "File URL is required"],
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

// Common list/query patterns for student and admin note pages.
NoteSchema.index({ section: 1, subject: 1, uploadedAt: -1 });
NoteSchema.index({ uploadedBy: 1, uploadedAt: -1 });
NoteSchema.index({ subject: 1, uploadedAt: -1 });

const Note: Model<INote> =
  mongoose.models.Note || mongoose.model<INote>("Note", NoteSchema);

export default Note;
