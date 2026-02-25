import mongoose, { Document, Schema } from "mongoose";

export interface IContactMessage extends Document {
  name: string;
  email: string;
  subject: string;
  message: string;
  read: boolean;
  replied: boolean;
  adminReply?: string;
  repliedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ContactMessageSchema = new Schema<IContactMessage>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    read: { type: Boolean, default: false },
    replied: { type: Boolean, default: false },
    adminReply: { type: String, default: "" },
    repliedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.ContactMessage ||
  mongoose.model<IContactMessage>("ContactMessage", ContactMessageSchema);
