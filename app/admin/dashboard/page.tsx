"use client"

import { RefreshCw } from "lucide-react"
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { type AntrianStatus, STATUS_LABELS, toDateKey } from "@/lib/antrian"

interface AdminAntrianEntry {
    id: number
    userId: string
    userName: string | null
    userEmail: string | null
    jenisLayanan: string
    nomorAntri: number
    tanggal: string
    appointmentTime: string
    status: AntrianStatus
    createdAt: string
}

function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
    })
}

function nextStatus(status: AntrianStatus): AntrianStatus | null {
    if (status === "waiting") return "in_progress"
    if (status === "in_progress") return "done"
    return null
}

export default function AdminDashboardPage() {
    const [entries, setEntries] = useState<AdminAntrianEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [listError, setListError] = useState("")
    const [busyId, setBusyId] = useState<number | null>(null)
    const [selectedDate, setSelectedDate] = useState(toDateKey(new Date()))

    const fetchEntries = useCallback(async (date: string) => {
        try {
            const res = await fetch(`/api/antrian?date=${date}`)
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
        fetchEntries(selectedDate)
    }, [fetchEntries, selectedDate])

    async function advance(entry: AdminAntrianEntry) {
        const target = nextStatus(entry.status)
        if (!target) return

        setBusyId(entry.id)
        try {
            const res = await fetch(`/api/antrian/${entry.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: target }),
            })
            if (!res.ok) {
                const json = await res.json().catch(() => null)
                throw new Error(json?.message ?? "Gagal memperbarui status")
            }
            fetchEntries(selectedDate)
        } catch (err) {
            setListError(
                err instanceof Error ? err.message : "Gagal memperbarui status",
            )
        } finally {
            setBusyId(null)
        }
    }

    async function remove(entry: AdminAntrianEntry) {
        setBusyId(entry.id)
        try {
            const res = await fetch(`/api/antrian/${entry.id}`, {
                method: "DELETE",
            })
            if (!res.ok) {
                const json = await res.json().catch(() => null)
                throw new Error(json?.message ?? "Gagal menghapus antrian")
            }
            fetchEntries(selectedDate)
        } catch (err) {
            setListError(
                err instanceof Error ? err.message : "Gagal menghapus antrian",
            )
        } finally {
            setBusyId(null)
        }
    }

    const waitingCount = entries.filter((e) => e.status === "waiting").length
    const activeCount = entries.filter((e) => e.status !== "done").length

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Kelola Antrian</h2>
                    <p className="text-sm text-muted-foreground">
                        {activeCount} antrian aktif, {waitingCount} menunggu
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-44"
                    />
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                            setLoading(true)
                            fetchEntries(selectedDate)
                        }}
                    >
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle>Daftar Antrian</CardTitle>
                    <CardDescription>
                        Panggil antrian berikutnya atau hapus antrian yang tidak
                        valid. Pilih tanggal lain untuk melihat riwayat.
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
                            Tidak ada antrian pada tanggal ini
                        </p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Waktu</TableHead>
                                    <TableHead>Pengguna</TableHead>
                                    <TableHead>Jenis Layanan</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">
                                        Nomor
                                    </TableHead>
                                    <TableHead className="text-right">
                                        Aksi
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {entries.map((entry) => {
                                    const target = nextStatus(entry.status)
                                    return (
                                        <TableRow key={entry.id}>
                                            <TableCell>
                                                {formatTime(
                                                    entry.appointmentTime,
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm">
                                                    {entry.userName ?? "-"}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {entry.userEmail ?? "-"}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {entry.jenisLayanan}
                                            </TableCell>
                                            <TableCell>
                                                {STATUS_LABELS[entry.status]}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-lg font-bold">
                                                {entry.nomorAntri}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex justify-end gap-1">
                                                    {target && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            disabled={
                                                                busyId ===
                                                                entry.id
                                                            }
                                                            onClick={() =>
                                                                advance(entry)
                                                            }
                                                        >
                                                            {
                                                                STATUS_LABELS[
                                                                    target
                                                                ]
                                                            }
                                                        </Button>
                                                    )}
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-destructive"
                                                        disabled={
                                                            busyId === entry.id
                                                        }
                                                        onClick={() =>
                                                            remove(entry)
                                                        }
                                                    >
                                                        Hapus
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
