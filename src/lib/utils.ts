import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPeriod(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase();
}

export function periodToSlug(dateStr: string): string {
  return dateStr.slice(0, 7); // '2026-02-01' → '2026-02'
}

export function deltaColor(direction: 'up' | 'down' | 'neutral'): string {
  if (direction === 'up') return 'text-v1-green bg-v1-green/10';
  if (direction === 'down') return 'text-v1-red bg-v1-red/10';
  return 'text-text-3 bg-surface-2';
}

export function deltaArrow(direction: 'up' | 'down' | 'neutral'): string {
  if (direction === 'up') return '↑';
  if (direction === 'down') return '↓';
  return '–';
}
