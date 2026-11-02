import { createHmac, timingSafeEqual } from "node:crypto"
import type { NextResponse } from "next/server"

const DEV_SECRET = "development-insecure-secret-change-me"
const FALLBACK_SESSION_TTL_MINUTES = 60

export const SESSION_COOKIE = "antrian_session"

interface BaseTokenPayload {
    type: "session"
    iat: number
    exp: number
}

export interface SessionTokenPayload extends BaseTokenPayload {
    type: "session"
    sub: string
}

function readPositiveInt(name: string, fallback: number): number {
    const value = Number(process.env[name])
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback
}

export const SESSION_TTL_MINUTES = readPositiveInt(
    "SESSION_TTL_MINUTES",
    FALLBACK_SESSION_TTL_MINUTES,
)

export const SESSION_TTL_SECONDS = SESSION_TTL_MINUTES * 60

function getSecret(): string {
    if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET

    if (process.env.NODE_ENV === "production") {
        throw new Error("AUTH_SECRET wajib diatur di environment production")
    }

    return DEV_SECRET
}

function base64url(value: string): string {
    return Buffer.from(value, "utf8").toString("base64url")
}

function sign(value: string): string {
    return createHmac("sha256", getSecret()).update(value).digest("base64url")
}

function safeEqual(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left, "utf8")
    const rightBuffer = Buffer.from(right, "utf8")

    if (leftBuffer.length !== rightBuffer.length) return false
    return timingSafeEqual(leftBuffer, rightBuffer)
}

function createToken<T extends BaseTokenPayload>(payload: T): string {
    const body = base64url(JSON.stringify(payload))
    return `${body}.${sign(body)}`
}

function verifyToken<T extends BaseTokenPayload>(
    token: string,
    type: T["type"],
): T | null {
    const [body, signature, ...rest] = token.split(".")
    if (!body || !signature || rest.length > 0) return null
    if (!safeEqual(signature, sign(body))) return null

    try {
        const payload = JSON.parse(
            Buffer.from(body, "base64url").toString("utf8"),
        ) as T

        if (payload.type !== type) return null
        if (!Number.isFinite(payload.exp) || payload.exp * 1000 <= Date.now()) {
            return null
        }

        return payload
    } catch {
        return null
    }
}

export function createSessionToken(userId: string): string {
    const now = Math.floor(Date.now() / 1000)

    return createToken({
        type: "session",
        sub: userId,
        iat: now,
        exp: now + SESSION_TTL_SECONDS,
    })
}

export function verifySessionToken(token: string): SessionTokenPayload | null {
    return verifyToken<SessionTokenPayload>(token, "session")
}

export function getSessionExpiresAt(): string {
    return new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString()
}

export function setSessionCookie(
    response: NextResponse,
    token: string,
): NextResponse {
    response.cookies.set({
        name: SESSION_COOKIE,
        value: token,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: SESSION_TTL_SECONDS,
    })

    return response
}

export function clearSessionCookie(response: NextResponse): NextResponse {
    response.cookies.set({
        name: SESSION_COOKIE,
        value: "",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 0,
    })

    return response
}

export function getTokenFromCookieHeader(
    cookieHeader: string | null,
): string | null {
    if (!cookieHeader) return null

    for (const part of cookieHeader.split(";")) {
        const [name, ...rest] = part.trim().split("=")
        if (name === SESSION_COOKIE) {
            return decodeURIComponent(rest.join("="))
        }
    }

    return null
}
