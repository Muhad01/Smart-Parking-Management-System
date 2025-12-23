"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-context"
import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [modeParam, setModeParam] = useState<"login" | "signup">("login")

  useEffect(() => {
    // Read search params from URL on client side only
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const mode = params.get("mode") === "signup" ? "signup" : "login"
      setModeParam(mode)
    }
  }, [])

  useEffect(() => {
    if (!isLoading && user) {
      router.push(user.role === "admin" ? "/admin" : "/home")
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    )
  }

  return <LoginForm initialMode={modeParam} />
}


