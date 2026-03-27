import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    TextField,
    Divider,
    Switch,
    alpha,
    useTheme,
    Alert,
    Select,
    MenuItem,
    FormControl,
} from '@mui/material'
import FolderOpenRoundedIcon from '@mui/icons-material/FolderOpenRounded'
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded'
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded'
import InfoRoundedIcon from '@mui/icons-material/InfoRounded'
import TranslateRoundedIcon from '@mui/icons-material/TranslateRounded'
import { useThemeMode } from '@/theme/ThemeContext'
import {
    getStoredVaultPath,
    selectVaultPath,
    saveVaultPath,
    checkStatus,
    type SystemStatus,
} from '@/hooks/useTauriCommands'

export default function SettingsPage() {
    const { t, i18n } = useTranslation()
    const theme = useTheme()
    const { mode, toggleTheme } = useThemeMode()
    const [vaultPath, setVaultPath] = useState<string>('')
    const [status, setStatus] = useState<SystemStatus | null>(null)
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        async function load() {
            const path = await getStoredVaultPath()
            if (path) setVaultPath(path)
            const s = await checkStatus()
            setStatus(s)
        }
        load()
    }, [])

    async function handleSelectVault() {
        const path = await selectVaultPath()
        if (path) {
            setVaultPath(path)
            await saveVaultPath(path)
            setSaved(true)
            setTimeout(() => setSaved(false), 3000)
        }
    }

    return (
        <Box>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" gutterBottom>
                    {t('settings.title')}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    {t('settings.subtitle')}
                </Typography>
            </Box>

            {saved && (
                <Alert severity="success" sx={{ mb: 2 }}>
                    {t('settings.vaultSaved')}
                </Alert>
            )}

            {/* Theme */}
            <Card sx={{ mb: 2 }}>
                <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                        {t('settings.appearance')}
                    </Typography>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}
                    >
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.5,
                            }}
                        >
                            {mode === 'dark' ? (
                                <DarkModeRoundedIcon color="primary" />
                            ) : (
                                <LightModeRoundedIcon
                                    sx={{ color: '#FDCB6E' }}
                                />
                            )}
                            <Box>
                                <Typography variant="subtitle2">
                                    {mode === 'dark' ? t('settings.themeDark') : t('settings.themeLight')}
                                </Typography>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                >
                                    {t('settings.themeToggleHint')}
                                </Typography>
                            </Box>
                        </Box>
                        <Switch
                            checked={mode === 'dark'}
                            onChange={toggleTheme}
                        />
                    </Box>
                </CardContent>
            </Card>

            {/* Language */}
            <Card sx={{ mb: 2 }}>
                <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                        {t('language.label')}
                    </Typography>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}
                    >
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.5,
                            }}
                        >
                            <TranslateRoundedIcon color="primary" />
                            <Typography variant="subtitle2">
                                {t(`language.${i18n.language.split('-')[0]}`) || i18n.language}
                            </Typography>
                        </Box>
                        <FormControl size="small" sx={{ minWidth: 160 }}>
                            <Select
                                value={i18n.language.split('-')[0]}
                                onChange={(e) => i18n.changeLanguage(e.target.value)}
                            >
                                {(['en', 'it', 'es', 'fr', 'de', 'pt', 'zh'] as const).map(
                                    (lang) => (
                                        <MenuItem key={lang} value={lang}>
                                            {t(`language.${lang}`)}
                                        </MenuItem>
                                    )
                                )}
                            </Select>
                        </FormControl>
                    </Box>
                </CardContent>
            </Card>

            {/* Vault Path */}
            <Card sx={{ mb: 2 }}>
                <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                        {t('settings.vault')}
                    </Typography>
                    <Box
                        sx={{
                            display: 'flex',
                            gap: 1,
                            alignItems: 'flex-start',
                        }}
                    >
                        <TextField
                            fullWidth
                            size="small"
                            value={vaultPath}
                            placeholder={t('settings.vaultPlaceholder')}
                            slotProps={{ input: { readOnly: true } }}
                        />
                        <Button
                            variant="outlined"
                            startIcon={<FolderOpenRoundedIcon />}
                            onClick={handleSelectVault}
                            sx={{ whiteSpace: 'nowrap' }}
                        >
                            {t('settings.browse')}
                        </Button>
                    </Box>
                </CardContent>
            </Card>

            {/* Info */}
            <Card>
                <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                        {t('settings.info')}
                    </Typography>

                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 1.5,
                        }}
                    >
                        <InfoRow label={t('settings.version')} value="1.0.0" />
                        <Divider />
                        <InfoRow
                            label="Git"
                            value={
                                status?.git_installed
                                    ? t('settings.installed')
                                    : t('settings.notFound')
                            }
                            ok={status?.git_installed}
                        />
                        <Divider />
                        <InfoRow
                            label="Obsidian"
                            value={
                                status?.obsidian_installed
                                    ? t('settings.installed')
                                    : t('settings.notFound')
                            }
                            ok={status?.obsidian_installed}
                        />
                        <Divider />
                        <InfoRow
                            label="Crew"
                            value={
                                status?.crew_installed
                                    ? t('settings.crewInstalled')
                                    : t('settings.crewNotInstalled')
                            }
                            ok={status?.crew_installed}
                        />
                    </Box>

                    <Box
                        sx={{
                            mt: 3,
                            p: 2,
                            borderRadius: 2,
                            bgcolor: alpha(
                                theme.palette.info.main,
                                0.06
                            ),
                            display: 'flex',
                            gap: 1,
                        }}
                    >
                        <InfoRoundedIcon
                            sx={{ color: 'info.main', fontSize: 20, mt: 0.2 }}
                        />
                        <Typography variant="caption" color="text.secondary">
                            {t('settings.about')}
                        </Typography>
                    </Box>
                </CardContent>
            </Card>
        </Box>
    )
}

function InfoRow({
    label,
    value,
    ok,
}: {
    label: string
    value: string
    ok?: boolean
}) {
    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}
        >
            <Typography variant="body2" color="text.secondary">
                {label}
            </Typography>
            <Typography
                variant="body2"
                fontWeight={500}
                color={
                    ok === undefined
                        ? 'text.primary'
                        : ok
                          ? 'success.main'
                          : 'error.main'
                }
            >
                {value}
            </Typography>
        </Box>
    )
}

export const Component = SettingsPage
