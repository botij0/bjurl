import { Button } from '../ui/button'
import { Sun } from 'lucide-react'

export default function ThemeToggle() {
  return (
    <Button
      variant="outline"
      size="icon"
      className="border-primary/20 bg-secondary/30 hover:bg-primary/10 hover:border-primary/40"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
    </Button>
  )
}
