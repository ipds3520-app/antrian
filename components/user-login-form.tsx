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

export function UserLoginForm() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault()
        setError("")
        setLoading(true)

        try {
            await apiRequest("/api/auth/login", {
                method: "POST",
                body: JSON.stringify({ email, password }),
            })

            window.location.assign("/user")
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
                    Masukkan email dan password akun Anda.
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
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="email@example.com"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="Password"
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
                        Belum punya akun?{" "}
                        <Link
                            href="/auth/signup"
                            className="underline underline-offset-4"
                        >
                            Daftar
                        </Link>
                    </p>
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
            </form>
        </Card>
    )
}
