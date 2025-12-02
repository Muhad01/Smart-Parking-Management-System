import { NextResponse } from "next/server"
import { readJsonFile, writeJsonFile } from "@/lib/json-store"
import type { User, UserRole, AuthSession } from "@/lib/types"
import { db } from "@/lib/db"

interface AuthUserRecord {
  id: string
  email: string
  password: string
  role: UserRole
  createdAt: string
}

interface AuthFile {
  users: AuthUserRecord[]
}

const FILE_NAME = "auth.json"

function generateToken(userId: string): string {
  return `token_${userId}_${Date.now()}`
}

export async function POST(request: Request) {
  const body = await request.json()
  const { email, password, role } = body as { email?: string; password?: string; role?: UserRole }

  if (!email || !password || !role) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const data = await readJsonFile<AuthFile>(FILE_NAME, { users: [] })

  let record = data.users.find((u) => u.email === email)

  // If not in auth.json yet, fall back to seeded demo users and persist them
  if (!record) {
    const seeded = db.users.findByEmail(email)
    if (seeded && seeded.password === password) {
      record = {
        id: seeded.id,
        email: seeded.email,
        password: seeded.password,
        role: seeded.role,
        createdAt: seeded.createdAt.toISOString(),
      }
      data.users.push(record)
      await writeJsonFile(FILE_NAME, data)
    }
  }

  if (!record || record.password !== password) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
  }

  if (record.role !== role) {
    return NextResponse.json({ error: "Selected role does not match this account" }, { status: 401 })
  }

  const user: User = {
    id: record.id,
    email: record.email,
    password: record.password,
    role: record.role,
    createdAt: new Date(record.createdAt),
  }

  const session: AuthSession = {
    user,
    token: generateToken(user.id),
  }

  return NextResponse.json(session)
}





