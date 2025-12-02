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
  const { email, password } = body as { email?: string; password?: string }

  if (!email || !password) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  // Force all new signups to be regular users, not admins
  const role: UserRole = "user"

  const data = await readJsonFile<AuthFile>(FILE_NAME, { users: [] })

  if (data.users.some((u) => u.email === email)) {
    return NextResponse.json({ error: "User already exists" }, { status: 400 })
  }

  const userId = Date.now().toString()
  const record: AuthUserRecord = {
    id: userId,
    email,
    password,
    role,
    createdAt: new Date().toISOString(),
  }

  data.users.push(record)
  await writeJsonFile(FILE_NAME, data)

  // Keep in-memory db in sync
  const user: User = {
    id: userId,
    email,
    password,
    role,
    createdAt: new Date(record.createdAt),
  }
  db.users.create(user)

  const session: AuthSession = {
    user,
    token: generateToken(userId),
  }

  return NextResponse.json(session, { status: 201 })
}




