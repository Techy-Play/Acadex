import { connectDB } from "@/lib/db";
import Stream from "@/models/Stream";
import Subject from "@/models/Subject";
import User from "@/models/User";

type AudienceInput =
  | { targetType: "all" }
  | { targetType: "semester"; semester: number }
  | { targetType: "section"; sectionId?: string; sectionIds?: string[] }
  | { targetType: "users"; userIds: string[] };

export async function resolveUserIdsForAudience(input: AudienceInput): Promise<string[]> {
  await connectDB();

  if (input.targetType === "users") {
    if (!Array.isArray(input.userIds) || input.userIds.length === 0) return [];
    const users = await User.find({
      _id: { $in: input.userIds },
      status: "active",
    })
      .select("_id")
      .lean();
    return users.map((u) => u._id.toString());
  }

  if (input.targetType === "all") {
    const users = await User.find({ status: "active" }).select("_id").lean();
    return users.map((u) => u._id.toString());
  }

  if (input.targetType === "semester") {
    const users = await User.find({
      role: "student",
      status: "active",
      semester: input.semester,
    })
      .select("_id")
      .lean();
    return users.map((u) => u._id.toString());
  }

  const sectionIds = Array.from(
    new Set((input.sectionIds || []).filter(Boolean))
  );
  if (sectionIds.length === 0 && input.sectionId) {
    sectionIds.push(input.sectionId);
  }
  if (sectionIds.length === 0) {
    return [];
  }

  const users = await User.find({
    role: "student",
    status: "active",
    section: { $in: sectionIds },
  })
    .select("_id")
    .lean();
  return users.map((u) => u._id.toString());
}

export async function resolveStudentUserIdsForSubject(
  subjectId: string,
  sectionId?: string | null
): Promise<string[]> {
  await connectDB();

  const subject = await Subject.findById(subjectId).select("semester").lean();
  if (!subject) return [];

  const streams = await Stream.find({ subjects: subject._id }).select("_id").lean();
  const streamIds = streams.map((s) => s._id);
  if (streamIds.length === 0) return [];

  const userFilter: Record<string, unknown> = {
    role: "student",
    status: "active",
    stream: { $in: streamIds },
  };

  if (subject.semester) {
    userFilter.semester = subject.semester;
  }
  if (sectionId) {
    userFilter.section = sectionId;
  }

  const users = await User.find(userFilter).select("_id").lean();
  return users.map((u) => u._id.toString());
}
