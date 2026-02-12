import { use } from 'react'
import { Sun } from 'lucide-react'

import { Button } from '../ui/button'
import { ThemeContext } from '@/context/ThemeContext'

export default function ThemeToggle() {
  const { toggleTheme } = use(ThemeContext)
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all" />
    </Button>
  )
}
