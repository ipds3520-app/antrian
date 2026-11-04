"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
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
import { SERVICES, TIME_SLOTS, toDateKey } from "@/lib/antrian"
import { apiRequest, handleApiError } from "@/lib/http"
import type { AppointmentDto } from "@/lib/types"

interface AdminAppointmentDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    appointment: AppointmentDto | null
    onSaved: () => void
}

interface FormState {
    name: string
    email: string
    phone: string
    bookedDate: string
    time: string
    service: string
    queueNumber: string
}

function emptyForm(): FormState {
    return {
        name: "",
        email: "",
        phone: "",
        bookedDate: toDateKey(new Date()),
        time: "",
        service: "",
        queueNumber: "",
    }
}

function formFromAppointment(appointment: AppointmentDto): FormState {
    return {
        name: appointment.name,
        email: appointment.email,
        phone: appointment.phone ?? "",
        bookedDate: appointment.bookedDate,
        time: appointment.time,
        service: appointment.service,
        queueNumber: appointment.queueNumber?.toString() ?? "",
    }
}

export function AdminAppointmentDialog({
    open,
    onOpenChange,
    appointment,
    onSaved,
}: AdminAppointmentDialogProps) {
    const [form, setForm] = useState<FormState>(emptyForm)
    const [error, setError] = useState("")
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        if (!open) return

        setForm(appointment ? formFromAppointment(appointment) : emptyForm())
        setError("")
    }, [open, appointment])

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault()
        setError("")
        setSubmitting(true)

        try {
            const body: Record<string, unknown> = {
                name: form.name,
                email: form.email,
                phone: form.phone,
                bookedDate: form.bookedDate,
                time: form.time,
                service: form.service,
            }

            if (form.queueNumber.trim()) {
                body.queueNumber = Number(form.queueNumber)
            }

            if (appointment) {
                await apiRequest(`/api/admin/appointments/${appointment.id}`, {
                    method: "PATCH",
                    body: JSON.stringify(body),
                })
            } else {
                await apiRequest("/api/admin/appointments", {
                    method: "POST",
                    body: JSON.stringify(body),
                })
            }

            onOpenChange(false)
            onSaved()
        } catch (error) {
            setError(
                handleApiError(error, () =>
                    window.location.assign("/auth/admin"),
                ),
            )
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {appointment
                            ? "Ubah Appointment"
                            : "Tambah Appointment"}
                    </DialogTitle>
                    <DialogDescription>
                        Perubahan dapat dilakukan untuk seluruh riwayat
                        appointment.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <div className="space-y-4 py-2">
                        {error && (
                            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="admin-name">Nama</Label>
                            <Input
                                id="admin-name"
                                value={form.name}
                                onChange={(event) =>
                                    setForm({
                                        ...form,
                                        name: event.target.value,
                                    })
                                }
                                required
                            />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="admin-email">Email</Label>
                                <Input
                                    id="admin-email"
                                    type="email"
                                    value={form.email}
                                    onChange={(event) =>
                                        setForm({
                                            ...form,
                                            email: event.target.value,
                                        })
                                    }
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="admin-phone">
                                    Nomor WhatsApp
                                </Label>
                                <Input
                                    id="admin-phone"
                                    type="tel"
                                    value={form.phone}
                                    onChange={(event) =>
                                        setForm({
                                            ...form,
                                            phone: event.target.value,
                                        })
                                    }
                                />
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="admin-date">Tanggal</Label>
                                <Input
                                    id="admin-date"
                                    type="date"
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
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
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
                            <div className="space-y-2">
                                <Label htmlFor="admin-queue">
                                    Nomor Antrian
                                </Label>
                                <Input
                                    id="admin-queue"
                                    type="number"
                                    min={1}
                                    value={form.queueNumber}
                                    onChange={(event) =>
                                        setForm({
                                            ...form,
                                            queueNumber: event.target.value,
                                        })
                                    }
                                    placeholder="Otomatis"
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="submit"
                            disabled={submitting || !form.time || !form.service}
                        >
                            {submitting ? "Menyimpan..." : "Simpan"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
