import { GeometricShapes } from "@/components/custom/GeometricShapes"
import { StatsBar } from "@/components/custom/StatsBar"
import ThemeToggle from "@/components/custom/ThemeToggle"
import { UrlShortenerForm } from "@/components/custom/UrlShortenerForm"
import { Scissors } from "lucide-react"


export const HomePage = () => {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6 geometric-grid">
      <GeometricShapes />

      {/* Theme toggle top-right */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      <div className="relative z-10 text-center max-w-3xl mx-auto">
        {/* Logo */}
        <div className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full border border-primary/20 bg-secondary/30">
          <Scissors className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-muted-foreground tracking-wide">
            sniplink
          </span>
        </div>

        {/* Heading */}
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-4">
          Shorten.{" "}
          <span className="text-gradient">Share.</span>
          <br />
          Track.
        </h1>

        <p className="text-muted-foreground text-lg md:text-xl max-w-xl mx-auto mb-12 leading-relaxed">
          Transform unwieldy URLs into clean, memorable links.
          Fast, minimal, geometric.
        </p>

        {/* Form */}
        <UrlShortenerForm />

        {/* Stats */}
        <StatsBar />
      </div>

      {/* Bottom geometric line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
    </div>
  )
}