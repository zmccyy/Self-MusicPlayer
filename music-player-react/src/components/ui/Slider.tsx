import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import * as SliderPrimitive from '@radix-ui/react-slider'
import { cn } from '../../lib/utils'

type SliderProps = ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & {
  /** 轨道高度（默认细进度条样式） */
  thick?: boolean
}

/** 统一 Radix Slider：渐变已播区间 + 发光滑块，用于进度条/音量/EQ */
export const Slider = forwardRef<HTMLSpanElement, SliderProps>(function Slider(
  { className, thick = false, ...props },
  ref,
) {
  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn(
        'relative flex touch-none select-none items-center',
        thick ? 'h-4 w-full' : 'h-4 w-full',
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track
        className={cn(
          'relative w-full grow overflow-hidden rounded-full bg-surface-strong',
          thick ? 'h-1.5' : 'h-1',
        )}
      >
        <SliderPrimitive.Range className="absolute h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        className={cn(
          'block h-3.5 w-3.5 rounded-full bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.1),0_0_10px_rgba(16,185,129,0.5)]',
          'outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-accent/50 active:scale-95',
        )}
        aria-label={props['aria-label']}
      />
    </SliderPrimitive.Root>
  )
})
