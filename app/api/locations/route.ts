import { NextResponse } from "next/server"
import path from "path"
import fs from "fs/promises"
import type { ParkingLocation, ParkingSlot } from "@/lib/types"

interface ParkingDataLocation {
  name: string
  address: string
  totalSlots: number
  mapUrl?: string
  slots: {
    slotNumber: number
    isOccupied: boolean
  }[]
}

interface ParkingDataFile {
  locations: ParkingDataLocation[]
}

export async function GET() {
  try {
    const dataPath = path.join(process.cwd(), "data", "parkingdata.json")
    const file = await fs.readFile(dataPath, "utf-8")
    const parsed = JSON.parse(file) as ParkingDataFile

    const locations: ParkingLocation[] = []
    const slots: ParkingSlot[] = []

    parsed.locations.forEach((location, index) => {
      const locationId = `loc_${index + 1}`

      locations.push({
        id: locationId,
        name: location.name,
        address: location.address,
        totalSlots: location.totalSlots,
        mapUrl: location.mapUrl,
      })

      location.slots.forEach((slot) => {
        slots.push({
          id: `${locationId}-${slot.slotNumber}`,
          locationId,
          slotNumber: slot.slotNumber,
          isOccupied: slot.isOccupied,
        })
      })
    })

    // Return with no-cache headers to ensure real-time updates
    return NextResponse.json(
      { locations, slots },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    )
  } catch (err) {
    console.error("Error reading parkingdata.json:", err)
    return NextResponse.json({ error: "Failed to load parking data" }, { status: 500 })
  }
}




