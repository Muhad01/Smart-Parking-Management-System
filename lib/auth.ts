import { db } from "./db"
import type { User, AuthSession, UserRole } from "./types"

// Simulate JWT token generation
function generateToken(userId: string): string {
  return `token_${userId}_${Date.now()}`
}

export const auth = {
  signup: (email: string, password: string, role: UserRole): AuthSession => {
    const existing = db.users.findByEmail(email)
    if (existing) {
      throw new Error("User already exists")
    }

    const userId = Date.now().toString()
    const user: User = {
      id: userId,
      email,
      password,
      role,
      createdAt: new Date(),
    }

    db.users.create(user)
    const token = generateToken(userId)

    return { user, token }
  },

  login: (email: string, password: string): AuthSession => {
    console.log("[v0] Login attempt with email:", email)
    const user = db.users.findByEmail(email)
    console.log("[v0] Found user:", user)

    if (!user || user.password !== password) {
      console.log("[v0] Login failed: user not found or password mismatch")
      throw new Error("Invalid credentials")
    }

    console.log("[v0] Login successful for user:", user.email)
    const token = generateToken(user.id)
    return { user, token }
  },

  getSession: (token: string): User | null => {
    const userId = token.split("_")[1]
    return userId ? db.users.findById(userId) : null
  },
}
