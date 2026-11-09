"use client"

import { UserPlus } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiRequest, handleApiError } from "@/lib/http"

interface SignupForm {
    name: string
    email: string
    phone: string
    password: string
    confirmPassword: string
}

const EMPTY_FORM: SignupForm = {
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
}

export function UserSignupForm() {
    const [form, setForm] = useState<SignupForm>(EMPTY_FORM)
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const [created, setCreated] = useState(false)

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault()
        setError("")

        if (form.password !== form.confirmPassword) {
            setError("Konfirmasi password tidak sama")
            return
        }

        setLoading(true)

        try {
            await apiRequest("/api/auth/signup", {
                method: "POST",
                body: JSON.stringify({
                    name: form.name,
                    email: form.email,
                    phone: form.phone,
                    password: form.password,
                }),
            })

            setCreated(true)
        } catch (error) {
            setError(handleApiError(error))
        } finally {
            setLoading(false)
        }
    }

    if (created) {
        return (
            <Card>
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">
                        Akun berhasil dibuat
                    </CardTitle>
                    <CardDescription>
                        Silakan masuk menggunakan email dan password Anda.
                    </CardDescription>
                </CardHeader>
                <CardFooter className="flex flex-col gap-2">
                    <Button asChild className="w-full">
                        <Link href="/auth/login">Masuk</Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full">
                        <Link href="/">Kembali ke Jadwal Antrian</Link>
                    </Button>
                </CardFooter>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader className="text-center">
                <CardTitle className="text-2xl">Daftar</CardTitle>
                <CardDescription>
                    Buat akun untuk mengambil antrian.
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                    {error && (
                        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                            {error}
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="signup-name">Nama</Label>
                        <Input
                            id="signup-name"
                            value={form.name}
                            onChange={(event) =>
                                setForm({ ...form, name: event.target.value })
                            }
                            placeholder="Nama lengkap"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="signup-email">Email</Label>
                        <Input
                            id="signup-email"
                            type="email"
                            value={form.email}
                            onChange={(event) =>
                                setForm({ ...form, email: event.target.value })
                            }
                            placeholder="email@example.com"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="signup-phone">Nomor WhatsApp</Label>
                        <Input
                            id="signup-phone"
                            type="tel"
                            value={form.phone}
                            onChange={(event) =>
                                setForm({ ...form, phone: event.target.value })
                            }
                            placeholder="081234567890"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="signup-password">Password</Label>
                        <Input
                            id="signup-password"
                            type="password"
                            value={form.password}
                            onChange={(event) =>
                                setForm({
                                    ...form,
                                    password: event.target.value,
                                })
                            }
                            placeholder="Minimal 8 karakter"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="signup-confirm">
                            Konfirmasi Password
                        </Label>
                        <Input
                            id="signup-confirm"
                            type="password"
                            value={form.confirmPassword}
                            onChange={(event) =>
                                setForm({
                                    ...form,
                                    confirmPassword: event.target.value,
                                })
                            }
                            placeholder="Ulangi password"
                            required
                        />
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3">
                    <Button type="submit" className="w-full" disabled={loading}>
                        <UserPlus className="h-4 w-4" />
                        {loading ? "Mendaftar..." : "Daftar"}
                    </Button>
                    <p className="text-center text-sm text-muted-foreground">
                        Sudah punya akun?{" "}
                        <Link
                            href="/auth/login"
                            className="underline underline-offset-4"
                        >
                            Masuk
                        </Link>
                    </p>
                </CardFooter>
            </form>
        </Card>
    )
}
