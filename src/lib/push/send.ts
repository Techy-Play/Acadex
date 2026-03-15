import mongoose from "mongoose";
import webpush from "web-push";
import { connectDB } from "@/lib/db";
import { ensureWebPushConfigured } from "@/lib/push/config";
import PushSubscription from "@/models/PushSubscription";
import User from "@/models/User";
import type { PushPayload } from "@/lib/push/payloads";
import type { INotificationPreferences } from "@/models/User";

const DEFAULT_BATCH_SIZE = 100;

type PreferenceKey = keyof INotificationPreferences;

interface SendPushInput {
  userIds: string[];
  payload: PushPayload;
  preferenceKey?: PreferenceKey;
  batchSize?: number;
}

export interface PushSendStats {
  attempted: number;
  sent: number;
  failed: number;
  cleaned: number;
  skipped: number;
}

export async function sendPushToUsers(input: SendPushInput): Promise<PushSendStats> {
  const uniqueUserIds = Array.from(new Set(input.userIds.filter(Boolean)));
  if (uniqueUserIds.length === 0) {
    return { attempted: 0, sent: 0, failed: 0, cleaned: 0, skipped: 0 };
  }

  if (!ensureWebPushConfigured()) {
    return {
      attempted: 0,
      sent: 0,
      failed: 0,
      cleaned: 0,
      skipped: uniqueUserIds.length,
    };
  }

  await connectDB();

  let recipientIds = uniqueUserIds;
  if (input.preferenceKey) {
    const optedInUsers = await User.find({
      _id: { $in: uniqueUserIds },
      status: "active",
      [`notificationPreferences.${input.preferenceKey}`]: { $ne: false },
    })
      .select("_id")
      .lean();
    recipientIds = optedInUsers.map((u) => u._id.toString());
  }

  if (recipientIds.length === 0) {
    return {
      attempted: 0,
      sent: 0,
      failed: 0,
      cleaned: 0,
      skipped: uniqueUserIds.length,
    };
  }

  const subscriptions = await PushSubscription.find({
    userId: { $in: recipientIds.map((id) => new mongoose.Types.ObjectId(id)) },
    isActive: true,
  }).lean();

  if (subscriptions.length === 0) {
    return {
      attempted: 0,
      sent: 0,
      failed: 0,
      cleaned: 0,
      skipped: recipientIds.length,
    };
  }

  const payload = JSON.stringify(input.payload);
  const batchSize = Math.max(1, input.batchSize || DEFAULT_BATCH_SIZE);

  let sent = 0;
  let failed = 0;
  const staleEndpoints = new Set<string>();

  for (let i = 0; i < subscriptions.length; i += batchSize) {
    const chunk = subscriptions.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      chunk.map(async (subscription) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth,
              },
            },
            payload
          );
          return { ok: true as const };
        } catch (error: unknown) {
          const statusCode =
            typeof error === "object" && error !== null && "statusCode" in error
              ? Number((error as { statusCode?: number }).statusCode)
              : 0;
          if (statusCode === 404 || statusCode === 410) {
            staleEndpoints.add(subscription.endpoint);
          }
          return { ok: false as const };
        }
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled" && result.value.ok) sent += 1;
      else failed += 1;
    }
  }

  if (staleEndpoints.size > 0) {
    await PushSubscription.updateMany(
      { endpoint: { $in: Array.from(staleEndpoints) } },
      { $set: { isActive: false } }
    );
  }

  return {
    attempted: subscriptions.length,
    sent,
    failed,
    cleaned: staleEndpoints.size,
    skipped: uniqueUserIds.length - recipientIds.length,
  };
}
