"use client"

import { useEffect, useState } from "react"
import type { ParkingLocation, ParkingSlot } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface BookingPopupProps {
  open: boolean
  onClose: () => void
  userEmail: string
  userName?: string
}

export function BookingPopup({ open, onClose, userEmail, userName }: BookingPopupProps) {
  const [locations, setLocations] = useState<ParkingLocation[]>([])
  const [slots, setSlots] = useState<ParkingSlot[]>([])
  const [selectedLocationId, setSelectedLocationId] = useState<string>("")
  const [availableSlots, setAvailableSlots] = useState<ParkingSlot[]>([])
  const [selectedSlotNumber, setSelectedSlotNumber] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  // Real-time data from parkingdata.json via API (poll every 200ms for ultra-fast updates)
  useEffect(() => {
    if (!open) return

    let timeoutId: NodeJS.Timeout
    let isMounted = true

    const fetchData = async () => {
      if (!isMounted || !open) return

      try {
        // Add timestamp to prevent caching and ensure fresh data
        const timestamp = Date.now()
        const res = await fetch(`/api/locations?t=${timestamp}`, {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
          },
        })
        if (!res.ok) return
        const data: { locations: ParkingLocation[]; slots: ParkingSlot[] } = await res.json()

        if (!isMounted || !open) return

        setLocations(data.locations)
        setSlots(data.slots)
      } catch (e) {
        console.error("Failed to fetch locations for booking:", e)
      } finally {
        // Poll every 200ms for ultra-fast real-time updates
        if (isMounted && open) {
          timeoutId = setTimeout(fetchData, 200)
        }
      }
    }

    fetchData()

    return () => {
      isMounted = false
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [open])

  // Recompute available slots whenever selection or slots change
  useEffect(() => {
    if (!selectedLocationId) {
      setAvailableSlots([])
      setSelectedSlotNumber(null)
      return
    }

    const free = slots.filter((s) => s.locationId === selectedLocationId && !s.isOccupied)
    setAvailableSlots(free)

    // If previously selected slot became occupied, clear it
    if (selectedSlotNumber != null && !free.some((s) => s.slotNumber === selectedSlotNumber)) {
      setSelectedSlotNumber(null)
    }
  }, [selectedLocationId, slots, selectedSlotNumber])

  const handleSubmit = async () => {
    if (!userEmail || !selectedLocationId || selectedSlotNumber == null) return
    setIsSubmitting(true)
    setMessage(null)

    try {
      const bookingRes = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail,
          userName,
          locationId: selectedLocationId,
          slotNumber: selectedSlotNumber,
        }),
      })

      if (!bookingRes.ok) {
        throw new Error("Failed to create booking")
      }

      await bookingRes.json()

      onClose()
    } catch (err) {
      console.error(err)
      setMessage("Something went wrong while creating your booking.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg px-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Online Booking & Reservation</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              ✕
            </Button>
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
                {/* Scrollable area so large numbers of slots stay usable */}
                <div className="grid grid-cols-5 gap-2 max-h-56 overflow-y-auto pr-1">
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
              {isSubmitting ? "Booking..." : "Confirm Booking"}
            </Button>

            {message && <p className="text-xs text-muted-foreground">{message}</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


