DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS blocked_dates;

CREATE TABLE bookings (
  id TEXT PRIMARY KEY NOT NULL,
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  check_in TEXT NOT NULL,
  check_out TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  notes TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE blocked_dates (
  id TEXT PRIMARY KEY NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  reason TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX bookings_status_idx ON bookings(status);
CREATE INDEX bookings_dates_idx ON bookings(check_in, check_out);
CREATE INDEX blocked_dates_range_idx ON blocked_dates(start_date, end_date);
