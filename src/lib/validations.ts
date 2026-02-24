import { z } from "zod";

export const loginSchema = z.object({
  college_id: z
    .string()
    .min(1, "College ID is required")
    .max(50, "College ID too long"),
  password: z
    .string()
    .min(1, "Password is required")
    .max(128, "Password too long"),
});

export const addStudentSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name too long"),
  college_id: z
    .string()
    .min(1, "College ID is required")
    .max(50, "College ID too long"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(128, "Password too long"),
  role: z.enum(["admin", "student"]).default("student"),
});

export const resetPasswordSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
});

export const changePasswordSchema = z.object({
  newPassword: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(128, "Password too long"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const addNoteSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  title: z
    .string()
    .min(1, "Title is required")
    .max(255, "Title too long"),
  file_url: z
    .string()
    .url("Must be a valid URL")
    .min(1, "File URL is required"),
});

export const addAssignmentSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  title: z
    .string()
    .min(1, "Title is required")
    .max(255, "Title too long"),
  description: z.string().optional().default(""),
  file_url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  deadline: z.string().optional().nullable(),
});

export const addPracticalSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  title: z
    .string()
    .min(1, "Title is required")
    .max(255, "Title too long"),
  description: z.string().optional().default(""),
  file_url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type AddStudentInput = z.infer<typeof addStudentSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type AddNoteInput = z.infer<typeof addNoteSchema>;
export type AddAssignmentInput = z.infer<typeof addAssignmentSchema>;
export type AddPracticalInput = z.infer<typeof addPracticalSchema>;
