"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface LoginFormProps {
  initialMode?: "login" | "signup"
}

export function LoginForm({ initialMode = "login" }: LoginFormProps) {
  const [mode, setMode] = useState<"login" | "signup">(initialMode)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<"user" | "admin">("user")
  const [error, setError] = useState("")
  const [stayLoggedIn, setStayLoggedIn] = useState(false)
  const { login, signup } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    try {
      if (mode === "login") {
        login(email, password)
      } else {
        signup(email, password, role)
      }
      router.push(role === "admin" ? "/admin" : "/home")
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    }
  }

  const handleDemoUserLogin = () => {
    setEmail("user@example.com")
    setPassword("password")
    setMode("login")
    setError("")
  }

  const handleDemoAdminLogin = () => {
    setEmail("admin@example.com")
    setPassword("password")
    setMode("login")
    setError("")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white font-bold">
              P
            </div>
            <span className="text-xl font-bold">SmartPark</span>
          </div>
          <CardTitle>{mode === "login" ? "Welcome Back" : "Create Account"}</CardTitle>
          <CardDescription>
            {mode === "login" ? "Sign in to manage your parking" : "Join SmartPark to get started"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Email</label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Password</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {mode === "login" && (
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">I am a</label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={role === "user" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setRole("user")}
                  >
                    User
                  </Button>
                  <Button
                    type="button"
                    variant={role === "admin" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setRole("admin")}
                  >
                    Admin
                  </Button>
                </div>
              </div>
            )}

            {mode === "login" && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="stayLoggedIn"
                  checked={stayLoggedIn}
                  onChange={(e) => setStayLoggedIn(e.target.checked)}
                  className="rounded border-border"
                />
                <label htmlFor="stayLoggedIn" className="text-sm text-muted-foreground">
                  Stay logged in
                </label>
              </div>
            )}

            {error && <div className="text-foreground text-sm">{error}</div>}

            <Button type="submit" className="w-full">
              {mode === "login" ? "Sign In" : "Create Account"}
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-card px-2 text-muted-foreground">
                  {mode === "login" ? "Don't have an account?" : "Already have an account?"}
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full bg-transparent"
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login")
                setError("")
              }}
            >
              {mode === "login" ? "Sign Up" : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-muted rounded-lg space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Quick Demo Login:</p>
            <Button
              type="button"
              variant="outline"
              className="w-full text-sm bg-transparent"
              onClick={() => {
                handleDemoUserLogin()
              }}
            >
              Try as User
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full text-sm bg-transparent"
              onClick={() => {
                handleDemoAdminLogin()
              }}
            >
              Try as Admin
            </Button>
            <p className="text-xs text-muted-foreground pt-2 border-t border-border">
              Email: user@example.com or admin@example.com
              <br />
              Password: password
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
