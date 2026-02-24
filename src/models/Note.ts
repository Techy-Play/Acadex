import mongoose, { Schema, Document, Model } from "mongoose";

export interface INote extends Document {
  _id: mongoose.Types.ObjectId;
  subject: mongoose.Types.ObjectId;
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

const Note: Model<INote> =
  mongoose.models.Note || mongoose.model<INote>("Note", NoteSchema);

export default Note;
