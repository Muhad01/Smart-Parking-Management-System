import Link from "next/link"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Background video */}
      <video
        className="pointer-events-none fixed inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
      >
        <source src="/bmw m4 60fps loop by visualdon - TEST525 (1080p, h264) (1).mp4" type="video/mp4" />
      </video>

      {/* Dark overlay to keep text readable */}
      <div className="pointer-events-none fixed inset-0 bg-black/60" />

      {/* Foreground content */}
      <div className="relative z-10 flex min-h-screen flex-col bg-gradient-to-b from-black/40 via-black/20 to-black/60">
        <SiteHeader />

        <main className="flex-1 flex items-center justify-center">
          <div className="max-w-4xl mx-auto px-6 py-12 flex flex-col items-center justify-center text-center gap-8 text-white">
            <div>
              {/* Welcome Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/30 bg-white/10 backdrop-blur-sm mb-6">
                <Sparkles className="w-4 h-4 text-white" />
                <span className="text-sm font-medium text-white">Welcome to SmartPark</span>
              </div>

              {/* Main Heading */}
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-4 drop-shadow-lg">
                Smart Park
              </h1>

              {/* Subtitle */}
              <p className="text-base md:text-lg text-zinc-200 max-w-2xl mx-auto leading-relaxed mb-8 drop-shadow">
                Discover premium parking solutions handpicked for discerning drivers. Experience the art of refined selection.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-4 justify-center mt-4">
                <Link href="/login">
                  <Button size="lg" className="px-8 bg-white text-black hover:bg-white/90 rounded-md">
                    Get Started
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}



