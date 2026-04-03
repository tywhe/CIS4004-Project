import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronUp, LayoutDashboard, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

function SortHead({ children, className, accent }) {
  return (
    <TableHead
      className={cn(
        'text-xs font-semibold uppercase tracking-wide text-muted-foreground',
        className,
        accent && 'shadow-[inset_0_-2px_0_0_oklch(0.65_0.18_145)]',
      )}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        <span className="inline-flex flex-col leading-none text-muted-foreground/80" aria-hidden="true">
          <ChevronUp className="size-3" />
          <ChevronDown className="size-3 -mt-0.5" />
        </span>
      </span>
    </TableHead>
  )
}

export default function DashboardPage() {
  useEffect(() => {
    document.title = 'BloomBoard'
  }, [])

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
                    <SidebarMenuButton isActive tooltip="Dashboard">
                      <LayoutDashboard />
                      <span>Dashboard</span>
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
                <Link to="/">Sign out</Link>
              </Button>
            </div>
          </header>

          <div className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-5 p-4 md:p-6">
            

            <Tabs defaultValue="holdings" className="w-full gap-0">
              <TabsList variant="line" className="h-auto w-full min-w-0 justify-start gap-6 border-b border-border bg-transparent p-0">
                <TabsTrigger value="holdings" className="rounded-none pb-3">
                  Holdings
                </TabsTrigger>
                <TabsTrigger value="portfolios" className="rounded-none pb-3">
                  Portfolios
                </TabsTrigger>
                <TabsTrigger value="watchlist" className="rounded-none pb-3">
                  Watchlist
                </TabsTrigger>
                <TabsTrigger value="simulations" className="rounded-none pb-3">
                  Simulations
                </TabsTrigger>
              </TabsList>

              <TabsContent value="holdings" className="mt-6">
                <Card className="gap-0 overflow-hidden py-0">
                  <Table>
                    <TableCaption>Positions table — columns match your portfolio view.</TableCaption>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <SortHead>Symbol</SortHead>
                        <SortHead className="text-right">Last price</SortHead>
                        <SortHead className="text-right">Today&apos;s gain/loss</SortHead>
                        <SortHead className="text-right">Total gain/loss</SortHead>
                        <SortHead className="text-right">Current value</SortHead>
                        <SortHead className="text-right">Cost basis</SortHead>
                        <SortHead className="text-right">Quantity</SortHead>
                        <SortHead className="text-right" accent>
                          % of account
                        </SortHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow className="hover:bg-transparent">
                        <TableCell
                          colSpan={8}
                          className="py-10 text-center text-sm italic text-muted-foreground"
                        >
                          No holdings yet — rows will be rendered from the database.
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </Card>
              </TabsContent>

              <TabsContent value="portfolios" className="mt-6">
                <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-4 py-12 text-center text-sm text-muted-foreground">
                  Portfolio view — add content here later.
                </div>
              </TabsContent>

              <TabsContent value="watchlist" className="mt-6">
                <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-4 py-12 text-center text-sm text-muted-foreground">
                  Watchlist — add content here later.
                </div>
              </TabsContent>

              <TabsContent value="simulations" className="mt-6">
                <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-4 py-12 text-center text-sm text-muted-foreground">
                  Simulations — add content here later.
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
