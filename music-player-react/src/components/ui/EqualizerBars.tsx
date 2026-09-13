import { cn } from '../../lib/utils'

/** 播放中的三根均衡器动画条（纯 CSS 动画，见 style.css 的 eq-bar keyframes） */
export function EqualizerBars({ className }: { className?: string }) {
  return (
    <div className={cn('flex h-3.5 items-end gap-[3px]', className)} aria-hidden>
      {[0, 0.25, 0.5].map((delay) => (
        <span
          key={delay}
          className="eq-bar h-full w-[3px] rounded-sm bg-gradient-to-t from-emerald-500 to-teal-300"
          style={{ animationDelay: `${delay}s` }}
        />
      ))}
    </div>
  )
}
