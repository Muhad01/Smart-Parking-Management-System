"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function DarkModeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [ripple, setRipple] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleToggle = () => {
    setIsAnimating(true)
    setRipple(true)
    setTheme(theme === "dark" ? "light" : "dark")
    
    setTimeout(() => {
      setIsAnimating(false)
      setRipple(false)
    }, 600)
  }

  if (!mounted) {
    return null
  }

  const isDark = theme === "dark"

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        size="icon"
        variant="outline"
        className={cn(
          "relative h-14 w-14 rounded-full",
          "backdrop-blur-md",
          "border-2 shadow-2xl ring-2",
          "hover:scale-110 hover:shadow-2xl",
          "transition-all duration-300 ease-out",
          "group overflow-hidden",
          isDark 
            ? "bg-zinc-900 border-zinc-600 ring-zinc-700/50 hover:border-zinc-500 hover:bg-zinc-800 hover:ring-zinc-600/50" 
            : "bg-white border-zinc-400 ring-zinc-300/50 hover:border-zinc-500 hover:bg-zinc-50 hover:ring-zinc-400/50",
          isAnimating && "scale-95"
        )}
        onClick={handleToggle}
        aria-label="Toggle dark mode"
      >
        {/* Ripple effect */}
        {ripple && (
          <span
            className={cn(
              "absolute inset-0 rounded-full",
              "bg-primary/30 animate-ping",
              "pointer-events-none"
            )}
            style={{ animationDuration: "600ms" }}
          />
        )}

        {/* Glow effect */}
        <span
          className={cn(
            "absolute inset-0 rounded-full opacity-0 group-hover:opacity-100",
            "transition-opacity duration-300",
            isDark ? "bg-yellow-500/30" : "bg-zinc-400/30",
            "blur-xl"
          )}
        />

        {/* Sun icon - shows in dark mode */}
        <Sun
          className={cn(
            "absolute h-6 w-6 transition-all duration-500 ease-in-out",
            isDark
              ? "rotate-0 scale-100 opacity-100 text-yellow-400"
              : "rotate-90 scale-0 opacity-0",
            isAnimating && isDark && "animate-spin"
          )}
        />

        {/* Moon icon - shows in light mode */}
        <Moon
          className={cn(
            "absolute h-6 w-6 transition-all duration-500 ease-in-out",
            isDark
              ? "rotate-90 scale-0 opacity-0"
              : "rotate-0 scale-100 opacity-100 text-zinc-800",
            isAnimating && !isDark && "animate-pulse"
          )}
        />

        {/* Shimmer effect */}
        <span
          className={cn(
            "absolute inset-0 rounded-full",
            "bg-gradient-to-r from-transparent via-white/20 to-transparent",
            "translate-x-[-100%] group-hover:translate-x-[100%]",
            "transition-transform duration-1000 ease-in-out",
            "pointer-events-none"
          )}
        />
      </Button>
    </div>
  )
}


