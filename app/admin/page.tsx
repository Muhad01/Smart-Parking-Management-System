"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/components/auth-context"
import { AdminContent } from "@/components/admin-content"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, MapPin, LogOut, ClipboardList } from "lucide-react"

export default function AdminPage() {
  const { user, isLoading, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  
  // Persist navbar expanded state in localStorage
  const [expanded, setExpanded] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("navbar-expanded")
      return saved !== null ? saved === "true" : true
    }
    return true
  })

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "admin")) {
      router.push("/")
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Expandable fixed-height left navbar */}
      <aside
        className={`border-r border-border bg-card/90 backdrop-blur flex flex-col justify-between transition-all duration-200 flex-shrink-0 ${
          expanded ? "w-60" : "w-18"
        }`}
      >
        <div>
          <div className="flex items-center px-3 py-4">
            {expanded ? (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-foreground rounded-lg flex items-center justify-center text-background text-xs font-bold">
                  A
                </div>
                <span className="text-sm font-semibold tracking-tight">Location Status</span>
              </div>
            ) : (
              <div className="w-8 h-8 bg-foreground rounded-lg flex items-center justify-center text-background text-xs font-bold">
                A
              </div>
            )}
          </div>
          <nav className="px-2 space-y-1 text-xs pt-2">
            <Button
              type="button"
              variant={pathname === "/admin" ? "secondary" : "ghost"}
              size="sm"
              className="w-full justify-start"
              onClick={() => router.push("/admin")}
            >
              {expanded ? "Location Status" : <MapPin className="h-4 w-4" />}
            </Button>
            <Button
              type="button"
              variant={pathname === "/admin/booking-status" ? "secondary" : "ghost"}
              size="sm"
              className="w-full justify-start"
              onClick={() => router.push("/admin/booking-status")}
            >
              {expanded ? "Booking Status" : <ClipboardList className="h-4 w-4" />}
            </Button>
          </nav>
        </div>

        <div className="px-3 py-4 border-t border-border text-[11px] space-y-3">
          <div className="flex items-center justify-between">
            {expanded && (
              <p className="text-muted-foreground truncate text-[11px]" title={user?.email || ""}>
                {user?.email}
              </p>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full border border-border"
              onClick={() => {
                setExpanded((v) => {
                  const newValue = !v
                  if (typeof window !== "undefined") {
                    localStorage.setItem("navbar-expanded", String(newValue))
                  }
                  return newValue
                })
              }}
            >
              {expanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>

          <div className="border-t border-border pt-2 space-y-2">
            {expanded && !user?.email && <p className="text-muted-foreground">Not signed in</p>}
            {expanded && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  logout()
                  router.push("/")
                }}
              >
                Logout
              </Button>
            )}
            {!expanded && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 w-full justify-center"
                onClick={() => {
                  logout()
                  router.push("/")
                }}
                aria-label="Logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </aside>

      {/* Main dashboard content, scrollable while navbar stays fixed */}
      <main className="flex-1 h-full overflow-y-auto">
        <AdminContent />
      </main>
    </div>
  )
}
