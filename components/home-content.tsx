"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ParkingSlotGrid } from "@/components/parking-slot-grid"
import type { ParkingLocation, ParkingSlot } from "@/lib/types"
import { Search, LogOut, MapPin, Radio, Navigation } from "lucide-react"

const DEFAULT_MAP_URL = "https://maps.google.com/"

export function HomeContent() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)
  const [locations, setLocations] = useState<ParkingLocation[]>([])
  const [slotsByLocation, setSlotsByLocation] = useState<Record<string, ParkingSlot[]>>({})
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const { user, logout } = useAuth()
  const router = useRouter()

  // Load locations and slots from parkingdata.json via API and keep them updated in real-time
  useEffect(() => {
    let timeoutId: NodeJS.Timeout
    let isMounted = true

    const fetchData = async () => {
      if (!isMounted) return

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

        if (!isMounted) return

        setLocations(data.locations)

        const map: Record<string, ParkingSlot[]> = {}
        data.slots.forEach((slot) => {
          if (!map[slot.locationId]) {
            map[slot.locationId] = []
          }
          map[slot.locationId].push(slot)
        })
        setSlotsByLocation(map)
        setLastUpdate(new Date())
      } catch (e) {
        console.error("Failed to fetch locations:", e)
      } finally {
        // Poll every 200ms for ultra-fast real-time updates when parkingdata.json changes
        if (isMounted) {
          timeoutId = setTimeout(fetchData, 200)
        }
      }
    }

    fetchData()

    return () => {
      isMounted = false
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [])

  const filteredLocations = useMemo(() => {
    return locations.filter(
      (loc) =>
        loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.address.toLowerCase().includes(searchQuery.toLowerCase()),
    )
  }, [searchQuery, locations])

  const getAvailableSlots = (locationId: string) => {
    const slots = slotsByLocation[locationId] || []
    return slots.filter((s) => !s.isOccupied).length
  }

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  const handleNavigate = (mapUrl?: string) => {
    const targetUrl = mapUrl || DEFAULT_MAP_URL
    if (typeof window !== "undefined") {
      window.open(targetUrl, "_blank", "noopener,noreferrer")
    }
  }

  const handleViewLocation = (locationId: string) => {
    setSelectedLocation(locationId)
  }

  const selectedLocationData = selectedLocation ? locations.find((loc) => loc.id === selectedLocation) : null
  const selectedSlots = selectedLocation ? slotsByLocation[selectedLocation] || [] : []

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-6xl mx-auto px-4 py-8">
        {!selectedLocation ? (
          <>
            {/* Search Section */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">Find Parking</h1>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Radio className="h-3 w-3 text-green-500 animate-pulse" />
                  <span>Live updates</span>
                </div>
              </div>
              <p className="text-muted-foreground mb-6">Search for available parking locations near you</p>

              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <Input
                    placeholder="Search by location name or address..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 py-2 h-12"
                  />
                </div>
              </div>
            </div>

            {/* Locations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLocations.length > 0 ? (
                filteredLocations.map((location) => {
                  const availableSlots = getAvailableSlots(location.id)
                  const occupancyRate = ((location.totalSlots - availableSlots) / location.totalSlots) * 100

                  return (
                    <Card
                      key={location.id}
                      className="hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => handleViewLocation(location.id)}
                    >
                      <CardHeader>
                        <CardTitle className="text-lg">{location.name}</CardTitle>
                        <CardDescription className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {location.address}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Available Slots</span>
                            <span className="text-2xl font-bold text-secondary">
                              {availableSlots}/{location.totalSlots}
                            </span>
                          </div>

                          {/* Occupancy bar */}
                          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-secondary h-full transition-all"
                              style={{ width: `${100 - occupancyRate}%` }}
                            />
                          </div>

                          <p className="text-xs text-muted-foreground">{occupancyRate.toFixed(0)}% occupied</p>
                          <div className="flex gap-2 mt-4">
                            <Button className="flex-1" onClick={() => handleViewLocation(location.id)}>
                              View Slots
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleNavigate(location.mapUrl)
                              }}
                              title="Open in maps"
                            >
                              <Navigation className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              ) : (
                <div className="col-span-full text-center py-12">
                  <p className="text-muted-foreground">No locations found matching your search.</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Location Details */}
            <div className="mb-6">
              <Button variant="ghost" onClick={() => setSelectedLocation(null)} className="mb-4">
                ← Back to Locations
              </Button>

              {selectedLocationData && (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div>
                      <h1 className="text-3xl font-bold mb-2">{selectedLocationData.name}</h1>
                      <p className="text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {selectedLocationData.address}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="flex items-center gap-2"
                      onClick={() => handleNavigate(selectedLocationData.mapUrl)}
                    >
                      <Navigation className="w-4 h-4" />
                      Navigate
                    </Button>
                  </div>

                  {/* Slots Summary */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground mb-1">Total Slots</p>
                          <p className="text-3xl font-bold">{selectedLocationData.totalSlots}</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground mb-1">Available</p>
                          <p className="text-3xl font-bold text-secondary">{getAvailableSlots(selectedLocation)}</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground mb-1">Occupied</p>
                          <p className="text-3xl font-bold text-destructive">
                            {selectedLocationData.totalSlots - getAvailableSlots(selectedLocation)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Parking Slots Grid */}
                  <ParkingSlotGrid slots={selectedSlots} locationName={selectedLocationData.name} />
                </>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
