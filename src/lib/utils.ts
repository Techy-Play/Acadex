/**
 * @module lib/utils
 * @description Shared utility helpers.
 */
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/** Merges class names with clsx + tailwind-merge for conflict resolution. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats Google Drive profile picture URLs to use Google's high-speed direct CDN endpoint (lh3.googleusercontent.com/d/ID)
 * which works 100% reliably in <img src> and <AvatarImage src> across all browsers without CORS/302 redirect blocks.
 */
export function formatProfileImageUrl(
  url?: string | null,
  driveId?: string | null
): string | null {
  if (!url && !driveId) return null;
  if (!url && driveId) return `https://lh3.googleusercontent.com/d/${driveId}`;
  if (!url) return null;

  if (url.startsWith("data:")) return url;

  const driveIdMatch =
    url.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
    url.match(/\/d\/([a-zA-Z0-9_-]+)\/?/);

  const targetId = driveIdMatch ? driveIdMatch[1] : driveId;

  if (targetId) {
    return `https://lh3.googleusercontent.com/d/${targetId}`;
  }

  return url;
}
