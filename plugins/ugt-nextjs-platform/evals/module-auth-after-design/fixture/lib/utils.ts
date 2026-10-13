import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes with conflict resolution — every kit component uses it. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
