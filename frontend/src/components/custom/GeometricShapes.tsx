
export const GeometricShapes = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Large triangle top-right */}
      <div
        className="absolute -top-20 -right-20 w-80 h-80 border border-primary/30 rotate-45 animate-float"
        style={{ animationDelay: "0s" }}
      />
      {/* Hexagon-ish shape left */}
      <div
        className="absolute top-1/3 -left-16 w-48 h-48 border border-accent/30 rotate-12 animate-float"
        style={{ animationDelay: "2s" }}
      />
      {/* Small diamond bottom */}
      <div
        className="absolute bottom-20 right-1/4 w-24 h-24 border border-primary/30 rotate-45 animate-float"
        style={{ animationDelay: "4s" }}
      />
      {/* Circle Outline */}
      <div
        className="absolute -top-20 left-92 w-96 h-96 border border-primary/30 rounded-full"
      />
      <div
        className="absolute bottom-1/3 left-1/4 w-3 h-3 rounded-full bg-accent/30 animate-pulse-glow"
        style={{ animationDelay: "1.5s" }}
      />
      {/* Large circle outline */}
      <div
        className="absolute -bottom-32 -left-32 w-96 h-96 border border-primary/30 rounded-full"
      />
    </div>
  )
}
