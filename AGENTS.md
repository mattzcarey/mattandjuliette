# AGENTS.md - Codebase Rules & Standards

> This document defines the coding standards, architectural decisions, and testing requirements for the Matt & Juliette booking application. All contributors (human or AI) must follow these rules.

---

## Table of Contents

1. [TypeScript Standards](#1-typescript-standards)
2. [Testing Requirements](#2-testing-requirements)
3. [API Design Principles](#3-api-design-principles)
4. [Code Organization](#4-code-organization)
5. [Error Handling](#5-error-handling)
6. [Security Guidelines](#6-security-guidelines)
7. [Documentation Standards](#7-documentation-standards)

---

## 1. TypeScript Standards

### 1.1 Strict Mode Configuration

The project MUST use strict TypeScript configuration. The `tsconfig.json` should include:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "useUnknownInCatchVariables": true,
    "alwaysStrict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true
  }
}
```

### 1.2 Type Definition Rules

#### Never Use `any`
```typescript
// BAD
function processData(data: any) { ... }

// GOOD
function processData(data: BookingData) { ... }

// If truly unknown, use unknown and narrow
function processData(data: unknown) {
  if (isBookingData(data)) { ... }
}
```

#### Explicit Return Types for Functions
```typescript
// BAD
function calculatePrice(nights, pricePerNight) {
  return nights * pricePerNight;
}

// GOOD
function calculatePrice(nights: number, pricePerNight: number): number {
  return nights * pricePerNight;
}
```

#### Use Branded Types for Domain Concepts
```typescript
// Define branded types for type safety across boundaries
type BookingId = string & { readonly __brand: "BookingId" };
type UserId = string & { readonly __brand: "UserId" };
type ISODateString = string & { readonly __brand: "ISODateString" };

// Factory functions to create branded types
function createBookingId(id: string): BookingId {
  return id as BookingId;
}

function createISODateString(date: Date): ISODateString {
  return date.toISOString().split("T")[0] as ISODateString;
}
```

#### Exhaustive Pattern Matching
```typescript
// Use never to ensure exhaustive handling
type BookingStatus = "pending" | "accepted" | "denied" | "cancelled" | "completed";

function getStatusColor(status: BookingStatus): string {
  switch (status) {
    case "pending":
      return "yellow";
    case "accepted":
      return "green";
    case "denied":
      return "red";
    case "cancelled":
      return "gray";
    case "completed":
      return "blue";
    default:
      // This ensures we handle all cases
      const _exhaustive: never = status;
      throw new Error(`Unhandled status: ${_exhaustive}`);
  }
}
```

### 1.3 Zod Schema Validation

All external data (API requests, environment variables, external API responses) MUST be validated with Zod:

```typescript
import { z } from "zod";

// Define schemas next to their types
export const BookingRequestSchema = z.object({
  guestName: z.string().min(2).max(100),
  guestEmail: z.string().email(),
  guestPhone: z.string().optional(),
  guestCountry: z.string().min(2).max(100),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format"),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format"),
  tripPurpose: z.string().min(10).max(1000),
  specialRequests: z.string().max(1000).optional(),
});

// Derive types from schemas (single source of truth)
export type BookingRequest = z.infer<typeof BookingRequestSchema>;

// Validate at API boundaries
export function parseBookingRequest(data: unknown): BookingRequest {
  return BookingRequestSchema.parse(data);
}
```

### 1.4 Environment Variable Typing

```typescript
// src/env.ts
import { z } from "zod";

const EnvSchema = z.object({
  // Database
  DB: z.custom<D1Database>(),
  KV: z.custom<KVNamespace>().optional(),

  // Auth
  BETTER_AUTH_SECRET: z.string().min(32),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  ADMIN_EMAILS: z.string().transform(s => s.split(",")),

  // Google Calendar
  GOOGLE_CALENDAR_CLIENT_ID: z.string(),
  GOOGLE_CALENDAR_CLIENT_SECRET: z.string(),
  PUBLIC_CALENDAR_ID: z.string().optional(),

  // Email
  RESEND_API_KEY: z.string().startsWith("re_"),
  FROM_EMAIL: z.string().email(),
  ADMIN_EMAIL: z.string().email(),

  // URLs
  PUBLIC_URL: z.string().url(),
  ADMIN_URL: z.string().url(),
});

export type Env = z.infer<typeof EnvSchema>;

export function validateEnv(env: unknown): Env {
  return EnvSchema.parse(env);
}
```

---

## 2. Testing Requirements

### 2.1 Test Coverage Standards

| Category | Minimum Coverage |
|----------|-----------------|
| API endpoints | 100% |
| Business logic | 90% |
| Utility functions | 100% |
| Components (critical paths) | 80% |
| Overall | 85% |

### 2.2 Test File Organization

```
src/
├── lib/
│   ├── calendar.ts
│   └── calendar.test.ts      # Co-located unit tests
├── routes/
│   └── api/
│       ├── bookings.ts
│       └── bookings.test.ts  # API route tests
└── __tests__/
    ├── integration/          # Integration tests
    │   └── booking-flow.test.ts
    └── e2e/                  # End-to-end tests
        └── booking.spec.ts
```

### 2.3 Unit Test Standards

Every public function MUST have corresponding tests:

```typescript
// src/lib/pricing.ts
export function calculateTotalPrice(
  nights: number,
  pricePerNight: number,
  discount?: number
): number {
  const subtotal = nights * pricePerNight;
  const discountAmount = discount ? subtotal * (discount / 100) : 0;
  return subtotal - discountAmount;
}

// src/lib/pricing.test.ts
import { describe, it, expect } from "vitest";
import { calculateTotalPrice } from "./pricing";

describe("calculateTotalPrice", () => {
  it("calculates price without discount", () => {
    expect(calculateTotalPrice(3, 50)).toBe(150);
  });

  it("calculates price with discount", () => {
    expect(calculateTotalPrice(3, 50, 10)).toBe(135); // 10% off
  });

  it("handles zero nights", () => {
    expect(calculateTotalPrice(0, 50)).toBe(0);
  });

  it("handles edge case of 100% discount", () => {
    expect(calculateTotalPrice(3, 50, 100)).toBe(0);
  });
});
```

### 2.4 API Endpoint Testing

All API endpoints MUST have tests covering:
- Success cases
- Validation failures
- Authentication/authorization
- Edge cases
- Error responses

```typescript
// src/routes/api/bookings.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createTestContext } from "@/test/helpers";

describe("POST /api/bookings", () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = createTestContext();
  });

  describe("validation", () => {
    it("rejects missing required fields", async () => {
      const response = await ctx.fetch("/api/bookings", {
        method: "POST",
        body: JSON.stringify({ guestName: "John" }), // Missing other fields
      });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Validation failed");
      expect(body.details.fieldErrors).toHaveProperty("guestEmail");
    });

    it("rejects invalid email format", async () => {
      const response = await ctx.fetch("/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          ...validBookingData,
          guestEmail: "not-an-email",
        }),
      });

      expect(response.status).toBe(400);
    });

    it("rejects check-out before check-in", async () => {
      const response = await ctx.fetch("/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          ...validBookingData,
          checkIn: "2025-06-15",
          checkOut: "2025-06-10",
        }),
      });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain("Check-out must be after check-in");
    });
  });

  describe("availability", () => {
    it("rejects booking for blocked dates", async () => {
      // Setup: Block a date
      await ctx.db.insert(blockedDates).values({
        date: "2025-06-15",
        reason: "Personal",
        source: "manual",
      });

      const response = await ctx.fetch("/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          ...validBookingData,
          checkIn: "2025-06-14",
          checkOut: "2025-06-17",
        }),
      });

      expect(response.status).toBe(409);
      const body = await response.json();
      expect(body.unavailable).toContain("2025-06-15");
    });
  });

  describe("success", () => {
    it("creates booking and sends emails", async () => {
      const emailSpy = vi.spyOn(emailService, "sendBookingRequestNotification");

      const response = await ctx.fetch("/api/bookings", {
        method: "POST",
        body: JSON.stringify(validBookingData),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.booking.id).toBeDefined();

      // Verify email was sent
      expect(emailSpy).toHaveBeenCalledOnce();
    });
  });
});
```

### 2.5 Test Utilities

Create reusable test helpers:

```typescript
// src/test/helpers.ts
import { drizzle } from "drizzle-orm/d1";
import { createAuth } from "@/lib/auth";
import * as schema from "@/db/schema";

export interface TestContext {
  db: ReturnType<typeof drizzle>;
  fetch: (path: string, init?: RequestInit) => Promise<Response>;
  authenticateAs: (user: TestUser) => void;
}

export function createTestContext(): TestContext {
  const db = createTestDb();
  let authHeaders: Headers = new Headers();

  return {
    db,
    async fetch(path, init) {
      const request = new Request(`http://test${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...Object.fromEntries(authHeaders),
          ...init?.headers,
        },
      });

      return handleRequest(request, { DB: db, ...testEnv });
    },
    authenticateAs(user) {
      authHeaders = createAuthHeaders(user);
    },
  };
}

// Factory functions for test data
export function createTestBooking(overrides?: Partial<NewBooking>): NewBooking {
  return {
    guestName: "Test Guest",
    guestEmail: "test@example.com",
    guestCountry: "Portugal",
    checkIn: "2025-06-15",
    checkOut: "2025-06-18",
    nightCount: 3,
    pricePerNight: 50,
    totalPrice: 150,
    tripPurpose: "Testing the booking system",
    status: "pending",
    ...overrides,
  };
}
```

### 2.6 Test Commands

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:e2e": "playwright test"
  }
}
```

---

## 3. API Design Principles

### 3.1 Response Format

All API responses MUST follow this structure:

```typescript
// Success response
interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    totalPages?: number;
    totalCount?: number;
  };
}

// Error response
interface ErrorResponse {
  success: false;
  error: string;
  code: ErrorCode;
  details?: Record<string, unknown>;
}

type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

// Error codes
type ErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "CONFLICT"
  | "INTERNAL_ERROR";
```

### 3.2 API Response Helpers

```typescript
// src/lib/api-response.ts
export function success<T>(data: T, meta?: ResponseMeta): Response {
  return Response.json({ success: true, data, meta });
}

export function error(
  message: string,
  code: ErrorCode,
  status: number,
  details?: Record<string, unknown>
): Response {
  return Response.json(
    { success: false, error: message, code, details },
    { status }
  );
}

export const errors = {
  validation: (details: Record<string, unknown>) =>
    error("Validation failed", "VALIDATION_ERROR", 400, details),

  notFound: (resource: string) =>
    error(`${resource} not found`, "NOT_FOUND", 404),

  unauthorized: () =>
    error("Authentication required", "UNAUTHORIZED", 401),

  forbidden: () =>
    error("Access denied", "FORBIDDEN", 403),

  conflict: (message: string) =>
    error(message, "CONFLICT", 409),

  internal: (message = "Internal server error") =>
    error(message, "INTERNAL_ERROR", 500),
};
```

### 3.3 Input Validation Pattern

```typescript
// Every API endpoint follows this pattern
export const ServerRoute = createServerFileRoute("/api/bookings").methods(
  ["POST"],
  async ({ request }) => {
    // 1. Parse and validate input
    const body = await request.json().catch(() => ({}));
    const result = BookingRequestSchema.safeParse(body);

    if (!result.success) {
      return errors.validation({
        fieldErrors: result.error.flatten().fieldErrors,
      });
    }

    // 2. Business logic with typed data
    const data = result.data;

    // 3. Return typed response
    return success({ booking: createdBooking });
  }
);
```

---

## 4. Code Organization

### 4.1 File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `BookingForm.tsx` |
| Utilities | kebab-case | `date-utils.ts` |
| Types | PascalCase | `BookingTypes.ts` |
| Tests | same + `.test` | `date-utils.test.ts` |
| Schemas | kebab-case | `booking-schema.ts` |

### 4.2 Import Order

```typescript
// 1. Node/external modules
import { useState, useEffect } from "react";
import { z } from "zod";

// 2. Internal absolute imports (aliases)
import { Button } from "@/components/ui/button";
import { createDb } from "@/lib/db";
import type { Booking } from "@/db/schema";

// 3. Relative imports
import { BookingCard } from "./booking-card";
import type { BookingCardProps } from "./types";
```

### 4.3 Module Boundaries

```
src/
├── routes/           # HTTP layer only - no business logic
├── lib/              # Business logic - no HTTP concerns
├── db/               # Database schema and queries
├── components/       # UI components - no direct API calls
└── types/            # Shared type definitions
```

---

## 5. Error Handling

### 5.1 Error Types

```typescript
// src/lib/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly statusCode: number,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(details: Record<string, unknown>) {
    super("Validation failed", "VALIDATION_ERROR", 400, details);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, "NOT_FOUND", 404);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends AppError {
  constructor() {
    super("Authentication required", "UNAUTHORIZED", 401);
    this.name = "UnauthorizedError";
  }
}
```

### 5.2 Error Handling in API Routes

```typescript
// Wrap all route handlers
export async function handleRoute<T>(
  handler: () => Promise<T>
): Promise<Response> {
  try {
    const result = await handler();
    return success(result);
  } catch (err) {
    if (err instanceof AppError) {
      return error(err.message, err.code, err.statusCode, err.details);
    }

    // Log unexpected errors
    console.error("Unexpected error:", err);
    return errors.internal();
  }
}
```

---

## 6. Security Guidelines

### 6.1 Input Sanitization

- All user input MUST be validated with Zod
- HTML content MUST be escaped before rendering
- SQL queries MUST use parameterized queries (Drizzle handles this)

### 6.2 Authentication Checks

```typescript
// Every admin endpoint MUST check authentication
async function requireAdmin(request: Request, env: Env): Promise<Session> {
  const auth = createAuth(env);
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    throw new UnauthorizedError();
  }

  if (!env.ADMIN_EMAILS.includes(session.user.email)) {
    throw new ForbiddenError();
  }

  return session;
}
```

### 6.3 Secrets Management

- NEVER commit secrets to version control
- All secrets MUST be stored via `wrangler secret`
- Environment variables MUST be validated at startup

---

## 7. Documentation Standards

### 7.1 Function Documentation

Public functions MUST have JSDoc comments:

```typescript
/**
 * Calculate the total price for a booking.
 *
 * @param nights - Number of nights for the stay
 * @param pricePerNight - Price per night in EUR
 * @param discount - Optional discount percentage (0-100)
 * @returns Total price after discount
 *
 * @example
 * ```ts
 * calculateTotalPrice(3, 50) // 150
 * calculateTotalPrice(3, 50, 10) // 135 (10% off)
 * ```
 */
export function calculateTotalPrice(
  nights: number,
  pricePerNight: number,
  discount?: number
): number {
  // ...
}
```

### 7.2 API Documentation

Each API route file MUST have a header comment:

```typescript
/**
 * @api POST /api/bookings
 * @description Create a new booking request
 *
 * @body {BookingRequest} - Booking details
 *
 * @response 200 {SuccessResponse<{ booking: Booking }>} - Booking created
 * @response 400 {ErrorResponse} - Validation error
 * @response 409 {ErrorResponse} - Dates not available
 *
 * @example Request
 * ```json
 * {
 *   "guestName": "John Doe",
 *   "guestEmail": "john@example.com",
 *   "checkIn": "2025-06-15",
 *   "checkOut": "2025-06-18"
 * }
 * ```
 */
```

---

## 8. Development Commands

### 8.1 Git Commit Requirements

This repository uses a custom git hook that requires a `--prompt` flag when committing. The `ZAGI_AGENT` environment variable is set, which triggers this requirement.

```bash
# Commits MUST include the --prompt flag
git commit -m "your commit message" --prompt "the prompt/task that generated this commit"

# Example
git commit -m "feat: add booking validation" --prompt "Add validation for booking requests"
```

### 8.2 Local Development

```bash
# Start development server (runs on port 3000)
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Deploy to Cloudflare Workers
pnpm deploy

# Regenerate Cloudflare Worker types (run after changing wrangler.jsonc)
pnpm cf-typegen
```

**Important:** After adding or modifying bindings in `wrangler.jsonc`, run `pnpm cf-typegen` to regenerate the `worker-configuration.d.ts` file. This enables TypeScript to understand your D1, KV, and other Cloudflare bindings.

### 8.3 Code Quality

```bash
# Run linter and formatter
pnpm check

# Run tests
pnpm test
```

---

## Quick Reference Checklist

Before submitting code, verify:

- [ ] TypeScript strict mode passes with no errors
- [ ] All functions have explicit return types
- [ ] No `any` types used
- [ ] All API inputs validated with Zod
- [ ] Unit tests written for new functions
- [ ] API endpoint tests cover success/error cases
- [ ] Test coverage meets thresholds
- [ ] Error handling uses AppError classes
- [ ] Admin routes have authentication checks
- [ ] JSDoc comments on public functions
- [ ] Imports follow ordering convention
