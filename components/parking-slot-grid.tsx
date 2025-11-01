"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { ParkingSlot } from "@/lib/types"
import { AlertCircle, CheckCircle2, Clock } from "lucide-react"

interface ParkingSlotGridProps {
  slots: ParkingSlot[]
  locationName: string
  onSlotSelect?: (slot: ParkingSlot) => void
}

export function ParkingSlotGrid({ slots, locationName, onSlotSelect }: ParkingSlotGridProps) {
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null)
  const [reservedSlots, setReservedSlots] = useState<Set<string>>(new Set())

  const availableSlots = slots.filter((s) => !s.isOccupied).length
  const occupiedSlots = slots.filter((s) => s.isOccupied).length
  const reservedCount = reservedSlots.size

  const handleSlotClick = (slot: ParkingSlot) => {
    if (slot.isOccupied) return

    if (selectedSlot === slot.id) {
      setSelectedSlot(null)
    } else {
      setSelectedSlot(slot.id)
      onSlotSelect?.(slot)
    }
  }

  const handleReserveSlot = () => {
    if (selectedSlot) {
      const newReserved = new Set(reservedSlots)
      newReserved.add(selectedSlot)
      setReservedSlots(newReserved)
      setSelectedSlot(null)
    }
  }

  const handleCancelReservation = (slotId: string) => {
    const newReserved = new Set(reservedSlots)
    newReserved.delete(slotId)
    setReservedSlots(newReserved)
  }

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Reserved</p>
              <p className="text-3xl font-bold text-accent">{reservedCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Slot Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Parking Layout</CardTitle>
          <CardDescription>Click on an available slot to select it, then reserve your spot</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Slot Grid */}
          <div className="bg-muted/30 p-8 rounded-lg">
            <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(60px, 1fr))" }}>
              {slots.map((slot) => {
                const isSelected = selectedSlot === slot.id
                const isReserved = reservedSlots.has(slot.id)
                const isHovered = hoveredSlot === slot.id

                return (
                  <div key={slot.id} className="flex flex-col items-center gap-1">
                    <button
                      onClick={() => handleSlotClick(slot)}
                      onMouseEnter={() => setHoveredSlot(slot.id)}
                      onMouseLeave={() => setHoveredSlot(null)}
                      disabled={slot.isOccupied}
                      className={`
                        w-14 h-14 rounded-lg font-semibold text-xs transition-all duration-200
                        flex items-center justify-center cursor-pointer relative
                        ${
                          slot.isOccupied
                            ? "bg-destructive/40 text-destructive-foreground cursor-not-allowed opacity-60"
                            : isReserved
                              ? "bg-accent text-accent-foreground ring-2 ring-accent ring-offset-2 shadow-md"
                              : isSelected
                                ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 shadow-lg scale-110"
                                : "bg-secondary text-secondary-foreground hover:bg-secondary/90 hover:shadow-md"
                        }
                        ${isHovered && !slot.isOccupied && !isSelected && !isReserved ? "shadow-lg scale-105" : ""}
                      `}
                    >
                      {slot.slotNumber}
                    </button>
                    {isReserved && <Clock className="w-3 h-3 text-accent" />}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-secondary rounded" />
              <span className="text-sm">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary rounded ring-2 ring-primary ring-offset-2" />
              <span className="text-sm">Selected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-accent rounded" />
              <span className="text-sm">Reserved</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-destructive/40 rounded opacity-60" />
              <span className="text-sm">Occupied</span>
            </div>
          </div>

          {/* Actions */}
          {selectedSlot && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-semibold">
                        Slot {slots.find((s) => s.id === selectedSlot)?.slotNumber} Selected
                      </p>
                      <p className="text-sm text-muted-foreground">Reserve this spot for your visit</p>
                    </div>
                  </div>
                  <Button onClick={handleReserveSlot} className="gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Reserve
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reserved Slots List */}
          {reservedCount > 0 && (
            <Card className="bg-accent/5 border-accent/20">
              <CardHeader>
                <CardTitle className="text-base">Your Reservations ({reservedCount})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {slots
                    .filter((s) => reservedSlots.has(s.id))
                    .map((slot) => (
                      <div key={slot.id} className="flex items-center gap-2 bg-accent/20 px-3 py-2 rounded-lg">
                        <Clock className="w-4 h-4 text-accent" />
                        <span className="font-semibold text-sm">Slot {slot.slotNumber}</span>
                        <button
                          onClick={() => handleCancelReservation(slot.id)}
                          className="ml-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
