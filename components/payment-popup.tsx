"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface PaymentPopupProps {
  open: boolean
  onClose: () => void
  bookingId: string | null
  amount: number | null
  onPaid: (id: string) => void
}

export function PaymentPopup({ open, onClose, bookingId, amount, onPaid }: PaymentPopupProps) {
  const [paymentMethod, setPaymentMethod] = useState<string>("card")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!bookingId || amount === null) return

    setIsSubmitting(true)
    setMessage(null)

    try {
      // Process payment
      const paymentRes = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          amount,
          method: paymentMethod,
        }),
      })

      if (!paymentRes.ok) {
        throw new Error("Payment failed")
      }

      // Mark booking as paid
      const bookingRes = await fetch("/api/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: bookingId,
          paid: true,
        }),
      })

      if (!bookingRes.ok) {
        throw new Error("Failed to update booking")
      }

      onPaid(bookingId)
      onClose()
    } catch (err) {
      console.error(err)
      setMessage("Something went wrong while processing your payment.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg px-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Process Payment</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              ✕
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Amount to pay</p>
              <p className="text-2xl font-bold">${amount?.toFixed(2) || "0.00"}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Method</label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="card">Credit/Debit Card</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="mobile">Mobile Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              type="button"
              disabled={!bookingId || amount === null || isSubmitting}
              onClick={handleSubmit}
              className="w-full"
            >
              {isSubmitting ? "Processing..." : "Pay Now"}
            </Button>

            {message && <p className="text-xs text-destructive">{message}</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
