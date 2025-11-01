export type UserRole = "user" | "admin"

export interface User {
  id: string
  email: string
  password: string
  role: UserRole
  createdAt: Date
}

export interface ParkingLocation {
  id: string
  name: string
  totalSlots: number
  address: string
}

export interface ParkingSlot {
  id: string
  locationId: string
  slotNumber: number
  isOccupied: boolean
}

export interface AuthSession {
  user: User
  token: string
}
