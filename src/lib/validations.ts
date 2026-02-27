import { z } from "zod";

// Allowed email domains
export const ALLOWED_EMAIL_DOMAINS = [
  "gmail.com",
  "outlook.com",
  "hotmail.com",
  "yahoo.com",
  "amrapali.ac.in",
];

// College ID format: 7 digits starting with 241/257/258/259
export const STUDENT_COLLEGE_ID_REGEX = /^(241|257|258|259)\d{3,4}$/;

export function isAllowedEmailDomain(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return ALLOWED_EMAIL_DOMAINS.includes(domain);
}

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
  section: z.string().optional().nullable(),
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
  section: z.string().optional().nullable(),
});

export const addPracticalSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  title: z
    .string()
    .min(1, "Title is required")
    .max(255, "Title too long"),
  description: z.string().optional().default(""),
  file_url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  section: z.string().optional().nullable(),
});

export const addLibraryResourceSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(255, "Title too long"),
  description: z.string().max(1000, "Description too long").optional().default(""),
  subject: z.string().min(1, "Subject is required"),
  semester: z.number().int().min(1, "Min semester is 1").max(8, "Max semester is 8"),
  academicYear: z
    .string()
    .min(1, "Academic year is required")
    .max(20, "Academic year too long"),
  resourceType: z.enum(["notes", "assignments", "practicals", "oldyearpapers", "reference"], {
    message: "Resource type is required",
  }),
  tags: z.array(z.string().max(50)).optional().default([]),
  fileUrl: z
    .string()
    .url("Must be a valid URL")
    .min(1, "File URL is required"),
  section: z.string().optional().nullable(),
});

export const accessRequestSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name too long"),
  college_id: z
    .string()
    .min(1, "College ID is required")
    .max(50, "College ID too long")
    .refine(
      (id) => STUDENT_COLLEGE_ID_REGEX.test(id),
      "College ID must be 6 or 7 digits starting with 241, 257, 258, or 259"
    ),
  email: z
    .string()
    .email("Must be a valid email")
    .max(255, "Email too long")
    .refine(
      isAllowedEmailDomain,
      `Email must end with: ${ALLOWED_EMAIL_DOMAINS.join(", ")}`
    ),
  stream: z.string().optional().nullable(),
  section: z.string().min(1, "Section is required"),
  reason: z.string().max(500, "Reason too long").optional().default(""),
});

export const emailDomainSchema = z
  .string()
  .email("Must be a valid email")
  .refine(
    isAllowedEmailDomain,
    `Email must end with: ${ALLOWED_EMAIL_DOMAINS.join(", ")}`
  );

export type LoginInput = z.infer<typeof loginSchema>;
export type AddStudentInput = z.infer<typeof addStudentSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type AddNoteInput = z.infer<typeof addNoteSchema>;
export type AddAssignmentInput = z.infer<typeof addAssignmentSchema>;
export type AddPracticalInput = z.infer<typeof addPracticalSchema>;
export type AddLibraryResourceInput = z.infer<typeof addLibraryResourceSchema>;
export type AccessRequestInput = z.infer<typeof accessRequestSchema>;
