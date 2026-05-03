type BookingEmailInput = {
  checkIn: string;
  checkOut: string;
  guestCount: number;
  guestName: string;
};

export function bookingReceivedEmail(input: BookingEmailInput): { body: string; subject: string } {
  return {
    subject: "We received your stay request",
    body: `Hi ${input.guestName},\n\nWe received your stay request for ${input.checkIn} to ${input.checkOut} (${input.guestCount} guest${input.guestCount === 1 ? "" : "s"}). It is pending for now.\n\nWe will confirm once we have reviewed the dates.\n\nMatt & Juliette`,
  };
}

export function bookingConfirmedEmail(input: BookingEmailInput): { body: string; subject: string } {
  return {
    subject: "Your stay is confirmed",
    body: `Hi ${input.guestName},\n\nYour stay from ${input.checkIn} to ${input.checkOut} is confirmed.\n\nSee you soon,\nMatt & Juliette`,
  };
}

export function bookingCancelledEmail(input: BookingEmailInput): { body: string; subject: string } {
  return {
    subject: "Your stay has been cancelled",
    body: `Hi ${input.guestName},\n\nYour stay from ${input.checkIn} to ${input.checkOut} has been cancelled.\n\nSorry for the change,\nMatt & Juliette`,
  };
}

export function adminBookingRequestEmail(
  input: BookingEmailInput & { guestEmail: string; notes: string | null },
): { body: string; subject: string } {
  return {
    subject: `New stay request from ${input.guestName}`,
    body: [
      "New stay request",
      "",
      `Name: ${input.guestName}`,
      `Email: ${input.guestEmail}`,
      `Dates: ${input.checkIn} → ${input.checkOut}`,
      `Guests: ${input.guestCount}`,
      `Notes: ${input.notes || "—"}`,
      "",
      "Review it in the admin dashboard.",
    ].join("\n"),
  };
}
