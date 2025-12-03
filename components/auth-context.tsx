"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import type { User, AuthSession, UserRole } from "@/lib/types"

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string, role: UserRole) => Promise<void>
  signup: (email: string, password: string, fullName: string, role: UserRole) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load session from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("authToken")
    const savedUser = localStorage.getItem("authUser")

    if (savedToken && savedUser) {
      try {
        setToken(savedToken)
        setUser(JSON.parse(savedUser))
      } catch {
        localStorage.removeItem("authToken")
        localStorage.removeItem("authUser")
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string, role: UserRole) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      })
      const data = (await res.json()) as { error?: string } & AuthSession
      if (!res.ok) {
        throw new Error(data.error || "Login failed")
      }

      setUser(data.user)
      setToken(data.token)
      localStorage.setItem("authToken", data.token)
      localStorage.setItem("authUser", JSON.stringify(data.user))
    } catch (error) {
      throw error
    }
  }

  const signup = async (email: string, password: string, fullName: string, role: UserRole) => {
    try {
      // All new signups are always regular users, not admins
      // The role parameter is kept for API compatibility but ignored
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, fullName }),
      })
      const data = (await res.json()) as { error?: string } & AuthSession
      if (!res.ok) {
        throw new Error(data.error || "Signup failed")
      }

      setUser(data.user)
      setToken(data.token)
      localStorage.setItem("authToken", data.token)
      localStorage.setItem("authUser", JSON.stringify(data.user))
    } catch (error) {
      throw error
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem("authToken")
    localStorage.removeItem("authUser")
  }

  return (
    <AuthContext.Provider value={{ user, token, login, signup, logout, isLoading }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
