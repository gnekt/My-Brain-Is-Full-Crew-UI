import {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
    useMemo,
} from 'react'
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { lightTheme, darkTheme } from '@/theme'

type ThemeMode = 'light' | 'dark'

interface ThemeContextType {
    mode: ThemeMode
    toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType>({
    mode: 'dark',
    toggleTheme: () => {},
})

export function useThemeMode() {
    return useContext(ThemeContext)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [mode, setMode] = useState<ThemeMode>(() => {
        const saved = localStorage.getItem('theme-mode')
        return (saved as ThemeMode) || 'dark'
    })

    useEffect(() => {
        localStorage.setItem('theme-mode', mode)
    }, [mode])

    const toggleTheme = () => {
        setMode((prev) => (prev === 'light' ? 'dark' : 'light'))
    }

    const theme = useMemo(
        () => (mode === 'dark' ? darkTheme : lightTheme),
        [mode]
    )

    const value = useMemo(() => ({ mode, toggleTheme }), [mode])

    return (
        <ThemeContext.Provider value={value}>
            <MuiThemeProvider theme={theme}>
                <CssBaseline />
                {children}
            </MuiThemeProvider>
        </ThemeContext.Provider>
    )
}
