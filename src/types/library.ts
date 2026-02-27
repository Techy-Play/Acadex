/**
 * LibraryResource — Placeholder type definition for the Acadex Library module.
 *
 * This interface represents a future MongoDB document schema for centralized
 * academic resource indexing. Do NOT implement the model yet — this file
 * exists purely for type scaffolding and future expansion.
 *
 * Planned MongoDB Schema (commented):
 *
 * const LibraryResourceSchema = new Schema<ILibraryResource>({
 *   title:        { type: String, required: true, trim: true },
 *   description:  { type: String, default: "" },
 *   subject:      { type: Schema.Types.ObjectId, ref: "Subject", required: true },
 *   semester:     { type: Number, required: true, min: 1, max: 8 },
 *   branch:       { type: String, required: true },
 *   academicYear: { type: String, required: true },
 *   resourceType: { type: String, enum: ["notes","assignments","practicals","oldyearpapers","reference"], required: true },
 *   uploadedBy:   { type: Schema.Types.ObjectId, ref: "User", required: true },
 *   tags:         [{ type: String }],
 *   fileUrl:      { type: String, required: true },
 *   createdAt:    { type: Date, default: Date.now },
 * });
 */

export type ResourceType =
  | "notes"
  | "assignments"
  | "practicals"
  | "oldyearpapers"
  | "reference";

export interface ILibraryResource {
  _id: string;
  title: string;
  description: string;
  subject: string; // ObjectId reference
  semester: number;
  branch: string;
  academicYear: string;
  resourceType: ResourceType;
  uploadedBy: string; // ObjectId reference
  tags: string[];
  fileUrl: string;
  createdAt: string;
}
