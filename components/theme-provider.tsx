"use client"

import {
    createContext,
    type ReactNode,
    useContext,
    useEffect,
    useState,
} from "react"

type Theme = "light" | "dark"

interface ThemeContextValue {
    theme: Theme
    setTheme: (theme: Theme) => void
    toggleTheme: () => void
}

const COOKIE_NAME = "theme"
const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({
    children,
    initialTheme = "light",
}: {
    children: ReactNode
    initialTheme?: Theme
}) {
    const [theme, setThemeState] = useState<Theme>(initialTheme)

    useEffect(() => {
        document.documentElement.classList.toggle("dark", theme === "dark")
        // biome-ignore lint/suspicious/noDocumentCookie: Cookie Store API has limited browser support
        document.cookie = `${COOKIE_NAME}=${theme}; path=/; max-age=31536000; samesite=lax`
    }, [theme])

    function setTheme(next: Theme) {
        setThemeState(next)
    }

    function toggleTheme() {
        setThemeState((prev) => (prev === "dark" ? "light" : "dark"))
    }

    return (
        <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme() {
    const ctx = useContext(ThemeContext)
    if (!ctx) {
        throw new Error("useTheme must be used within ThemeProvider")
    }
    return ctx
}
