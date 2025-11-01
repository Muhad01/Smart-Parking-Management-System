"use client"

import { useState, useEffect } from "react"
import { db } from "@/lib/db"
import type { ParkingLocation } from "@/lib/types"
import { Button } from "@/components/ui/button"

interface LocationSelectorProps {
  onSelect: (locationId: string) => void
}

export function LocationSelector({ onSelect }: LocationSelectorProps) {
  const [locations, setLocations] = useState<ParkingLocation[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setLocations(db.locations.getAll())
  }, [])

  return (
    <div className="space-y-2">
      {open ? (
        <div className="grid grid-cols-1 gap-2">
          {locations.map((loc) => (
            <Button
              key={loc.id}
              variant="outline"
              className="justify-start text-left h-auto py-3 bg-transparent"
              onClick={() => {
                onSelect(loc.id)
                setOpen(false)
              }}
            >
              <div>
                <div className="font-medium">{loc.name}</div>
                <div className="text-sm text-muted-foreground">{loc.address}</div>
                <div className="text-xs text-muted-foreground">{loc.totalSlots} slots</div>
              </div>
            </Button>
          ))}
        </div>
      ) : (
        <Button variant="outline" className="w-full bg-transparent" onClick={() => setOpen(true)}>
          Select a parking location
        </Button>
      )}
    </div>
  )
}
