"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ParkingSlotGrid } from "@/components/parking-slot-grid"
import type { ParkingLocation, ParkingSlot } from "@/lib/types"
import { Search, LogOut, MapPin } from "lucide-react"

// Mock data
const mockLocations: ParkingLocation[] = [
  { id: "1", name: "Downtown Garage", address: "123 Main St", totalSlots: 50 },
  { id: "2", name: "Airport Parking", address: "456 Terminal Dr", totalSlots: 200 },
  { id: "3", name: "Mall Parking", address: "789 Shopping Center Blvd", totalSlots: 150 },
  { id: "4", name: "Hospital Lot", address: "321 Medical Way", totalSlots: 100 },
  { id: "5", name: "Stadium Parking", address: "555 Game Ave", totalSlots: 300 },
]

const mockSlots: { [key: string]: ParkingSlot[] } = {
  "1": Array.from({ length: 50 }, (_, i) => ({
    id: `1-${i + 1}`,
    locationId: "1",
    slotNumber: i + 1,
    isOccupied: Math.random() > 0.6,
  })),
  "2": Array.from({ length: 200 }, (_, i) => ({
    id: `2-${i + 1}`,
    locationId: "2",
    slotNumber: i + 1,
    isOccupied: Math.random() > 0.5,
  })),
  "3": Array.from({ length: 150 }, (_, i) => ({
    id: `3-${i + 1}`,
    locationId: "3",
    slotNumber: i + 1,
    isOccupied: Math.random() > 0.65,
  })),
  "4": Array.from({ length: 100 }, (_, i) => ({
    id: `4-${i + 1}`,
    locationId: "4",
    slotNumber: i + 1,
    isOccupied: Math.random() > 0.55,
  })),
  "5": Array.from({ length: 300 }, (_, i) => ({
    id: `5-${i + 1}`,
    locationId: "5",
    slotNumber: i + 1,
    isOccupied: Math.random() > 0.7,
  })),
}

export function HomeContent() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)
  const { user, logout } = useAuth()
  const router = useRouter()

  const filteredLocations = useMemo(() => {
    return mockLocations.filter(
      (loc) =>
        loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.address.toLowerCase().includes(searchQuery.toLowerCase()),
    )
  }, [searchQuery])

  const getAvailableSlots = (locationId: string) => {
    const slots = mockSlots[locationId] || []
    return slots.filter((s) => !s.isOccupied).length
  }

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  const handleViewLocation = (locationId: string) => {
    setSelectedLocation(locationId)
  }

  const selectedLocationData = selectedLocation ? mockLocations.find((loc) => loc.id === selectedLocation) : null
  const selectedSlots = selectedLocation ? mockSlots[selectedLocation] : []

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white font-bold">
              P
            </div>
            <span className="text-xl font-bold">SmartPark</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {!selectedLocation ? (
          <>
            {/* Search Section */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Find Parking</h1>
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

                          <Button className="w-full mt-4">View Slots</Button>
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
                  <h1 className="text-3xl font-bold mb-2">{selectedLocationData.name}</h1>
                  <p className="text-muted-foreground flex items-center gap-1 mb-4">
                    <MapPin className="w-4 h-4" />
                    {selectedLocationData.address}
                  </p>

                  {/* Slots Summary */}
                  <Card className="mb-6">
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Slots</p>
                          <p className="text-2xl font-bold">{selectedLocationData.totalSlots}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Available</p>
                          <p className="text-2xl font-bold text-secondary">{getAvailableSlots(selectedLocation)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Occupied</p>
                          <p className="text-2xl font-bold text-destructive">
                            {selectedLocationData.totalSlots - getAvailableSlots(selectedLocation)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

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
