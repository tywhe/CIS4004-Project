import { Link, useLocation } from 'react-router-dom'
import { Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TooltipProvider } from '@/components/ui/tooltip'
import { clearSession, isAdminSession } from '@/lib/session.js'

export default function DashboardShell({ children }) {
  const { pathname } = useLocation()
  const homePath = isAdminSession() ? '/admin' : '/dashboard'
  const onSettings = pathname === '/settings'

  return (
    <TooltipProvider>
      <div className="flex min-h-svh flex-col">
        <header className="flex h-14 shrink-0 items-center border-b border-border px-4 md:px-6">
          <div className="mx-auto flex w-full max-w-[1280px] items-center gap-3">
            <Link
              to={homePath}
              className="flex-1 text-lg font-semibold tracking-tight text-foreground hover:opacity-80 transition-opacity"
            >
              BloomBoard
            </Link>

            {!onSettings && (
              <Button variant="ghost" size="icon" asChild>
                <Link to="/settings" aria-label="Settings">
                  <Settings className="size-4" />
                </Link>
              </Button>
            )}

            <Button variant="link" className="h-auto p-0 text-muted-foreground" asChild>
              <Link to="/" onClick={() => clearSession()}>
                Sign out
              </Link>
            </Button>
          </div>
        </header>

        <main className="flex flex-1 flex-col">
          {children}
        </main>
      </div>
    </TooltipProvider>
  )
}
