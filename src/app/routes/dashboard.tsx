import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    Chip,
    Button,
    alpha,
    useTheme,
    Skeleton,
    LinearProgress,
    Divider,
} from '@mui/material'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import CancelRoundedIcon from '@mui/icons-material/CancelRounded'
import SmartToyRoundedIcon from '@mui/icons-material/SmartToyRounded'
import FolderRoundedIcon from '@mui/icons-material/FolderRounded'
import GitHubIcon from '@mui/icons-material/GitHub'
import AutoStoriesRoundedIcon from '@mui/icons-material/AutoStoriesRounded'
import RocketLaunchRoundedIcon from '@mui/icons-material/RocketLaunchRounded'
import PsychologyRoundedIcon from '@mui/icons-material/PsychologyRounded'
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded'
import TagRoundedIcon from '@mui/icons-material/TagRounded'
import LinkRoundedIcon from '@mui/icons-material/LinkRounded'
import TextFieldsRoundedIcon from '@mui/icons-material/TextFieldsRounded'
import StorageRoundedIcon from '@mui/icons-material/StorageRounded'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded'
import { useNavigate } from 'react-router'
import {
    checkStatus,
    listAgents,
    getVaultStats,
    type SystemStatus,
    type AgentInfo,
    type VaultStats,
} from '@/hooks/useTauriCommands'

function StatusIcon({ ok }: { ok: boolean }) {
    return ok ? (
        <CheckCircleRoundedIcon sx={{ color: 'success.main', fontSize: 20 }} />
    ) : (
        <CancelRoundedIcon sx={{ color: 'error.main', fontSize: 20 }} />
    )
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function formatNumber(n: number): string {
    return n.toLocaleString()
}

function timeAgo(timestamp: number): string {
    const now = Math.floor(Date.now() / 1000)
    const diff = now - timestamp
    if (diff < 60) return '< 1 min'
    if (diff < 3600) return `${Math.floor(diff / 60)} min`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`
    const date = new Date(timestamp * 1000)
    return date.toLocaleDateString()
}

export default function DashboardPage() {
    const theme = useTheme()
    const navigate = useNavigate()
    const { t } = useTranslation()
    const [status, setStatus] = useState<SystemStatus | null>(null)
    const [agents, setAgents] = useState<AgentInfo[]>([])
    const [stats, setStats] = useState<VaultStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [statsLoading, setStatsLoading] = useState(false)

    async function loadStats(vaultPath: string) {
        setStatsLoading(true)
        try {
            const s = await getVaultStats(vaultPath)
            setStats(s)
        } catch (e) {
            console.error('Failed to load vault stats:', e)
        } finally {
            setStatsLoading(false)
        }
    }

    useEffect(() => {
        async function load() {
            try {
                const s = await checkStatus()
                setStatus(s)
                if (s.vault_path) {
                    const a = await listAgents(s.vault_path)
                    setAgents(a)
                    loadStats(s.vault_path)
                }
            } catch (e) {
                console.error('Failed to load status:', e)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    const isInstalled = status?.crew_installed && status?.vault_path

    const statusCards = [
        {
            label: 'Git',
            ok: status?.git_installed ?? false,
            icon: <GitHubIcon />,
            color: theme.palette.primary.main,
        },
        {
            label: 'Obsidian',
            ok: status?.obsidian_installed ?? false,
            icon: <AutoStoriesRoundedIcon />,
            color: theme.palette.secondary.main,
        },
        {
            label: t('dashboard.crewInstalled'),
            ok: status?.crew_installed ?? false,
            icon: <RocketLaunchRoundedIcon />,
            color: '#E17055',
        },
        {
            label: t('dashboard.activeAgents'),
            ok: agents.filter((a) => a.enabled).length > 0,
            icon: <SmartToyRoundedIcon />,
            color: '#FDCB6E',
            count: agents.filter((a) => a.enabled).length,
        },
    ]

    const statCards = stats
        ? [
              {
                  label: t('stats.totalNotes'),
                  value: formatNumber(stats.total_notes),
                  icon: <DescriptionRoundedIcon />,
                  color: theme.palette.primary.main,
              },
              {
                  label: t('stats.totalFolders'),
                  value: formatNumber(stats.total_folders),
                  icon: <FolderRoundedIcon />,
                  color: theme.palette.secondary.main,
              },
              {
                  label: t('stats.totalTags'),
                  value: formatNumber(stats.total_tags),
                  icon: <TagRoundedIcon />,
                  color: '#E17055',
              },
              {
                  label: t('stats.totalLinks'),
                  value: formatNumber(stats.total_internal_links),
                  icon: <LinkRoundedIcon />,
                  color: '#00B894',
              },
              {
                  label: t('stats.totalWords'),
                  value: formatNumber(stats.total_words),
                  icon: <TextFieldsRoundedIcon />,
                  color: '#6C5CE7',
              },
              {
                  label: t('stats.totalSize'),
                  value: formatBytes(stats.total_size_bytes),
                  icon: <StorageRoundedIcon />,
                  color: '#FDCB6E',
              },
          ]
        : []

    const maxTagCount = stats?.top_tags?.[0]?.count ?? 1

    return (
        <Box>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" gutterBottom>
                    {t('dashboard.title')}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    {t('dashboard.subtitle')}
                </Typography>
            </Box>

            {/* Hero Card */}
            <Card
                sx={{
                    mb: 3,
                    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.15)}, ${alpha(theme.palette.secondary.main, 0.1)})`,
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                }}
            >
                <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            mb: 2,
                        }}
                    >
                        <PsychologyRoundedIcon
                            sx={{
                                fontSize: 48,
                                color: 'primary.main',
                            }}
                        />
                        <Box>
                            <Typography variant="h5">
                                My Brain Is Full Crew
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {t('dashboard.heroDescription')}
                            </Typography>
                        </Box>
                    </Box>
                    {!isInstalled && !loading && (
                        <Button
                            variant="contained"
                            startIcon={<RocketLaunchRoundedIcon />}
                            onClick={() => navigate('/setup')}
                            sx={{ mt: 1 }}
                        >
                            {t('dashboard.startInstall')}
                        </Button>
                    )}
                    {isInstalled && (
                        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                            <Chip
                                icon={<FolderRoundedIcon />}
                                label={status?.vault_path}
                                size="small"
                                variant="outlined"
                            />
                            <Chip
                                label={t('dashboard.agentsCount', { count: agents.length })}
                                size="small"
                                color="primary"
                            />
                        </Box>
                    )}
                </CardContent>
            </Card>

            {/* Status Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {statusCards.map((card) => (
                    <Grid size={{ xs: 12, sm: 6, md: 3 }} key={card.label}>
                        <Card>
                            <CardContent
                                sx={{
                                    p: 2.5,
                                    '&:last-child': { pb: 2.5 },
                                }}
                            >
                                {loading ? (
                                    <Skeleton
                                        variant="rounded"
                                        height={60}
                                    />
                                ) : (
                                    <Box>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent:
                                                    'space-between',
                                                mb: 1,
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    width: 36,
                                                    height: 36,
                                                    borderRadius: 1.5,
                                                    bgcolor: alpha(
                                                        card.color,
                                                        0.12
                                                    ),
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent:
                                                        'center',
                                                    color: card.color,
                                                }}
                                            >
                                                {card.icon}
                                            </Box>
                                            <StatusIcon ok={card.ok} />
                                        </Box>
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                        >
                                            {card.label}
                                        </Typography>
                                        {card.count !== undefined && (
                                            <Typography
                                                variant="h5"
                                                sx={{ mt: 0.5 }}
                                            >
                                                {card.count} /{' '}
                                                {agents.length}
                                            </Typography>
                                        )}
                                    </Box>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Agents Preview */}
            {agents.length > 0 && (
                <Box>
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            mb: 2,
                        }}
                    >
                        <Typography variant="h6">{t('nav.agents')}</Typography>
                        <Button
                            size="small"
                            onClick={() => navigate('/agents')}
                        >
                            {t('dashboard.viewAll')}
                        </Button>
                    </Box>
                    <Grid container spacing={2}>
                        {agents.slice(0, 4).map((agent) => (
                            <Grid
                                size={{ xs: 12, sm: 6, md: 3 }}
                                key={agent.name}
                            >
                                <Card
                                    sx={{
                                        cursor: 'pointer',
                                        transition: 'transform 0.15s',
                                        '&:hover': {
                                            transform: 'translateY(-2px)',
                                        },
                                    }}
                                    onClick={() => navigate('/agents')}
                                >
                                    <CardContent
                                        sx={{
                                            p: 2,
                                            '&:last-child': { pb: 2 },
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                                mb: 1,
                                            }}
                                        >
                                            <SmartToyRoundedIcon
                                                sx={{
                                                    color: agent.enabled
                                                        ? 'primary.main'
                                                        : 'text.disabled',
                                                    fontSize: 20,
                                                }}
                                            />
                                            <Typography
                                                variant="subtitle2"
                                                sx={{
                                                    textTransform:
                                                        'capitalize',
                                                }}
                                            >
                                                {agent.display_name}
                                            </Typography>
                                        </Box>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            sx={{
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient:
                                                    'vertical',
                                                overflow: 'hidden',
                                            }}
                                        >
                                            {agent.description}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            )}

            {/* Vault Statistics */}
            {status?.vault_path && (
                <Box sx={{ mt: 4 }}>
                    <Divider sx={{ mb: 3 }} />
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            mb: 2,
                        }}
                    >
                        <Box>
                            <Typography variant="h6">
                                {t('stats.title')}
                            </Typography>
                            <Typography
                                variant="body2"
                                color="text.secondary"
                            >
                                {t('stats.subtitle')}
                            </Typography>
                        </Box>
                        <Button
                            size="small"
                            startIcon={<RefreshRoundedIcon />}
                            onClick={() => status.vault_path && loadStats(status.vault_path)}
                            disabled={statsLoading}
                        >
                            {t('stats.refresh')}
                        </Button>
                    </Box>

                    {statsLoading && !stats && (
                        <Grid container spacing={2}>
                            {[...Array(6)].map((_, i) => (
                                <Grid size={{ xs: 6, sm: 4, md: 2 }} key={i}>
                                    <Skeleton
                                        variant="rounded"
                                        height={90}
                                    />
                                </Grid>
                            ))}
                        </Grid>
                    )}

                    {stats && (
                        <>
                            {/* Stat number cards */}
                            <Grid container spacing={2} sx={{ mb: 3 }}>
                                {statCards.map((card) => (
                                    <Grid
                                        size={{ xs: 6, sm: 4, md: 2 }}
                                        key={card.label}
                                    >
                                        <Card>
                                            <CardContent
                                                sx={{
                                                    p: 2,
                                                    '&:last-child': {
                                                        pb: 2,
                                                    },
                                                    textAlign: 'center',
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        width: 36,
                                                        height: 36,
                                                        borderRadius: 1.5,
                                                        bgcolor: alpha(
                                                            card.color,
                                                            0.12
                                                        ),
                                                        display: 'flex',
                                                        alignItems:
                                                            'center',
                                                        justifyContent:
                                                            'center',
                                                        color: card.color,
                                                        mx: 'auto',
                                                        mb: 1,
                                                    }}
                                                >
                                                    {card.icon}
                                                </Box>
                                                <Typography
                                                    variant="h6"
                                                    sx={{
                                                        fontWeight: 700,
                                                    }}
                                                >
                                                    {card.value}
                                                </Typography>
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                >
                                                    {card.label}
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>

                            <Grid container spacing={2}>
                                {/* Top Tags */}
                                {stats.top_tags.length > 0 && (
                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <Card>
                                            <CardContent
                                                sx={{
                                                    p: 2.5,
                                                    '&:last-child': {
                                                        pb: 2.5,
                                                    },
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems:
                                                            'center',
                                                        gap: 1,
                                                        mb: 2,
                                                    }}
                                                >
                                                    <TagRoundedIcon
                                                        sx={{
                                                            color: '#E17055',
                                                            fontSize: 20,
                                                        }}
                                                    />
                                                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                                        {t('stats.topTags')}
                                                    </Typography>
                                                </Box>
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        flexDirection:
                                                            'column',
                                                        gap: 1.5,
                                                    }}
                                                >
                                                    {stats.top_tags.map(
                                                        (tag) => (
                                                            <Box
                                                                key={
                                                                    tag.tag
                                                                }
                                                            >
                                                                <Box
                                                                    sx={{
                                                                        display:
                                                                            'flex',
                                                                        justifyContent:
                                                                            'space-between',
                                                                        alignItems:
                                                                            'center',
                                                                        mb: 0.5,
                                                                    }}
                                                                >
                                                                    <Typography
                                                                        variant="body2"
                                                                        sx={{
                                                                            fontFamily:
                                                                                'monospace',
                                                                        }}
                                                                    >
                                                                        #
                                                                        {
                                                                            tag.tag
                                                                        }
                                                                    </Typography>
                                                                    <Typography
                                                                        variant="caption"
                                                                        color="text.secondary"
                                                                    >
                                                                        {t(
                                                                            'stats.occurrences',
                                                                            {
                                                                                count: tag.count,
                                                                            }
                                                                        )}
                                                                    </Typography>
                                                                </Box>
                                                                <LinearProgress
                                                                    variant="determinate"
                                                                    value={
                                                                        (tag.count /
                                                                            maxTagCount) *
                                                                        100
                                                                    }
                                                                    sx={{
                                                                        height: 6,
                                                                        borderRadius: 3,
                                                                        bgcolor:
                                                                            alpha(
                                                                                '#E17055',
                                                                                0.1
                                                                            ),
                                                                        '& .MuiLinearProgress-bar':
                                                                            {
                                                                                bgcolor:
                                                                                    '#E17055',
                                                                                borderRadius: 3,
                                                                            },
                                                                    }}
                                                                />
                                                            </Box>
                                                        )
                                                    )}
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                )}

                                {/* Recent Notes */}
                                {stats.recent_notes.length > 0 && (
                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <Card>
                                            <CardContent
                                                sx={{
                                                    p: 2.5,
                                                    '&:last-child': {
                                                        pb: 2.5,
                                                    },
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems:
                                                            'center',
                                                        gap: 1,
                                                        mb: 2,
                                                    }}
                                                >
                                                    <AccessTimeRoundedIcon
                                                        sx={{
                                                            color: '#6C5CE7',
                                                            fontSize: 20,
                                                        }}
                                                    />
                                                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                                        {t(
                                                            'stats.recentNotes'
                                                        )}
                                                    </Typography>
                                                </Box>
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        flexDirection:
                                                            'column',
                                                        gap: 1,
                                                    }}
                                                >
                                                    {stats.recent_notes.map(
                                                        (note, i) => (
                                                            <Box
                                                                key={i}
                                                                sx={{
                                                                    display:
                                                                        'flex',
                                                                    alignItems:
                                                                        'center',
                                                                    justifyContent:
                                                                        'space-between',
                                                                    py: 0.75,
                                                                    px: 1.5,
                                                                    borderRadius: 1.5,
                                                                    bgcolor:
                                                                        alpha(
                                                                            theme
                                                                                .palette
                                                                                .text
                                                                                .primary,
                                                                            0.03
                                                                        ),
                                                                }}
                                                            >
                                                                <Box
                                                                    sx={{
                                                                        display:
                                                                            'flex',
                                                                        alignItems:
                                                                            'center',
                                                                        gap: 1,
                                                                        overflow:
                                                                            'hidden',
                                                                    }}
                                                                >
                                                                    <DescriptionRoundedIcon
                                                                        sx={{
                                                                            fontSize: 16,
                                                                            color: 'text.secondary',
                                                                            flexShrink: 0,
                                                                        }}
                                                                    />
                                                                    <Typography
                                                                        variant="body2"
                                                                        noWrap
                                                                        sx={{
                                                                            maxWidth: 200,
                                                                        }}
                                                                    >
                                                                        {
                                                                            note.name
                                                                        }
                                                                    </Typography>
                                                                </Box>
                                                                <Box
                                                                    sx={{
                                                                        display:
                                                                            'flex',
                                                                        alignItems:
                                                                            'center',
                                                                        gap: 1.5,
                                                                        flexShrink: 0,
                                                                    }}
                                                                >
                                                                    <Typography
                                                                        variant="caption"
                                                                        color="text.secondary"
                                                                    >
                                                                        {formatBytes(
                                                                            note.size_bytes
                                                                        )}
                                                                    </Typography>
                                                                    <Chip
                                                                        label={timeAgo(
                                                                            note.modified
                                                                        )}
                                                                        size="small"
                                                                        variant="outlined"
                                                                        sx={{
                                                                            height: 20,
                                                                            fontSize:
                                                                                '0.65rem',
                                                                        }}
                                                                    />
                                                                </Box>
                                                            </Box>
                                                        )
                                                    )}
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                )}

                                {/* Notes by Depth */}
                                {stats.notes_by_depth.length > 0 && (
                                    <Grid size={{ xs: 12 }}>
                                        <Card>
                                            <CardContent
                                                sx={{
                                                    p: 2.5,
                                                    '&:last-child': {
                                                        pb: 2.5,
                                                    },
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems:
                                                            'center',
                                                        gap: 1,
                                                        mb: 2,
                                                    }}
                                                >
                                                    <FolderRoundedIcon
                                                        sx={{
                                                            color: theme
                                                                .palette
                                                                .secondary
                                                                .main,
                                                            fontSize: 20,
                                                        }}
                                                    />
                                                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                                        {t(
                                                            'stats.notesByDepth'
                                                        )}
                                                    </Typography>
                                                </Box>
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        gap: 1.5,
                                                        flexWrap: 'wrap',
                                                    }}
                                                >
                                                    {stats.notes_by_depth.map(
                                                        (d) => {
                                                            const maxCount =
                                                                Math.max(
                                                                    ...stats.notes_by_depth.map(
                                                                        (
                                                                            x
                                                                        ) =>
                                                                            x.count
                                                                    )
                                                                )
                                                            const pct =
                                                                (d.count /
                                                                    maxCount) *
                                                                100
                                                            return (
                                                                <Box
                                                                    key={
                                                                        d.depth
                                                                    }
                                                                    sx={{
                                                                        display:
                                                                            'flex',
                                                                        flexDirection:
                                                                            'column',
                                                                        alignItems:
                                                                            'center',
                                                                        minWidth: 60,
                                                                        flex: 1,
                                                                    }}
                                                                >
                                                                    <Box
                                                                        sx={{
                                                                            width: '100%',
                                                                            height: 80,
                                                                            display:
                                                                                'flex',
                                                                            alignItems:
                                                                                'flex-end',
                                                                            justifyContent:
                                                                                'center',
                                                                        }}
                                                                    >
                                                                        <Box
                                                                            sx={{
                                                                                width: '60%',
                                                                                minHeight: 8,
                                                                                height: `${Math.max(pct, 8)}%`,
                                                                                bgcolor:
                                                                                    alpha(
                                                                                        theme
                                                                                            .palette
                                                                                            .secondary
                                                                                            .main,
                                                                                        0.7
                                                                                    ),
                                                                                borderRadius:
                                                                                    '4px 4px 0 0',
                                                                                transition:
                                                                                    'height 0.3s',
                                                                            }}
                                                                        />
                                                                    </Box>
                                                                    <Typography
                                                                        variant="caption"
                                                                        sx={{
                                                                            fontWeight: 700,
                                                                            mt: 0.5,
                                                                        }}
                                                                    >
                                                                        {
                                                                            d.count
                                                                        }
                                                                    </Typography>
                                                                    <Typography
                                                                        variant="caption"
                                                                        color="text.secondary"
                                                                        sx={{
                                                                            fontSize:
                                                                                '0.65rem',
                                                                        }}
                                                                    >
                                                                        {d.depth ===
                                                                        0
                                                                            ? t(
                                                                                  'stats.depthRoot'
                                                                              )
                                                                            : t(
                                                                                  'stats.depthLevel',
                                                                                  {
                                                                                      depth: d.depth,
                                                                                  }
                                                                              )}
                                                                    </Typography>
                                                                </Box>
                                                            )
                                                        }
                                                    )}
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                )}
                            </Grid>
                        </>
                    )}
                </Box>
            )}
        </Box>
    )
}

export const Component = DashboardPage
