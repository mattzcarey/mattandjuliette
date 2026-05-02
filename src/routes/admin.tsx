import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "../components/button";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

type Booking = {
  id: string;
  guestName: string;
  guestEmail: string;
  checkIn: string;
  checkOut: string;
  guestCount: number;
  status: "pending" | "confirmed" | "cancelled";
  notes: string | null;
  createdAt: string | number | Date;
};

type BlockedDate = {
  id: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  createdAt: string | number | Date;
};

type CalendarUrls = {
  httpsUrl: string;
  webcalUrl: string;
};

type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; details?: unknown };

function AdminPage(): React.ReactElement {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [calendarUrls, setCalendarUrls] = useState<CalendarUrls | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load(): Promise<void> {
    const [bookingResponse, blockedResponse, calendarResponse] = await Promise.all([
      fetch("/api/bookings"),
      fetch("/api/blocked-dates"),
      fetch("/api/admin/calendar-url"),
    ]);
    const bookingJson = (await bookingResponse.json()) as ApiResponse<Booking[]>;
    const blockedJson = (await blockedResponse.json()) as ApiResponse<BlockedDate[]>;
    const calendarJson = (await calendarResponse.json()) as ApiResponse<CalendarUrls>;

    if (bookingResponse.status === 401) {
      setAuthenticated(false);
      return;
    }

    if (bookingJson.success) setBookings(bookingJson.data);
    if (blockedJson.success) setBlockedDates(blockedJson.data);
    if (calendarJson.success) setCalendarUrls(calendarJson.data);
  }

  useEffect(() => {
    async function checkSession(): Promise<void> {
      const response = await fetch("/api/admin/session");
      const result = (await response.json()) as ApiResponse<{ authenticated: boolean }>;
      const isAuthenticated = result.success && result.data.authenticated;
      setAuthenticated(isAuthenticated);
      if (isAuthenticated) await load();
    }

    void checkSession();
  }, []);

  async function login(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setLoginError(null);

    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const result = (await response.json()) as ApiResponse<{ authenticated: boolean }>;

    if (!result.success) {
      setLoginError(result.error);
      return;
    }

    setPassword("");
    setAuthenticated(true);
    await load();
  }

  async function logout(): Promise<void> {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthenticated(false);
    setBookings([]);
  }

  async function updateGuestCount(id: string, guestCount: number): Promise<void> {
    const response = await fetch(`/api/bookings/${id}/guest-count`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guestCount }),
    });
    const result = (await response.json()) as ApiResponse<Booking>;

    if (!result.success) {
      setError(result.error);
      return;
    }

    await load();
  }

  async function updateBookingStatus(id: string, action: "approve" | "cancel"): Promise<void> {
    const response = await fetch(`/api/bookings/${id}/${action}`, { method: "POST" });
    const result = (await response.json()) as ApiResponse<Booking>;

    if (!result.success) {
      setError(result.error);
      return;
    }

    await load();
  }

  async function deleteBlockedDate(id: string): Promise<void> {
    const response = await fetch(`/api/blocked-dates/${id}`, { method: "DELETE" });
    const result = (await response.json()) as ApiResponse<{ id: string }>;

    if (!result.success) {
      setError(result.error);
      return;
    }

    await load();
  }

  async function blockDates(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);

    const response = await fetch("/api/blocked-dates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startDate, endDate, reason: reason || undefined }),
    });
    const result = (await response.json()) as ApiResponse<BlockedDate>;

    if (!result.success) {
      setError(result.error);
      return;
    }

    setStartDate("");
    setEndDate("");
    setReason("");
    await load();
  }

  if (authenticated === null) {
    return (
      <main className="grid min-h-screen place-items-center bg-stone-50 text-stone-950">
        Loading…
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="grid min-h-screen place-items-center bg-stone-50 px-6 text-stone-950">
        <form
          className="w-full max-w-sm rounded-3xl border bg-white p-6 shadow-sm"
          onSubmit={login}
        >
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
          <Button className="mt-5 w-full rounded-xl" type="submit">
            Login
          </Button>
        </form>
      </main>
    );
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
          <Button
            className="rounded-xl"
            onClick={logout}
            size="sm"
            type="button"
            variant="secondary"
          >
            Logout
          </Button>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          <Stat
            label="Pending requests"
            value={bookings.filter((b) => b.status === "pending").length}
          />
          <Stat label="Confirmed" value={bookings.filter((b) => b.status === "confirmed").length} />
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
                        <label className="mt-2 block text-sm text-stone-600">
                          Guests
                          <select
                            className="ml-2 rounded-lg border bg-white px-2 py-1 text-sm text-stone-950"
                            value={booking.guestCount}
                            onChange={(event) =>
                              void updateGuestCount(booking.id, Number(event.currentTarget.value))
                            }
                          >
                            {[1, 2, 3, 4].map((count) => (
                              <option key={count} value={count}>
                                {count}
                              </option>
                            ))}
                          </select>
                        </label>
                        {booking.notes ? (
                          <p className="mt-2 text-sm text-stone-600">{booking.notes}</p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <span className="h-fit rounded-full bg-stone-100 px-3 py-1 text-xs font-medium uppercase">
                          {booking.status}
                        </span>
                        {booking.status === "pending" ? (
                          <Button
                            className="rounded-lg text-xs"
                            onClick={() => void updateBookingStatus(booking.id, "approve")}
                            size="sm"
                            type="button"
                          >
                            Approve
                          </Button>
                        ) : null}
                        {booking.status !== "cancelled" ? (
                          <Button
                            className="rounded-lg text-xs"
                            onClick={() => void updateBookingStatus(booking.id, "cancel")}
                            size="sm"
                            type="button"
                            variant="secondary"
                          >
                            Cancel
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <aside className="space-y-6">
            <div className="rounded-3xl border bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold">Admin calendar</h2>
              {calendarUrls ? (
                <Button
                  className="mt-5 w-full rounded-xl"
                  onClick={() => void navigator.clipboard.writeText(calendarUrls.httpsUrl)}
                  type="button"
                >
                  Copy calendar URL
                </Button>
              ) : null}
            </div>

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
              <Button className="mt-5 w-full rounded-xl" type="submit">
                Block dates
              </Button>
            </form>

            <div className="rounded-3xl border bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold">Blocked</h2>
              {blockedDates.length === 0 ? (
                <p className="mt-5 text-sm text-stone-500">No blocked dates.</p>
              ) : (
                <div className="mt-5 space-y-3">
                  {blockedDates.map((date) => (
                    <article key={date.id} className="rounded-2xl bg-stone-50 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium">
                            {date.startDate} → {date.endDate}
                          </p>
                          {date.reason ? (
                            <p className="text-sm text-stone-600">{date.reason}</p>
                          ) : null}
                        </div>
                        <Button
                          className="shrink-0 rounded-lg"
                          onClick={() => void deleteBlockedDate(date.id)}
                          size="sm"
                          type="button"
                          variant="secondary"
                        >
                          Remove
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

function Stat(props: { label: string; value: number }): React.ReactElement {
  return (
    <article className="rounded-3xl border bg-white p-6 shadow-sm">
      <p className="text-sm font-medium uppercase tracking-wider text-stone-500">{props.label}</p>
      <p className="mt-3 text-4xl font-bold">{props.value}</p>
    </article>
  );
}
