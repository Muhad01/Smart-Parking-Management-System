"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/components/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ChevronLeft, ChevronRight, MapPin, CalendarClock, Search, LogOut, Navigation } from "lucide-react"
import { db } from "@/lib/db"
import { BookingPopup } from "@/components/booking-popup"
import { PaymentPopup } from "@/components/payment-popup"
import { DarkModeToggle } from "@/components/dark-mode-toggle"
import type { ParkingLocation } from "@/lib/types"

const DEFAULT_MAP_URL = "https://maps.google.com/"

interface Booking {
  id: string
  userEmail: string
  userName?: string
  locationId: string
  locationName?: string
  slotNumber: number
  createdAt: string
  paid?: boolean
  paidAt?: string | null
}

export default function BookingPage() {
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
  const [showBookingPopup, setShowBookingPopup] = useState(false)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [now, setNow] = useState<number>(() => Date.now())
  const [payBookingId, setPayBookingId] = useState<string | null>(null)
  const [payAmount, setPayAmount] = useState<number | null>(null)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
      return
    }
    let timeoutId: NodeJS.Timeout

    const fetchBookings = async () => {
      try {
        const res = await fetch("/api/bookings", { cache: "no-store" })
        if (res.ok) {
          setBookings(await res.json())
        }
      } catch (e) {
        console.error("Failed to fetch bookings:", e)
      } finally {
        timeoutId = setTimeout(fetchBookings, 3000)
      }
    }

    fetchBookings()

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [isLoading, user, router])

  // Tick every second so timers update
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const openPayPopup = (booking: Booking) => {
    const startedAt = new Date(booking.createdAt).getTime()
    const ms = Date.now() - startedAt
    const minutes = ms / (1000 * 60)
    const halfHours = Math.ceil(minutes / 30) // Round up to nearest half hour
    const fee = Math.max(1, halfHours * 1) // $1 per half hour, minimum $1

    setPayBookingId(booking.id)
    setPayAmount(fee)
  }

  const handlePaid = (id: string) => {
    setBookings((prev) => prev.filter((b) => b.id !== id))
    setPayBookingId(null)
    setPayAmount(null)
  }

  const handleNavigate = (mapUrl?: string) => {
    const targetUrl = mapUrl || DEFAULT_MAP_URL
    if (typeof window !== "undefined") {
      window.open(targetUrl, "_blank", "noopener,noreferrer")
    }
  }

  if (isLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Left navbar matching dashboard */}
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
                  P
                </div>
                <span className="text-sm font-semibold tracking-tight">SmartPark</span>
              </div>
            ) : (
              <div className="w-8 h-8 bg-foreground rounded-lg flex items-center justify-center text-background text-xs font-bold">
                P
              </div>
            )}
          </div>
          <nav className="px-2 space-y-1 text-xs pt-2">
            <Button
              type="button"
              variant={pathname === "/home" ? "secondary" : "ghost"}
              size="sm"
              className="w-full justify-start"
              onClick={() => router.push("/home")}
            >
              {expanded ? "Location" : <MapPin className="h-4 w-4" />}
            </Button>
            <Button
              type="button"
              variant={pathname === "/booking" ? "secondary" : "ghost"}
              size="sm"
              className="w-full justify-start"
              onClick={() => router.push("/booking")}
            >
              {expanded ? "Booking" : <CalendarClock className="h-4 w-4" />}
            </Button>
          </nav>
        </div>

        <div className="px-3 py-4 border-t border-border text-[11px] space-y-3">
          <div className="flex items-center justify-between">
            {expanded && (
              <p className="text-muted-foreground truncate text-[11px]" title={user?.fullName || user?.email || ""}>
                {user?.fullName || user?.email}
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
            {expanded && !user && <p className="text-muted-foreground">Not signed in</p>}
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

      {/* Booking list styled similar to Find Parking */}
      <main className="flex-1 h-full overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-1">Bookings</h1>
              <p className="text-sm text-muted-foreground">
                View all reservations and create a new booking when needed.
              </p>
            </div>
            <Button onClick={() => setShowBookingPopup(true)}>Book a slot</Button>
          </div>

          {/* Search bar similar to Find Parking */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                placeholder="Search by email, location, or slot..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 py-2 h-11"
              />
            </div>
          </div>

          {/* Bookings grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bookings.length === 0 ? (
              <div className="col-span-full text-center py-12 text-sm text-muted-foreground">
                No active (unpaid) bookings.
              </div>
            ) : (
              bookings
                .filter((b) => {
                  const q = searchQuery.toLowerCase()
                  if (!q) return true
                  return (
                    b.userEmail.toLowerCase().includes(q) ||
                    (b.locationName || b.locationId).toLowerCase().includes(q) ||
                    String(b.slotNumber).includes(q)
                  )
                })
                .slice(-30)
                .reverse()
                .map((b) => {
                  const locationName = b.locationName || b.locationId
                  // Try to get address from db for display, but use locationName from booking
                  const loc: ParkingLocation | undefined = db.locations.getById(b.locationId)
                  const locationAddress = loc?.address

                  const startedAt = new Date(b.createdAt).getTime()
                  const elapsedMs = Math.max(0, now - startedAt)
                  const minutes = elapsedMs / (1000 * 60)
                  const halfHours = Math.ceil(minutes / 30) // Round up to nearest half hour
                  const fee = Math.max(1, halfHours * 1) // $1 per half hour, minimum $1

                  const totalSeconds = Math.floor(elapsedMs / 1000)
                  const h = Math.floor(totalSeconds / 3600)
                  const m = Math.floor((totalSeconds % 3600) / 60)
                  const s = totalSeconds % 60
                  const timeStr = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s
                    .toString()
                    .padStart(2, "0")}`

                  return (
                    <Card key={b.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {locationName}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Slot {b.slotNumber} · {b.userName || b.userEmail}
                          {locationAddress && <> · {locationAddress}</>}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-xs text-muted-foreground">
                          <p>
                            Booked on{" "}
                            {new Date(b.createdAt).toLocaleString(undefined, {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </p>
                          <p>Time parked: {timeStr}</p>
                          <p>Current fee (@ $1/half hour): ${fee.toFixed(2)}</p>
                          <div className="flex gap-2 mt-2">
                            <Button
                              size="sm"
                              className="flex-1"
                              onClick={() => openPayPopup(b)}
                            >
                              Pay &amp; Finish
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleNavigate(loc?.mapUrl)}
                              title="Open location in maps"
                            >
                              <Navigation className="w-4 h-4 mr-1" />
                              Navigate
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
            )}
          </div>
        </div>
      </main>
      {user && (
        <BookingPopup
          open={showBookingPopup}
          onClose={() => setShowBookingPopup(false)}
          userEmail={user.email}
          userName={user.fullName}
        />
      )}
      <PaymentPopup
        open={payBookingId != null && payAmount != null}
        onClose={() => {
          setPayBookingId(null)
          setPayAmount(null)
        }}
        bookingId={payBookingId}
        amount={payAmount}
        onPaid={handlePaid}
      />
      <DarkModeToggle />
    </div>
  )
}


