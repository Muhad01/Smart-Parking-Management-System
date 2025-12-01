import { NextResponse } from "next/server"
import { readJsonFile, writeJsonFile } from "@/lib/json-store"

interface Booking {
  id: string
  userEmail: string
  locationId: string
  slotNumber: number
  createdAt: string
}

interface BookingsFile {
  bookings: Booking[]
}

const FILE_NAME = "bookings.json"

export async function GET() {
  const data = await readJsonFile<BookingsFile>(FILE_NAME, { bookings: [] })
  return NextResponse.json(data.bookings)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { userEmail, locationId, slotNumber } = body as Partial<Booking>

  if (!userEmail || !locationId || typeof slotNumber !== "number") {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const data = await readJsonFile<BookingsFile>(FILE_NAME, { bookings: [] })

  const booking: Booking = {
    id: `booking_${Date.now()}`,
    userEmail,
    locationId,
    slotNumber,
    createdAt: new Date().toISOString(),
  }

  data.bookings.push(booking)
  await writeJsonFile(FILE_NAME, data)

  return NextResponse.json(booking, { status: 201 })
}


