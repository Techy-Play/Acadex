import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Assignment from "@/models/Assignment";
import Practical from "@/models/Practical";
import Completion from "@/models/Completion";
import PracticalCompletion from "@/models/PracticalCompletion";
import DeadlineReminderLog from "@/models/DeadlineReminderLog";
import Notification from "@/models/Notification";
import { assignmentReminderPayload, practicalReminderPayload } from "@/lib/push/payloads";
import { sendPushToUsers } from "@/lib/push/send";
import { resolveStudentUserIdsForSubject } from "@/lib/push/targets";

export const dynamic = "force-dynamic";

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    Number((error as { code?: number }).code) === 11000
  );
}

async function insertReminderLogsSafe(
  docs: Array<{
    userId: string;
    resourceType: "assignment" | "practical";
    resourceId: mongoose.Types.ObjectId;
    windowKey: string;
    sentAt: Date;
  }>
) {
  if (docs.length === 0) return;
  try {
    await DeadlineReminderLog.insertMany(docs, { ordered: false });
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }
  }
}

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = request.headers.get("authorization");
  const cronHeader = request.headers.get("x-cron-secret");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  return cronHeader === secret || bearer === secret;
}

function formatWindowKey(deadline: Date): string {
  return `due-${deadline.toISOString().slice(0, 13)}`;
}

export async function GET(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const [assignments, practicals] = await Promise.all([
      Assignment.find({ deadline: { $gte: now, $lte: in24h } })
        .populate("subject", "_id name")
        .populate("section", "_id")
        .select("_id title deadline subject section")
        .lean(),
      Practical.find({ deadline: { $gte: now, $lte: in24h } })
        .populate("subject", "_id name")
        .populate("section", "_id")
        .select("_id title deadline subject section")
        .lean(),
    ]);

    let remindersSent = 0;

    for (const item of assignments) {
      const subject = item.subject as { _id?: mongoose.Types.ObjectId; name?: string } | null;
      if (!subject?._id || !item.deadline) continue;

      const candidateUserIds = await resolveStudentUserIdsForSubject(
        subject._id.toString(),
        (item.section as { _id?: mongoose.Types.ObjectId } | null)?._id?.toString() || null
      );
      if (candidateUserIds.length === 0) continue;

      const completed = await Completion.find({
        assignment: item._id,
        user: { $in: candidateUserIds },
      })
        .select("user")
        .lean();
      const completedIds = new Set(completed.map((c) => c.user.toString()));
      const incompleteUserIds = candidateUserIds.filter((uid) => !completedIds.has(uid));
      if (incompleteUserIds.length === 0) continue;

      const windowKey = formatWindowKey(item.deadline);
      const existingLogs = await DeadlineReminderLog.find({
        userId: { $in: incompleteUserIds },
        resourceType: "assignment",
        resourceId: item._id,
        windowKey,
      })
        .select("userId")
        .lean();
      const alreadySentTo = new Set(existingLogs.map((l) => l.userId.toString()));
      const recipientIds = incompleteUserIds.filter((uid) => !alreadySentTo.has(uid));
      if (recipientIds.length === 0) continue;

      await sendPushToUsers({
        userIds: recipientIds,
        preferenceKey: "deadline_alert",
        payload: assignmentReminderPayload(subject._id.toString()),
      });

      await Notification.create({
        type: "deadline_alert",
        title: "Assignment Reminder",
        message: `"${item.title}" is due soon. Finish it before the deadline catches you!`,
        link: `/user/dashboard/pending-work?tab=assignments&subject=${subject._id.toString()}`,
        targetUsers: recipientIds,
      });

      await insertReminderLogsSafe(
        recipientIds.map((uid) => ({
          userId: uid,
          resourceType: "assignment",
          resourceId: item._id,
          windowKey,
          sentAt: new Date(),
        }))
      );

      remindersSent += recipientIds.length;
    }

    for (const item of practicals) {
      const subject = item.subject as { _id?: mongoose.Types.ObjectId; name?: string } | null;
      if (!subject?._id || !item.deadline) continue;

      const candidateUserIds = await resolveStudentUserIdsForSubject(
        subject._id.toString(),
        (item.section as { _id?: mongoose.Types.ObjectId } | null)?._id?.toString() || null
      );
      if (candidateUserIds.length === 0) continue;

      const completed = await PracticalCompletion.find({
        practical: item._id,
        user: { $in: candidateUserIds },
      })
        .select("user")
        .lean();
      const completedIds = new Set(completed.map((c) => c.user.toString()));
      const incompleteUserIds = candidateUserIds.filter((uid) => !completedIds.has(uid));
      if (incompleteUserIds.length === 0) continue;

      const windowKey = formatWindowKey(item.deadline);
      const existingLogs = await DeadlineReminderLog.find({
        userId: { $in: incompleteUserIds },
        resourceType: "practical",
        resourceId: item._id,
        windowKey,
      })
        .select("userId")
        .lean();
      const alreadySentTo = new Set(existingLogs.map((l) => l.userId.toString()));
      const recipientIds = incompleteUserIds.filter((uid) => !alreadySentTo.has(uid));
      if (recipientIds.length === 0) continue;

      await sendPushToUsers({
        userIds: recipientIds,
        preferenceKey: "deadline_alert",
        payload: practicalReminderPayload(subject._id.toString()),
      });

      await Notification.create({
        type: "deadline_alert",
        title: "Practical Reminder",
        message: `"${item.title}" is due soon. Your lab submission is waiting for you!`,
        link: `/user/dashboard/pending-work?tab=practicals&subject=${subject._id.toString()}`,
        targetUsers: recipientIds,
      });

      await insertReminderLogsSafe(
        recipientIds.map((uid) => ({
          userId: uid,
          resourceType: "practical",
          resourceId: item._id,
          windowKey,
          sentAt: new Date(),
        }))
      );

      remindersSent += recipientIds.length;
    }

    return NextResponse.json({
      success: true,
      assignmentsChecked: assignments.length,
      practicalsChecked: practicals.length,
      remindersSent,
    });
  } catch (error) {
    console.error("Deadline reminder job error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
