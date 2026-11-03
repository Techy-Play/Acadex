export interface PushPayload {
  title: string;
  body: string;
  icon: string;
  data: {
    url: string;
  };
}

const DEFAULT_ICON = "/images/android-chrome-192x192.png";

export function buildPushPayload(title: string, body: string, url: string): PushPayload {
  return {
    title,
    body,
    icon: DEFAULT_ICON,
    data: { url },
  };
}

export function noteUploadedPayload(
  subjectName: string,
  subjectId: string,
  resourceTitle?: string
): PushPayload {
  const subjectPrefix = subjectName ? `[${subjectName}] ` : "";
  const bodyText = resourceTitle
    ? `${subjectPrefix}"${resourceTitle}" has been uploaded`
    : `${subjectPrefix}New notes available for ${subjectName || "this subject"}`;

  return buildPushPayload(
    `${subjectPrefix}New Note Uploaded`,
    bodyText,
    `/user/dashboard/notes?subject=${subjectId}`
  );
}

export function assignmentUploadedPayload(
  subjectName: string,
  subjectId: string,
  resourceTitle?: string
): PushPayload {
  const subjectPrefix = subjectName ? `[${subjectName}] ` : "";
  const bodyText = resourceTitle
    ? `${subjectPrefix}"${resourceTitle}" has been posted`
    : `${subjectPrefix}A new assignment has been uploaded for ${subjectName || "this subject"}`;

  return buildPushPayload(
    `${subjectPrefix}New Assignment Added`,
    bodyText,
    `/user/dashboard/assignments?subject=${subjectId}`
  );
}

export function practicalUploadedPayload(
  subjectName: string,
  subjectId: string,
  practicalFileName: string
): PushPayload {
  const subjectPrefix = subjectName ? `[${subjectName}] ` : "";
  return buildPushPayload(
    `${subjectPrefix}New Practical Uploaded`,
    `${subjectPrefix}"${practicalFileName}" has been uploaded`,
    `/user/dashboard/practicals?subject=${subjectId}`
  );
}

export function adminMessagePayload(title: string, message: string): PushPayload {
  return buildPushPayload(title, message, "/user/dashboard/messages");
}

const funnyAssignmentReminders = [
  "Your assignment is still incomplete and the clock is ticking!",
  "Deadline alert: your assignment is speed-running toward you.",
  "Your assignment is waiting. Dramatic background music intensifies.",
];

const funnyPracticalReminders = [
  "Hey, your practical submission is waiting for you!",
  "Lab mission pending: complete your practical before time escapes.",
  "Your practical is staring at you from the to-do list.",
];

function pickOne(items: string[]): string {
  return items[Math.floor(Math.random() * items.length)] || items[0];
}

export function assignmentReminderPayload(
  subjectId?: string,
  subjectName?: string,
  resourceTitle?: string
): PushPayload {
  const url = subjectId
    ? `/user/dashboard/pending-work?tab=assignments&subject=${subjectId}`
    : "/user/dashboard/pending-work?tab=assignments";
  const subjectPrefix = subjectName ? `[${subjectName}] ` : "";
  const title = `${subjectPrefix}Assignment Reminder`;
  const body =
    subjectName && resourceTitle
      ? `${subjectPrefix}"${resourceTitle}" is due soon. Finish it before the deadline catches you!`
      : pickOne(funnyAssignmentReminders);

  return buildPushPayload(title, body, url);
}

export function practicalReminderPayload(
  subjectId?: string,
  subjectName?: string,
  resourceTitle?: string
): PushPayload {
  const url = subjectId
    ? `/user/dashboard/pending-work?tab=practicals&subject=${subjectId}`
    : "/user/dashboard/pending-work?tab=practicals";
  const subjectPrefix = subjectName ? `[${subjectName}] ` : "";
  const title = `${subjectPrefix}Practical Reminder`;
  const body =
    subjectName && resourceTitle
      ? `${subjectPrefix}"${resourceTitle}" is due soon. Your lab submission is waiting for you!`
      : pickOne(funnyPracticalReminders);

  return buildPushPayload(title, body, url);
}
