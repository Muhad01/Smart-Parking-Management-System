"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"

export function SiteHeader() {
  return (
    <header className="bg-transparent">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4 text-white">
        <div className="flex items-center gap-2">
          <span className="text-sm tracking-[0.3em] font-semibold uppercase">SmartPark</span>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-white hover:text-white">
              Sign in
            </Button>
          </Link>
          <Link href="/login?mode=signup">
            <Button variant="ghost" size="sm" className="text-white hover:text-white">
              Sign up
            </Button>
          </Link>
        </div>
      </div>
    </header>
  )
}


