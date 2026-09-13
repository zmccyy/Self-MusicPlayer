import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger:
    'bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 hover:text-red-300',
  outline: 'border border-border-strong bg-transparent text-text-primary hover:bg-surface',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'min-h-8 px-2.5 text-xs gap-1',
  md: 'min-h-9 px-3.5 text-sm gap-1.5',
  lg: 'min-h-11 px-5 text-sm gap-2',
  icon: 'h-9 w-9 p-0',
}

/** 统一按钮：保留 .btn 基类（全局 hover 抬升/禁用/焦点环），变体走语义 token */
export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = 'secondary', size = 'md', type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn('btn', VARIANTS[variant], SIZES[size], className)}
      {...props}
    />
  )
})
