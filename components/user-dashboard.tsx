"use client"

import { CalendarPlus, CheckCircle2, RefreshCw } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { formatDateId, SERVICES, TIME_SLOTS, toDateKey } from "@/lib/antrian"
import { apiRequest, handleApiError } from "@/lib/http"
import type { AppointmentDto, ReceiptResult } from "@/lib/types"

interface UserDashboardProps {
    user: {
        name: string
        email: string
        phone: string
    }
}

interface BookingForm {
    name: string
    email: string
    phone: string
    bookedDate: string
    time: string
    service: string
}

interface BookingResponse {
    appointment: AppointmentDto
    receipt: ReceiptResult
}

function createInitialForm(user: UserDashboardProps["user"]): BookingForm {
    return {
        name: user.name,
        email: user.email,
        phone: user.phone,
        bookedDate: toDateKey(new Date()),
        time: "",
        service: "",
    }
}

function statusBadge(status: AppointmentDto["status"]) {
    if (status === "upcoming") {
        return (
            <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                Akan datang
            </span>
        )
    }

    return (
        <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
            Selesai
        </span>
    )
}

export function UserDashboard({ user }: UserDashboardProps) {
    const [entries, setEntries] = useState<AppointmentDto[]>([])
    const [loading, setLoading] = useState(true)
    const [listError, setListError] = useState("")
    const [form, setForm] = useState<BookingForm>(() => createInitialForm(user))
    const [submitting, setSubmitting] = useState(false)
    const [formError, setFormError] = useState("")
    const [success, setSuccess] = useState<BookingResponse | null>(null)
    const today = useMemo(() => toDateKey(new Date()), [])

    const loadHistory = useCallback(async () => {
        setLoading(true)
        try {
            const payload = await apiRequest<{ data: AppointmentDto[] }>(
                "/api/user/appointments",
            )
            setEntries(payload.data)
            setListError("")
        } catch (error) {
            setListError(
                handleApiError(error, () =>
                    window.location.assign("/auth/login?error=expired"),
                ),
            )
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadHistory()
    }, [loadHistory])

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault()
        setFormError("")
        setSubmitting(true)

        try {
            const payload = await apiRequest<{ data: BookingResponse }>(
                "/api/user/appointments",
                {
                    method: "POST",
                    body: JSON.stringify(form),
                },
            )

            setSuccess(payload.data)
            setForm((current) => ({
                ...current,
                bookedDate: toDateKey(new Date()),
                time: "",
                service: "",
            }))
            await loadHistory()
        } catch (error) {
            setFormError(
                handleApiError(error, () =>
                    window.location.assign("/auth/login?error=expired"),
                ),
            )
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold">Ambil Antrian</h2>
                <p className="text-sm text-muted-foreground">
                    Isi data kunjungan Anda. Kuitansi akan dikirim ke nomor
                    WhatsApp yang terdaftar.
                </p>
            </div>

            {success && (
                <Card className="border-emerald-300 dark:border-emerald-800">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                            <CheckCircle2 className="h-5 w-5" />
                            Antrian berhasil dibuat
                        </CardTitle>
                        <CardDescription>
                            Nomor antrian{" "}
                            <span className="font-semibold text-foreground">
                                #{success.appointment.queueNumber ?? "-"}
                            </span>{" "}
                            untuk {formatDateId(success.appointment.bookedDate)}{" "}
                            pukul {success.appointment.time}.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <p className="text-sm">
                            {success.receipt.sent
                                ? "Kuitansi sudah dikirim ke WhatsApp Anda."
                                : "Kuitansi belum terkirim otomatis ke WhatsApp."}
                            {!success.receipt.sent && success.receipt.error
                                ? ` (${success.receipt.error})`
                                : ""}
                        </p>
                        <pre className="whitespace-pre-wrap rounded-md bg-muted p-4 text-sm">
                            {success.receipt.message}
                        </pre>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
                <Card>
                    <CardHeader>
                        <CardTitle>Formulir Pemesanan</CardTitle>
                        <CardDescription>
                            Maksimal satu appointment aktif per tanggal.
                        </CardDescription>
                    </CardHeader>
                    <form onSubmit={handleSubmit}>
                        <CardContent className="space-y-4">
                            {formError && (
                                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                                    {formError}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="name">Nama</Label>
                                <Input
                                    id="name"
                                    value={form.name}
                                    onChange={(event) =>
                                        setForm({
                                            ...form,
                                            name: event.target.value,
                                        })
                                    }
                                    placeholder="Nama lengkap"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={form.email}
                                    readOnly
                                    className="bg-muted"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">Nomor WhatsApp</Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    value={form.phone}
                                    onChange={(event) =>
                                        setForm({
                                            ...form,
                                            phone: event.target.value,
                                        })
                                    }
                                    placeholder="081234567890"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="booked-date">Tanggal</Label>
                                <Input
                                    id="booked-date"
                                    type="date"
                                    min={today}
                                    value={form.bookedDate}
                                    onChange={(event) =>
                                        setForm({
                                            ...form,
                                            bookedDate: event.target.value,
                                        })
                                    }
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Waktu</Label>
                                <Select
                                    value={form.time}
                                    onValueChange={(value) =>
                                        setForm({ ...form, time: value })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih waktu" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {TIME_SLOTS.map((slot) => (
                                            <SelectItem key={slot} value={slot}>
                                                {slot}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Layanan</Label>
                                <Select
                                    value={form.service}
                                    onValueChange={(value) =>
                                        setForm({ ...form, service: value })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih layanan" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {SERVICES.map((service) => (
                                            <SelectItem
                                                key={service.value}
                                                value={service.value}
                                            >
                                                {service.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={
                                    submitting ||
                                    !form.time ||
                                    !form.service ||
                                    !form.phone
                                }
                            >
                                <CalendarPlus className="h-4 w-4" />
                                {submitting ? "Menyimpan..." : "Ambil Antrian"}
                            </Button>
                        </CardContent>
                    </form>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
                        <div>
                            <CardTitle>Riwayat Antrian</CardTitle>
                            <CardDescription>
                                Seluruh appointment yang terhubung dengan email{" "}
                                {user.email}.
                            </CardDescription>
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={loadHistory}
                            disabled={loading}
                            aria-label="Muat ulang riwayat"
                        >
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <p className="py-8 text-center text-muted-foreground">
                                Memuat...
                            </p>
                        ) : listError ? (
                            <p className="py-8 text-center text-sm text-destructive">
                                {listError}
                            </p>
                        ) : entries.length === 0 ? (
                            <p className="py-8 text-center text-muted-foreground">
                                Belum ada riwayat antrian.
                            </p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Jadwal</TableHead>
                                        <TableHead>Layanan</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">
                                            No.
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {entries.map((entry) => (
                                        <TableRow key={entry.id}>
                                            <TableCell>
                                                <div className="text-sm font-medium">
                                                    {formatDateId(
                                                        entry.bookedDate,
                                                    )}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {entry.time}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {entry.serviceLabel}
                                            </TableCell>
                                            <TableCell>
                                                {statusBadge(entry.status)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-lg font-bold">
                                                {entry.queueNumber ?? "-"}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>

            <p className="text-xs text-muted-foreground">
                Sesi masuk berakhir otomatis. Jika sesi habis, Anda akan diminta
                meminta tautan masuk baru melalui email.
            </p>
        </div>
    )
}
