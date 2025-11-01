import type { ParkingLocation, ParkingSlot, User } from "./types"

// In-memory database (will use localStorage for persistence)
interface AppData {
  users: Map<string, User>
  locations: Map<string, ParkingLocation>
  slots: Map<string, ParkingSlot>
}

const appData: AppData = {
  users: new Map(),
  locations: new Map(),
  slots: new Map(),
}

// Initialize with mock data
function initializeMockData() {
  const demoUsers: User[] = [
    {
      id: "user_demo_1",
      email: "user@example.com",
      password: "password",
      role: "user",
      createdAt: new Date(),
    },
    {
      id: "admin_demo_1",
      email: "admin@example.com",
      password: "password",
      role: "admin",
      createdAt: new Date(),
    },
  ]

  demoUsers.forEach((user) => {
    appData.users.set(user.id, user)
    appData.users.set(user.email, user)
  })

  const mockLocations: ParkingLocation[] = [
    { id: "1", name: "Downtown Garage A", totalSlots: 50, address: "123 Main St" },
    { id: "2", name: "Mall Parking Lot B", totalSlots: 100, address: "456 Shopping Ave" },
    { id: "3", name: "Airport Garage C", totalSlots: 200, address: "789 Airport Rd" },
  ]

  mockLocations.forEach((loc) => {
    appData.locations.set(loc.id, loc)
    for (let i = 1; i <= loc.totalSlots; i++) {
      const slotId = `${loc.id}-${i}`
      const isOccupied = Math.random() > 0.6
      appData.slots.set(slotId, {
        id: slotId,
        locationId: loc.id,
        slotNumber: i,
        isOccupied,
      })
    }
  })
}

if (appData.users.size === 0) {
  initializeMockData()
}

export const db = {
  users: {
    create: (user: User) => {
      appData.users.set(user.id, user)
      appData.users.set(user.email, user)
      return user
    },
    findByEmail: (email: string) => {
      const user = appData.users.get(email)
      if (user && typeof user === "object" && "email" in user && user.email === email) {
        return user
      }
      return Array.from(appData.users.values()).find((u) => typeof u === "object" && "email" in u && u.email === email)
    },
    findById: (id: string) => appData.users.get(id),
  },
  locations: {
    getAll: () => Array.from(appData.locations.values()),
    getById: (id: string) => appData.locations.get(id),
    create: (location: Omit<ParkingLocation, "id">) => {
      const id = Date.now().toString()
      const newLocation: ParkingLocation = { ...location, id }
      appData.locations.set(id, newLocation)
      return newLocation
    },
    update: (id: string, location: Partial<ParkingLocation>) => {
      const existing = appData.locations.get(id)
      if (existing) {
        const updated = { ...existing, ...location }
        appData.locations.set(id, updated)
        return updated
      }
      return null
    },
    delete: (id: string) => {
      appData.locations.delete(id)
      Array.from(appData.slots.values())
        .filter((s) => s.locationId === id)
        .forEach((s) => appData.slots.delete(s.id))
    },
  },
  slots: {
    getByLocationId: (locationId: string) => {
      return Array.from(appData.slots.values()).filter((s) => s.locationId === locationId)
    },
    updateStatus: (slotId: string, isOccupied: boolean) => {
      const slot = appData.slots.get(slotId)
      if (slot) {
        slot.isOccupied = isOccupied
        return slot
      }
      return null
    },
    getFreeSlots: (locationId: string) => {
      return Array.from(appData.slots.values()).filter((s) => s.locationId === locationId && !s.isOccupied)
    },
  },
}
