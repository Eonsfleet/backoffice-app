'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Truck } from 'lucide-react'
import Image from 'next/image'
import axios from 'axios'
import { loginAdmin, setAuthCookie } from '@/features/auth/api'
import { useAuthStore } from '@/stores/auth.store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useState } from 'react'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [isPending, setIsPending] = useState(false)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: FormData) => {
    setIsPending(true)
    try {
      const { token, user } = await loginAdmin(values)
      setAuthCookie(token)   // middleware reads this cookie to protect routes
      setAuth(token, user)   // Zustand holds token in memory for Axios interceptor
      router.replace('/dashboard')
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as { message?: string; errors?: Array<{ source?: { pointer: string }; detail: string }> } | undefined
        if (data?.errors?.length) {
          data.errors.forEach((e) => {
            const field = e.source?.pointer?.split('/').pop() as keyof FormData | undefined
            if (field && (field === 'email' || field === 'password')) {
              setError(field, { message: e.detail })
            }
          })
        } else {
          toast.error(data?.message ?? 'Invalid credentials')
        }
      } else {
        toast.error('An unexpected error occurred. Please try again.')
      }
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      {/* Background image */}
      <Image
        src="https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=1920&q=80"
        alt="Fleet of trucks in a garage"
        fill
        className="object-cover"
        priority
      />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/65" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-black/40 p-8 shadow-2xl backdrop-blur-md">
        {/* Logo / brand */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-lg">
            <Truck className="h-6 w-6 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-white">EonsFleet Admin</h1>
            <p className="mt-1 text-sm text-white/60">Platform administration panel</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} method="post" className="space-y-5" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-white/80">
              Email address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@eonsfleet.io"
              autoComplete="email"
              aria-invalid={!!errors.email}
              className="border-white/20 bg-white/10 text-white placeholder:text-white/30 focus-visible:border-primary focus-visible:ring-primary/30"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-xs text-red-400">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-white/80">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              className="border-white/20 bg-white/10 text-white placeholder:text-white/30 focus-visible:border-primary focus-visible:ring-primary/30"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-xs text-red-400">{errors.password.message}</p>
            )}
          </div>

          <Button
            type="submit"
            className="mt-2 w-full bg-primary font-semibold hover:bg-primary/90"
            disabled={isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isPending ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-white/30">
          &copy; {new Date().getFullYear()} EonsFleet. All rights reserved.
        </p>
      </div>
    </div>
  )
}
