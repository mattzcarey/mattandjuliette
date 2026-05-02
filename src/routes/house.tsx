import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button, buttonClassName } from "../components/button";

export const Route = createFileRoute("/house")({
  component: HousePage,
});

type BookingStatus = "idle" | "submitting" | "success" | "error";

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: string | HTMLElement,
        options: { callback: (token: string) => void; sitekey: string },
      ) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

type BlockedDate = {
  id: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  createdAt: string | number | Date;
};

type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; details?: unknown };

type SelectedRange = {
  checkIn: string;
  checkOut: string;
};

export function HousePage(): React.ReactElement {
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState<SelectedRange>({ checkIn: "", checkOut: "" });

  function openBooking(range?: SelectedRange): void {
    if (range) setSelectedRange(range);
    setIsBookingOpen(true);
  }

  function closeBooking(): void {
    setIsBookingOpen(false);
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link className="font-serif text-xl font-bold tracking-tight text-primary" to="/">
            Costa da Caparica flat
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium">
            <a className="transition-colors hover:text-primary" href="#availability">
              Availability
            </a>
            <Button
              className="h-auto p-0 text-sm"
              onClick={() => openBooking()}
              type="button"
              variant="ghost"
            >
              Book a Stay
            </Button>
            <Link
              className="text-muted-foreground transition-colors hover:text-primary"
              to="/admin"
            >
              Host Login
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:py-14">
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <img
            alt="Costa da Caparica beach"
            className="aspect-[4/3] h-full w-full object-cover"
            src="/hero.jpg"
          />
        </div>

        <div className="flex flex-col justify-center py-6">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.25em] text-primary">
            Costa da Caparica, Portugal
          </p>
          <h1 className="font-serif text-5xl font-bold leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
            Costa da Caparica flat.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
            Our cosy 2-bedroom flat puts you steps away from one of Portugal's best surfing beaches,
            with Lisbon airport just 25 minutes away by car. Sleeps up to 4 extra guests. Perfect
            for a beach escape, whether you're after water sports, coastal walks or pastéis de nata.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a className={buttonClassName({ size: "lg" })} href="#availability">
              Check Availability
            </a>
            <Button onClick={() => openBooking()} size="lg" type="button" variant="secondary">
              Request a Stay
            </Button>
          </div>
        </div>
      </section>

      <section id="availability" className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <h2 className="font-serif text-3xl font-semibold">Check Availability</h2>
          <p className="mt-1 text-muted-foreground">Select your dates to request a booking.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <AvailabilityCalendar onBook={openBooking} />

          <aside className="space-y-6">
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Legend
              </h3>
              <div className="space-y-3 text-sm">
                <Legend color="bg-background border" label="Available" />
                <Legend color="bg-primary/10 border border-primary/20" label="Selected" />
                <Legend color="bg-rose-50 border border-rose-200" label="Blocked" />
              </div>
            </div>

            <div id="book" className="rounded-xl border bg-card p-6 shadow-sm">
              <h3 className="font-serif text-2xl font-semibold">Ready to book?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Pick a check-in and check-out date, or open the form directly.
              </p>
              <Button className="mt-5 w-full" onClick={() => openBooking()} type="button">
                Continue to Booking
              </Button>
            </div>
          </aside>
        </div>
      </section>

      <footer className="mt-12 border-t bg-muted/30 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground md:flex-row">
          <div>
            <p className="font-serif text-lg font-medium text-foreground">Costa da Caparica flat</p>
            <p>Costa da Caparica, Portugal</p>
          </div>
          <p>For friends of Juliette & Matt.</p>
        </div>
      </footer>

      <BookingDrawer initialRange={selectedRange} isOpen={isBookingOpen} onClose={closeBooking} />
    </main>
  );
}

function AvailabilityCalendar(props: {
  onBook: (range?: SelectedRange) => void;
}): React.ReactElement {
  const today = new Date();
  const [visibleMonth, setVisibleMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [selectedStart, setSelectedStart] = useState<string | null>(null);
  const [selectedEnd, setSelectedEnd] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadBlockedDates(): Promise<void> {
      const response = await fetch("/api/blocked-dates");
      const json = (await response.json()) as ApiResponse<BlockedDate[]>;
      if (json.success) {
        setBlockedDates(json.data);
      } else {
        setError(json.error);
      }
    }

    void loadBlockedDates();
  }, []);

  const blockedSet = useMemo(() => {
    const set = new Set<string>();
    for (const range of blockedDates) {
      for (const date of datesBetween(range.startDate, range.endDate)) {
        set.add(date);
      }
    }
    return set;
  }, [blockedDates]);

  const calendarDays = useMemo(() => getCalendarDays(visibleMonth), [visibleMonth]);
  const monthLabel = visibleMonth.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  function previousMonth(): void {
    setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1));
  }

  function nextMonth(): void {
    setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1));
  }

  function selectDate(date: string): void {
    if (blockedSet.has(date)) return;

    if (!selectedStart || selectedEnd || date < selectedStart) {
      setSelectedStart(date);
      setSelectedEnd(null);
      return;
    }

    const range = datesBetween(selectedStart, date);
    if (range.some((rangeDate) => blockedSet.has(rangeDate))) {
      setError("That range includes blocked dates.");
      setSelectedStart(date);
      setSelectedEnd(null);
      return;
    }

    setError(null);
    setSelectedEnd(date);
    props.onBook({ checkIn: selectedStart, checkOut: date });
  }

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <Button onClick={previousMonth} size="sm" type="button" variant="secondary">
          ←
        </Button>
        <h3 className="font-serif text-2xl font-semibold">{monthLabel}</h3>
        <Button onClick={nextMonth} size="sm" type="button" variant="secondary">
          →
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-sm">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="py-2 font-medium text-muted-foreground">
            {day}
          </div>
        ))}
        {calendarDays.map((day) => {
          const date = toDateKey(day.date);
          const isCurrentMonth = day.date.getMonth() === visibleMonth.getMonth();
          const isBlocked = blockedSet.has(date);
          const isSelected = isInSelectedRange(date, selectedStart, selectedEnd);

          return (
            <Button
              key={date}
              className={[
                "h-auto aspect-square rounded-lg p-0 text-sm font-normal transition",
                isCurrentMonth
                  ? "bg-background hover:border-primary"
                  : "bg-muted/40 text-muted-foreground/40",
                isBlocked ? "border-rose-200 bg-rose-50 text-rose-900 line-through" : "",
                isSelected ? "border-primary bg-primary/10 text-primary" : "",
              ].join(" ")}
              disabled={isBlocked}
              onClick={() => selectDate(date)}
              type="button"
              variant="secondary"
            >
              {day.date.getDate()}
            </Button>
          );
        })}
      </div>

      <div className="mt-5 min-h-6 text-sm text-muted-foreground">
        {error ? <p className="text-rose-700">{error}</p> : null}
        {!error && selectedStart && !selectedEnd ? (
          <p>Selected check-in: {selectedStart}. Now choose check-out.</p>
        ) : null}
        {!error && selectedStart && selectedEnd ? (
          <p>
            Selected: {selectedStart} → {selectedEnd}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function BookingDrawer(props: {
  initialRange: SelectedRange;
  isOpen: boolean;
  onClose: () => void;
}): React.ReactElement {
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [checkIn, setCheckIn] = useState(props.initialRange.checkIn);
  const [checkOut, setCheckOut] = useState(props.initialRange.checkOut);
  const [guestCount, setGuestCount] = useState(1);
  const [notes, setNotes] = useState("");
  const [website, setWebsite] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileWidgetId, setTurnstileWidgetId] = useState<string | null>(null);
  const [status, setStatus] = useState<BookingStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (props.isOpen) {
      setCheckIn(props.initialRange.checkIn);
      setCheckOut(props.initialRange.checkOut);
    }
  }, [props.initialRange.checkIn, props.initialRange.checkOut, props.isOpen]);

  useEffect(() => {
    if (!props.isOpen || turnstileWidgetId || !window.turnstile) return;

    const widgetId = window.turnstile.render("#booking-turnstile", {
      sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY,
      callback: setTurnstileToken,
    });
    setTurnstileWidgetId(widgetId);
  }, [props.isOpen, turnstileWidgetId]);

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setStatus("submitting");
    setError(null);

    if (!turnstileToken) {
      setStatus("error");
      setError("Please complete the bot check.");
      return;
    }

    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        guestName,
        guestEmail,
        checkIn,
        checkOut,
        guestCount,
        notes: notes || undefined,
        website: website || undefined,
        turnstileToken,
      }),
    });
    const result = (await response.json()) as { success: boolean; error?: string };

    if (!result.success) {
      setStatus("error");
      setError(result.error || "Could not submit booking");
      window.turnstile?.reset(turnstileWidgetId || undefined);
      setTurnstileToken("");
      return;
    }

    setStatus("success");
    setGuestName("");
    setGuestEmail("");
    setCheckIn("");
    setCheckOut("");
    setGuestCount(1);
    setNotes("");
    setWebsite("");
    setTurnstileToken("");
    window.turnstile?.reset(turnstileWidgetId || undefined);
  }

  return (
    <div
      className={
        props.isOpen ? "fixed inset-0 z-[100]" : "pointer-events-none fixed inset-0 z-[100]"
      }
    >
      <Button
        aria-label="Close booking form"
        className={[
          "absolute inset-0 h-auto rounded-none border-transparent bg-stone-950/45 p-0 backdrop-blur-[1px] transition-opacity hover:border-transparent hover:bg-stone-950/45",
          props.isOpen ? "opacity-100" : "opacity-0",
        ].join(" ")}
        onClick={props.onClose}
        type="button"
      />
      <aside
        className={[
          "absolute right-0 top-0 flex h-full w-full max-w-[32rem] flex-col border-l border-border bg-white shadow-2xl transition-transform duration-300",
          props.isOpen ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        <div className="flex items-start justify-between border-b p-6">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
              Book a stay
            </p>
            <h2 className="mt-2 font-serif text-3xl font-semibold">Request dates</h2>
            <p className="mt-1 text-sm text-muted-foreground">We’ll reply by email.</p>
          </div>
          <Button onClick={props.onClose} size="sm" type="button" variant="secondary">
            Close
          </Button>
        </div>

        <form className="flex-1 space-y-5 overflow-y-auto p-6" onSubmit={submit}>
          <label className="block text-sm font-medium">
            Your name
            <input
              className="mt-2 w-full rounded-md border bg-background px-3 py-2"
              required
              value={guestName}
              onChange={(event) => setGuestName(event.currentTarget.value)}
            />
          </label>
          <label className="block text-sm font-medium">
            Email
            <input
              className="mt-2 w-full rounded-md border bg-background px-3 py-2"
              required
              type="email"
              value={guestEmail}
              onChange={(event) => setGuestEmail(event.currentTarget.value)}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Check-in
              <input
                className="mt-2 w-full rounded-md border bg-background px-3 py-2"
                required
                type="date"
                value={checkIn}
                onChange={(event) => setCheckIn(event.currentTarget.value)}
              />
            </label>
            <label className="block text-sm font-medium">
              Check-out
              <input
                className="mt-2 w-full rounded-md border bg-background px-3 py-2"
                required
                type="date"
                value={checkOut}
                onChange={(event) => setCheckOut(event.currentTarget.value)}
              />
            </label>
          </div>
          <label className="block text-sm font-medium">
            Number of guests
            <select
              className="mt-2 w-full rounded-md border bg-background px-3 py-2"
              required
              value={guestCount}
              onChange={(event) => setGuestCount(Number(event.currentTarget.value))}
            >
              <option value={1}>1 guest</option>
              <option value={2}>2 guests</option>
              <option value={3}>3 guests</option>
              <option value={4}>4 guests</option>
            </select>
          </label>
          <label className="hidden" aria-hidden="true">
            Website
            <input
              tabIndex={-1}
              value={website}
              onChange={(event) => setWebsite(event.currentTarget.value)}
            />
          </label>
          <label className="block text-sm font-medium">
            Notes
            <textarea
              className="mt-2 min-h-28 w-full rounded-md border bg-background px-3 py-2"
              placeholder="Who is coming? Anything we should know?"
              value={notes}
              onChange={(event) => setNotes(event.currentTarget.value)}
            />
          </label>

          <div id="booking-turnstile" />

          {error ? (
            <p className="rounded-md bg-rose-50 p-3 text-sm text-rose-700">{error}</p>
          ) : null}
          {status === "success" ? (
            <p className="rounded-md bg-sage-100 p-3 text-sm text-primary">
              Request sent. We’ll email you soon.
            </p>
          ) : null}

          <Button className="w-full" disabled={status === "submitting"}>
            {status === "submitting" ? "Sending…" : "Send request"}
          </Button>
        </form>
      </aside>
    </div>
  );
}

function getCalendarDays(month: Date): { date: Date }[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return { date };
  });
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function datesBetween(startDate: string, endDate: string): string[] {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  const dates: string[] = [];

  for (const date = start; date <= end; date.setUTCDate(date.getUTCDate() + 1)) {
    dates.push(date.toISOString().slice(0, 10));
  }

  return dates;
}

function isInSelectedRange(date: string, start: string | null, end: string | null): boolean {
  if (!start) return false;
  if (!end) return date === start;
  return date >= start && date <= end;
}

function Legend(props: { color: string; label: string }): React.ReactElement {
  return (
    <div className="flex items-center gap-3">
      <span className={`block size-4 rounded ${props.color}`} />
      <span>{props.label}</span>
    </div>
  );
}
