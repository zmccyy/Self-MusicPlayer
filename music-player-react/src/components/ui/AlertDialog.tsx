import { type ReactNode } from 'react'
import * as AD from '@radix-ui/react-alert-dialog'
import { AnimatePresence, motion } from 'motion/react'
import { Button, type ButtonVariant } from './Button'

/**
 * 破坏性操作确认框（替代 window.confirm）。
 * 用法：<AlertDialogTrigger asChild><Button/></AlertDialogTrigger> + <AlertDialogAction>。
 * 也提供受控的 confirm 风格快捷封装 ConfirmDialog。
 */

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = '确认删除',
  cancelText = '取消',
  danger = true,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  confirmText?: string
  cancelText?: string
  danger?: boolean
  onConfirm: () => void
}) {
  return (
    <AD.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <AD.Portal forceMount>
            <AD.Overlay forceMount asChild>
              <motion.div
                className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              />
            </AD.Overlay>
            <AD.Content forceMount asChild>
              <motion.div
                className="fixed left-1/2 top-1/2 z-[90] w-[380px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border-strong bg-elevated p-5 shadow-2xl"
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                <AD.Title className="text-base font-medium text-text-primary">{title}</AD.Title>
                {description ? (
                  <AD.Description className="mt-1.5 text-sm text-text-secondary">
                    {description}
                  </AD.Description>
                ) : null}
                <div className="mt-5 flex justify-end gap-2">
                  <AD.Cancel asChild>
                    <Button variant="ghost">{cancelText}</Button>
                  </AD.Cancel>
                  <AD.Action asChild>
                    <Button
                      variant={danger ? 'danger' : 'primary'}
                      onClick={onConfirm}
                    >
                      {confirmText}
                    </Button>
                  </AD.Action>
                </div>
              </motion.div>
            </AD.Content>
          </AD.Portal>
        ) : null}
      </AnimatePresence>
    </AD.Root>
  )
}

export type { ButtonVariant }
