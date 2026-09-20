import { Link, NavLink } from "react-router"

import ThemeToggle from "@/components/custom/ThemeToggle"
import { cn } from "@/lib/utils"

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "rounded-md px-3 py-1.5 text-sm transition-colors",
    isActive
      ? "text-foreground"
      : "text-muted-foreground hover:text-foreground",
  )

export const AppHeader = () => {
  return (
    <header className="relative z-10 border-b border-border/70">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2.5 text-lg font-bold tracking-tight"
          aria-label="bjurl home"
        >
          <span aria-hidden className="h-2.5 w-2.5 rotate-45 bg-primary" />
          bjurl
        </Link>

        <nav className="flex items-center gap-1">
          <NavLink to="/" end className={navLinkClass}>
            Home
          </NavLink>
          <NavLink to="/links" className={navLinkClass}>
            My links
          </NavLink>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}
