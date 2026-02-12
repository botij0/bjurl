import ThemeToggle from "@/components/custom/ThemeToggle"
import { StatsBar } from "@/components/custom/StatsBar"
import { GeometricShapes } from "@/components/custom/GeometricShapes"
import { UrlShortenerForm } from "@/components/custom/UrlShortenerForm"


export const HomePage = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 geometric-grid">
      <GeometricShapes />

      {/* Theme toggle top-right */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      <div className="text-center w-full">
        {/* Heading */}
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-4">
          Shorten.{" "}
          <span className="text-gradient">Share.</span>
          <br />
          Track.
        </h1>

        <p className="text-muted-foreground text-md xs:text-lg sm:text-xl max-w-xl mx-auto mb-12 leading-relaxed text-pretty">
          Transform unwieldy URLs into clean, memorable links.
          <br />
          Fast, minimal, geometric.
        </p>

        {/* Form */}
        <UrlShortenerForm />

        {/* Stats */}
        <StatsBar />
      </div>

      {/* Bottom geometric line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-primary/20 to-transparent" />
    </div>
  )
}