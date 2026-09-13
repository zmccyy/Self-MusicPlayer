import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** 合并 className：tailwind-merge 解决同 utilities 冲突（shadcn/ui 同款约定） */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
