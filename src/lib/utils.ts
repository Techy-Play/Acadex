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
