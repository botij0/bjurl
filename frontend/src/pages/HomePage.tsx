import { AppHeader } from "@/components/custom/AppHeader"
import { StatsBar } from "@/components/custom/StatsBar"
import { UrlShortenerForm } from "@/components/custom/UrlShortenerForm"


export const HomePage = () => {
  return (
    <div className="relative min-h-dvh">

      <div aria-hidden className="pointer-events-none fixed inset-0 geometric-grid" />
      <AppHeader />

      <main className="relative mx-auto flex flex-col w-full max-w-6xl gap-12 px-6 pb-20 pt-16 md:pt-24">
        <div className="mx-auto w-full max-w-2xl">
          <h1 className="text-5xl md:text-6xl font-bold leading-[1.05]">
            Shorten. <span className="text-primary">Share.</span> Track.
          </h1>

          <p className="mt-5 max-w-md text-base md:text-lg leading-relaxed text-muted-foreground">
            Transform unwieldy URLs into clean, memorable links. Fast, minimal, geometric.
          </p>
        </div>

        <div className="mx-auto w-full max-w-2xl">
          <UrlShortenerForm />
        </div>

        <StatsBar />
      </main>
    </div>
  )
}
