export type UserRole = "admin" | "user"

export interface AuthUser {
    id: string
    email: string
    name: string
    role: UserRole
    phone: string | null
}

export interface UserRow {
    id: string
    created_at: string | Date
    email: string
    name: string | null
    role: string | null
    password: string | null
    phone: string | null
}

export type User = UserRow

export interface AppointmentRow {
    id: string | number
    created_at: string | Date | null
    name: string
    email: string
    booked_date: string
    time: string
    service: string
    phone: string | null
    auth_user_id?: string | null
    queue_number: number | null
    status: string | null
    completed_at: string | Date | null
}

export type Appointment = AppointmentRow

export type AppointmentStatus = "proses" | "selesai"

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
    completedAt: string | null
}

export interface ReceiptResult {
    message: string
    sent: boolean
    error?: string
}
