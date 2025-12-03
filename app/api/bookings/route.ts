import { NextResponse } from "next/server"
import { readJsonFile, writeJsonFile } from "@/lib/json-store"
import fs from "fs/promises"
import path from "path"

interface Booking {
  id: string
  userEmail: string
  userName?: string
  locationId: string
  locationName: string
  slotNumber: number
  createdAt: string
  paid?: boolean
  paidAt?: string | null
}

interface BookingsFile {
  bookings: Booking[]
}

interface ParkingDataSlot {
  slotNumber: number
  isOccupied: boolean
}

interface ParkingDataLocation {
  name: string
  address: string
  totalSlots: number
  availableSlots?: number
  occupiedSlots?: number
  slots: ParkingDataSlot[]
}

interface ParkingDataFile {
  locations: ParkingDataLocation[]
}

const FILE_NAME = "bookings.json"

async function updateParkingSlot(locationId: string, slotNumber: number, isOccupied: boolean) {
  try {
    const dataPath = path.join(process.cwd(), "data", "parkingdata.json")
    const file = await fs.readFile(dataPath, "utf-8")
    const parsed = JSON.parse(file) as ParkingDataFile

    const indexStr = locationId.split("_")[1]
    const idx = Number(indexStr) - 1

    if (Number.isNaN(idx) || idx < 0 || idx >= parsed.locations.length) {
      return
    }

    const loc = parsed.locations[idx]
    const slot = loc.slots.find((s) => s.slotNumber === slotNumber)

    if (!slot) {
      return
    }

    slot.isOccupied = isOccupied

    // Recalculate summary fields
    loc.totalSlots = loc.slots.length
    const occupied = loc.slots.filter((s) => s.isOccupied).length
    loc.occupiedSlots = occupied
    loc.availableSlots = loc.totalSlots - occupied

    await fs.writeFile(dataPath, JSON.stringify(parsed, null, 2), "utf-8")
  } catch (e) {
    console.error("Failed to update parkingdata.json from booking:", e)
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const all = searchParams.get("all") === "true"
  
  const data = await readJsonFile<BookingsFile>(FILE_NAME, { bookings: [] })
  
  // Return all bookings if all=true, otherwise only unpaid
  const bookings = all ? data.bookings : data.bookings.filter((b) => !b.paid)
  return NextResponse.json(bookings)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { userEmail, userName, locationId, slotNumber } = body as Partial<Booking>

  if (!userEmail || !locationId || typeof slotNumber !== "number") {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  // Get location name from parkingdata.json
  let locationName = locationId // fallback to locationId if not found
  try {
    const dataPath = path.join(process.cwd(), "data", "parkingdata.json")
    const file = await fs.readFile(dataPath, "utf-8")
    const parsed = JSON.parse(file) as ParkingDataFile

    const indexStr = locationId.split("_")[1]
    const idx = Number(indexStr) - 1

    if (!Number.isNaN(idx) && idx >= 0 && idx < parsed.locations.length) {
      locationName = parsed.locations[idx].name
    }
  } catch (e) {
    console.error("Failed to read location name from parkingdata.json:", e)
  }

  const data = await readJsonFile<BookingsFile>(FILE_NAME, { bookings: [] })

  const booking: Booking = {
    id: `booking_${Date.now()}`,
    userEmail,
    userName: userName || undefined,
    locationId,
    locationName,
    slotNumber,
    createdAt: new Date().toISOString(),
    paid: false,
    paidAt: null,
  }

  data.bookings.push(booking)
  await writeJsonFile(FILE_NAME, data)

  // Mark the slot as occupied in parkingdata.json
  await updateParkingSlot(locationId, slotNumber, true)

  return NextResponse.json(booking, { status: 201 })
}

export async function PATCH(request: Request) {
  const body = await request.json()
  const { id, paid } = body as { id?: string; paid?: boolean }

  if (!id || paid !== true) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  const data = await readJsonFile<BookingsFile>(FILE_NAME, { bookings: [] })
  const booking = data.bookings.find((b) => b.id === id)

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 })
  }

  booking.paid = true
  booking.paidAt = new Date().toISOString()

  await writeJsonFile(FILE_NAME, data)

  // Mark the slot as unoccupied in parkingdata.json
  await updateParkingSlot(booking.locationId, booking.slotNumber, false)

  return NextResponse.json(booking, { status: 200 })
}

