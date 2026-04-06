import { useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardShell from '@/components/DashboardShell.jsx'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/lib/ThemeContext.jsx'
import { ArrowLeft, Moon, Sun } from 'lucide-react'
import { API_BASE } from '@/lib/api.js'

export default function SettingsPage() {
  // isDark tells us the current mode, toggleTheme flips it
  const { isDark, toggleTheme } = useTheme()

  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [status, setStatus] = useState(null) // 'success' | 'error' | null
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleChangePassword(e) {
    e.preventDefault()

    if (form.newPassword !== form.confirmPassword) {
      setStatus('error')
      setMessage('New passwords do not match')
      return
    }
    if (form.newPassword.length < 6) {
      setStatus('error')
      setMessage('New password must be at least 6 characters')
      return
    }

    setSaving(true)
    setStatus(null)
    try {
      const res = await fetch(`${API_BASE}/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: localStorage.getItem('userId'),
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setStatus('error')
        setMessage(data.error || 'Something went wrong')
      } else {
        setStatus('success')
        setMessage('Password updated successfully')
        setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      }
    } catch (err) {
      setStatus('error')
      setMessage('Could not reach the server')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardShell>
      <div className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-5 p-4 md:p-6">
        <h2 className="text-lg font-semibold tracking-tight">Settings</h2>

        {/* appearance card — just the one setting for now, easy to add more later */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Appearance</p>
              <p className="text-sm text-muted-foreground">
                Switch between light and dark mode
              </p>
            </div>

            {/* button label/icon changes depending on which mode you're currently in,
                so it always shows what you'll switch TO, not what you're already on */}
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {isDark ? (
                <>
                  <Sun className="size-4" />
                  Light mode
                </>
              ) : (
                <>
                  <Moon className="size-4" />
                  Dark mode
                </>
              )}
            </button>
          </div>
        </Card>

        {/* password change card */}
        <Card className="p-6">
          <p className="font-medium mb-1">Change Password</p>
          <p className="text-sm text-muted-foreground mb-4">
            Enter your current password, then choose a new one
          </p>

          <form onSubmit={handleChangePassword} className="flex flex-col gap-3 max-w-sm">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Current Password</label>
              <input
                type="password"
                className="border border-border rounded px-3 py-2 text-sm bg-background text-foreground"
                value={form.currentPassword}
                onChange={e => setForm({ ...form, currentPassword: e.target.value })}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">New Password</label>
              <input
                type="password"
                className="border border-border rounded px-3 py-2 text-sm bg-background text-foreground"
                value={form.newPassword}
                onChange={e => setForm({ ...form, newPassword: e.target.value })}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Confirm New Password</label>
              <input
                type="password"
                className="border border-border rounded px-3 py-2 text-sm bg-background text-foreground"
                value={form.confirmPassword}
                onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                required
              />
            </div>

            {/* show success or error feedback after the request comes back */}
            {status && (
              <p className={`text-sm ${status === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                {message}
              </p>
            )}

            <Button type="submit" size="sm" className="w-fit" disabled={saving}>
              {saving ? 'Saving...' : 'Update Password'}
            </Button>
          </form>
        </Card>
        <Button variant="outline" size="sm" asChild>
          <Link to="/dashboard">
            <ArrowLeft className="size-4 mr-1" /> Back to Dashboard
          </Link>
        </Button>
      </div>
    </DashboardShell>
  )
}
