"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { SiteHeader } from "@/components/site-header"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      {/* Centered hero, minimalist like the reference layout */}
      <main className="max-w-4xl mx-auto px-4 pt-32 pb-24 text-center space-y-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="space-y-6"
        >
          <p className="inline-flex items-center justify-center rounded-full border border-border px-4 py-1 text-xs uppercase tracking-wide text-muted-foreground">
            Welcome to SmartPark
          </p>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight" id="overview">
            Real‑time parking visibility for modern facilities.
          </h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
            Monitor availability across multiple locations, manage slots from a single admin dashboard, and give
            drivers a clear view of where to park before they arrive.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link href="/login">
              <Button size="lg" className="w-full sm:w-auto">
                Get started
              </Button>
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  )
}

