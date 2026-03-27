import { ReactNode, Suspense } from 'react'
import { Box, CircularProgress } from '@mui/material'
import { ThemeProvider } from '@/theme/ThemeContext'

function LoadingFallback() {
    return (
        <Box
            sx={{
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <CircularProgress />
        </Box>
    )
}

export default function AppProvider({ children }: { children: ReactNode }) {
    return (
        <ThemeProvider>
            <Suspense fallback={<LoadingFallback />}>{children}</Suspense>
        </ThemeProvider>
    )
}
