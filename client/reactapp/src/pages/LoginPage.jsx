import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { API_BASE } from '@/lib/api.js'

function readPostSignupBanner() {
  try {
    if (sessionStorage.getItem('postSignup') === '1') {
      sessionStorage.removeItem('postSignup')
      return 'Account created. You can sign in now.'
    }
  } catch {
    /* ignore */
  }
  return ''
}

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [banner] = useState(readPostSignupBanner)
  const navigate = useNavigate()

  useEffect(() => {
    document.title = 'Login'
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage('')
    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await response.json()
      if (response.ok) {
        if (data.portfolioId != null) {
          localStorage.setItem('portfolioId', data.portfolioId)
        }
        localStorage.setItem('userId', data.userId)
        const roleNorm =
          String(data.role ?? 'user').trim().toLowerCase() === 'admin' ? 'admin' : 'user'
        localStorage.setItem('role', roleNorm)
        navigate(roleNorm === 'admin' ? '/admin' : '/dashboard')
      } else {
        setMessage(data.error || 'Login failed')
      }
    } catch {
      setMessage('Could not connect to server')
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md shadow-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-semibold tracking-tight">Sign in</CardTitle>
          <CardDescription>
            Sign in to BloomBoard with your username and password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {banner ? (
            <p className="mb-4 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-foreground">
              {banner}
            </p>
          ) : null}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                placeholder="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {message ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {message}
              </p>
            ) : null}
            <Button type="submit" className="w-full" size="lg">
              Sign in
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t border-border/80 bg-transparent py-4 text-sm text-muted-foreground">
          <span>
            Don&apos;t have an account?{' '}
            <Link
              to="/signup"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Sign up
            </Link>
          </span>
        </CardFooter>
      </Card>
    </main>
  )
}