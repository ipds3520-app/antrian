"use client"

import { CalendarPlus, CheckCircle2, RefreshCw, UserRound } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
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
import {
    formatDateId,
    normalizeTimeKey,
    SERVICES,
    serviceLabel,
    TIME_SLOTS,
    toDateKey,
} from "@/lib/antrian"
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

interface QueueItem {
    id: string | number
    booked_date: string
    time: string
    service: string
    queue_number?: number | null
    status?: string | null
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
    if (status === "proses") {
        return (
            <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                Proses
            </span>
        )
    }

    return (
        <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            Selesai
        </span>
    )
}

export function UserDashboard({ user }: UserDashboardProps) {
    const [queue, setQueue] = useState<QueueItem[]>([])
    const [queueLoading, setQueueLoading] = useState(true)
    const [entries, setEntries] = useState<AppointmentDto[]>([])
    const [loading, setLoading] = useState(true)
    const [listError, setListError] = useState("")
    const [form, setForm] = useState<BookingForm>(() => createInitialForm(user))
    const [submitting, setSubmitting] = useState(false)
    const [formError, setFormError] = useState("")
    const [success, setSuccess] = useState<BookingResponse | null>(null)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [profileOpen, setProfileOpen] = useState(false)
    const [profileForm, setProfileForm] = useState({
        name: user.name,
        phone: user.phone,
    })
    const [profileSaving, setProfileSaving] = useState(false)
    const [profileError, setProfileError] = useState("")
    const [profileNotice, setProfileNotice] = useState("")
    const [time, setTime] = useState("")
    const [date, setDate] = useState("")
    const today = useMemo(() => toDateKey(new Date()), [])

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

    const loadQueue = useCallback(async () => {
        try {
            const res = await fetch("/api")
            if (res.ok) {
                const body = await res.json()
                setQueue(
                    Array.isArray(body.appointments) ? body.appointments : [],
                )
            }
        } catch (error) {
            console.error("Gagal memuat antrian", error)
        } finally {
            setQueueLoading(false)
        }
    }, [])

    useEffect(() => {
        loadQueue()
        const interval = setInterval(loadQueue, 30000)
        return () => clearInterval(interval)
    }, [loadQueue])

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

    function openCreate() {
        setFormError("")
        setDialogOpen(true)
    }

    function handleDialogChange(open: boolean) {
        setDialogOpen(open)
        if (!open) setFormError("")
    }

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
            setDialogOpen(false)
            await Promise.all([loadHistory(), loadQueue()])
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

    async function handleSaveProfile(event: React.FormEvent) {
        event.preventDefault()
        setProfileError("")
        setProfileNotice("")
        setProfileSaving(true)

        try {
            await apiRequest("/api/user/profile", {
                method: "PATCH",
                body: JSON.stringify(profileForm),
            })

            setProfileOpen(false)
            setProfileNotice("Profil berhasil diperbarui.")
            setSuccess(null)
        } catch (error) {
            setProfileError(
                handleApiError(error, () =>
                    window.location.assign("/auth/login?error=expired"),
                ),
            )
        } finally {
            setProfileSaving(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">
                        Antrian Hari Ini
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {date ? `${date} • ${time}` : "Memuat waktu..."}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setProfileOpen(true)}
                    >
                        <UserRound className="h-4 w-4" />
                        Profil
                    </Button>
                    <Button onClick={openCreate}>
                        <CalendarPlus className="h-4 w-4" />
                        Ambil Antrian
                    </Button>
                </div>
            </div>

            {profileNotice && (
                <div className="rounded-md bg-muted p-3 text-sm">
                    {profileNotice}
                </div>
            )}

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

            <div className="rounded-md border">
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
                        {queueLoading ? (
                            <TableRow>
                                <TableCell
                                    colSpan={4}
                                    className="h-32 text-center text-muted-foreground"
                                >
                                    Memuat data antrian...
                                </TableCell>
                            </TableRow>
                        ) : queue.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={4}
                                    className="h-32 text-center text-muted-foreground"
                                >
                                    Belum ada antrian untuk hari ini.
                                </TableCell>
                            </TableRow>
                        ) : (
                            queue.map((item) => {
                                const timeStr = normalizeTimeKey(
                                    String(item.time || "00:00"),
                                )
                                const isDone =
                                    item.status?.toLowerCase() === "selesai"

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
                                                    isDone
                                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                                        : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                                                }`}
                                            >
                                                {isDone ? "Selesai" : "Proses"}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

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
                                                {formatDateId(entry.bookedDate)}
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

            <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Ambil Antrian</DialogTitle>
                        <DialogDescription>
                            Isi data kunjungan Anda. Kuitansi akan dikirim ke
                            nomor WhatsApp yang terdaftar.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit}>
                        <div className="space-y-4 py-2">
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
                        </div>

                        <DialogFooter>
                            <Button
                                type="submit"
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
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Profil</DialogTitle>
                        <DialogDescription>
                            Perbarui nama dan nomor WhatsApp Anda. Email tidak
                            dapat diubah.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveProfile}>
                        <div className="space-y-4 py-2">
                            {profileError && (
                                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                                    {profileError}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="profile-name">Nama</Label>
                                <Input
                                    id="profile-name"
                                    value={profileForm.name}
                                    onChange={(event) =>
                                        setProfileForm({
                                            ...profileForm,
                                            name: event.target.value,
                                        })
                                    }
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="profile-email">Email</Label>
                                <Input
                                    id="profile-email"
                                    type="email"
                                    value={user.email}
                                    readOnly
                                    className="bg-muted"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="profile-phone">
                                    Nomor WhatsApp
                                </Label>
                                <Input
                                    id="profile-phone"
                                    type="tel"
                                    value={profileForm.phone}
                                    onChange={(event) =>
                                        setProfileForm({
                                            ...profileForm,
                                            phone: event.target.value,
                                        })
                                    }
                                    required
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="submit" disabled={profileSaving}>
                                {profileSaving
                                    ? "Menyimpan..."
                                    : "Simpan Profil"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <p className="text-xs text-muted-foreground">
                Sesi masuk berlaku sementara. Setelah berakhir, silakan masuk
                kembali.
            </p>
        </div>
    )
}
