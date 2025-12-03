"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/components/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
  Search,
  CheckCircle2,
  XCircle,
  Filter,
  ChevronLeft,
  ChevronRight,
  MapPin,
  LogOut,
  ClipboardList,
  CalendarDays,
} from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"

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

type IncomeRange = "daily" | "weekly" | "monthly"

const incomeChartConfig: ChartConfig = {
  income: {
    label: "Income",
    color: "hsl(var(--chart-1))",
  },
}

export default function BookingStatusPage() {
  const { user, isLoading, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [expanded, setExpanded] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("navbar-expanded")
      return saved !== null ? saved === "true" : true
    }
    return true
  })

  const [bookings, setBookings] = useState<Booking[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [showUnpaidOnly, setShowUnpaidOnly] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "admin")) {
      router.push("/")
    }
  }, [user, isLoading, router])

  useEffect(() => {
    let timeoutId: NodeJS.Timeout
    let isMounted = true

    const fetchData = async () => {
      if (!isMounted) return

      try {
        const timestamp = Date.now()
        const bookingsRes = await fetch(`/api/bookings?all=true&t=${timestamp}`, {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
          },
        })

        if (!bookingsRes.ok) return

        const bookingsData = (await bookingsRes.json()) as Booking[]

        if (!isMounted) return
        setBookings(bookingsData)
      } catch (e) {
        console.error("Failed to fetch bookings:", e)
      } finally {
        if (isMounted) {
          // Short interval so bookings and income chart feel realtime
          timeoutId = setTimeout(fetchData, 1000)
        }
      }
    }

    fetchData()

    return () => {
      isMounted = false
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [])

  // Tick every second so timers and unpaid amounts update
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const computeFee = (createdAt: string, endTimestampMs: number) => {
    const startedAt = new Date(createdAt).getTime()
    const ms = Math.max(0, endTimestampMs - startedAt)
    const minutes = ms / (1000 * 60)
    const halfHours = Math.ceil(minutes / 30) // Round up to nearest half hour
    const fee = Math.max(1, halfHours * 1) // $1 per half hour, minimum $1
    return fee
  }

  const formatDuration = (createdAt: string, endTimestampMs: number) => {
    const startedAt = new Date(createdAt).getTime()
    const elapsedMs = Math.max(0, endTimestampMs - startedAt)
    const totalSeconds = Math.floor(elapsedMs / 1000)
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    const s = totalSeconds % 60
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }

  const paidCount = bookings.filter((b) => b.paid).length
  const unpaidCount = bookings.filter((b) => !b.paid).length
  const totalCount = bookings.length
  const paidPercent = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0
  const unpaidPercent = totalCount > 0 ? 100 - paidPercent : 0
  // Total income computed directly from bookings.json:
  // for each paid booking, recompute fee from createdAt to paidAt using the same pricing logic.
  const totalIncome = useMemo(
    () =>
      bookings
        .filter((b) => b.paid && b.paidAt)
        .reduce((sum, b) => {
          const paidAtMs = new Date(b.paidAt as string).getTime()
          return sum + computeFee(b.createdAt, paidAtMs)
        }, 0),
    [bookings],
  )

  const unpaidCashPile = useMemo(
    () =>
      bookings
        .filter((b) => !b.paid)
        .reduce((sum, b) => sum + computeFee(b.createdAt, now), 0),
    [bookings, now],
  )

  const incomeChartData = useMemo(() => {
    const monthStart = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1)
    const monthEnd = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0)
    const daysInMonth = monthEnd.getDate()

    // Initialize buckets for every day in the selected month so upcoming/empty days are still visible.
    const buckets: { label: string; income: number; date: Date }[] = []
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), day)
      buckets.push({
        label: currentDate.toLocaleDateString(undefined, {
          day: "2-digit",
        }),
        income: 0,
        date: currentDate,
      })
    }

    const paidBookings = bookings.filter((b) => b.paid && b.paidAt)
    if (!paidBookings.length) return buckets

    for (const booking of paidBookings) {
      const paidAt = new Date(booking.paidAt as string)

      if (
        paidAt.getFullYear() !== selectedMonth.getFullYear() ||
        paidAt.getMonth() !== selectedMonth.getMonth()
      ) {
        continue
      }

      const dayIndex = paidAt.getDate() - 1
      if (dayIndex < 0 || dayIndex >= buckets.length) continue

      const amount = computeFee(booking.createdAt, paidAt.getTime())
      buckets[dayIndex].income += amount
    }

    return buckets.map(({ label, income }) => ({ label, income }))
  }, [bookings, selectedMonth])

  const incomeInRangeTotal = useMemo(
    () => incomeChartData.reduce((sum, item) => sum + item.income, 0),
    [incomeChartData],
  )

  const filteredBookings = useMemo(() => {
    let filtered = bookings

    if (showUnpaidOnly) {
      filtered = filtered.filter((b) => !b.paid)
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (b) =>
          b.userEmail.toLowerCase().includes(q) ||
          (b.userName || "").toLowerCase().includes(q) ||
          (b.locationName || b.locationId).toLowerCase().includes(q) ||
          String(b.slotNumber).includes(q),
      )
    }

    return filtered
  }, [bookings, showUnpaidOnly, searchQuery])

  if (isLoading || !user || user.role !== "admin") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    )
  }

  const content = (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Booking Status</h1>
        <p className="text-muted-foreground">View and manage all parking bookings</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Paid Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{paidCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Income from paid bookings: <span className="font-semibold">${totalIncome.toFixed(2)}</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Unpaid Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{unpaidCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Unpaid amount (if settled now):{" "}
              <span className="font-semibold">${unpaidCashPile.toFixed(2)}</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">${totalIncome.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Sum of all successful payments</p>
          </CardContent>
        </Card>
      </div>

      {/* Income Chart */}
      <Card className="mb-8">
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Income by Day</CardTitle>
            <CardDescription>
              Track how much you&apos;re earning from completed bookings for a specific month, day by day
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Total in selected range</p>
              <p className="text-xl font-semibold text-emerald-600">
                ${incomeInRangeTotal.toFixed(2)}
              </p>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <CalendarDays className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {selectedMonth.toLocaleDateString(undefined, {
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  <span className="sm:hidden">
                    {selectedMonth.toLocaleDateString(undefined, {
                      month: "short",
                      year: "2-digit",
                    })}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedMonth}
                  onSelect={(date) => {
                    if (!date) return
                    setSelectedMonth(new Date(date.getFullYear(), date.getMonth(), 1))
                  }}
                  month={selectedMonth}
                  onMonthChange={(month) =>
                    setSelectedMonth(new Date(month.getFullYear(), month.getMonth(), 1))
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent>
          {incomeChartData.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No income data available yet. This chart will come to life once there are paid bookings.
            </p>
          ) : (
            <ChartContainer config={incomeChartConfig} className="w-full h-[280px]">
              <BarChart
                data={incomeChartData}
                margin={{ left: 16, right: 16, top: 24, bottom: 8 }}
                barCategoryGap="20%"
              >
                <defs>
                  <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="4 4" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value: number) =>
                    value >= 1000 ? `$${(value / 1000).toFixed(1)}k` : `$${value.toFixed(0)}`
                  }
                />
                <ChartTooltip
                  cursor={{ fill: "hsl(var(--muted))" }}
                  content={
                    <ChartTooltipContent
                      indicator="dot"
                      labelFormatter={(_, payload) => {
                        const first = payload?.[0]?.payload as { label?: string } | undefined
                        return first?.label ?? ""
                      }}
                      formatter={(value) => {
                        const amount = Number(value ?? 0)
                        return (
                          <span className="font-semibold text-foreground">
                            ${amount.toFixed(2)}
                          </span>
                        )
                      }}
                    />
                  }
                />
                <Bar
                  dataKey="income"
                  fill="url(#incomeGradient)"
                  radius={[6, 6, 2, 2]}
                  maxBarSize={42}
                />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Donut Chart Visualization */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Booking Status Overview</CardTitle>
          <CardDescription>Visual representation of paid vs unpaid bookings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="relative flex items-center justify-center">
              <div
                className="w-56 h-56 rounded-full"
                style={{
                  background: `conic-gradient(#22c55e 0% ${paidPercent}%, #ef4444 ${paidPercent}% 100%)`,
                }}
              />
              <div className="absolute w-40 h-40 bg-background rounded-full flex flex-col items-center justify-center text-center shadow-inner">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-3xl font-bold">{totalCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Bookings tracked</p>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-lg font-bold">
                  {paidPercent}%
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Paid Bookings</p>
                  <p className="text-2xl font-bold text-green-600">{paidCount}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-lg font-bold">
                  {unpaidPercent}%
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Unpaid Bookings</p>
                  <p className="text-2xl font-bold text-red-600">{unpaidCount}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Goal</p>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div className="bg-green-500 h-full transition-all" style={{ width: `${paidPercent}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Aim for 100% paid bookings · Currently {paidPercent}%
                </p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Attention Needed</p>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div className="bg-red-500 h-full transition-all" style={{ width: `${unpaidPercent}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Unpaid bookings require follow-up · {unpaidCount} pending
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters and Search */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input
            placeholder="Search by email, location, or slot..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 py-2 h-11"
          />
        </div>
        <Button
          variant={showUnpaidOnly ? "default" : "outline"}
          onClick={() => setShowUnpaidOnly(!showUnpaidOnly)}
          className="gap-2"
        >
          <Filter className="w-4 h-4" />
          {showUnpaidOnly ? "Show All" : "Show Unpaid Only"}
        </Button>
      </div>

      {/* Bookings List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBookings.length === 0 ? (
          <div className="col-span-full text-center py-12 text-sm text-muted-foreground">
            {showUnpaidOnly
              ? "No unpaid bookings found."
              : searchQuery
                ? "No bookings match your search."
                : "No bookings found."}
          </div>
        ) : (
          filteredBookings
            .slice()
            .reverse()
                .map((booking) => {
              const bookingDate = new Date(booking.createdAt)
              const paidDate = booking.paidAt ? new Date(booking.paidAt) : null
              const isPaid = Boolean(booking.paid)
              const elapsedStr = !isPaid ? formatDuration(booking.createdAt, now) : null
              const unpaidFee = !isPaid ? computeFee(booking.createdAt, now) : null
              const paidAmount =
                isPaid && booking.paidAt
                  ? computeFee(booking.createdAt, new Date(booking.paidAt).getTime())
                  : null

              return (
                <Card key={booking.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <span>{booking.locationName}</span>
                          {isPaid ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500" />
                          )}
                        </CardTitle>
                        <CardDescription className="text-xs mt-1">
                          Slot {booking.slotNumber} · {booking.userName || booking.userEmail}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-xs text-muted-foreground">
                      <p>
                        Booked on{" "}
                        {bookingDate.toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                      {isPaid && paidDate && (
                        <p>
                          Paid on{" "}
                          {paidDate.toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </p>
                      )}
                      {isPaid && paidAmount != null && (
                        <p>
                          Amount paid:{" "}
                          <span className="font-semibold">
                            ${paidAmount.toFixed(2)}
                          </span>
                        </p>
                      )}
                      {!isPaid && elapsedStr && unpaidFee != null && (
                        <>
                          <p>Time since booking: {elapsedStr}</p>
                          <p>
                            Current unpaid amount:{" "}
                            <span className="font-semibold">${unpaidFee.toFixed(2)}</span>
                          </p>
                        </>
                      )}
                      <div className="pt-2">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            isPaid
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                          }`}
                        >
                          {isPaid ? "Paid" : "Unpaid"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
        )}
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`border-r border-border bg-card/90 backdrop-blur flex flex-col justify-between transition-all duration-200 flex-shrink-0 ${
          expanded ? "w-60" : "w-18"
        }`}
      >
        <div>
          <div className="flex items-center px-3 py-4">
            {expanded ? (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-foreground rounded-lg flex items-center justify-center text-background text-xs font-bold">
                  A
                </div>
                <span className="text-sm font-semibold tracking-tight">Location Status</span>
              </div>
            ) : (
              <div className="w-8 h-8 bg-foreground rounded-lg flex items-center justify-center text-background text-xs font-bold">
                A
              </div>
            )}
          </div>
          <nav className="px-2 space-y-1 text-xs pt-2">
            <Button
              type="button"
              variant={pathname === "/admin" ? "secondary" : "ghost"}
              size="sm"
              className="w-full justify-start"
              onClick={() => router.push("/admin")}
            >
              {expanded ? "Location Status" : <MapPin className="h-4 w-4" />}
            </Button>
            <Button
              type="button"
              variant={pathname === "/admin/booking-status" ? "secondary" : "ghost"}
              size="sm"
              className="w-full justify-start"
              onClick={() => router.push("/admin/booking-status")}
            >
              {expanded ? "Booking Status" : <ClipboardList className="h-4 w-4" />}
            </Button>
          </nav>
        </div>

        <div className="px-3 py-4 border-t border-border text-[11px] space-y-3">
          <div className="flex items-center justify-between">
            {expanded && (
              <p className="text-muted-foreground truncate text-[11px]" title={user?.fullName || user?.email || ""}>
                {user?.fullName || user?.email}
              </p>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full border border-border"
              onClick={() => {
                setExpanded((v) => {
                  const newValue = !v
                  if (typeof window !== "undefined") {
                    localStorage.setItem("navbar-expanded", String(newValue))
                  }
                  return newValue
                })
              }}
            >
              {expanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>

          <div className="border-t border-border pt-2 space-y-2">
            {expanded && !user && <p className="text-muted-foreground">Not signed in</p>}
            {expanded && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  logout()
                  router.push("/")
                }}
              >
                Logout
              </Button>
            )}
            {!expanded && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 w-full justify-center"
                onClick={() => {
                  logout()
                  router.push("/")
                }}
                aria-label="Logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 h-full overflow-y-auto">{content}</main>
    </div>
  )
}