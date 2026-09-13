import { cn } from '../../lib/utils'

type Props = {
  children: React.ReactNode
  tone?: 'neutral' | 'accent' | 'warn'
  className?: string
}

const TONES = {
  neutral: 'bg-surface-strong text-text-secondary border-border-soft',
  accent: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/25',
  warn: 'bg-amber-500/15 text-amber-500 border-amber-500/25',
}

export function Badge({ children, tone = 'neutral', className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 text-[10px] font-medium leading-none',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
