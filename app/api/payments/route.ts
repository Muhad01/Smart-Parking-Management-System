import { NextResponse } from "next/server"
import { readJsonFile, writeJsonFile } from "@/lib/json-store"

interface Payment {
  id: string
  bookingId: string
  amount: number
  method: string
  status: "success" | "failed"
  createdAt: string
}

interface PaymentsFile {
  payments: Payment[]
}

const FILE_NAME = "payments.json"

export async function GET() {
  const data = await readJsonFile<PaymentsFile>(FILE_NAME, { payments: [] })
  return NextResponse.json(data.payments)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { bookingId, amount, method } = body as Partial<Payment>

  if (!bookingId || typeof amount !== "number" || !method) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const data = await readJsonFile<PaymentsFile>(FILE_NAME, { payments: [] })

  const payment: Payment = {
    id: `payment_${Date.now()}`,
    bookingId,
    amount,
    method,
    status: "success",
    createdAt: new Date().toISOString(),
  }

  data.payments.push(payment)
  await writeJsonFile(FILE_NAME, data)

  return NextResponse.json(payment, { status: 201 })
}











