"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Booking {
  id: string
  userEmail: string
  locationId: string
  slotNumber: number
  createdAt: string
}

interface Payment {
  id: string
  bookingId: string
  amount: number
  method: string
  status: "success" | "failed"
  createdAt: string
}

export default function AdminAnalyticsPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [payments, setPayments] = useState<Payment[]>([])

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "admin")) {
      router.push("/")
    }
  }, [user, isLoading, router])

  useEffect(() => {
    async function load() {
      const [bRes, pRes] = await Promise.all([fetch("/api/bookings"), fetch("/api/payments")])
      if (bRes.ok) {
        setBookings(await bRes.json())
      }
      if (pRes.ok) {
        setPayments(await pRes.json())
      }
    }
    load()
  }, [])

  if (isLoading || !user || user.role !== "admin") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    )
  }

  const totalRevenue = payments.reduce((sum, p) => (p.status === "success" ? sum + p.amount : sum), 0)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="max-w-5xl mx-auto px-4 py-10 space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight mb-4">Admin Dashboard & Analytics</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Total Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{bookings.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Successful Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{payments.filter((p) => p.status === "success").length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">${totalRevenue.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-xs">
              {bookings.slice(-10).reverse().map((b) => (
                <div key={b.id} className="flex items-center justify-between border-b border-border/40 pb-1 last:border-0">
                  <span>{b.userEmail}</span>
                  <span>
                    Location {b.locationId} · Slot {b.slotNumber}
                  </span>
                  <span className="text-muted-foreground">
                    {new Date(b.createdAt).toLocaleDateString()}{" "}
                    {new Date(b.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
              {bookings.length === 0 && <p className="text-muted-foreground">No bookings yet.</p>}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}


