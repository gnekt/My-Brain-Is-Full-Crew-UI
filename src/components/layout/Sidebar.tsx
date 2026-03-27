import { useLocation, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import {
    Drawer,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Box,
    Typography,
    IconButton,
    Divider,
    alpha,
    useTheme,
} from '@mui/material'
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded'
import RocketLaunchRoundedIcon from '@mui/icons-material/RocketLaunchRounded'
import SmartToyRoundedIcon from '@mui/icons-material/SmartToyRounded'
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded'
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded'
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded'
import PsychologyRoundedIcon from '@mui/icons-material/PsychologyRounded'
import { useThemeMode } from '@/theme/ThemeContext'

const DRAWER_WIDTH = 260

export default function Sidebar() {
    const location = useLocation()
    const navigate = useNavigate()
    const theme = useTheme()
    const { mode, toggleTheme } = useThemeMode()
    const { t } = useTranslation()

    const navItems = [
        {
            label: t('nav.dashboard'),
            path: '/',
            icon: <DashboardRoundedIcon />,
        },
        {
            label: t('nav.setup'),
            path: '/setup',
            icon: <RocketLaunchRoundedIcon />,
        },
        {
            label: t('nav.agents'),
            path: '/agents',
            icon: <SmartToyRoundedIcon />,
        },
        {
            label: t('nav.settings'),
            path: '/settings',
            icon: <SettingsRoundedIcon />,
        },
    ]

    return (
        <Drawer
            variant="permanent"
            sx={{
                width: DRAWER_WIDTH,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    width: DRAWER_WIDTH,
                    boxSizing: 'border-box',
                    bgcolor: 'background.paper',
                    display: 'flex',
                    flexDirection: 'column',
                },
            }}
        >
            <Box
                sx={{
                    p: 2.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                }}
            >
                <Box
                    sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <PsychologyRoundedIcon
                        sx={{ color: '#fff', fontSize: 24 }}
                    />
                </Box>
                <Box>
                    <Typography variant="subtitle1" fontWeight={700}>
                        MBIF Crew
                    </Typography>
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ lineHeight: 1 }}
                    >
                        My Brain Is Full
                    </Typography>
                </Box>
            </Box>

            <Divider sx={{ mx: 2 }} />

            <List sx={{ px: 1.5, py: 1.5, flex: 1 }}>
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path
                    return (
                        <ListItemButton
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            sx={{
                                borderRadius: 2,
                                mb: 0.5,
                                px: 2,
                                py: 1.2,
                                bgcolor: isActive
                                    ? alpha(theme.palette.primary.main, 0.12)
                                    : 'transparent',
                                color: isActive
                                    ? 'primary.main'
                                    : 'text.secondary',
                                '&:hover': {
                                    bgcolor: isActive
                                        ? alpha(
                                              theme.palette.primary.main,
                                              0.16
                                          )
                                        : alpha(
                                              theme.palette.primary.main,
                                              0.06
                                          ),
                                },
                            }}
                        >
                            <ListItemIcon
                                sx={{
                                    minWidth: 36,
                                    color: isActive
                                        ? 'primary.main'
                                        : 'text.secondary',
                                }}
                            >
                                {item.icon}
                            </ListItemIcon>
                            <ListItemText
                                primary={item.label}
                                primaryTypographyProps={{
                                    fontSize: '0.9rem',
                                    fontWeight: isActive ? 600 : 400,
                                }}
                            />
                        </ListItemButton>
                    )
                })}
            </List>

            <Divider sx={{ mx: 2 }} />

            <Box
                sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                <Typography variant="caption" color="text.secondary">
                    {mode === 'dark' ? t('theme.dark') : t('theme.light')}
                </Typography>
                <IconButton onClick={toggleTheme} size="small">
                    {mode === 'dark' ? (
                        <LightModeRoundedIcon fontSize="small" />
                    ) : (
                        <DarkModeRoundedIcon fontSize="small" />
                    )}
                </IconButton>
            </Box>
        </Drawer>
    )
}

export { DRAWER_WIDTH }
