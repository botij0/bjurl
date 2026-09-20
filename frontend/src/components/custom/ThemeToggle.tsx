import { use } from 'react'
import { Moon, Sun } from 'lucide-react'

import { Button } from '../ui/button'
import { ThemeContext } from '@/context/ThemeContext'

export default function ThemeToggle() {
  const { theme, toggleTheme } = use(ThemeContext)
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      {theme === 'dark' ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  )
}
