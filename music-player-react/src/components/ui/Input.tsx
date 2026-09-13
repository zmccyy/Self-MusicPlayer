import { type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

const FIELD =
  'w-full rounded-xl border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none ring-accent/40 placeholder:text-text-muted focus:ring-2 transition'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(FIELD, className)} {...props} />
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(FIELD, 'resize-y', className)} {...props} />
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div className="mb-1 text-text-secondary">{children}</div>
}
