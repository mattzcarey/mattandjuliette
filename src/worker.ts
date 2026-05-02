import { EmailMessage } from 'cloudflare:email'
import { desc, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { z } from 'zod'
import { blockedDates, bookings } from './db/schema'

interface Env {
  DB: D1Database
  ADMIN_PASSWORD: string
  AUTH_SECRET: string
  TURNSTILE_SECRET_KEY: string
  SEND_EMAIL: SendEmail
}

const fromEmail = 'noreply@house.mattandjuliette.com'

const authCookieName = 'mandj_admin'
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

const BookingInput = z.object({
  guestName: z.string().trim().min(2).max(100),
  guestEmail: z.string().trim().email().max(200),
  checkIn: dateSchema,
  checkOut: dateSchema,
  notes: z.string().trim().max(1000).optional(),
  website: z.string().max(0).optional(),
  turnstileToken: z.string().min(1),
})

const LoginInput = z.object({
  password: z.string().min(1),
})

const BlockedDateInput = z.object({
  startDate: dateSchema,
  endDate: dateSchema,
  reason: z.string().trim().max(200).optional(),
})

function json(data: unknown, init?: ResponseInit): Response {
  return Response.json(data, init)
}

async function readJson(request: Request): Promise<unknown> {
  return request.json().catch(() => null)
}

function getCookie(request: Request, name: string): string | null {
  const cookie = request.headers.get('Cookie')
  if (!cookie) return null

  for (const part of cookie.split(';')) {
    const [rawKey, ...valueParts] = part.trim().split('=')
    if (rawKey === name) return valueParts.join('=')
  }

  return null
}

function base64Url(bytes: ArrayBuffer): string {
  let binary = ''
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

async function sign(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { hash: 'SHA-256', name: 'HMAC' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value))
  return base64Url(signature)
}

async function createSessionCookie(env: Env): Promise<string> {
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 30
  const payload = `admin.${expiresAt}`
  const signature = await sign(payload, env.AUTH_SECRET)
  return `${payload}.${signature}`
}

async function isAdmin(request: Request, env: Env): Promise<boolean> {
  const cookie = getCookie(request, authCookieName)
  if (!cookie) return false

  const parts = cookie.split('.')
  if (parts.length !== 3) return false

  const [role, expiresAt, signature] = parts
  if (role !== 'admin' || !expiresAt || !signature) return false
  if (Number(expiresAt) < Date.now()) return false

  const expected = await sign(`admin.${expiresAt}`, env.AUTH_SECRET)
  return signature === expected
}

async function requireAdmin(request: Request, env: Env): Promise<Response | null> {
  if (await isAdmin(request, env)) return null
  return json({ success: false, error: 'Unauthorized' }, { status: 401 })
}

function encodeHeader(value: string): string {
  return value.replace(/[\r\n]/g, ' ')
}

function createRawEmail(to: string, subject: string, body: string): string {
  return [
    `From: Matt & Juliette House <${fromEmail}>`,
    `To: ${encodeHeader(to)}`,
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    body,
  ].join('\r\n')
}

async function sendEmail(env: Env, to: string, subject: string, body: string): Promise<void> {
  await env.SEND_EMAIL.send(new EmailMessage(fromEmail, to, createRawEmail(to, subject, body)))
}

async function verifyTurnstile(token: string, env: Env, request: Request): Promise<boolean> {
  const formData = new FormData()
  formData.append('secret', env.TURNSTILE_SECRET_KEY)
  formData.append('response', token)

  const ip = request.headers.get('CF-Connecting-IP')
  if (ip) formData.append('remoteip', ip)

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: formData,
  })
  const result = (await response.json()) as { success?: boolean }
  return result.success === true
}

async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const db = drizzle(env.DB)

  if (request.method === 'GET' && url.pathname === '/api/admin/session') {
    return json({ success: true, data: { authenticated: await isAdmin(request, env) } })
  }

  if (request.method === 'POST' && url.pathname === '/api/admin/login') {
    const parsed = LoginInput.safeParse(await readJson(request))
    if (!parsed.success || parsed.data.password !== env.ADMIN_PASSWORD) {
      return json({ success: false, error: 'Invalid password' }, { status: 401 })
    }

    const cookie = await createSessionCookie(env)
    return json(
      { success: true, data: { authenticated: true } },
      {
        headers: {
          'Set-Cookie': `${authCookieName}=${cookie}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`,
        },
      },
    )
  }

  if (request.method === 'POST' && url.pathname === '/api/admin/logout') {
    return json(
      { success: true, data: { authenticated: false } },
      {
        headers: {
          'Set-Cookie': `${authCookieName}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`,
        },
      },
    )
  }

  if (request.method === 'GET' && url.pathname === '/api/bookings') {
    const unauthorized = await requireAdmin(request, env)
    if (unauthorized) return unauthorized

    const rows = await db.select().from(bookings).orderBy(desc(bookings.createdAt))
    return json({ success: true, data: rows })
  }

  if (request.method === 'POST' && url.pathname === '/api/bookings') {
    const parsed = BookingInput.safeParse(await readJson(request))

    if (!parsed.success) {
      return json(
        { success: false, error: 'Invalid booking', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    if (parsed.data.website) {
      return json({ success: false, error: 'Invalid booking' }, { status: 400 })
    }

    const turnstileOk = await verifyTurnstile(parsed.data.turnstileToken, env, request)
    if (!turnstileOk) {
      return json({ success: false, error: 'Bot check failed' }, { status: 400 })
    }

    if (parsed.data.checkOut <= parsed.data.checkIn) {
      return json({ success: false, error: 'Check-out must be after check-in' }, { status: 400 })
    }

    const row = {
      id: crypto.randomUUID(),
      guestName: parsed.data.guestName,
      guestEmail: parsed.data.guestEmail,
      checkIn: parsed.data.checkIn,
      checkOut: parsed.data.checkOut,
      status: 'pending' as const,
      notes: parsed.data.notes || null,
      createdAt: new Date(),
    }

    await db.insert(bookings).values(row)
    await sendEmail(
      env,
      row.guestEmail,
      'We received your stay request',
      `Hi ${row.guestName},\n\nWe received your stay request for ${row.checkIn} to ${row.checkOut}. It is pending for now.\n\nWe will confirm once we have reviewed the dates.\n\nMatt & Juliette`,
    )

    return json({ success: true, data: row }, { status: 201 })
  }

  const approveMatch = url.pathname.match(/^\/api\/bookings\/([^/]+)\/approve$/)
  if (request.method === 'POST' && approveMatch?.[1]) {
    const unauthorized = await requireAdmin(request, env)
    if (unauthorized) return unauthorized

    const id = approveMatch[1]
    const existing = await db.select().from(bookings).where(eq(bookings.id, id)).get()
    if (!existing) return json({ success: false, error: 'Booking not found' }, { status: 404 })

    await db.update(bookings).set({ status: 'confirmed' }).where(eq(bookings.id, id))
    const approved = { ...existing, status: 'confirmed' as const }
    await sendEmail(
      env,
      approved.guestEmail,
      'Your stay is confirmed',
      `Hi ${approved.guestName},\n\nYour stay from ${approved.checkIn} to ${approved.checkOut} is confirmed.\n\nSee you soon,\nMatt & Juliette`,
    )

    return json({ success: true, data: approved })
  }

  if (request.method === 'GET' && url.pathname === '/api/blocked-dates') {
    const rows = await db.select().from(blockedDates).orderBy(desc(blockedDates.createdAt))
    return json({ success: true, data: rows })
  }

  if (request.method === 'POST' && url.pathname === '/api/blocked-dates') {
    const unauthorized = await requireAdmin(request, env)
    if (unauthorized) return unauthorized

    const parsed = BlockedDateInput.safeParse(await readJson(request))

    if (!parsed.success) {
      return json(
        { success: false, error: 'Invalid blocked date', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const row = {
      id: crypto.randomUUID(),
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      reason: parsed.data.reason || null,
      createdAt: new Date(),
    }

    await db.insert(blockedDates).values(row)
    return json({ success: true, data: row }, { status: 201 })
  }

  return json({ success: false, error: 'Not found' }, { status: 404 })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname.startsWith('/api/')) {
      return handleApi(request, env)
    }

    return new Response('Not found', { status: 404 })
  },
}
