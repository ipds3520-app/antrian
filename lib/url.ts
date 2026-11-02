export function getBaseUrl(request: Request): string {
    const configured = process.env.NEXT_PUBLIC_APP_URL
    if (configured) return configured.replace(/\/+$/, "")

    return new URL(request.url).origin
}

export function sanitizeRedirect(
    value: string | null,
    fallback = "/user",
): string {
    if (!value) return fallback
    if (!value.startsWith("/") || value.startsWith("//")) return fallback

    return value
}
