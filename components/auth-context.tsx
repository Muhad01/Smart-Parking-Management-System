"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { auth } from "@/lib/auth"
import type { User } from "@/lib/types"

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => void
  signup: (email: string, password: string, role: "user" | "admin") => void
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

  const login = (email: string, password: string) => {
    try {
      const session = auth.login(email, password)
      setUser(session.user)
      setToken(session.token)
      localStorage.setItem("authToken", session.token)
      localStorage.setItem("authUser", JSON.stringify(session.user))
    } catch (error) {
      throw error
    }
  }

  const signup = (email: string, password: string, role: "user" | "admin") => {
    try {
      const session = auth.signup(email, password, role)
      setUser(session.user)
      setToken(session.token)
      localStorage.setItem("authToken", session.token)
      localStorage.setItem("authUser", JSON.stringify(session.user))
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
