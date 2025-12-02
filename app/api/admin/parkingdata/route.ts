import { NextResponse } from "next/server"
import path from "path"
import fs from "fs/promises"

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

// Simple admin endpoint to overwrite parkingdata.json
export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as ParkingDataFile

    if (!body || !Array.isArray(body.locations)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    // Basic validation of structure
    for (const loc of body.locations) {
      if (
        typeof loc.name !== "string" ||
        typeof loc.address !== "string" ||
        typeof loc.totalSlots !== "number" ||
        !Array.isArray(loc.slots)
      ) {
        return NextResponse.json({ error: "Invalid location structure" }, { status: 400 })
      }
    }

    const dataPath = path.join(process.cwd(), "data", "parkingdata.json")
    await fs.writeFile(dataPath, JSON.stringify(body, null, 2), "utf-8")

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err) {
    console.error("Error writing parkingdata.json from admin:", err)
    return NextResponse.json({ error: "Failed to save parking data" }, { status: 500 })
  }
}



