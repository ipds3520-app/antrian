"use client"

import { MessageCircle, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { AdminAppointmentDialog } from "@/components/admin-appointment-dialog"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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
import { formatDateId, SERVICES } from "@/lib/antrian"
import { apiRequest, handleApiError } from "@/lib/http"
import type { AppointmentDto } from "@/lib/types"

interface ListResponse {
    data: AppointmentDto[]
    pagination: {
        total: number
        limit: number
        offset: number
        hasMore: boolean
    }
}

interface Filters {
    q: string
    service: string
    from: string
    to: string
}

const EMPTY_FILTERS: Filters = { q: "", service: "all", from: "", to: "" }

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

export default function AdminDashboardPage() {
    const [entries, setEntries] = useState<AppointmentDto[]>([])
    const [pagination, setPagination] = useState<ListResponse["pagination"]>({
        total: 0,
        limit: 50,
        offset: 0,
        hasMore: false,
    })
    const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
    const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS)
    const [offset, setOffset] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [notice, setNotice] = useState("")
    const [busyId, setBusyId] = useState<string | null>(null)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editing, setEditing] = useState<AppointmentDto | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({
                limit: "50",
                offset: String(offset),
            })

            if (applied.q.trim()) params.set("q", applied.q.trim())
            if (applied.service !== "all")
                params.set("service", applied.service)
            if (applied.from) params.set("from", applied.from)
            if (applied.to) params.set("to", applied.to)

            const payload = await apiRequest<ListResponse>(
                `/api/admin/appointments?${params.toString()}`,
            )

            setEntries(payload.data)
            setPagination(payload.pagination)
            setError("")
        } catch (error) {
            setError(
                handleApiError(error, () =>
                    window.location.assign("/auth/admin"),
                ),
            )
        } finally {
            setLoading(false)
        }
    }, [applied, offset])

    useEffect(() => {
        load()
    }, [load])

    function applyFilters(event: React.FormEvent) {
        event.preventDefault()
        setOffset(0)
        setApplied(filters)
    }

    function resetFilters() {
        setFilters(EMPTY_FILTERS)
        setApplied(EMPTY_FILTERS)
        setOffset(0)
    }

    function openCreate() {
        setEditing(null)
        setDialogOpen(true)
    }

    function openEdit(appointment: AppointmentDto) {
        setEditing(appointment)
        setDialogOpen(true)
    }

    async function remove(appointment: AppointmentDto) {
        const confirmed = window.confirm(
            `Hapus appointment ${appointment.name} pada ${formatDateId(appointment.bookedDate)}?`,
        )
        if (!confirmed) return

        setBusyId(appointment.id)
        setNotice("")
        try {
            await apiRequest(`/api/admin/appointments/${appointment.id}`, {
                method: "DELETE",
            })
            setNotice("Appointment berhasil dihapus.")
            await load()
        } catch (error) {
            setError(
                handleApiError(error, () =>
                    window.location.assign("/auth/admin"),
                ),
            )
        } finally {
            setBusyId(null)
        }
    }

    async function resendReceipt(appointment: AppointmentDto) {
        setBusyId(appointment.id)
        setNotice("")
        setError("")
        try {
            const payload = await apiRequest<{
                data: { sent: boolean; error?: string }
            }>(`/api/admin/appointments/${appointment.id}/receipt`, {
                method: "POST",
            })

            setNotice(
                payload.data.sent
                    ? "Kuitansi WhatsApp berhasil dikirim."
                    : `Kuitansi tidak terkirim: ${payload.data.error ?? "provider belum dikonfigurasi"}`,
            )
        } catch (error) {
            setError(
                handleApiError(error, () =>
                    window.location.assign("/auth/admin"),
                ),
            )
        } finally {
            setBusyId(null)
        }
    }

    const currentPage = Math.floor(offset / pagination.limit) + 1
    const totalPages = Math.max(
        1,
        Math.ceil(pagination.total / pagination.limit),
    )

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-bold">Riwayat Appointment</h2>
                    <p className="text-sm text-muted-foreground">
                        {pagination.total} appointment tersimpan. Menampilkan
                        seluruh riwayat dari semua tanggal.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={load}
                        disabled={loading}
                        aria-label="Muat ulang"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button onClick={openCreate}>
                        <Plus className="h-4 w-4" />
                        Tambah
                    </Button>
                </div>
            </div>

            {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                </div>
            )}
            {notice && (
                <div className="rounded-md bg-muted p-3 text-sm">{notice}</div>
            )}

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle>Filter</CardTitle>
                    <CardDescription>
                        Cari berdasarkan nama, email, atau nomor WhatsApp.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form
                        onSubmit={applyFilters}
                        className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_160px_160px_auto]"
                    >
                        <Input
                            placeholder="Cari nama, email, telepon..."
                            value={filters.q}
                            onChange={(event) =>
                                setFilters({
                                    ...filters,
                                    q: event.target.value,
                                })
                            }
                        />
                        <Select
                            value={filters.service}
                            onValueChange={(value) =>
                                setFilters({ ...filters, service: value })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Layanan" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    Semua layanan
                                </SelectItem>
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
                        <Input
                            type="date"
                            value={filters.from}
                            onChange={(event) =>
                                setFilters({
                                    ...filters,
                                    from: event.target.value,
                                })
                            }
                            aria-label="Dari tanggal"
                        />
                        <Input
                            type="date"
                            value={filters.to}
                            onChange={(event) =>
                                setFilters({
                                    ...filters,
                                    to: event.target.value,
                                })
                            }
                            aria-label="Sampai tanggal"
                        />
                        <div className="flex gap-2">
                            <Button type="submit">Terapkan</Button>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={resetFilters}
                            >
                                Reset
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="pt-6">
                    {loading ? (
                        <p className="py-8 text-center text-muted-foreground">
                            Memuat...
                        </p>
                    ) : entries.length === 0 ? (
                        <p className="py-8 text-center text-muted-foreground">
                            Tidak ada appointment yang cocok.
                        </p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Jadwal</TableHead>
                                    <TableHead>Pemesan</TableHead>
                                    <TableHead>Layanan</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">
                                        No.
                                    </TableHead>
                                    <TableHead className="text-right">
                                        Aksi
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
                                        <TableCell>
                                            <div className="text-sm font-medium">
                                                {entry.name}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {entry.email}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {entry.phone ?? "-"}
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
                                        <TableCell>
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    disabled={
                                                        busyId === entry.id
                                                    }
                                                    onClick={() =>
                                                        resendReceipt(entry)
                                                    }
                                                    aria-label="Kirim ulang WhatsApp"
                                                >
                                                    <MessageCircle className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    disabled={
                                                        busyId === entry.id
                                                    }
                                                    onClick={() =>
                                                        openEdit(entry)
                                                    }
                                                    aria-label="Ubah"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="text-destructive"
                                                    disabled={
                                                        busyId === entry.id
                                                    }
                                                    onClick={() =>
                                                        remove(entry)
                                                    }
                                                    aria-label="Hapus"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                    Halaman {currentPage} dari {totalPages}
                </span>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={offset === 0 || loading}
                        onClick={() =>
                            setOffset(Math.max(0, offset - pagination.limit))
                        }
                    >
                        Sebelumnya
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={!pagination.hasMore || loading}
                        onClick={() => setOffset(offset + pagination.limit)}
                    >
                        Berikutnya
                    </Button>
                </div>
            </div>

            <AdminAppointmentDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                appointment={editing}
                onSaved={load}
            />
        </div>
    )
}
