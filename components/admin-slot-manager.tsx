"use client"

import { useState, useEffect } from "react"
import { db } from "@/lib/db"
import type { ParkingSlot, ParkingLocation } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface AdminSlotManagerProps {
  locationId: string
}

export function AdminSlotManager({ locationId }: AdminSlotManagerProps) {
  const [slots, setSlots] = useState<ParkingSlot[]>([])
  const [location, setLocation] = useState<ParkingLocation | null>(null)

  useEffect(() => {
    loadData()
  }, [locationId])

  const loadData = () => {
    const allSlots = db.slots.getByLocationId(locationId)
    setSlots(allSlots)
    const loc = db.locations.getById(locationId)
    setLocation(loc || null)
  }

  const toggleSlotStatus = (slotId: string) => {
    const slot = slots.find((s) => s.id === slotId)
    if (slot) {
      db.slots.updateStatus(slotId, !slot.isOccupied)
      loadData()
    }
  }

  const freeCount = slots.filter((s) => !s.isOccupied).length
  const occupiedCount = slots.length - freeCount

  return (
    <Card>
      <CardHeader>
        <CardTitle>{location?.name} - Slot Management</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-muted rounded-lg text-center">
            <div className="text-2xl font-bold">{slots.length}</div>
            <div className="text-sm text-muted-foreground">Total Slots</div>
          </div>
          <div className="p-4 bg-green-400 rounded-lg text-center">
            <div className="text-2xl font-bold text-black">{freeCount}</div>
            <div className="text-sm text-black">Free</div>
          </div>
          <div className="p-4 bg-red-400 rounded-lg text-center">
            <div className="text-2xl font-bold text-black">{occupiedCount}</div>
            <div className="text-sm text-black">Occupied</div>
          </div>
        </div>

        <div className="bg-card rounded-lg p-6 border border-border">
          <div className="grid grid-cols-10 gap-2">
            {slots.map((slot) => (
              <button
                key={slot.id}
                onClick={() => toggleSlotStatus(slot.id)}
                className={`aspect-square rounded-lg font-medium text-sm transition-all ${
                  slot.isOccupied
                    ? "bg-red-400 text-black hover:bg-red-500"
                    : "bg-green-400 text-black hover:bg-green-500"
                }`}
              >
                {slot.slotNumber}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground">
          <p className="font-medium mb-2">Instructions:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Click on any slot to toggle between occupied (red) and available (green)</li>
              <li>Use the summary cards to track overall parking availability</li>
              <li>Green slots are available for users</li>
            </ul>
        </div>
      </CardContent>
    </Card>
  )
}
