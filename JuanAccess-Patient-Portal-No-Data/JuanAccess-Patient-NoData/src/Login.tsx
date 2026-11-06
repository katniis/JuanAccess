import { useState } from "react"
import type { UserRole } from "./types"
import { BrandLogo, Button, Card } from "./components"

interface LoginProps {
  role: UserRole
  onLogin: (role: UserRole) => void
}

export default function Login({ role, onLogin }: LoginProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    // Frontend-only demo behavior: accept non-empty credentials until API auth is connected.
    setTimeout(() => {
      if (email.trim() && password.length >= 1) onLogin(role)
      else setError("Enter your email and password to continue.")
      setLoading(false)
    }, 300)
  }

  const emailError = ""
  const passwordError = error
  const canSubmit = email.trim().length > 0 && password.length > 0 && !loading

  return (
    <div className="flex min-h-dvh overflow-y-auto bg-gradient-to-br from-brand-700 via-brand-600 to-teal-600 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pt-[max(1.5rem,env(safe-area-inset-top))] lg:px-10 lg:pb-[max(2rem,env(safe-area-inset-bottom))] lg:pt-[max(2rem,env(safe-area-inset-top))]">
      <div className="mx-auto my-auto w-full max-w-[1200px] animate-fade-in">
        {/* Logo */}
        <div className="mb-6 text-center leading-[1.2]">
          <div className="mx-auto mb-2 w-fit max-w-full rounded-2xl bg-white px-5 py-3 shadow-lg">
            <BrandLogo className="w-[clamp(11rem,22vw,15rem)] max-w-full" />
          </div>
          <p className="mt-2 text-[clamp(14px,1.6vw,18px)] font-medium text-white/90">
            {role === "patient" ? "Patient Portal" : "Staff Portal"}
          </p>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(380px,480px)_minmax(0,560px)] lg:justify-center lg:gap-12">
          <div className="w-full min-w-0 max-w-[520px] justify-self-center lg:max-w-none">
            {/* Card */}
            <Card className="h-full border-white/60 p-5 shadow-2xl sm:p-8">
              <h2 className="text-xl font-semibold text-slate-900">
                Welcome back
              </h2>
              <p className="mb-6 mt-1 text-sm text-slate-600">
                Sign in to your{" "}
                {role === "patient" ? "patient portal" : "staff dashboard"}
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="login-email"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    {role === "patient" ? "Email address" : "Staff email or ID"}
                  </label>
                  <input
                    id="login-email"
                    type={role === "patient" ? "email" : "text"}
                    autoComplete="username"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setError("")
                    }}
                    placeholder={
                      role === "patient"
                        ? "you@example.com"
                        : "name@juanaccess.health or staff ID"
                    }
                    aria-invalid={Boolean(emailError)}
                    aria-describedby={
                      emailError ? "login-email-error" : undefined
                    }
                    className={`min-h-12 w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-500 transition focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                      emailError
                        ? "border-red-500"
                        : "border-slate-300 hover:border-slate-400 focus:border-brand-500"
                    }`}
                    required
                  />
                  {emailError && (
                    <FieldError id="login-email-error">{emailError}</FieldError>
                  )}
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <label
                      htmlFor="login-password"
                      className="block text-sm font-semibold text-slate-700"
                    >
                      Password
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="min-h-12 px-2 text-brand-700 hover:bg-brand-50 hover:text-brand-800"
                    >
                      Forgot password?
                    </Button>
                  </div>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        setError("")
                      }}
                      placeholder="Enter your password"
                      aria-invalid={Boolean(passwordError)}
                      aria-describedby={
                        passwordError ? "login-password-error" : undefined
                      }
                      className={`min-h-12 w-full rounded-xl border bg-white py-2.5 pl-4 pr-12 text-sm text-slate-800 placeholder:text-slate-500 transition focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                        passwordError
                          ? "border-red-500"
                          : "border-slate-300 hover:border-slate-400 focus:border-brand-500"
                      }`}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      aria-pressed={showPassword}
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute inset-y-0 right-0 min-h-12 w-11 rounded-l-none px-0 text-slate-500 hover:bg-transparent hover:text-brand-700 focus-visible:ring-inset"
                    >
                      <EyeIcon hidden={showPassword} />
                    </Button>
                  </div>
                  {passwordError && (
                    <FieldError id="login-password-error">
                      {passwordError}
                    </FieldError>
                  )}
                </div>

                <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg text-sm font-medium text-slate-700 focus-within:ring-2 focus-within:ring-brand-500 focus-within:ring-offset-2">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-5 w-5 rounded border-slate-300 accent-brand-600"
                  />
                  Remember me
                </label>

                <Button
                  type="submit"
                  size="lg"
                  disabled={!canSubmit}
                  className="w-full"
                >
                  {loading && <SpinnerIcon />}
                  {loading ? "Signing in..." : "Log in"}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <span className="text-sm text-slate-600">New patient? </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="min-h-12 px-1 text-brand-700 hover:bg-brand-50 hover:text-brand-800"
                >
                  Create an account
                </Button>
              </div>

              <div className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-slate-600">
                <LockIcon className="h-4 w-4 shrink-0 text-brand-600" />
                <span>Your information is encrypted and securely stored</span>
              </div>

            </Card>
          </div>

          <section
            className="min-w-0 text-white"
            aria-labelledby="care-heading"
          >
            <div className="mx-auto w-full max-w-[520px] rounded-3xl border border-white/20 bg-white/10 p-6 shadow-xl backdrop-blur-sm sm:p-8 lg:mx-0 lg:max-w-[560px] lg:p-10">
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
                <HeartIcon />
              </div>
              <h2
                id="care-heading"
                className="max-w-lg text-[clamp(2rem,3.2vw,2.75rem)] font-semibold leading-[1.15] [text-wrap:balance]"
              >
                Your Care, Your Access, All in Juan Place.
              </h2>
              <p className="mt-4 max-w-[52ch] text-lg leading-[1.6] text-white/85">
                JuanAccess makes healthcare more accessible and convenient by
                bringing essential health services and information into one
                platform.
              </p>
              <ul className="mt-8 space-y-4">
                <CarePoint icon={<CalendarIcon />} text="Book appointments" />
                <CarePoint icon={<ResultsIcon />} text="View results" />
                <CarePoint
                  icon={<MessageIcon />}
                  text="Message your care team"
                />
              </ul>
            </div>
          </section>
        </div>

        <p className="mt-7 text-center text-xs font-medium text-white/90 lg:text-left">
          © 2026 JuanAccess · All rights reserved
        </p>
      </div>
    </div>
  )
}

function FieldError({
  id,
  children,
}: {
  id: string
  children: React.ReactNode
}) {
  return (
    <p
      id={id}
      className="mt-2 flex items-start gap-1.5 text-xs font-medium text-red-700"
      role="alert"
    >
      <AlertIcon />
      <span>{children}</span>
    </p>
  )
}

function CarePoint({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-center gap-4 text-lg font-medium">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15">
        {icon}
      </span>
      {text}
    </li>
  )
}

const iconClass = "h-5 w-5"

function EyeIcon({ hidden }: { hidden: boolean }) {
  return hidden ? (
    <svg
      className={iconClass}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 3l18 18M10.6 10.7a2 2 0 002.7 2.7M9.9 4.2A10.8 10.8 0 0112 4c5.5 0 9 5.5 9 8a8.2 8.2 0 01-2 3.3M6.5 6.5C4.3 8 3 10.4 3 12c0 2.5 3.5 8 9 8a10 10 0 004.2-.9"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ) : (
    <svg
      className={iconClass}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 12c0-2.5 3.5-8 9-8s9 5.5 9 8-3.5 8-9 8-9-5.5-9-8z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="3"
        className="opacity-25"
      />
      <path
        d="M21 12a9 9 0 00-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        className="opacity-90"
      />
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg
      className="mt-0.5 h-3.5 w-3.5 shrink-0"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" />
      <path
        d="M8 4.5v4M8 11.5h.01"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="5"
        y="10"
        width="14"
        height="10"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M8 10V7a4 4 0 018 0v3M12 14v2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg
      className={iconClass}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M5 20a7 7 0 0114 0"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  )
}

function BadgeIcon() {
  return (
    <svg
      className={iconClass}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="4"
        y="5"
        width="16"
        height="15"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M9 5V3h6v2M8 10h8M8 14h5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  )
}

function HeartIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20.8 5.8a5.5 5.5 0 00-7.8 0L12 6.9l-1.1-1.1a5.5 5.5 0 00-7.8 7.8L12 22l8.8-8.4a5.5 5.5 0 000-7.8z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg
      className={iconClass}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="5"
        width="18"
        height="16"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M8 3v4M16 3v4M3 10h18M8 15h3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  )
}

function ResultsIcon() {
  return (
    <svg
      className={iconClass}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 3h14v18H5zM9 3v4h6V3M8 12h8M8 16h5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function MessageIcon() {
  return (
    <svg
      className={iconClass}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 5h16v12H9l-5 4V5z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 9h8M8 13h5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  )
}
