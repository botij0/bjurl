
export const GeometricShapes = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Large triangle top-right */}
      <div
        className="absolute -top-20 -right-20 w-80 h-80 border border-primary/10 rotate-45 animate-float"
        style={{ animationDelay: "0s" }}
      />
      {/* Hexagon-ish shape left */}
      <div
        className="absolute top-1/3 -left-16 w-48 h-48 border border-accent/10 rotate-12 animate-float"
        style={{ animationDelay: "2s" }}
      />
      {/* Small diamond bottom */}
      <div
        className="absolute bottom-20 right-1/4 w-24 h-24 border border-primary/15 rotate-45 animate-float"
        style={{ animationDelay: "4s" }}
      />
      {/* Circle accent */}
      <div
        className="absolute top-1/4 right-1/3 w-4 h-4 rounded-full bg-primary/20 animate-pulse-glow"
      />
      <div
        className="absolute bottom-1/3 left-1/4 w-3 h-3 rounded-full bg-accent/25 animate-pulse-glow"
        style={{ animationDelay: "1.5s" }}
      />
      {/* Large circle outline */}
      <div
        className="absolute -bottom-32 -left-32 w-96 h-96 border border-primary/5 rounded-full"
      />
    </div>
  )
}
