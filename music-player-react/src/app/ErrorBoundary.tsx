import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { error: Error | null }

/** 全局错误边界：渲染异常时给出可恢复的提示，避免整页白屏。 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-bg p-6 text-text-primary">
          <div className="max-w-md rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
            <div className="text-lg font-semibold text-red-300">页面出了点问题</div>
            <div className="mt-2 break-all text-sm text-text-secondary">{this.state.error.message}</div>
            <button
              type="button"
              className="btn btn-primary mt-4"
              onClick={() => {
                this.setState({ error: null })
              }}
            >
              重试
            </button>
            <button
              type="button"
              className="btn btn-secondary mt-4 ml-2"
              onClick={() => {
                window.location.reload()
              }}
            >
              刷新页面
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
