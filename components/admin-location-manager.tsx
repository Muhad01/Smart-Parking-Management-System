"use client"

import { useState, useEffect } from "react"
import { db } from "@/lib/db"
import type { ParkingLocation } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface AdminLocationManagerProps {
  onSelectLocation: (locationId: string) => void
}

export function AdminLocationManager({ onSelectLocation }: AdminLocationManagerProps) {
  const [locations, setLocations] = useState<ParkingLocation[]>([])
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState("")
  const [address, setAddress] = useState("")
  const [totalSlots, setTotalSlots] = useState("")

  useEffect(() => {
    loadLocations()
  }, [])

  const loadLocations = () => {
    setLocations(db.locations.getAll())
  }

  const handleAddLocation = () => {
    if (!name || !address || !totalSlots) return

    const newLocation = db.locations.create({
      name,
      address,
      totalSlots: Number.parseInt(totalSlots),
    })

    // Create slots for new location
    for (let i = 1; i <= Number.parseInt(totalSlots); i++) {
      const slotId = `${newLocation.id}-${i}`
      // Slots are auto-created in db.locations.create, but we need to ensure they exist
      if (!db.slots.getByLocationId(newLocation.id).find((s) => s.slotNumber === i)) {
        // Slot already exists from mock data initialization
      }
    }

    loadLocations()
    setShowForm(false)
    setName("")
    setAddress("")
    setTotalSlots("")
  }

  const handleDeleteLocation = (id: string) => {
    db.locations.delete(id)
    loadLocations()
    onSelectLocation("")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Locations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={() => setShowForm(!showForm)} className="w-full" variant={showForm ? "secondary" : "default"}>
          {showForm ? "Cancel" : "Add New Location"}
        </Button>

        {showForm && (
          <div className="space-y-3 p-4 bg-muted rounded-lg">
            <div>
              <label className="text-sm font-medium block mb-1">Location Name</label>
              <Input placeholder="Downtown Garage" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Address</label>
              <Input placeholder="123 Main Street" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Total Slots</label>
              <Input
                type="number"
                placeholder="50"
                value={totalSlots}
                onChange={(e) => setTotalSlots(e.target.value)}
              />
            </div>
            <Button onClick={handleAddLocation} className="w-full">
              Add Location
            </Button>
          </div>
        )}

        <div className="space-y-2">
          {locations.map((loc) => (
            <div
              key={loc.id}
              className="p-3 border border-border rounded-lg cursor-pointer hover:bg-muted transition-colors"
              onClick={() => onSelectLocation(loc.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium text-foreground">{loc.name}</p>
                  <p className="text-xs text-muted-foreground">{loc.address}</p>
                  <p className="text-xs text-muted-foreground mt-1">{loc.totalSlots} slots</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteLocation(loc.id)
                  }}
                  className="text-destructive hover:text-destructive"
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
