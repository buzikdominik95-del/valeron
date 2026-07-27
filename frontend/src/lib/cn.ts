import { clsx } from 'clsx'
import type { ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Склеивает Tailwind-классы и разрешает конфликты последним значением.
 * Позволяет переопределять классы компонента снаружи через class="".
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
