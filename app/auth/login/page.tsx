"use client"

import { Mail } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
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

export default function LoginPage() {
    const [email, setEmail] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const [sentTo, setSentTo] = useState<string | null>(null)

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        if (params.get("error") === "expired") {
            setError("Tautan masuk sudah kedaluwarsa. Silakan minta lagi.")
        } else if (params.get("error")) {
            setError("Tautan masuk tidak valid. Silakan minta lagi.")
        }
    }, [])

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault()
        setError("")
        setLoading(true)

        try {
            await apiRequest<{
                message: string
            }>("/api/auth/request-link", {
                method: "POST",
                body: JSON.stringify({ email }),
            })

            setSentTo(email)
        } catch (error) {
            setError(handleApiError(error))
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card>
            <CardHeader className="text-center">
                <CardTitle className="text-2xl">Masuk</CardTitle>
                <CardDescription>
                    Masukkan email Anda. Kami akan mengirim tautan untuk masuk
                    tanpa password.
                </CardDescription>
            </CardHeader>

            {sentTo ? (
                <CardContent className="space-y-4">
                    <div className="rounded-md bg-muted p-4 text-sm">
                        Tautan masuk telah dikirim ke{" "}
                        <span className="font-medium">{sentTo}</span>. Buka
                        email Anda lalu tekan tautan tersebut.
                    </div>
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                            setSentTo(null)
                        }}
                    >
                        Gunakan email lain
                    </Button>
                </CardContent>
            ) : (
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        {error && (
                            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                                {error}
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="email@example.com"
                                value={email}
                                onChange={(event) =>
                                    setEmail(event.target.value)
                                }
                                required
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Sesi berlaku sementara. Setelah berakhir, Anda dapat
                            meminta tautan masuk baru.
                        </p>
                    </CardContent>
                    <CardFooter>
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={loading}
                        >
                            <Mail className="h-4 w-4" />
                            {loading ? "Mengirim..." : "Kirim tautan masuk"}
                        </Button>
                    </CardFooter>
                </form>
            )}

            <CardFooter className="flex flex-col gap-2 border-t pt-4">
                <Button asChild variant="outline" className="w-full">
                    <Link href="/">Kembali ke Jadwal Antrian</Link>
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                    Admin?{" "}
                    <Link
                        href="/auth/admin"
                        className="underline underline-offset-4"
                    >
                        Masuk sebagai admin
                    </Link>
                </p>
            </CardFooter>
        </Card>
    )
}
