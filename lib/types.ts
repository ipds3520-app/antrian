export type UserRole = "admin" | "user"

export interface AuthUser {
    id: string
    email: string
    name: string
    role: UserRole
    phone: string | null
}

export type AppointmentStatus = "upcoming" | "expired"

export interface AppointmentDto {
    id: string
    createdAt: string | null
    name: string
    email: string
    phone: string | null
    bookedDate: string
    time: string
    service: string
    serviceLabel: string
    queueNumber: number | null
    status: AppointmentStatus
}

export interface ReceiptResult {
    message: string
    sent: boolean
    error?: string
}
