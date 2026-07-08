import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, CheckSquare } from 'lucide-react'
import { useAuth } from '@/context/AuthProvider'
import { Button, ErrorBanner } from '@/components/ui'

// ─── Validation schema ────────────────────────────────────────────────────────
const registerSchema = z
  .object({
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(50, 'Name must be 50 characters or less'),
    email: z.string().email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

type RegisterFormData = z.infer<typeof registerSchema>

// ─── Error message helper (Cognito error codes → human-readable) ──────────────
function getErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const msg = String((err as { message: string }).message)
    if (msg.includes('UsernameExistsException') || msg.includes('already exists'))
      return 'Email already in use. Please sign in or use a different email.'
    if (msg.includes('InvalidPasswordException'))
      return 'Password does not meet the requirements.'
    if (msg.includes('InvalidParameterException'))
      return 'Please check your information and try again.'
    return msg
  }
  return 'An unexpected error occurred. Please try again.'
}

// ─── PasswordStrength indicator ───────────────────────────────────────────────
function PasswordStrength({ password }: { password: string }) {
  if (!password) return null

  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    password.length >= 12,
  ]
  const score = checks.filter(Boolean).length

  const label = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'][score]
  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-yellow-500',
    'bg-emerald-400',
    'bg-emerald-500',
  ]

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i < score ? colors[score] : 'bg-gray-700'}`}
          />
        ))}
      </div>
      <p className="text-xs text-gray-400">
        Strength: <span className={`font-medium ${score >= 3 ? 'text-emerald-400' : 'text-gray-300'}`}>{label}</span>
      </p>
    </div>
  )
}

// ─── RegisterPage ─────────────────────────────────────────────────────────────
export default function RegisterPage() {
  const { register: authRegister } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const passwordValue = watch('password', '')

  const onSubmit = async (data: RegisterFormData) => {
    setServerError(null)
    try {
      await authRegister(data.name, data.email, data.password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setServerError(getErrorMessage(err))
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
      {/* Subtle glow orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-2xl ring-1 ring-white/10 p-8">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <CheckSquare className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">TaskFlow</span>
            </div>
          </div>

          {/* Heading */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white">Create your account</h1>
            <p className="mt-1.5 text-sm text-gray-400">Start managing tasks today — it&apos;s free</p>
          </div>

          {/* Server error */}
          {serverError && (
            <div className="mb-5">
              <ErrorBanner message={serverError} onRetry={() => setServerError(null)} />
            </div>
          )}

          {/* Form */}
          <form id="register-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            {/* Full Name */}
            <div>
              <label htmlFor="register-name" className="block text-sm font-medium text-gray-300 mb-1.5">
                Full Name
              </label>
              <input
                id="register-name"
                type="text"
                autoComplete="name"
                placeholder="Jane Doe"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'register-name-error' : undefined}
                className={`w-full rounded-lg border bg-gray-800/60 px-3.5 py-2.5 text-sm text-white placeholder-gray-500
                  focus:outline-none focus:ring-2 transition-colors
                  ${errors.name
                    ? 'border-red-500 focus:ring-red-500/50'
                    : 'border-gray-700 focus:ring-blue-500/60 focus:border-blue-500'
                  }`}
                {...register('name')}
              />
              {errors.name && (
                <p id="register-name-error" className="mt-1.5 text-xs text-red-400">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="register-email" className="block text-sm font-medium text-gray-300 mb-1.5">
                Email address
              </label>
              <input
                id="register-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'register-email-error' : undefined}
                className={`w-full rounded-lg border bg-gray-800/60 px-3.5 py-2.5 text-sm text-white placeholder-gray-500
                  focus:outline-none focus:ring-2 transition-colors
                  ${errors.email
                    ? 'border-red-500 focus:ring-red-500/50'
                    : 'border-gray-700 focus:ring-blue-500/60 focus:border-blue-500'
                  }`}
                {...register('email')}
              />
              {errors.email && (
                <p id="register-email-error" className="mt-1.5 text-xs text-red-400">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="register-password" className="block text-sm font-medium text-gray-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'register-password-error' : undefined}
                  className={`w-full rounded-lg border bg-gray-800/60 px-3.5 py-2.5 pr-10 text-sm text-white placeholder-gray-500
                    focus:outline-none focus:ring-2 transition-colors
                    ${errors.password
                      ? 'border-red-500 focus:ring-red-500/50'
                      : 'border-gray-700 focus:ring-blue-500/60 focus:border-blue-500'
                    }`}
                  {...register('password')}
                />
                <button
                  type="button"
                  id="register-toggle-password"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-300 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <PasswordStrength password={passwordValue} />
              {errors.password && (
                <p id="register-password-error" className="mt-1.5 text-xs text-red-400">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="register-confirm-password" className="block text-sm font-medium text-gray-300 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="register-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                  aria-invalid={!!errors.confirmPassword}
                  aria-describedby={errors.confirmPassword ? 'register-confirm-password-error' : undefined}
                  className={`w-full rounded-lg border bg-gray-800/60 px-3.5 py-2.5 pr-10 text-sm text-white placeholder-gray-500
                    focus:outline-none focus:ring-2 transition-colors
                    ${errors.confirmPassword
                      ? 'border-red-500 focus:ring-red-500/50'
                      : 'border-gray-700 focus:ring-blue-500/60 focus:border-blue-500'
                    }`}
                  {...register('confirmPassword')}
                />
                <button
                  type="button"
                  id="register-toggle-confirm-password"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-300 transition-colors"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p id="register-confirm-password-error" className="mt-1.5 text-xs text-red-400">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <Button
              id="register-submit"
              type="submit"
              size="lg"
              isLoading={isSubmitting}
              className="w-full mt-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 shadow-lg shadow-blue-500/25 border-0"
            >
              {isSubmitting ? 'Creating account…' : 'Create Account'}
            </Button>
          </form>

          {/* Footer link */}
          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link
              to="/login"
              id="register-login-link"
              className="text-blue-400 font-medium hover:text-blue-300 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
