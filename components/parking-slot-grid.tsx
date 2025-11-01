"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { ParkingSlot } from "@/lib/types"

interface ParkingSlotGridProps {
  slots: ParkingSlot[]
  locationName: string
  onSlotSelect?: (slot: ParkingSlot) => void
}

export function ParkingSlotGrid({ slots, locationName, onSlotSelect }: ParkingSlotGridProps) {
  const [showAvailableOnly, setShowAvailableOnly] = useState(false)
  const availableSlots = slots.filter((s) => !s.isOccupied).length
  const occupiedSlots = slots.filter((s) => s.isOccupied).length
  
  const displayedSlots = showAvailableOnly ? slots.filter((s) => !s.isOccupied) : slots

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Total Slots</p>
              <p className="text-3xl font-bold">{slots.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Available</p>
              <p className="text-3xl font-bold text-secondary">{availableSlots}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Occupied</p>
              <p className="text-3xl font-bold text-destructive">{occupiedSlots}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Slot Grid */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Parking Layout</CardTitle>
            <CardDescription>View available and occupied parking slots</CardDescription>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowAvailableOnly(!showAvailableOnly)}
            className="ml-4"
          >
            {showAvailableOnly ? "Show All Slots" : "Available Slots"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Slot Grid */}
          <div className="bg-muted/30 p-8 rounded-lg">
            <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(60px, 1fr))" }}>
              {displayedSlots.map((slot) => {
                return (
                  <div key={slot.id} className="flex flex-col items-center gap-1">
                    <div
                      className={`
                        w-14 h-14 rounded-lg font-semibold text-xs transition-all duration-200
                        flex items-center justify-center relative
                        ${
                          slot.isOccupied
                            ? "bg-red-400 text-black"
                            : "bg-green-400 text-black"
                        }
                      `}
                    >
                      {slot.slotNumber}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-green-400 rounded" />
              <span className="text-sm">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-red-400 rounded" />
              <span className="text-sm">Occupied</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
