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
      <div className="bg-card rounded-lg p-6 border border-border">
        <div className="grid grid-cols-10 gap-2">
          {displaySlots.map((slot) => (
            <div
              key={slot.id}
              className={`aspect-square rounded-lg font-medium text-sm transition-all flex items-center justify-center ${
                slot.isOccupied
                  ? "bg-red-400 text-black"
                  : "bg-green-400 text-black"
              }`}
            >
              {slot.slotNumber}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-400 rounded" />
          <span className="text-muted-foreground">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-400 rounded" />
          <span className="text-muted-foreground">Occupied</span>
        </div>
      </div>
    </div>
  )
}
