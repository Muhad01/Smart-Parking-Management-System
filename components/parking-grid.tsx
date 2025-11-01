"use client"

import { useState, useEffect } from "react"
import { db } from "@/lib/db"
import type { ParkingSlot, ParkingLocation } from "@/lib/types"
import { Card } from "@/components/ui/card"

interface ParkingGridProps {
  locationId: string
  showFreeOnly: boolean
}

export function ParkingGrid({ locationId, showFreeOnly }: ParkingGridProps) {
  const [slots, setSlots] = useState<ParkingSlot[]>([])
  const [location, setLocation] = useState<ParkingLocation | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)

  useEffect(() => {
    const allSlots = db.slots.getByLocationId(locationId)
    setSlots(allSlots)
    setLocation(db.locations.getById(locationId) || null)
  }, [locationId])

  const displaySlots = showFreeOnly ? slots.filter((s) => !s.isOccupied) : slots

  const freeCount = slots.filter((s) => !s.isOccupied).length
  const occupiedCount = slots.length - freeCount

  return (
    <div className="space-y-6">
      <Card className="p-4 bg-muted/50">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-primary">{slots.length}</div>
            <div className="text-sm text-muted-foreground">Total Slots</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-500">{freeCount}</div>
            <div className="text-sm text-muted-foreground">Free</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-500">{occupiedCount}</div>
            <div className="text-sm text-muted-foreground">Occupied</div>
          </div>
        </div>
      </Card>

      <div className="bg-card rounded-lg p-6 border border-border">
        <div className="grid grid-cols-10 gap-2">
          {displaySlots.map((slot) => (
            <button
              key={slot.id}
              onClick={() => setSelectedSlot(selectedSlot === slot.id ? null : slot.id)}
              className={`aspect-square rounded-lg font-medium text-sm transition-all ${
                slot.isOccupied
                  ? "bg-red-500 text-white cursor-not-allowed opacity-75"
                  : selectedSlot === slot.id
                    ? "bg-primary text-white ring-2 ring-primary ring-offset-2"
                    : "bg-green-500 text-white hover:bg-green-600"
              }`}
            >
              {slot.slotNumber}
            </button>
          ))}
        </div>
      </div>

      {selectedSlot && (
        <Card className="p-4 bg-primary/10 border border-primary/20">
          <div className="text-sm">
            <p className="font-medium text-foreground">Slot Details</p>
            <p className="text-muted-foreground">Slot #{selectedSlot.split("-")[1]}</p>
            <p className="text-sm text-muted-foreground mt-2">Available for reservation</p>
          </div>
        </Card>
      )}

      <div className="flex gap-2 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded" />
          <span className="text-muted-foreground">Free</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded" />
          <span className="text-muted-foreground">Occupied</span>
        </div>
      </div>
    </div>
  )
}
