import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPracticalCompletion extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  practical: mongoose.Types.ObjectId;
  completedAt: Date;
}

const PracticalCompletionSchema = new Schema<IPracticalCompletion>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    practical: {
      type: Schema.Types.ObjectId,
      ref: "Practical",
      required: [true, "Practical is required"],
    },
    completedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure a user can only complete a practical once
PracticalCompletionSchema.index({ user: 1, practical: 1 }, { unique: true });

const PracticalCompletion: Model<IPracticalCompletion> =
  mongoose.models.PracticalCompletion ||
  mongoose.model<IPracticalCompletion>(
    "PracticalCompletion",
    PracticalCompletionSchema
  );

export default PracticalCompletion;
