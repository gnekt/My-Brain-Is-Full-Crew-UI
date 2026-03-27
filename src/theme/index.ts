import { createTheme } from '@mui/material/styles'

const sharedTypography = {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
}

export const lightTheme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#6C5CE7',
            light: '#A29BFE',
            dark: '#5A4BD1',
        },
        secondary: {
            main: '#00B894',
            light: '#55EFC4',
            dark: '#00A381',
        },
        background: {
            default: '#F8F9FA',
            paper: '#FFFFFF',
        },
        text: {
            primary: '#2D3436',
            secondary: '#636E72',
        },
        divider: 'rgba(0,0,0,0.08)',
    },
    typography: sharedTypography,
    shape: { borderRadius: 12 },
    components: {
        MuiCard: {
            styleOverrides: {
                root: {
                    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                    border: '1px solid rgba(0,0,0,0.06)',
                },
            },
        },
        MuiDrawer: {
            styleOverrides: {
                paper: {
                    borderRight: 'none',
                    boxShadow: '2px 0 12px rgba(0,0,0,0.04)',
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: 10,
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    fontWeight: 500,
                },
            },
        },
    },
})

export const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#A29BFE',
            light: '#C8C3FF',
            dark: '#6C5CE7',
        },
        secondary: {
            main: '#55EFC4',
            light: '#81FDD8',
            dark: '#00B894',
        },
        background: {
            default: '#0D1117',
            paper: '#161B22',
        },
        text: {
            primary: '#E6EDF3',
            secondary: '#8B949E',
        },
        divider: 'rgba(255,255,255,0.08)',
    },
    typography: sharedTypography,
    shape: { borderRadius: 12 },
    components: {
        MuiCard: {
            styleOverrides: {
                root: {
                    boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.06)',
                },
            },
        },
        MuiDrawer: {
            styleOverrides: {
                paper: {
                    borderRight: 'none',
                    boxShadow: '2px 0 12px rgba(0,0,0,0.2)',
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: 10,
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    fontWeight: 500,
                },
            },
        },
    },
})
