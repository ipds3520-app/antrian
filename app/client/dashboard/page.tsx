"use client"

import { Plus, RefreshCw } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
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
    DialogTrigger,
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
    type AntrianStatus,
    LAYANAN_OPTIONS,
    STATUS_LABELS,
    toDateKey,
} from "@/lib/antrian"

interface AntrianEntry {
    id: number
    userId: string
    jenisLayanan: string
    nomorAntri: number
    tanggal: string
    appointmentTime: string
    status: AntrianStatus
    createdAt: string
}

const TIME_SLOTS: string[] = []
for (let h = 6; h <= 16; h++) {
    for (let m = 0; m < 60; m += 30) {
        if (h === 16 && m > 0) break
        TIME_SLOTS.push(
            `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
        )
    }
}

function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
    })
}

export default function ClientDashboardPage() {
    const [entries, setEntries] = useState<AntrianEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [listError, setListError] = useState("")
    const [dialogOpen, setDialogOpen] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [dialogError, setDialogError] = useState("")
    const [grabDate, setGrabDate] = useState(toDateKey(new Date()))
    const [selectedLayanan, setSelectedLayanan] = useState("")
    const [selectedTime, setSelectedTime] = useState("")

    const fetchEntries = useCallback(async () => {
        try {
            const res = await fetch("/api/antrian")
            if (!res.ok) {
                const json = await res.json().catch(() => null)
                throw new Error(json?.message ?? "Gagal memuat antrian")
            }
            setEntries(await res.json())
            setListError("")
        } catch (err) {
            setListError(
                err instanceof Error ? err.message : "Gagal memuat antrian",
            )
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        setLoading(true)
        fetchEntries()

        const interval = setInterval(() => {
            fetchEntries()
        }, 30_000)
        return () => clearInterval(interval)
    }, [fetchEntries])

    async function handleGrab() {
        setDialogError("")
        setSubmitting(true)

        try {
            const res = await fetch("/api/antrian", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jenisLayanan: selectedLayanan,
                    tanggal: grabDate,
                    waktu: selectedTime,
                }),
            })

            if (!res.ok) {
                const json = await res.json().catch(() => null)
                throw new Error(json?.message ?? "Gagal mengambil antrian")
            }

            setDialogOpen(false)
            setSelectedLayanan("")
            setSelectedTime("")
            fetchEntries()
        } catch (err) {
            setDialogError(
                err instanceof Error ? err.message : "Gagal mengambil antrian",
            )
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Antrian Hari Ini</h2>
                    <p className="text-sm text-muted-foreground">
                        {new Date().toLocaleDateString("id-ID", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                        })}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                            setLoading(true)
                            fetchEntries()
                        }}
                    >
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Dialog
                        open={dialogOpen}
                        onOpenChange={(open) => {
                            setGrabDate(toDateKey(new Date()))
                            setDialogOpen(open)
                        }}
                    >
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="h-4 w-4" />
                                Ambil Antrian
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Ambil Antrian</DialogTitle>
                                <DialogDescription>
                                    Pilih tanggal, jenis layanan, dan waktu
                                    janji temu
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-2">
                                {dialogError && (
                                    <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                                        {dialogError}
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <Label htmlFor="grab-date">Tanggal</Label>
                                    <Input
                                        id="grab-date"
                                        type="date"
                                        value={grabDate}
                                        min={toDateKey(new Date())}
                                        onChange={(e) =>
                                            setGrabDate(e.target.value)
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Jenis Layanan</Label>
                                    <Select
                                        value={selectedLayanan}
                                        onValueChange={setSelectedLayanan}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih layanan" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {LAYANAN_OPTIONS.map((l) => (
                                                <SelectItem key={l} value={l}>
                                                    {l}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Waktu Janji Temu</Label>
                                    <Select
                                        value={selectedTime}
                                        onValueChange={setSelectedTime}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih waktu" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {TIME_SLOTS.map((t) => (
                                                <SelectItem key={t} value={t}>
                                                    {t}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button
                                    onClick={handleGrab}
                                    disabled={
                                        submitting ||
                                        !selectedLayanan ||
                                        !selectedTime
                                    }
                                >
                                    {submitting
                                        ? "Mengambil..."
                                        : "Ambil Antrian"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle>Daftar Antrian</CardTitle>
                    <CardDescription>
                        Menampilkan antrian hari ini saja. Untuk mengambil
                        antrian di tanggal lain, gunakan tombol Ambil Antrian.
                    </CardDescription>
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
                            Belum ada antrian hari ini
                        </p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Waktu</TableHead>
                                    <TableHead>Jenis Layanan</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">
                                        Nomor Antri
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {entries.map((entry) => (
                                    <TableRow key={entry.id}>
                                        <TableCell>
                                            {formatTime(entry.appointmentTime)}
                                        </TableCell>
                                        <TableCell>
                                            {entry.jenisLayanan}
                                        </TableCell>
                                        <TableCell>
                                            {STATUS_LABELS[entry.status] ??
                                                entry.status}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-lg font-bold">
                                            {entry.nomorAntri}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
