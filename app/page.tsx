import { CalendarDays, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { SERVICES } from "@/lib/antrian"
import { getCurrentUser } from "@/lib/session"

export default async function HomePage() {
    const user = await getCurrentUser()

    if (user) {
        redirect(user.role === "admin" ? "/admin/dashboard" : "/user")
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4 py-10">
            <div className="w-full max-w-3xl space-y-8">
                <div className="space-y-2 text-center">
                    <h1 className="text-3xl font-bold tracking-tight">
                        Sistem Antrian BPS
                    </h1>
                    <p className="text-muted-foreground">
                        Pesan layanan statistik tanpa antre panjang. Masuk
                        dengan tautan email, lalu pilih jadwal kunjungan Anda.
                    </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CalendarDays className="h-8 w-8" />
                            <CardTitle>Untuk Pengguna</CardTitle>
                            <CardDescription>
                                Masuk dengan email untuk memesan antrian dan
                                melihat riwayat kunjungan.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button asChild className="w-full">
                                <Link href="/auth/login">
                                    Masuk sebagai pengguna
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <ShieldCheck className="h-8 w-8" />
                            <CardTitle>Untuk Admin</CardTitle>
                            <CardDescription>
                                Kelola seluruh appointment, riwayat, dan kirim
                                ulang kuitansi WhatsApp.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button
                                asChild
                                variant="outline"
                                className="w-full"
                            >
                                <Link href="/auth/admin">
                                    Masuk sebagai admin
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                <div className="rounded-lg border bg-background p-4 text-sm">
                    <p className="font-medium">Layanan yang tersedia</p>
                    <ul className="mt-2 list-inside list-disc text-muted-foreground">
                        {SERVICES.map((service) => (
                            <li key={service.value}>{service.label}</li>
                        ))}
                    </ul>
                </div>
            </div>
        </main>
    )
}
