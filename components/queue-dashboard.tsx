"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { isPastDateTime, normalizeTimeKey, serviceLabel } from "@/lib/antrian"
import type { AuthUser } from "@/lib/types"

interface AppointmentItem {
    id: string
    booked_date: string
    time: string
    service: string
    queue_number?: number | null
}

export function QueueDashboard({
    currentUser,
}: {
    currentUser: AuthUser | null
}) {
    const [appointments, setAppointments] = useState<AppointmentItem[]>([])
    const [loading, setLoading] = useState(true)
    const [time, setTime] = useState("")
    const [date, setDate] = useState("")

    useEffect(() => {
        function updateClock() {
            const now = new Date()
            setDate(
                new Intl.DateTimeFormat("id-ID", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                }).format(now),
            )
            setTime(
                `${new Intl.DateTimeFormat("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hourCycle: "h23",
                }).format(now)} WIB`,
            )
        }

        updateClock()
        const timer = setInterval(updateClock, 1000)
        return () => clearInterval(timer)
    }, [])

    useEffect(() => {
        async function loadData() {
            try {
                const res = await fetch("/api")
                if (res.ok) {
                    const body = await res.json()
                    setAppointments(
                        Array.isArray(body.appointments)
                            ? body.appointments
                            : [],
                    )
                }
            } catch (e) {
                console.error("Gagal memuat antrian", e)
            } finally {
                setLoading(false)
            }
        }

        loadData()
        const interval = setInterval(loadData, 30000)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="min-h-screen bg-background">
            <div className="mx-auto max-w-5xl px-4 py-8">
                <div className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Antrian Hari Ini
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {date ? `${date} • ${time}` : "Memuat waktu..."}
                        </p>
                    </div>

                    <div>
                        <Button asChild>
                            <Link
                                href={
                                    currentUser
                                        ? currentUser.role === "admin"
                                            ? "/admin/dashboard"
                                            : "/user"
                                        : "/auth/login"
                                }
                            >
                                {currentUser ? "Ke Dashboard" : "Masuk"}
                            </Link>
                        </Button>
                    </div>
                </div>

                <div className="mt-6 rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-24 text-center">
                                    No. Antrian
                                </TableHead>
                                <TableHead className="w-28">Waktu</TableHead>
                                <TableHead>Layanan</TableHead>
                                <TableHead className="w-28 text-center">
                                    Status
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={5}
                                        className="h-32 text-center text-muted-foreground"
                                    >
                                        Memuat data antrian...
                                    </TableCell>
                                </TableRow>
                            ) : appointments.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={5}
                                        className="h-32 text-center text-muted-foreground"
                                    >
                                        Belum ada antrian untuk hari ini.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                appointments.map((item) => {
                                    const dateStr = item.booked_date
                                        ? String(item.booked_date).slice(0, 10)
                                        : ""
                                    const timeStr = normalizeTimeKey(
                                        String(item.time || "00:00"),
                                    )
                                    const isPast = isPastDateTime(
                                        dateStr,
                                        timeStr,
                                    )

                                    return (
                                        <TableRow key={item.id}>
                                            <TableCell className="text-center font-bold">
                                                #
                                                {String(
                                                    item.queue_number ?? "-",
                                                ).padStart(2, "0")}
                                            </TableCell>
                                            <TableCell>{timeStr} WIB</TableCell>
                                            <TableCell>
                                                {serviceLabel(item.service)}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span
                                                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                                        isPast
                                                            ? "bg-muted text-muted-foreground"
                                                            : "bg-primary/10 text-primary"
                                                    }`}
                                                >
                                                    {isPast
                                                        ? "Selesai"
                                                        : "Menunggu"}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    )
}
