"use client"

import { LogIn } from "lucide-react"
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

export default function AdminLoginPage() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault()
        setError("")
        setLoading(true)

        try {
            await apiRequest("/api/admin/auth/login", {
                method: "POST",
                body: JSON.stringify({ email, password }),
            })

            window.location.assign("/admin/dashboard")
        } catch (error) {
            setError(handleApiError(error))
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card>
            <CardHeader className="text-center">
                <CardTitle className="text-2xl">Masuk Admin</CardTitle>
                <CardDescription>
                    Gunakan akun admin yang terdaftar pada tabel users.
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
                        <Label htmlFor="admin-email">Email</Label>
                        <Input
                            id="admin-email"
                            type="email"
                            placeholder="admin@example.com"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="admin-password">Password</Label>
                        <Input
                            id="admin-password"
                            type="password"
                            placeholder="Password admin"
                            value={password}
                            onChange={(event) =>
                                setPassword(event.target.value)
                            }
                            required
                        />
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3">
                    <Button type="submit" className="w-full" disabled={loading}>
                        <LogIn className="h-4 w-4" />
                        {loading ? "Masuk..." : "Masuk"}
                    </Button>
                    <Button asChild variant="outline" className="w-full">
                        <Link href="/">Kembali ke Jadwal Antrian</Link>
                    </Button>
                    <p className="text-center text-sm text-muted-foreground">
                        Pengguna?{" "}
                        <Link
                            href="/auth/login"
                            className="underline underline-offset-4"
                        >
                            Masuk dengan email
                        </Link>
                    </p>
                </CardFooter>
            </form>
        </Card>
    )
}
