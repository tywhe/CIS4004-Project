import DashboardShell from '@/components/DashboardShell.jsx'
import { Card } from '@/components/ui/card'
// pulls in our theme state and the toggle function from context
import { useTheme } from '@/lib/ThemeContext.jsx'
import { Moon, Sun } from 'lucide-react'

export default function SettingsPage() {
  // isDark tells us the current mode, toggleTheme flips it
  const { isDark, toggleTheme } = useTheme()

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
      </div>
    </DashboardShell>
  )
}
