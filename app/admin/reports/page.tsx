"use client"

import {
    CalendarRange,
    Download,
    FileSpreadsheet,
    RefreshCw,
} from "lucide-react"
import { useCallback, useEffect, useState } from "react"
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
import { APP_TIMEZONE, formatDateId, toDateKey } from "@/lib/antrian"
import { downloadCsv, downloadExcel, type ReportColumn } from "@/lib/export"
import { apiRequest, handleApiError } from "@/lib/http"
import {
    monthRange,
    type ReportPeriod,
    type ReportSummary,
} from "@/lib/reports"
import type { AppointmentDto } from "@/lib/types"
import { cn } from "@/lib/utils"

interface ReportRange {
    period: ReportPeriod
    from: string
    to: string
}

interface ReportResponse {
    data: AppointmentDto[]
    summary: ReportSummary
    range: ReportRange
}

interface Filters {
    period: ReportPeriod
    day: string
    month: string
    year: string
    from: string
    to: string
}

const EMPTY_SUMMARY: ReportSummary = {
    total: 0,
    proses: 0,
    selesai: 0,
    byService: [],
}

function initialFilters(): Filters {
    const today = toDateKey()
    const month = today.slice(0, 7)
    const bounds = monthRange(month) ?? { from: today, to: today }

    return {
        period: "month",
        day: today,
        month,
        year: today.slice(0, 4),
        from: bounds.from,
        to: bounds.to,
    }
}

function buildParams(filters: Filters): URLSearchParams {
    const params = new URLSearchParams({ period: filters.period })

    if (filters.period === "day") params.set("date", filters.day)
    if (filters.period === "month") params.set("month", filters.month)
    if (filters.period === "year") params.set("year", filters.year)
    if (filters.period === "custom") {
        params.set("from", filters.from)
        params.set("to", filters.to)
    }

    return params
}

function formatDateTime(value: string | null): string {
    if (!value) return ""

    return new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: APP_TIMEZONE,
    }).format(new Date(value))
}

function formatShortDate(dateKey: string): string {
    return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: APP_TIMEZONE,
    }).format(new Date(`${dateKey}T00:00:00`))
}

function statusLabel(status: AppointmentDto["status"]): string {
    return status === "selesai" ? "Selesai" : "Proses"
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

const EXPORT_COLUMNS: ReportColumn<AppointmentDto>[] = [
    { header: "Tanggal", value: (row) => row.bookedDate },
    { header: "Waktu", value: (row) => row.time },
    { header: "Nama", value: (row) => row.name },
    { header: "Email", value: (row) => row.email },
    { header: "WhatsApp", value: (row) => row.phone ?? "" },
    { header: "Layanan", value: (row) => row.serviceLabel },
    { header: "No. Antrian", value: (row) => row.queueNumber ?? "" },
    { header: "Status", value: (row) => statusLabel(row.status) },
    { header: "Dibuat", value: (row) => formatDateTime(row.createdAt) },
    { header: "Selesai Pada", value: (row) => formatDateTime(row.completedAt) },
]

export default function AdminReportsPage() {
    const [filters, setFilters] = useState<Filters>(initialFilters)
    const [applied, setApplied] = useState<Filters>(initialFilters)
    const [data, setData] = useState<AppointmentDto[]>([])
    const [summary, setSummary] = useState<ReportSummary>(EMPTY_SUMMARY)
    const [range, setRange] = useState<ReportRange | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    const load = useCallback(async () => {
        setLoading(true)
        setError("")

        try {
            const params = buildParams(applied)
            const payload = await apiRequest<ReportResponse>(
                `/api/admin/reports?${params.toString()}`,
            )

            setData(payload.data)
            setSummary(payload.summary)
            setRange(payload.range)
        } catch (error) {
            setError(
                handleApiError(error, () =>
                    window.location.assign("/auth/admin"),
                ),
            )
        } finally {
            setLoading(false)
        }
    }, [applied])

    useEffect(() => {
        load()
    }, [load])

    function applyFilters(event: React.FormEvent) {
        event.preventDefault()
        setApplied(filters)
    }

    function resetFilters() {
        const next = initialFilters()
        setFilters(next)
        setApplied(next)
    }

    function handleExportCsv() {
        if (!range) return
        downloadCsv(
            `laporan-antrian-${range.from}-${range.to}`,
            EXPORT_COLUMNS,
            data,
        )
    }

    function handleExportExcel() {
        if (!range) return
        downloadExcel(
            `laporan-antrian-${range.from}-${range.to}`,
            EXPORT_COLUMNS,
            data,
        )
    }

    const rangeLabel = range
        ? range.from === range.to
            ? formatDateId(range.from)
            : `${formatDateId(range.from)} – ${formatDateId(range.to)}`
        : "-"

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-bold">Laporan Appointment</h2>
                    <p className="text-sm text-muted-foreground">
                        Ringkasan appointment per hari, bulan, tahun, atau
                        rentang kustom.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={load}
                        disabled={loading}
                        aria-label="Muat ulang"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleExportExcel}
                        disabled={loading || data.length === 0}
                    >
                        <FileSpreadsheet className="h-4 w-4" />
                        Excel
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleExportCsv}
                        disabled={loading || data.length === 0}
                    >
                        <Download className="h-4 w-4" />
                        CSV
                    </Button>
                </div>
            </div>

            {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                </div>
            )}

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <CalendarRange className="h-4 w-4" />
                        Filter Periode
                    </CardTitle>
                    <CardDescription>
                        Pilih periode lalu tekan Tampilkan. Data yang tampil
                        dapat langsung diekspor.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form
                        onSubmit={applyFilters}
                        className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4"
                    >
                        <div className="space-y-2">
                            <Label>Periode</Label>
                            <Select
                                value={filters.period}
                                onValueChange={(value) =>
                                    setFilters({
                                        ...filters,
                                        period: value as ReportPeriod,
                                    })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="day">Harian</SelectItem>
                                    <SelectItem value="month">
                                        Bulanan
                                    </SelectItem>
                                    <SelectItem value="year">
                                        Tahunan
                                    </SelectItem>
                                    <SelectItem value="custom">
                                        Kustom
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {filters.period === "day" && (
                            <div className="space-y-2">
                                <Label htmlFor="report-day">Tanggal</Label>
                                <Input
                                    id="report-day"
                                    type="date"
                                    value={filters.day}
                                    onChange={(event) =>
                                        setFilters({
                                            ...filters,
                                            day: event.target.value,
                                        })
                                    }
                                    required
                                />
                            </div>
                        )}

                        {filters.period === "month" && (
                            <div className="space-y-2">
                                <Label htmlFor="report-month">Bulan</Label>
                                <Input
                                    id="report-month"
                                    type="month"
                                    value={filters.month}
                                    onChange={(event) =>
                                        setFilters({
                                            ...filters,
                                            month: event.target.value,
                                        })
                                    }
                                    required
                                />
                            </div>
                        )}

                        {filters.period === "year" && (
                            <div className="space-y-2">
                                <Label htmlFor="report-year">Tahun</Label>
                                <Input
                                    id="report-year"
                                    type="number"
                                    min={2000}
                                    max={2100}
                                    value={filters.year}
                                    onChange={(event) =>
                                        setFilters({
                                            ...filters,
                                            year: event.target.value,
                                        })
                                    }
                                    required
                                />
                            </div>
                        )}

                        {filters.period === "custom" && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="report-from">
                                        Dari Tanggal
                                    </Label>
                                    <Input
                                        id="report-from"
                                        type="date"
                                        value={filters.from}
                                        onChange={(event) =>
                                            setFilters({
                                                ...filters,
                                                from: event.target.value,
                                            })
                                        }
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="report-to">
                                        Sampai Tanggal
                                    </Label>
                                    <Input
                                        id="report-to"
                                        type="date"
                                        value={filters.to}
                                        onChange={(event) =>
                                            setFilters({
                                                ...filters,
                                                to: event.target.value,
                                            })
                                        }
                                        required
                                    />
                                </div>
                            </>
                        )}

                        <div
                            className={cn(
                                "flex gap-2 sm:col-span-2",
                                filters.period === "custom"
                                    ? "lg:col-span-1"
                                    : "lg:col-span-2",
                            )}
                        >
                            <Button
                                type="submit"
                                disabled={loading}
                                className="flex-1 lg:flex-none"
                            >
                                Tampilkan
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={resetFilters}
                                disabled={loading}
                                className="flex-1 lg:flex-none"
                            >
                                Reset
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <div className="grid gap-3 sm:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Total Appointment</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{summary.total}</p>
                        <p className="text-xs text-muted-foreground">
                            {rangeLabel}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Proses</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                            {summary.proses}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Selesai</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                            {summary.selesai}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardContent className="pt-6">
                    {loading ? (
                        <p className="py-8 text-center text-muted-foreground">
                            Memuat laporan...
                        </p>
                    ) : data.length === 0 ? (
                        <p className="py-8 text-center text-muted-foreground">
                            Tidak ada appointment pada periode ini.
                        </p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tanggal</TableHead>
                                    <TableHead>Nama</TableHead>
                                    <TableHead>Layanan</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">
                                        No.
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.map((entry) => (
                                    <TableRow key={entry.id}>
                                        <TableCell>
                                            <div className="text-sm font-medium">
                                                {formatShortDate(
                                                    entry.bookedDate,
                                                )}
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
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground">
                Menampilkan {data.length} appointment. Ekspor Excel menghasilkan
                file .xls yang dapat dibuka dengan Excel atau LibreOffice;
                ekspor CSV dapat dibuka dengan Excel maupun Google Sheets.
            </p>
        </div>
    )
}
