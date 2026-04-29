import { useContext } from 'react'
import { ThemeContext, type Theme } from '../app/providers/ThemeProvider'

export function useTheme(): { theme: Theme; toggleTheme: () => void } {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme 必须在 ThemeProvider 内使用')
  }

  return { theme: ctx.theme, toggleTheme: ctx.toggleTheme }
}
