import { Link, NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { clearSession, isAdminSession } from '@/lib/session.js'

export default function DashboardShell({ children }) {
  const { pathname } = useLocation()
  const homePath = isAdminSession() ? '/admin' : '/dashboard'
  const homeActive = pathname === '/dashboard' || pathname === '/admin'

  return (
    <TooltipProvider>
      <SidebarProvider className="min-h-svh w-full">
        <Sidebar collapsible="icon" variant="sidebar">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={homeActive} tooltip="Dashboard">
                      <NavLink to={homePath}>
                        <LayoutDashboard />
                        <span>Dashboard</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Settings">
                      <Settings />
                      <span>Settings</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarRail />
        </Sidebar>

        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4 md:px-6">
            <SidebarTrigger />
            <div className="mx-auto flex w-full max-w-[1280px] min-w-0 flex-1 items-center gap-2">
              <h1 className="font-heading min-w-0 flex-1 truncate text-lg font-semibold tracking-tight text-foreground md:text-xl">
                BloomBoard
              </h1>
              <Button variant="link" className="h-auto shrink-0 p-0 text-muted-foreground" asChild>
                <Link to="/" onClick={() => clearSession()}>
                  Sign out
                </Link>
              </Button>
            </div>
          </header>

          {children}
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
