"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import type { ParkingLocation, ParkingSlot } from "@/lib/types"
import { Plus, Edit2, Trash2, MapPin } from "lucide-react"

export function AdminContent() {
  const router = useRouter()
  const [locations, setLocations] = useState<ParkingLocation[]>([])
  const [slots, setSlots] = useState<{ [key: string]: ParkingSlot[] }>({})

  const [selectedLocationForSlots, setSelectedLocationForSlots] = useState<string | null>(null)
  const [newLocation, setNewLocation] = useState({ name: "", address: "", totalSlots: "", mapUrl: "" })
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingLocation, setEditingLocation] = useState<ParkingLocation | null>(null)

  const { user } = useAuth()

  // Load current parking data from parkingdata.json via API and keep synced in near real-time
  useEffect(() => {
    let cancelled = false
    let timeoutId: NodeJS.Timeout

    const load = async () => {
      if (cancelled) return

      try {
        const ts = Date.now()
        const res = await fetch(`/api/locations?t=${ts}`, {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
          },
        })
        if (!res.ok) return
        const data: { locations: ParkingLocation[]; slots: ParkingSlot[] } = await res.json()
        if (cancelled) return

        setLocations(data.locations)
        const map: { [key: string]: ParkingSlot[] } = {}
        data.slots.forEach((slot) => {
          if (!map[slot.locationId]) {
            map[slot.locationId] = []
          }
          map[slot.locationId].push(slot)
        })
        setSlots(map)
      } catch (e) {
        console.error("Failed to load admin parking data:", e)
      } finally {
        if (!cancelled) {
          timeoutId = setTimeout(load, 1000)
        }
      }
    }

    load()

    return () => {
      cancelled = true
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [])

  // Persist current admin view back to parkingdata.json
  const persistParkingData = async (
    nextLocations: ParkingLocation[],
    nextSlots: { [key: string]: ParkingSlot[] },
  ) => {
    try {
      const locationsForFile = nextLocations.map((loc) => {
        const locSlots = nextSlots[loc.id] || []
        return {
          name: loc.name,
          address: loc.address,
          totalSlots: loc.totalSlots,
          // Persist explicit mapUrl if provided, otherwise fall back to default Google Maps URL
          mapUrl: loc.mapUrl && loc.mapUrl.trim().length > 0 ? loc.mapUrl : "https://maps.google.com/",
          slots: locSlots.map((s) => ({
            slotNumber: s.slotNumber,
            isOccupied: s.isOccupied,
          })),
        }
      })

      await fetch("/api/admin/parkingdata", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locations: locationsForFile }),
      })
    } catch (e) {
      console.error("Failed to save parkingdata.json from admin:", e)
    }
  }

  const handleAddLocation = () => {
    if (newLocation.name && newLocation.address && newLocation.totalSlots) {
      const trimmedMapUrl = newLocation.mapUrl.trim()
      const location: ParkingLocation = {
        id: `loc_${locations.length + 1}`,
        name: newLocation.name,
        address: newLocation.address,
        totalSlots: Number.parseInt(newLocation.totalSlots),
        mapUrl: trimmedMapUrl || undefined,
      }
      const newLocations = [...locations, location]
      const newLocationId = location.id
      const newSlots = {
        ...slots,
        [newLocationId]: Array.from({ length: location.totalSlots }, (_, i) => ({
          id: `${newLocationId}-${i + 1}`,
          locationId: newLocationId,
          slotNumber: i + 1,
          isOccupied: false,
        })),
      }
      setLocations(newLocations)
      setSlots(newSlots)
      void persistParkingData(newLocations, newSlots)

      setNewLocation({ name: "", address: "", totalSlots: "", mapUrl: "" })
      setIsAddDialogOpen(false)
    }
  }

  const handleEditLocation = (location: ParkingLocation) => {
    setEditingLocation({ ...location })
    setIsEditDialogOpen(true)
  }

  const handleSaveEditLocation = () => {
    if (editingLocation && editingLocation.name && editingLocation.address && editingLocation.totalSlots > 0) {
      const normalizedEditingLocation: ParkingLocation = {
        ...editingLocation,
        mapUrl:
          editingLocation.mapUrl && editingLocation.mapUrl.trim().length > 0
            ? editingLocation.mapUrl
            : undefined,
      }
      const updatedLocations = locations.map((loc) =>
        loc.id === normalizedEditingLocation.id ? normalizedEditingLocation : loc,
      )

      // Update slots if total slots changed
      const oldTotalSlots = slots[editingLocation.id]?.length || 0
      let updatedSlots = { ...slots }
      if (editingLocation.totalSlots !== oldTotalSlots) {
        if (editingLocation.totalSlots > oldTotalSlots) {
          // Add new slots
          const newSlots = Array.from({ length: editingLocation.totalSlots - oldTotalSlots }, (_, i) => ({
            id: `${editingLocation.id}-${oldTotalSlots + i + 1}`,
            locationId: editingLocation.id,
            slotNumber: oldTotalSlots + i + 1,
            isOccupied: false,
          }))
          updatedSlots = {
            ...updatedSlots,
            [editingLocation.id]: [...(updatedSlots[editingLocation.id] || []), ...newSlots],
          }
        } else {
          // Remove slots from the end
          updatedSlots = {
            ...updatedSlots,
            [editingLocation.id]: (updatedSlots[editingLocation.id] || []).slice(0, editingLocation.totalSlots),
          }
        }
      }

      setLocations(updatedLocations)
      setSlots(updatedSlots)
      void persistParkingData(updatedLocations, updatedSlots)

      setIsEditDialogOpen(false)
      setEditingLocation(null)
    }
  }

  const handleDeleteLocation = (id: string) => {
    const newLocations = locations.filter((loc) => loc.id !== id)
    const newSlots = { ...slots }
    delete newSlots[id]
    setLocations(newLocations)
    setSlots(newSlots)
    void persistParkingData(newLocations, newSlots)
    if (selectedLocationForSlots === id) {
      setSelectedLocationForSlots(null)
    }
  }

  const totalSlots = locations.reduce((sum, loc) => sum + loc.totalSlots, 0)
  const selectedLocationData = selectedLocationForSlots
    ? locations.find((loc) => loc.id === selectedLocationForSlots)
    : null
  const selectedLocationSlots = selectedLocationForSlots ? slots[selectedLocationForSlots] || [] : []
  const occupiedSlotsCount = selectedLocationSlots.filter((s) => s.isOccupied).length

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
        {!selectedLocationForSlots ? (
          <>
            {/* Dashboard Summary */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-6">Manage Parking Locations</h1>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 animate-fade-in">
                <Card className="transition-all hover:shadow-lg">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-1">Total Locations</p>
                      <p className="text-3xl font-bold">{locations.length}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="transition-all hover:shadow-lg">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-1">Total Parking Slots</p>
                      <p className="text-3xl font-bold text-secondary">{totalSlots}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="transition-all hover:shadow-lg">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-1">Average Slots/Location</p>
                      <p className="text-3xl font-bold text-accent">
                        {locations.length > 0 ? Math.round(totalSlots / locations.length) : 0}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Add Location Button */}
            <div className="mb-6">
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 animate-slide-up">
                    <Plus className="w-4 h-4" />
                    Add New Location
                  </Button>
                </DialogTrigger>
                <DialogContent className="animate-dialog-appear">
                  <DialogHeader>
                    <DialogTitle>Add New Parking Location</DialogTitle>
                    <DialogDescription>Create a new parking location with available slots</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">Location Name</label>
                      <Input
                        placeholder="e.g., Downtown Garage"
                        value={newLocation.name}
                        onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">Address</label>
                      <Input
                        placeholder="e.g., 123 Main St"
                        value={newLocation.address}
                        onChange={(e) => setNewLocation({ ...newLocation, address: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">Total Slots</label>
                      <Input
                        type="number"
                        placeholder="e.g., 50"
                        value={newLocation.totalSlots}
                        onChange={(e) => setNewLocation({ ...newLocation, totalSlots: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">
                        Google Maps Link (optional)
                      </label>
                      <Input
                        placeholder="e.g., https://maps.google.com/?q=Downtown+Garage"
                        value={newLocation.mapUrl}
                        onChange={(e) => setNewLocation({ ...newLocation, mapUrl: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button
                        variant="outline"
                        className="flex-1 bg-transparent"
                        onClick={() => setIsAddDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button className="flex-1" onClick={handleAddLocation}>
                        Add Location
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Locations Table */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle>Parking Locations</CardTitle>
                <CardDescription>View and manage all parking locations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {locations.length > 0 ? (
                    locations.map((location, index) => (
                      <div
                        key={location.id}
                        className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-all hover:shadow-md cursor-pointer animate-slide-up"
                        style={{ animationDelay: `${index * 50}ms` }}
                        onClick={() => setSelectedLocationForSlots(location.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground">{location.name}</h3>
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="w-4 h-4" />
                            {location.address}
                          </p>
                          <div className="flex gap-4 mt-2">
                            <span className="text-xs bg-secondary/20 text-secondary px-2 py-1 rounded">
                              {location.totalSlots} slots
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditLocation(location)
                            }}
                            className="gap-2"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteLocation(location.id)
                            }}
                            className="gap-2 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No parking locations yet. Add one to get started.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent className="animate-dialog-appear">
                <DialogHeader>
                  <DialogTitle>Edit Parking Location</DialogTitle>
                  <DialogDescription>Update location name, address, or total slots</DialogDescription>
                </DialogHeader>
                {editingLocation && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">Location Name</label>
                      <Input
                        placeholder="e.g., Downtown Garage"
                        value={editingLocation.name}
                        onChange={(e) => setEditingLocation({ ...editingLocation, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">Address</label>
                      <Input
                        placeholder="e.g., 123 Main St"
                        value={editingLocation.address}
                        onChange={(e) => setEditingLocation({ ...editingLocation, address: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">Total Slots</label>
                      <Input
                        type="number"
                        placeholder="e.g., 50"
                        value={editingLocation.totalSlots}
                        onChange={(e) =>
                          setEditingLocation({ ...editingLocation, totalSlots: Number.parseInt(e.target.value) || 0 })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">
                        Google Maps Link (optional)
                      </label>
                      <Input
                        placeholder="e.g., https://maps.google.com/?q=Downtown+Garage"
                        value={editingLocation.mapUrl || ""}
                        onChange={(e) =>
                          setEditingLocation({
                            ...editingLocation,
                            mapUrl: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button
                        variant="outline"
                        className="flex-1 bg-transparent"
                        onClick={() => setIsEditDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button className="flex-1" onClick={handleSaveEditLocation}>
                        Save Changes
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </>
        ) : (
          <>
            {/* Slot Management View */}
            <div className="mb-6">
              <Button
                variant="ghost"
                onClick={() => setSelectedLocationForSlots(null)}
                className="mb-4 animate-slide-up"
              >
                ← Back to Locations
              </Button>

              {selectedLocationData && (
                <>
                  <h1 className="text-3xl font-bold mb-2 animate-fade-in">{selectedLocationData.name}</h1>
                  <p className="text-muted-foreground flex items-center gap-1 mb-6 animate-fade-in">
                    <MapPin className="w-4 h-4" />
                    {selectedLocationData.address}
                  </p>

                  {/* Slot Statistics */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                    <Card className="transition-all hover:shadow-lg animate-slide-up">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground mb-1">Total Slots</p>
                          <p className="text-3xl font-bold">{selectedLocationSlots.length}</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="transition-all hover:shadow-lg animate-slide-up">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground mb-1">Occupied</p>
                          <p className="text-3xl font-bold text-destructive">{occupiedSlotsCount}</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="transition-all hover:shadow-lg animate-slide-up">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground mb-1">Available</p>
                          <p className="text-3xl font-bold text-secondary">
                            {selectedLocationSlots.length - occupiedSlotsCount}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Slots Grid - Read-only view */}
                  <Card className="animate-fade-in">
                    <CardHeader>
                      <CardTitle>Parking Slots</CardTitle>
                      <CardDescription>Slot occupancy overview (read-only)</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-muted/30 p-8 rounded-lg">
                        <div
                          className="grid gap-2"
                          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(60px, 1fr))" }}
                        >
                          {selectedLocationSlots.map((slot, index) => (
                            <div
                              key={slot.id}
                              className={`
                                w-14 h-14 rounded-lg font-semibold text-xs
                                flex items-center justify-center
                                animate-slot-pop
                                ${
                                  slot.isOccupied
                                    ? "bg-red-400 text-black"
                                    : "bg-green-400 text-black"
                                }
                              `}
                              style={{
                                animationDelay: `${index * 20}ms`,
                              }}
                            >
                              {slot.slotNumber}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Legend */}
                      <div className="flex gap-6 mt-6 pt-4 border-t border-border text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-green-400 rounded" />
                          <span>Available</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-red-400 rounded" />
                          <span>Occupied</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </>
        )}
    </div>
  )
}
