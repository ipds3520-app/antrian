import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { cookies } from "next/headers"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
})

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
})

export const metadata: Metadata = {
    title: "Antrian",
    description: "Sistem Antrian Online",
}

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const theme =
        (await cookies()).get("theme")?.value === "dark" ? "dark" : "light"

    return (
        <html
            lang="id"
            suppressHydrationWarning
            className={`${theme === "dark" ? "dark " : ""}${geistSans.variable} ${geistMono.variable} h-full antialiased`}
        >
            <body className="min-h-full flex flex-col">
                <ThemeProvider initialTheme={theme}>{children}</ThemeProvider>
            </body>
        </html>
    )
}
