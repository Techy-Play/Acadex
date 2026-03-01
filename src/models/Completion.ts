/**
 * @module Completion
 * @description Tracks which assignments a student has marked as completed.
 * Uses a unique compound index on (user, assignment) to prevent duplicates.
 */
import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICompletion extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  assignment: mongoose.Types.ObjectId;
  completedAt: Date;
}

const CompletionSchema = new Schema<ICompletion>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    assignment: {
      type: Schema.Types.ObjectId,
      ref: "Assignment",
      required: [true, "Assignment is required"],
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

// Ensure a user can only complete an assignment once
CompletionSchema.index({ user: 1, assignment: 1 }, { unique: true });

const Completion: Model<ICompletion> =
  mongoose.models.Completion ||
  mongoose.model<ICompletion>("Completion", CompletionSchema);

export default Completion;
