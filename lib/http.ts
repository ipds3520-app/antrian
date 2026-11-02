export class ApiError extends Error {
    status: number

    constructor(message: string, status: number) {
        super(message)
        this.name = "ApiError"
        this.status = status
    }
}

export async function apiRequest<T>(
    input: string,
    init?: RequestInit,
): Promise<T> {
    const response = await fetch(input, {
        ...init,
        headers: {
            ...(init?.body ? { "Content-Type": "application/json" } : {}),
            ...init?.headers,
        },
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
        throw new ApiError(
            payload?.message ?? "Terjadi kesalahan, coba lagi",
            response.status,
        )
    }

    return payload as T
}

export function handleApiError(
    error: unknown,
    onUnauthorized?: () => void,
): string {
    if (error instanceof ApiError) {
        if (error.status === 401 && onUnauthorized) {
            onUnauthorized()
        }
        return error.message
    }

    return error instanceof Error
        ? error.message
        : "Terjadi kesalahan, coba lagi"
}
