"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-context"
import { db } from "@/lib/db"
import type { ParkingLocation, ParkingSlot } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SiteHeader } from "@/components/site-header"

export default function BookingPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  const [locations, setLocations] = useState<ParkingLocation[]>([])
  const [selectedLocationId, setSelectedLocationId] = useState<string>("")
  const [availableSlots, setAvailableSlots] = useState<ParkingSlot[]>([])
  const [selectedSlotNumber, setSelectedSlotNumber] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
      return
    }
    const locs = db.locations.getAll()
    setLocations(locs)
  }, [isLoading, user, router])

  useEffect(() => {
    if (!selectedLocationId) {
      setAvailableSlots([])
      return
    }
    const freeSlots = db.slots.getFreeSlots(selectedLocationId)
    setAvailableSlots(freeSlots)
    setSelectedSlotNumber(null)
  }, [selectedLocationId])

  const handleSubmit = async () => {
    if (!user || !selectedLocationId || selectedSlotNumber == null) return
    setIsSubmitting(true)
    setMessage(null)

    try {
      // Create booking
      const bookingRes = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail: user.email,
          locationId: selectedLocationId,
          slotNumber: selectedSlotNumber,
        }),
      })

      if (!bookingRes.ok) {
        throw new Error("Failed to create booking")
      }

      const booking = await bookingRes.json()

      // Mock payment
      await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: booking.id,
          amount: 50,
          method: "card",
        }),
      })

      setMessage("Booking confirmed and payment recorded.")
    } catch (err) {
      console.error(err)
      setMessage("Something went wrong while creating your booking.")
    } finally {
      setIsSubmitting(false)
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
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Online Booking & Reservation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select location</label>
              <Select value={selectedLocationId} onValueChange={(v) => setSelectedLocationId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a parking location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name} — {loc.address}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedLocationId && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Select a free slot</label>
                <div className="grid grid-cols-5 gap-2">
                  {availableSlots.map((slot) => (
                    <Button
                      key={slot.id}
                      type="button"
                      variant={selectedSlotNumber === slot.slotNumber ? "default" : "outline"}
                      className="h-9 text-xs"
                      onClick={() => setSelectedSlotNumber(slot.slotNumber)}
                    >
                      {slot.slotNumber}
                    </Button>
                  ))}
                  {availableSlots.length === 0 && (
                    <p className="col-span-full text-xs text-muted-foreground">No free slots at this location.</p>
                  )}
                </div>
              </div>
            )}

            <Button
              type="button"
              disabled={!selectedLocationId || selectedSlotNumber == null || isSubmitting}
              onClick={handleSubmit}
              className="w-full"
            >
              {isSubmitting ? "Booking..." : "Confirm Booking & Pay"}
            </Button>

            {message && <p className="text-xs text-muted-foreground">{message}</p>}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}


