import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react'
import DashboardShell from '@/components/DashboardShell.jsx'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { API_BASE } from '@/lib/api.js'
import { hasSession, isAdminSession } from '@/lib/session.js'
import { cn } from '@/lib/utils'

function selectClass() {
  return cn(
    'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs',
    'outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
  )
}

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const [gate, setGate] = useState('pending')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [createForm, setCreateForm] = useState({ username: '', password: '', userRole: 'user' })
  const createRoleRef = useRef(null)
  const [creating, setCreating] = useState(false)

  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [detailData, setDetailData] = useState(null)

  const [editOpen, setEditOpen] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [editForm, setEditForm] = useState({ username: '', userRole: 'user', password: '' })
  const [saving, setSaving] = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/auth/users`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load users')
      setUsers(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e.message || 'Could not load users')
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!hasSession()) {
      navigate('/', { replace: true })
      return
    }
    if (!isAdminSession()) {
      navigate('/dashboard', { replace: true })
      return
    }
    setGate('ok')
  }, [navigate])

  useEffect(() => {
    if (gate !== 'ok') return
    document.title = 'Admin — BloomBoard'
    fetchUsers()
  }, [gate, fetchUsers])

  async function handleCreate(e) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const username = String(fd.get('username') ?? '').trim()
    const password = String(fd.get('password') ?? '')
    // Prefer the live DOM value from the role <select> (ref) so we never send a stale role.
    const roleRaw =
      createRoleRef.current?.value ?? fd.get('userRole') ?? createForm.userRole
    const userRole =
      String(roleRaw ?? 'user').trim().toLowerCase() === 'admin' ? 'admin' : 'user'
    if (!username || !password) return
    setCreating(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, userRole }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Create failed')
      if (data.user) setUsers((prev) => [data.user, ...prev])
      else await fetchUsers()
      setCreateForm({ username: '', password: '', userRole: 'user' })
    } catch (e) {
      setError(e.message || 'Create failed')
    } finally {
      setCreating(false)
    }
  }

  async function openDetail(userRow) {
    setDetailError('')
    setDetailData(null)
    setDetailOpen(true)
    setDetailLoading(true)
    const userId = userRow._id
    try {
      const [uRes, pRes, hRes] = await Promise.all([
        fetch(`${API_BASE}/api/auth/${userId}`),
        fetch(`${API_BASE}/api/portfolios/${userId}`),
        fetch(`${API_BASE}/api/holdings/user/${userId}`),
      ])
      const user = await uRes.json()
      const portfolios = await pRes.json()
      const holdings = await hRes.json()
      if (!uRes.ok) throw new Error(user.error || 'Failed to load user')
      setDetailData({
        user,
        portfolios: Array.isArray(portfolios) ? portfolios : [],
        holdings: Array.isArray(holdings) ? holdings : [],
      })
    } catch (e) {
      setDetailError(e.message || 'Failed to load data')
    } finally {
      setDetailLoading(false)
    }
  }

  function openEdit(u) {
    setEditUser(u)
    setEditForm({
      username: u.username,
      userRole: String(u.userRole || '').toLowerCase() === 'admin' ? 'admin' : 'user',
      password: '',
    })
    setEditOpen(true)
  }

  async function handleSaveEdit(e) {
    e.preventDefault()
    if (!editUser?._id) return
    setSaving(true)
    setError('')
    try {
      const body = {
        username: editForm.username.trim(),
        userRole: editForm.userRole === 'admin' ? 'admin' : 'user',
      }
      if (editForm.password) body.password = editForm.password
      const res = await fetch(`${API_BASE}/api/auth/${editUser._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Update failed')
      setUsers((prev) => prev.map((x) => (x._id === data._id ? { ...x, ...data } : x)))
      setEditOpen(false)
      setEditUser(null)
    } catch (e) {
      setError(e.message || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id, username) {
    if (!window.confirm(`Delete user "${username}"? This removes the account.`)) return
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/auth/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Delete failed')
      setUsers((prev) => prev.filter((u) => u._id !== id))
    } catch (e) {
      setError(e.message || 'Delete failed')
    }
  }

  if (gate !== 'ok') {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background text-sm text-muted-foreground">
        Loading…
      </div>
    )
  }

  return (
    <DashboardShell>
      <div className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-6 p-4 md:p-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
              User administration
            </h2>
            <p className="text-sm text-muted-foreground">
              Manage accounts, roles, and inspect portfolios and holdings.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>
            <RefreshCw className={cn('mr-1 size-4', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>

        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Create user</CardTitle>
            <CardDescription>New account with username, password, and role (user or admin).</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="grid w-full gap-2 sm:max-w-[200px]">
                <Label htmlFor="adm-username">Username</Label>
                <Input
                  id="adm-username"
                  name="username"
                  value={createForm.username}
                  onChange={(e) => setCreateForm((f) => ({ ...f, username: e.target.value }))}
                  autoComplete="off"
                />
              </div>
              <div className="grid w-full gap-2 sm:max-w-[200px]">
                <Label htmlFor="adm-password">Password</Label>
                <Input
                  id="adm-password"
                  name="password"
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                  autoComplete="new-password"
                />
              </div>
              <div className="grid w-full gap-2 sm:max-w-[160px]">
                <Label htmlFor="adm-role">Role</Label>
                <select
                  id="adm-role"
                  ref={createRoleRef}
                  name="userRole"
                  className={selectClass()}
                  value={createForm.userRole}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, userRole: e.target.value }))
                  }
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <Button type="submit" disabled={creating}>
                <Plus className="mr-1 size-4" />
                {creating ? 'Creating…' : 'Create user'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="gap-0 overflow-hidden py-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Username
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Role
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Created
                </TableHead>
                <TableHead className="w-[200px] text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                    Loading users…
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={4} className="py-10 text-center text-sm italic text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u._id}>
                    <TableCell className="font-medium">{u.username}</TableCell>
                    <TableCell className="text-muted-foreground">{u.userRole || 'user'}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {u.createdAt ? new Date(u.createdAt).toLocaleString() : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button type="button" size="icon" variant="ghost" onClick={() => openDetail(u)}>
                          <Eye className="size-4" />
                          <span className="sr-only">View data for {u.username}</span>
                        </Button>
                        <Button type="button" size="icon" variant="ghost" onClick={() => openEdit(u)}>
                          <Pencil className="size-4" />
                          <span className="sr-only">Edit {u.username}</span>
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(u._id, u.username)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                          <span className="sr-only">Delete {u.username}</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
          <SheetContent side="right" className="flex w-full flex-col overflow-y-auto sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>User data</SheetTitle>
              <SheetDescription>Portfolios and holdings for this account.</SheetDescription>
            </SheetHeader>
            {detailLoading ? (
              <p className="px-4 text-sm text-muted-foreground">Loading…</p>
            ) : detailError ? (
              <p className="px-4 text-sm text-destructive">{detailError}</p>
            ) : detailData ? (
              <Tabs defaultValue="overview" className="flex min-h-0 flex-1 flex-col gap-0 px-4 pb-4">
                <div className="shrink-0 border-b border-border pb-3">
                  <TabsList
                    variant="line"
                    className="!flex h-auto min-h-9 w-full flex-wrap items-center justify-start gap-x-3 gap-y-2 bg-transparent p-0"
                  >
                    <TabsTrigger value="overview" className="!grow-0 !basis-auto shrink-0">
                      Overview
                    </TabsTrigger>
                    <TabsTrigger value="portfolios" className="!grow-0 !basis-auto shrink-0">
                      Portfolios
                    </TabsTrigger>
                    <TabsTrigger value="holdings" className="!grow-0 !basis-auto shrink-0">
                      Holdings
                    </TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="overview" className="mt-4 space-y-2 text-sm outline-none">
                  <p>
                    <span className="text-muted-foreground">ID:</span>{' '}
                    <span className="font-mono text-xs">{detailData.user._id}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Username:</span> {detailData.user.username}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Role:</span>{' '}
                    {detailData.user.userRole || 'user'}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Created:</span>{' '}
                    {detailData.user.createdAt
                      ? new Date(detailData.user.createdAt).toLocaleString()
                      : '—'}
                  </p>
                </TabsContent>
                <TabsContent value="portfolios" className="mt-4 max-h-[50vh] overflow-auto outline-none">
                  {detailData.portfolios.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No portfolios.</p>
                  ) : (
                    <ul className="space-y-2 text-sm">
                      {detailData.portfolios.map((p) => (
                        <li key={p._id} className="rounded-md border border-border px-3 py-2">
                          <div className="font-medium">{p.portfolioName}</div>
                          <div className="text-muted-foreground">Type: {p.portfolioType}</div>
                          <div className="font-mono text-xs text-muted-foreground">{p._id}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </TabsContent>
                <TabsContent value="holdings" className="mt-4 max-h-[50vh] overflow-auto outline-none">
                  {detailData.holdings.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No holdings.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Ticker</TableHead>
                          <TableHead className="text-xs">Qty</TableHead>
                          <TableHead className="text-xs text-right">Price</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailData.holdings.map((h) => (
                          <TableRow key={h._id}>
                            <TableCell className="font-medium">{h.ticker}</TableCell>
                            <TableCell>{h.quantity}</TableCell>
                            <TableCell className="text-right">
                              {(() => {
                                const v = h.currentPrice ?? h.purchasePrice
                                return typeof v === 'number' && !Number.isNaN(v)
                                  ? `$${v.toFixed(2)}`
                                  : '—'
                              })()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>
              </Tabs>
            ) : null}
          </SheetContent>
        </Sheet>

        <Sheet
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open)
            if (!open) setEditUser(null)
          }}
        >
          <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Edit user</SheetTitle>
              <SheetDescription>Change username, role, or set a new password.</SheetDescription>
            </SheetHeader>
            {editUser ? (
              <form onSubmit={handleSaveEdit} className="flex flex-1 flex-col gap-4 px-4">
                <div className="grid gap-2">
                  <Label htmlFor="ed-u">Username</Label>
                  <Input
                    id="ed-u"
                    value={editForm.username}
                    onChange={(e) => setEditForm((f) => ({ ...f, username: e.target.value }))}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ed-r">Role</Label>
                  <select
                    id="ed-r"
                    className={selectClass()}
                    value={editForm.userRole}
                    onChange={(e) => setEditForm((f) => ({ ...f, userRole: e.target.value }))}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ed-p">New password (optional)</Label>
                  <Input
                    id="ed-p"
                    type="password"
                    value={editForm.password}
                    onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="Leave blank to keep current"
                    autoComplete="new-password"
                  />
                </div>
                <SheetFooter className="mt-auto flex-row gap-2 sm:justify-end">
                  <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Saving…' : 'Save'}
                  </Button>
                </SheetFooter>
              </form>
            ) : null}
          </SheetContent>
        </Sheet>
      </div>
    </DashboardShell>
  )
}
