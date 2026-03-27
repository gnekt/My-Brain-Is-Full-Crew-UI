import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Alert,
    LinearProgress,
    Chip,
    CircularProgress,
    Divider,
    alpha,
    useTheme,
} from '@mui/material'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'
import FolderOpenRoundedIcon from '@mui/icons-material/FolderOpenRounded'
import RocketLaunchRoundedIcon from '@mui/icons-material/RocketLaunchRounded'
import AutoStoriesRoundedIcon from '@mui/icons-material/AutoStoriesRounded'
import GitHubIcon from '@mui/icons-material/GitHub'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'
import {
    checkStatus,
    installGit,
    installObsidian,
    selectVaultPath,
    saveVaultPath,
    createVault,
    cloneRepo,
    installCrew,
    openInObsidian,
    type SystemStatus,
    type CommandResult,
} from '@/hooks/useTauriCommands'

type StepStatus = 'pending' | 'loading' | 'done' | 'error'

export default function SetupPage() {
    const theme = useTheme()
    const { t } = useTranslation()
    const [status, setStatus] = useState<SystemStatus | null>(null)
    const [vaultPath, setVaultPath] = useState<string | null>(null)
    const [stepMessages, setStepMessages] = useState<Record<string, string>>({})
    const [stepStatuses, setStepStatuses] = useState<Record<string, StepStatus>>({})
    const [error, setError] = useState<string | null>(null)

    const refreshStatus = useCallback(async () => {
        try {
            const s = await checkStatus()
            setStatus(s)
            if (s.vault_path) setVaultPath(s.vault_path)

            // Auto-mark completed steps
            const newStatuses: Record<string, StepStatus> = {}
            if (s.git_installed) newStatuses.git = 'done'
            if (s.obsidian_installed) newStatuses.obsidian = 'done'
            if (s.repo_cloned) newStatuses.clone = 'done'
            if (s.crew_installed) newStatuses.install = 'done'
            setStepStatuses((prev) => ({ ...prev, ...newStatuses }))
        } catch (e) {
            setError(String(e))
        }
    }, [])

    useEffect(() => {
        refreshStatus()
    }, [refreshStatus])

    function setStep(key: string, status: StepStatus, message?: string) {
        setStepStatuses((prev) => ({ ...prev, [key]: status }))
        if (message) setStepMessages((prev) => ({ ...prev, [key]: message }))
    }

    async function handleInstallGit() {
        setStep('git', 'loading')
        setError(null)
        try {
            const result: CommandResult = await installGit()
            setStep('git', result.success ? 'done' : 'error', result.message)
            if (!result.success) setError(result.message)
            // Refresh after a delay to detect installation
            setTimeout(refreshStatus, 2000)
        } catch (e) {
            setStep('git', 'error', String(e))
            setError(String(e))
        }
    }

    async function handleInstallObsidian() {
        setStep('obsidian', 'loading')
        setError(null)
        try {
            const result: CommandResult = await installObsidian()
            setStep('obsidian', result.success ? 'done' : 'error', result.message)
            if (!result.success) {
                setError(result.message)
            } else {
                // After successful install, prompt for vault path
                setTimeout(async () => {
                    await refreshStatus()
                    if (!vaultPath) {
                        await handleSelectVault()
                    }
                }, 1500)
            }
        } catch (e) {
            setStep('obsidian', 'error', String(e))
            setError(String(e))
        }
    }

    async function handleSelectVault() {
        try {
            const path = await selectVaultPath()
            if (path) {
                setVaultPath(path)
                await saveVaultPath(path)
                // Create .obsidian structure and open in Obsidian for full init
                const result = await createVault(path)
                if (result.success) {
                    setStep('obsidian', 'done', result.message)
                } else {
                    setError(result.message)
                }
                await refreshStatus()
            }
        } catch (e) {
            setError(String(e))
        }
    }

    async function handleCloneRepo() {
        if (!vaultPath) return
        setStep('clone', 'loading')
        setError(null)
        try {
            const result: CommandResult = await cloneRepo(vaultPath)
            if (result.success) {
                setStep('clone', 'done', result.message)
            } else {
                setStep('clone', 'error', result.message)
                setError(result.message)
            }
        } catch (e) {
            setStep('clone', 'error', String(e))
            setError(String(e))
        }
    }

    async function handleInstallCrew() {
        if (!vaultPath) return
        setStep('install', 'loading')
        setError(null)
        try {
            const result: CommandResult = await installCrew(vaultPath)
            if (result.success) {
                setStep('install', 'done', result.message)
            } else {
                setStep('install', 'error', result.message)
                setError(result.message)
            }
        } catch (e) {
            setStep('install', 'error', String(e))
            setError(String(e))
        }
    }

    async function handleOpenObsidian() {
        if (vaultPath) {
            try {
                await openInObsidian(vaultPath)
            } catch (e) {
                setError(String(e))
            }
        }
    }

    const allDone =
        stepStatuses.git === 'done' &&
        stepStatuses.obsidian === 'done' &&
        stepStatuses.clone === 'done' &&
        stepStatuses.install === 'done'

    return (
        <Box>
            <Box
                sx={{
                    mb: 3,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                }}
            >
                <Box>
                    <Typography variant="h4" gutterBottom>
                        {t('setup.title')}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        {t('setup.subtitle')}
                    </Typography>
                </Box>
                <Button
                    size="small"
                    startIcon={<RefreshRoundedIcon />}
                    onClick={refreshStatus}
                    sx={{ mt: 0.5 }}
                >
                    {t('setup.recheck')}
                </Button>
            </Box>

            {error && (
                <Alert
                    severity="error"
                    sx={{ mb: 2 }}
                    onClose={() => setError(null)}
                >
                    {error}
                </Alert>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Step 1: Git */}
                <InstallCard
                    title={t('setup.git.title')}
                    description={t('setup.git.description')}
                    icon={<GitHubIcon sx={{ fontSize: 28 }} />}
                    color={theme.palette.primary.main}
                    status={stepStatuses.git || 'pending'}
                    message={stepMessages.git}
                    installed={status?.git_installed ?? false}
                    onInstall={handleInstallGit}
                    onRecheck={refreshStatus}
                    installLabel={t('setup.installButton', { name: 'Git' })}
                />

                {/* Step 2: Obsidian + Vault */}
                <Card
                    sx={{
                        border: `1px solid ${alpha(
                            (status?.obsidian_installed || stepStatuses.obsidian === 'done')
                                ? theme.palette.success.main
                                : theme.palette.secondary.main,
                            0.2
                        )}`,
                    }}
                >
                    <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 2,
                            }}
                        >
                            <Box
                                sx={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 2,
                                    bgcolor: alpha(theme.palette.secondary.main, 0.12),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: theme.palette.secondary.main,
                                    flexShrink: 0,
                                }}
                            >
                                <AutoStoriesRoundedIcon sx={{ fontSize: 28 }} />
                            </Box>
                            <Box sx={{ flex: 1 }}>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                        mb: 0.5,
                                    }}
                                >
                                    <Typography variant="h6">
                                        {t('setup.obsidian.title')}
                                    </Typography>
                                    {(status?.obsidian_installed || stepStatuses.obsidian === 'done') && (
                                        <CheckCircleRoundedIcon
                                            sx={{
                                                color: 'success.main',
                                                fontSize: 22,
                                            }}
                                        />
                                    )}
                                    <Chip
                                        label={t('setup.obsidian.installerIncluded')}
                                        size="small"
                                        variant="outlined"
                                        color="primary"
                                        sx={{ height: 20, fontSize: '0.65rem' }}
                                    />
                                </Box>
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{ mb: 2 }}
                                >
                                    {t('setup.obsidian.description')}
                                </Typography>

                                {stepMessages.obsidian && (
                                    <LogBox message={stepMessages.obsidian} />
                                )}

                                {!(status?.obsidian_installed || stepStatuses.obsidian === 'done') && (
                                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                                        <Button
                                            variant="contained"
                                            startIcon={
                                                stepStatuses.obsidian === 'loading' ? (
                                                    <CircularProgress
                                                        size={16}
                                                        color="inherit"
                                                    />
                                                ) : (
                                                    <DownloadRoundedIcon />
                                                )
                                            }
                                            onClick={handleInstallObsidian}
                                            disabled={stepStatuses.obsidian === 'loading'}
                                        >
                                            {stepStatuses.obsidian === 'loading'
                                                ? t('setup.installing')
                                                : t('setup.installButton', { name: 'Obsidian' })}
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            startIcon={<RefreshRoundedIcon />}
                                            onClick={refreshStatus}
                                        >
                                            {t('setup.recheck')}
                                        </Button>
                                    </Box>
                                )}

                                {(status?.obsidian_installed || stepStatuses.obsidian === 'done') && !vaultPath && (
                                    <Chip
                                        icon={<CheckCircleRoundedIcon />}
                                        label={t('setup.installed')}
                                        color="success"
                                        size="small"
                                        sx={{ mb: 2 }}
                                    />
                                )}

                                {/* Vault path section, shown after Obsidian is installed */}
                                {(status?.obsidian_installed || stepStatuses.obsidian === 'done') && (
                                    <>
                                        <Divider sx={{ my: 2 }} />
                                        <Typography
                                            variant="subtitle2"
                                            sx={{ fontWeight: 700, mb: 0.5 }}
                                        >
                                            {t('setup.obsidian.vault')}
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            sx={{ mb: 1.5 }}
                                        >
                                            {t('setup.obsidian.vaultDescription')}
                                        </Typography>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                gap: 1,
                                                alignItems: 'center',
                                                flexWrap: 'wrap',
                                            }}
                                        >
                                            <Button
                                                variant={vaultPath ? 'outlined' : 'contained'}
                                                size="small"
                                                startIcon={<FolderOpenRoundedIcon />}
                                                onClick={handleSelectVault}
                                                color={vaultPath ? 'primary' : 'secondary'}
                                            >
                                                {vaultPath
                                                    ? t('setup.obsidian.changeVault')
                                                    : t('setup.obsidian.selectFolder')}
                                            </Button>
                                            {vaultPath && (
                                                <Chip
                                                    icon={<FolderOpenRoundedIcon />}
                                                    label={vaultPath}
                                                    size="small"
                                                    color="success"
                                                    variant="outlined"
                                                />
                                            )}
                                        </Box>
                                    </>
                                )}
                            </Box>
                        </Box>
                    </CardContent>
                </Card>

                {/* Step 3: Clone Repo */}
                <Card
                    sx={{
                        border: `1px solid ${alpha(
                            stepStatuses.clone === 'done'
                                ? theme.palette.success.main
                                : '#E17055',
                            0.2
                        )}`,
                    }}
                >
                    <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 2,
                            }}
                        >
                            <Box
                                sx={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 2,
                                    bgcolor: alpha('#E17055', 0.12),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#E17055',
                                    flexShrink: 0,
                                }}
                            >
                                <ContentCopyRoundedIcon sx={{ fontSize: 28 }} />
                            </Box>
                            <Box sx={{ flex: 1 }}>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                        mb: 0.5,
                                    }}
                                >
                                    <Typography variant="h6">
                                        {t('setup.clone.title')}
                                    </Typography>
                                    {stepStatuses.clone === 'done' && (
                                        <CheckCircleRoundedIcon
                                            sx={{
                                                color: 'success.main',
                                                fontSize: 22,
                                            }}
                                        />
                                    )}
                                </Box>
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{ mb: 2 }}
                                >
                                    {t('setup.clone.description')}
                                </Typography>

                                {stepStatuses.clone === 'loading' && (
                                    <LinearProgress sx={{ mb: 2 }} />
                                )}

                                {stepMessages.clone && (
                                    <LogBox message={stepMessages.clone} />
                                )}

                                <Button
                                    variant="contained"
                                    startIcon={
                                        stepStatuses.clone === 'loading' ? (
                                            <CircularProgress
                                                size={16}
                                                color="inherit"
                                            />
                                        ) : (
                                            <DownloadRoundedIcon />
                                        )
                                    }
                                    onClick={handleCloneRepo}
                                    disabled={
                                        !vaultPath ||
                                        stepStatuses.clone === 'loading' ||
                                        !(status?.git_installed ?? false)
                                    }
                                    sx={{
                                        bgcolor: '#E17055',
                                        '&:hover': { bgcolor: '#D05A3E' },
                                    }}
                                >
                                    {stepStatuses.clone === 'loading'
                                        ? t('setup.clone.cloning')
                                        : status?.repo_cloned
                                          ? t('setup.clone.update')
                                          : t('setup.clone.cloneButton')}
                                </Button>
                                {!(status?.git_installed ?? false) && (
                                    <Typography
                                        variant="caption"
                                        color="error"
                                        sx={{ display: 'block', mt: 1 }}
                                    >
                                        {t('setup.clone.installGitFirst')}
                                    </Typography>
                                )}
                            </Box>
                        </Box>
                    </CardContent>
                </Card>

                {/* Step 4: Install Crew */}
                <Card
                    sx={{
                        border: `1px solid ${alpha(
                            stepStatuses.install === 'done'
                                ? theme.palette.success.main
                                : '#FDCB6E',
                            0.2
                        )}`,
                    }}
                >
                    <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 2,
                            }}
                        >
                            <Box
                                sx={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 2,
                                    bgcolor: alpha('#FDCB6E', 0.12),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#F0B429',
                                    flexShrink: 0,
                                }}
                            >
                                <RocketLaunchRoundedIcon
                                    sx={{ fontSize: 28 }}
                                />
                            </Box>
                            <Box sx={{ flex: 1 }}>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                        mb: 0.5,
                                    }}
                                >
                                    <Typography variant="h6">
                                        {t('setup.crew.title')}
                                    </Typography>
                                    {stepStatuses.install === 'done' && (
                                        <CheckCircleRoundedIcon
                                            sx={{
                                                color: 'success.main',
                                                fontSize: 22,
                                            }}
                                        />
                                    )}
                                </Box>
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{ mb: 2 }}
                                >
                                    {t('setup.crew.description')}
                                </Typography>

                                {stepStatuses.install === 'loading' && (
                                    <LinearProgress sx={{ mb: 2 }} />
                                )}

                                {stepMessages.install && (
                                    <LogBox message={stepMessages.install} />
                                )}

                                <Button
                                    variant="contained"
                                    startIcon={
                                        stepStatuses.install === 'loading' ? (
                                            <CircularProgress
                                                size={16}
                                                color="inherit"
                                            />
                                        ) : (
                                            <RocketLaunchRoundedIcon />
                                        )
                                    }
                                    onClick={handleInstallCrew}
                                    disabled={
                                        stepStatuses.clone !== 'done' ||
                                        stepStatuses.install === 'loading'
                                    }
                                    sx={{
                                        bgcolor: '#F0B429',
                                        color: '#000',
                                        '&:hover': { bgcolor: '#E0A420' },
                                    }}
                                >
                                    {stepStatuses.install === 'loading'
                                        ? t('setup.crew.installing')
                                        : t('setup.crew.installButton')}
                                </Button>
                                {stepStatuses.clone !== 'done' && (
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{ display: 'block', mt: 1 }}
                                    >
                                        {t('setup.crew.cloneFirst')}
                                    </Typography>
                                )}
                            </Box>
                        </Box>
                    </CardContent>
                </Card>
            </Box>

            {/* Success banner */}
            {allDone && (
                <Alert
                    severity="success"
                    sx={{ mt: 3 }}
                    icon={<CheckCircleRoundedIcon />}
                    action={
                        <Button
                            color="inherit"
                            size="small"
                            startIcon={<AutoStoriesRoundedIcon />}
                            onClick={handleOpenObsidian}
                        >
                            {t('setup.openObsidian')}
                        </Button>
                    }
                >
                    {t('setup.success')}
                </Alert>
            )}
        </Box>
    )
}

function InstallCard({
    title,
    description,
    icon,
    color,
    status,
    message,
    installed,
    onInstall,
    onRecheck,
    installLabel,
    extra,
}: {
    title: string
    description: string
    icon: React.ReactNode
    color: string
    status: StepStatus
    message?: string
    installed: boolean
    onInstall: () => void
    onRecheck: () => void
    installLabel: string
    extra?: React.ReactNode
}) {
    const theme = useTheme()
    const { t } = useTranslation()
    const isDone = installed || status === 'done'

    return (
        <Card
            sx={{
                border: `1px solid ${alpha(isDone ? theme.palette.success.main : color, 0.2)}`,
            }}
        >
            <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 2,
                    }}
                >
                    <Box
                        sx={{
                            width: 48,
                            height: 48,
                            borderRadius: 2,
                            bgcolor: alpha(color, 0.12),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: color,
                            flexShrink: 0,
                        }}
                    >
                        {icon}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                mb: 0.5,
                            }}
                        >
                            <Typography variant="h6">{title}</Typography>
                            {isDone && (
                                <CheckCircleRoundedIcon
                                    sx={{
                                        color: 'success.main',
                                        fontSize: 22,
                                    }}
                                />
                            )}
                            {extra}
                        </Box>
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mb: 2 }}
                        >
                            {description}
                        </Typography>

                        {message && <LogBox message={message} />}

                        {!isDone && (
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                    variant="contained"
                                    startIcon={
                                        status === 'loading' ? (
                                            <CircularProgress
                                                size={16}
                                                color="inherit"
                                            />
                                        ) : (
                                            <DownloadRoundedIcon />
                                        )
                                    }
                                    onClick={onInstall}
                                    disabled={status === 'loading'}
                                >
                                    {status === 'loading'
                                        ? t('setup.installing')
                                        : installLabel}
                                </Button>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<RefreshRoundedIcon />}
                                    onClick={onRecheck}
                                >
                                    {t('setup.recheck')}
                                </Button>
                            </Box>
                        )}

                        {isDone && (
                            <Chip
                                icon={<CheckCircleRoundedIcon />}
                                label={t('setup.installed')}
                                color="success"
                                size="small"
                            />
                        )}
                    </Box>
                </Box>
            </CardContent>
        </Card>
    )
}

function LogBox({ message }: { message: string }) {
    const theme = useTheme()
    return (
        <Box
            sx={{
                p: 2,
                mb: 2,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.text.primary, 0.04),
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                whiteSpace: 'pre-wrap',
                maxHeight: 160,
                overflow: 'auto',
                lineHeight: 1.6,
            }}
        >
            {message}
        </Box>
    )
}

export const Component = SetupPage
