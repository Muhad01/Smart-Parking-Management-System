"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

interface PaymentPopupProps {
  open: boolean
  onClose: () => void
  bookingId: string | null
  amount: number | null
  onPaid: (bookingId: string) => void
}

export function PaymentPopup({ open, onClose, bookingId, amount, onPaid }: PaymentPopupProps) {
  const [cardNumber, setCardNumber] = useState("")
  const [expiry, setExpiry] = useState("")
  const [cvv, setCvv] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  if (!open || !bookingId || amount == null) return null

  const handlePay = async () => {
    if (!cardNumber || !expiry || !cvv) {
      setMessage("Please fill in all payment details.")
      return
    }
    setIsSubmitting(true)
    setMessage(null)

    try {
      const paymentRes = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          amount,
          method: "card",
        }),
      })

      if (!paymentRes.ok) {
        throw new Error("Payment failed")
      }

      const patchRes = await fetch("/api/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: bookingId, paid: true }),
      })

      if (!patchRes.ok) {
        throw new Error("Failed to mark booking as paid")
      }

      onPaid(bookingId)
      setMessage("Payment successful.")
      onClose()
    } catch (e) {
      console.error(e)
      setMessage("Something went wrong while processing payment.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md px-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Pay for Booking</CardTitle>
              <CardDescription>Enter your payment details to finish and free the slot.</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              ✕
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">
              Amount due: <span className="font-semibold">${amount.toFixed(2)}</span>
            </p>
            <div className="space-y-2">
              <label className="text-xs font-medium">Card number</label>
              <Input
                placeholder="1234 5678 9012 3456"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-medium">Expiry</label>
                <Input
                  placeholder="MM/YY"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium">CVV</label>
                <Input
                  placeholder="123"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value)}
                />
              </div>
            </div>
            <Button
              className="w-full mt-2"
              type="button"
              disabled={isSubmitting}
              onClick={handlePay}
            >
              {isSubmitting ? "Processing..." : "Pay"}
            </Button>
            {message && <p className="text-xs text-muted-foreground">{message}</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}







