import { Link, createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/admin')({
  component: AdminPage,
})

type Booking = {
  id: string
  guestName: string
  guestEmail: string
  checkIn: string
  checkOut: string
  status: 'pending' | 'confirmed' | 'cancelled'
  notes: string | null
  createdAt: string | number | Date
}

type BlockedDate = {
  id: string
  startDate: string
  endDate: string
  reason: string | null
  createdAt: string | number | Date
}

type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; details?: unknown }

function AdminPage(): React.ReactElement {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function load(): Promise<void> {
    const [bookingResponse, blockedResponse] = await Promise.all([
      fetch('/api/bookings'),
      fetch('/api/blocked-dates'),
    ])
    const bookingJson = (await bookingResponse.json()) as ApiResponse<Booking[]>
    const blockedJson = (await blockedResponse.json()) as ApiResponse<BlockedDate[]>

    if (bookingResponse.status === 401) {
      setAuthenticated(false)
      return
    }

    if (bookingJson.success) setBookings(bookingJson.data)
    if (blockedJson.success) setBlockedDates(blockedJson.data)
  }

  useEffect(() => {
    async function checkSession(): Promise<void> {
      const response = await fetch('/api/admin/session')
      const result = (await response.json()) as ApiResponse<{ authenticated: boolean }>
      const isAuthenticated = result.success && result.data.authenticated
      setAuthenticated(isAuthenticated)
      if (isAuthenticated) await load()
    }

    void checkSession()
  }, [])

  async function login(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setLoginError(null)

    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    const result = (await response.json()) as ApiResponse<{ authenticated: boolean }>

    if (!result.success) {
      setLoginError(result.error)
      return
    }

    setPassword('')
    setAuthenticated(true)
    await load()
  }

  async function logout(): Promise<void> {
    await fetch('/api/admin/logout', { method: 'POST' })
    setAuthenticated(false)
    setBookings([])
  }

  async function approveBooking(id: string): Promise<void> {
    const response = await fetch(`/api/bookings/${id}/approve`, { method: 'POST' })
    const result = (await response.json()) as ApiResponse<Booking>

    if (!result.success) {
      setError(result.error)
      return
    }

    await load()
  }

  async function blockDates(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError(null)

    const response = await fetch('/api/blocked-dates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate, endDate, reason: reason || undefined }),
    })
    const result = (await response.json()) as ApiResponse<BlockedDate>

    if (!result.success) {
      setError(result.error)
      return
    }

    setStartDate('')
    setEndDate('')
    setReason('')
    await load()
  }

  if (authenticated === null) {
    return <main className="grid min-h-screen place-items-center bg-stone-50 text-stone-950">Loading…</main>
  }

  if (!authenticated) {
    return (
      <main className="grid min-h-screen place-items-center bg-stone-50 px-6 text-stone-950">
        <form className="w-full max-w-sm rounded-3xl border bg-white p-6 shadow-sm" onSubmit={login}>
          <Link className="text-sm text-stone-500 hover:text-stone-950" to="/">
            ← House
          </Link>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">Host Login</h1>
          <p className="mt-1 text-sm text-stone-600">Enter the admin password.</p>
          <label className="mt-6 block text-sm font-medium">
            Password
            <input
              autoFocus
              className="mt-2 w-full rounded-xl border px-3 py-2"
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.currentTarget.value)}
            />
          </label>
          {loginError ? <p className="mt-4 text-sm text-red-600">{loginError}</p> : null}
          <button className="mt-5 w-full rounded-xl bg-stone-950 px-4 py-3 font-semibold text-white hover:bg-stone-700">
            Login
          </button>
        </form>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-stone-50 text-stone-950">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <Link className="text-sm text-stone-500 hover:text-stone-950" to="/">
              ← Home
            </Link>
            <h1 className="mt-2 text-4xl font-bold tracking-tight">Host Dashboard</h1>
            <p className="mt-1 text-stone-600">Bookings and blocked dates.</p>
          </div>
          <button className="rounded-xl border bg-white px-4 py-2 text-sm font-medium hover:bg-stone-100" onClick={logout} type="button">
            Logout
          </button>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          <Stat label="Pending requests" value={bookings.filter((b) => b.status === 'pending').length} />
          <Stat label="Confirmed" value={bookings.filter((b) => b.status === 'confirmed').length} />
          <Stat label="Blocked ranges" value={blockedDates.length} />
        </section>

        <section className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold">Bookings</h2>
            {bookings.length === 0 ? (
              <p className="py-12 text-center text-stone-500">No bookings found.</p>
            ) : (
              <div className="mt-5 divide-y">
                {bookings.map((booking) => (
                  <article key={booking.id} className="py-4">
                    <div className="flex justify-between gap-4">
                      <div>
                        <h3 className="font-semibold">{booking.guestName}</h3>
                        <p className="text-sm text-stone-600">{booking.guestEmail}</p>
                        <p className="mt-1 text-sm">
                          {booking.checkIn} → {booking.checkOut}
                        </p>
                        {booking.notes ? <p className="mt-2 text-sm text-stone-600">{booking.notes}</p> : null}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <span className="h-fit rounded-full bg-stone-100 px-3 py-1 text-xs font-medium uppercase">
                          {booking.status}
                        </span>
                        {booking.status === 'pending' ? (
                          <button
                            className="rounded-lg bg-stone-950 px-3 py-2 text-xs font-semibold text-white hover:bg-stone-700"
                            onClick={() => void approveBooking(booking.id)}
                            type="button"
                          >
                            Approve
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <aside className="space-y-6">
            <form className="rounded-3xl border bg-white p-6 shadow-sm" onSubmit={blockDates}>
              <h2 className="text-2xl font-semibold">Block dates</h2>
              <label className="mt-5 block text-sm font-medium">
                Start date
                <input
                  className="mt-2 w-full rounded-xl border px-3 py-2"
                  required
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.currentTarget.value)}
                />
              </label>
              <label className="mt-4 block text-sm font-medium">
                End date
                <input
                  className="mt-2 w-full rounded-xl border px-3 py-2"
                  required
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.currentTarget.value)}
                />
              </label>
              <label className="mt-4 block text-sm font-medium">
                Reason
                <input
                  className="mt-2 w-full rounded-xl border px-3 py-2"
                  placeholder="Optional"
                  value={reason}
                  onChange={(event) => setReason(event.currentTarget.value)}
                />
              </label>
              {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
              <button className="mt-5 w-full rounded-xl bg-stone-950 px-4 py-3 font-semibold text-white hover:bg-stone-700">
                Block dates
              </button>
            </form>

            <div className="rounded-3xl border bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold">Blocked</h2>
              {blockedDates.length === 0 ? (
                <p className="mt-5 text-sm text-stone-500">No blocked dates.</p>
              ) : (
                <div className="mt-5 space-y-3">
                  {blockedDates.map((date) => (
                    <article key={date.id} className="rounded-2xl bg-stone-50 p-4">
                      <p className="font-medium">
                        {date.startDate} → {date.endDate}
                      </p>
                      {date.reason ? <p className="text-sm text-stone-600">{date.reason}</p> : null}
                    </article>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </section>
      </div>
    </main>
  )
}

function Stat(props: { label: string; value: number }): React.ReactElement {
  return (
    <article className="rounded-3xl border bg-white p-6 shadow-sm">
      <p className="text-sm font-medium uppercase tracking-wider text-stone-500">{props.label}</p>
      <p className="mt-3 text-4xl font-bold">{props.value}</p>
    </article>
  )
}
