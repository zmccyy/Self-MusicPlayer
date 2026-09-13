import { type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

type ModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  /** 底部按钮区（右侧对齐由调用方排版） */
  footer?: ReactNode
  /** 关闭按钮是否显示在右上角（默认显示） */
  showClose?: boolean
  /** 面板宽度 class（默认 w-[460px]） */
  width?: string
  className?: string
  contentClassName?: string
}

const PANEL =
  'fixed left-1/2 top-1/2 z-[70] max-w-[92vw] max-h-[85vh] overflow-y-auto ' +
  '-translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border-strong bg-elevated p-5 shadow-2xl'

/**
 * 统一模态框（Radix Dialog + motion 进出场）。
 * 全应用所有弹窗共用，替代各自复制的 Radix 脚手架。
 */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  showClose = true,
  width = 'w-[460px]',
  className,
  contentClassName,
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <Dialog.Portal forceMount>
            <Dialog.Overlay forceMount asChild>
              <motion.div
                className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              />
            </Dialog.Overlay>

            <Dialog.Content forceMount asChild>
              <motion.div
                className={cn(PANEL, width, contentClassName)}
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 6 }}
                transition={{ duration: 0.2, ease: [0.2, 0.8, 0.3, 1] }}
              >
                <div className={cn('flex items-start justify-between gap-4', className)}>
                  <div className="min-w-0">
                    <Dialog.Title className="text-base font-medium text-text-primary">
                      {title}
                    </Dialog.Title>
                    {description ? (
                      <Dialog.Description className="mt-1 text-sm text-text-secondary">
                        {description}
                      </Dialog.Description>
                    ) : null}
                  </div>
                  {showClose ? (
                    <Dialog.Close asChild>
                      <button
                        type="button"
                        aria-label="Close dialog"
                        className="rounded-lg p-1 text-text-muted transition hover:bg-surface-hover hover:text-text-primary"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </Dialog.Close>
                  ) : null}
                </div>

                <div className="mt-4">{children}</div>

                {footer ? <div className="mt-5 flex justify-end gap-2">{footer}</div> : null}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  )
}
