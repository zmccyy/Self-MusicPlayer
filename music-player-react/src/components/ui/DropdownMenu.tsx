import { type ReactNode } from 'react'
import * as DM from '@radix-ui/react-dropdown-menu'
import { cn } from '../../lib/utils'

export const DropdownMenu = DM.Root
export const DropdownMenuTrigger = DM.Trigger

/** 统一样式的下拉菜单，用于歌单/歌曲行的更多操作 */
export function DropdownMenuContent({
  children,
  className,
  align = 'end',
}: {
  children: ReactNode
  className?: string
  align?: 'start' | 'center' | 'end'
}) {
  return (
    <DM.Portal>
      <DM.Content
        align={align}
        sideOffset={6}
        className={cn(
          'z-[80] min-w-36 overflow-hidden rounded-xl border border-border-strong bg-elevated p-1 shadow-2xl',
          className,
        )}
      >
        {children}
      </DM.Content>
    </DM.Portal>
  )
}

export function DropdownMenuItem({
  children,
  onSelect,
  danger,
  disabled,
  className,
}: {
  children: ReactNode
  onSelect?: () => void
  danger?: boolean
  disabled?: boolean
  className?: string
}) {
  return (
    <DM.Item
      disabled={disabled}
      onSelect={(e) => {
        e.preventDefault()
        onSelect?.()
      }}
      className={cn(
        'flex cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm outline-none transition',
        danger
          ? 'text-red-400 data-[highlighted]:bg-red-500/15'
          : 'text-text-primary data-[highlighted]:bg-surface-hover',
        disabled && 'cursor-not-allowed opacity-40',
        className,
      )}
    >
      {children}
    </DM.Item>
  )
}

export function DropdownMenuSeparator() {
  return <DM.Separator className="my-1 h-px bg-border-soft" />
}
