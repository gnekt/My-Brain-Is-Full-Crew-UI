import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    Chip,
    Switch,
    alpha,
    useTheme,
    Skeleton,
    Alert,
    Drawer,
    IconButton,
    Tabs,
    Tab,
    Button,
    TextField,
    Divider,
    Snackbar,
    Checkbox,
    FormControlLabel,
    FormGroup,
    InputAdornment,
} from '@mui/material'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import ArchitectureRoundedIcon from '@mui/icons-material/ArchitectureRounded'
import EditNoteRoundedIcon from '@mui/icons-material/EditNoteRounded'
import SortRoundedIcon from '@mui/icons-material/SortRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import HubRoundedIcon from '@mui/icons-material/HubRounded'
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded'
import MicRoundedIcon from '@mui/icons-material/MicRounded'
import EmailRoundedIcon from '@mui/icons-material/EmailRounded'
import SmartToyRoundedIcon from '@mui/icons-material/SmartToyRounded'
import SaveRoundedIcon from '@mui/icons-material/SaveRounded'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import CodeRoundedIcon from '@mui/icons-material/CodeRounded'
import TuneRoundedIcon from '@mui/icons-material/TuneRounded'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import AutoFixHighRoundedIcon from '@mui/icons-material/AutoFixHighRounded'
import FilterListRoundedIcon from '@mui/icons-material/FilterListRounded'
import {
    listAgents,
    toggleAgent,
    getStoredVaultPath,
    readAgentMarkdown,
    saveAgentMarkdown,
    updateAgentModel,
    updateAgentTools,
    type AgentInfo,
} from '@/hooks/useTauriCommands'

const AGENT_ICONS: Record<string, React.ReactNode> = {
    architect: <ArchitectureRoundedIcon />,
    scribe: <EditNoteRoundedIcon />,
    sorter: <SortRoundedIcon />,
    seeker: <SearchRoundedIcon />,
    connector: <HubRoundedIcon />,
    librarian: <MenuBookRoundedIcon />,
    transcriber: <MicRoundedIcon />,
    postman: <EmailRoundedIcon />,
}

const AGENT_COLORS: Record<string, string> = {
    architect: '#6C5CE7',
    scribe: '#00B894',
    sorter: '#E17055',
    seeker: '#0984E3',
    connector: '#FDCB6E',
    librarian: '#A29BFE',
    transcriber: '#FF7675',
    postman: '#74B9FF',
}

const AVAILABLE_MODELS = [
    { value: 'opus', label: 'Claude Opus', color: '#6C5CE7' },
    { value: 'sonnet', label: 'Claude Sonnet', color: '#00B894' },
    { value: 'haiku', label: 'Claude Haiku', color: '#FDCB6E' },
]

const AVAILABLE_TOOLS = [
    'Read',
    'Edit',
    'Write',
    'Bash',
    'Glob',
    'Grep',
    'WebSearch',
    'WebFetch',
    'TodoWrite',
    'NotebookEdit',
    'Agent',
]

const MODEL_COLORS: Record<string, string> = {
    opus: '#6C5CE7',
    sonnet: '#00B894',
    haiku: '#FDCB6E',
}

type FilterType = 'all' | 'core' | 'custom' | 'enabled' | 'disabled'

export default function AgentsPage() {
    const { t } = useTranslation()
    const theme = useTheme()
    const [agents, setAgents] = useState<AgentInfo[]>([])
    const [loading, setLoading] = useState(true)
    const [vaultPath, setVaultPath] = useState<string | null>(null)
    const [selectedAgent, setSelectedAgent] = useState<AgentInfo | null>(null)
    const [drawerTab, setDrawerTab] = useState(0)
    const [markdown, setMarkdown] = useState('')
    const [markdownLoading, setMarkdownLoading] = useState(false)
    const [markdownDirty, setMarkdownDirty] = useState(false)
    const [snackbar, setSnackbar] = useState<{
        open: boolean
        message: string
        severity: 'success' | 'error'
    }>({ open: false, message: '', severity: 'success' })
    const [filter, setFilter] = useState<FilterType>('all')
    const [searchQuery, setSearchQuery] = useState('')

    const loadAgents = useCallback(async () => {
        try {
            const path = await getStoredVaultPath()
            setVaultPath(path)
            if (path) {
                const a = await listAgents(path)
                setAgents(a)
            }
        } catch (e) {
            console.error('Failed to load agents:', e)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadAgents()
    }, [loadAgents])

    async function handleToggle(agent: AgentInfo) {
        if (!vaultPath) return
        const newEnabled = !agent.enabled
        setAgents((prev) =>
            prev.map((a) =>
                a.name === agent.name ? { ...a, enabled: newEnabled } : a
            )
        )
        if (selectedAgent && selectedAgent.name === agent.name) {
            setSelectedAgent({ ...selectedAgent, enabled: newEnabled })
        }
        try {
            await toggleAgent(vaultPath, agent.name, newEnabled)
        } catch {
            setAgents((prev) =>
                prev.map((a) =>
                    a.name === agent.name
                        ? { ...a, enabled: !newEnabled }
                        : a
                )
            )
        }
    }

    function handleOpenDrawer(agent: AgentInfo) {
        setSelectedAgent(agent)
        setDrawerTab(0)
        setMarkdownDirty(false)
    }

    async function loadMarkdown(agentName: string) {
        if (!vaultPath) return
        setMarkdownLoading(true)
        try {
            const md = await readAgentMarkdown(vaultPath, agentName)
            setMarkdown(md)
            setMarkdownDirty(false)
        } catch (e) {
            setMarkdown(`Error: ${e}`)
        } finally {
            setMarkdownLoading(false)
        }
    }

    async function handleSaveMarkdown() {
        if (!vaultPath || !selectedAgent) return
        try {
            const result = await saveAgentMarkdown(
                vaultPath,
                selectedAgent.name,
                markdown
            )
            if (result.success) {
                setMarkdownDirty(false)
                showSnack(t('agents.drawer.markdownSaved'), 'success')
                await loadAgents()
            } else {
                showSnack(result.message, 'error')
            }
        } catch (e) {
            showSnack(`Error: ${e}`, 'error')
        }
    }

    async function handleModelChange(model: string) {
        if (!vaultPath || !selectedAgent) return
        try {
            const result = await updateAgentModel(
                vaultPath,
                selectedAgent.name,
                model
            )
            if (result.success) {
                setSelectedAgent({ ...selectedAgent, model })
                setAgents((prev) =>
                    prev.map((a) =>
                        a.name === selectedAgent.name ? { ...a, model } : a
                    )
                )
                showSnack(t('agents.drawer.modelUpdated', { model }), 'success')
            } else {
                showSnack(result.message, 'error')
            }
        } catch (e) {
            showSnack(`Error: ${e}`, 'error')
        }
    }

    async function handleToolsChange(tools: string[]) {
        if (!vaultPath || !selectedAgent) return
        try {
            const result = await updateAgentTools(
                vaultPath,
                selectedAgent.name,
                tools
            )
            if (result.success) {
                setSelectedAgent({ ...selectedAgent, tools })
                setAgents((prev) =>
                    prev.map((a) =>
                        a.name === selectedAgent.name ? { ...a, tools } : a
                    )
                )
                showSnack(t('agents.drawer.toolsUpdated'), 'success')
            } else {
                showSnack(result.message, 'error')
            }
        } catch (e) {
            showSnack(`Error: ${e}`, 'error')
        }
    }

    function showSnack(message: string, severity: 'success' | 'error') {
        setSnackbar({ open: true, message, severity })
    }

    // Filter & search
    const filteredAgents = agents.filter((a) => {
        if (filter === 'core' && a.is_custom) return false
        if (filter === 'custom' && !a.is_custom) return false
        if (filter === 'enabled' && !a.enabled) return false
        if (filter === 'disabled' && a.enabled) return false
        if (searchQuery) {
            const q = searchQuery.toLowerCase()
            return (
                a.name.toLowerCase().includes(q) ||
                a.display_name.toLowerCase().includes(q) ||
                a.description.toLowerCase().includes(q)
            )
        }
        return true
    })

    const coreAgents = filteredAgents.filter((a) => !a.is_custom)
    const customAgents = filteredAgents.filter((a) => a.is_custom)
    const totalEnabled = agents.filter((a) => a.enabled).length

    if (!loading && !vaultPath) {
        return (
            <Box>
                <Typography variant="h4" gutterBottom>
                    {t('agents.title')}
                </Typography>
                <Alert severity="info">
                    {t('agents.noVault')}
                </Alert>
            </Box>
        )
    }

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" gutterBottom sx={{ mb: 0.5 }}>
                    {t('agents.title')}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    {loading
                        ? t('agents.loading')
                        : t('agents.subtitle', { enabled: totalEnabled, total: agents.length })}
                </Typography>
            </Box>

            {/* Toolbar */}
            <Box
                sx={{
                    mb: 3,
                    display: 'flex',
                    gap: 1.5,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                }}
            >
                <TextField
                    size="small"
                    placeholder={t('agents.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchRoundedIcon
                                        sx={{
                                            fontSize: 20,
                                            color: 'text.secondary',
                                        }}
                                    />
                                </InputAdornment>
                            ),
                        },
                    }}
                    sx={{ minWidth: 220 }}
                />
                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                    <FilterListRoundedIcon
                        sx={{ fontSize: 18, color: 'text.secondary', mr: 0.5 }}
                    />
                    {(
                        [
                            ['all', t('agents.filterAll')],
                            ['core', t('agents.filterCore')],
                            ['custom', t('agents.filterCustom')],
                            ['enabled', t('agents.filterEnabled')],
                            ['disabled', t('agents.filterDisabled')],
                        ] as [FilterType, string][]
                    ).map(([key, label]) => (
                        <Chip
                            key={key}
                            label={label}
                            size="small"
                            variant={filter === key ? 'filled' : 'outlined'}
                            color={filter === key ? 'primary' : 'default'}
                            onClick={() => setFilter(key)}
                            sx={{ cursor: 'pointer', transition: 'all 0.2s' }}
                        />
                    ))}
                </Box>
            </Box>

            {/* Core Agents */}
            {coreAgents.length > 0 && (
                <>
                    <Box
                        sx={{
                            mb: 2,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                        }}
                    >
                        <AutoFixHighRoundedIcon
                            sx={{
                                fontSize: 18,
                                color: theme.palette.primary.main,
                            }}
                        />
                        <Typography
                            variant="overline"
                            sx={{
                                color: theme.palette.primary.main,
                                fontWeight: 700,
                                letterSpacing: 1.5,
                            }}
                        >
                            {t('agents.coreAgents', { count: coreAgents.length })}
                        </Typography>
                    </Box>
                    <Grid container spacing={2} sx={{ mb: 4 }}>
                        {loading
                            ? Array.from({ length: 8 }).map((_, i) => (
                                  <Grid
                                      size={{ xs: 12, sm: 6, md: 4, lg: 3 }}
                                      key={i}
                                  >
                                      <Card>
                                          <CardContent>
                                              <Skeleton
                                                  variant="rounded"
                                                  height={140}
                                              />
                                          </CardContent>
                                      </Card>
                                  </Grid>
                              ))
                            : coreAgents.map((agent) => (
                                  <Grid
                                      size={{ xs: 12, sm: 6, md: 4, lg: 3 }}
                                      key={agent.name}
                                  >
                                      <AgentCard
                                          agent={agent}
                                          onToggle={() => handleToggle(agent)}
                                          onClick={() =>
                                              handleOpenDrawer(agent)
                                          }
                                      />
                                  </Grid>
                              ))}
                    </Grid>
                </>
            )}

            {/* Custom Agents */}
            {customAgents.length > 0 && (
                <>
                    <Box
                        sx={{
                            mb: 2,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                        }}
                    >
                        <SmartToyRoundedIcon
                            sx={{
                                fontSize: 18,
                                color: theme.palette.secondary.main,
                            }}
                        />
                        <Typography
                            variant="overline"
                            sx={{
                                color: theme.palette.secondary.main,
                                fontWeight: 700,
                                letterSpacing: 1.5,
                            }}
                        >
                            {t('agents.customAgents', { count: customAgents.length })}
                        </Typography>
                    </Box>
                    <Grid container spacing={2} sx={{ mb: 4 }}>
                        {customAgents.map((agent) => (
                            <Grid
                                size={{ xs: 12, sm: 6, md: 4, lg: 3 }}
                                key={agent.name}
                            >
                                <AgentCard
                                    agent={agent}
                                    onToggle={() => handleToggle(agent)}
                                    onClick={() => handleOpenDrawer(agent)}
                                />
                            </Grid>
                        ))}
                    </Grid>
                </>
            )}

            {/* ============ AGENT DETAIL DRAWER ============ */}
            <Drawer
                anchor="right"
                open={!!selectedAgent}
                onClose={() => setSelectedAgent(null)}
                PaperProps={{
                    sx: {
                        width: { xs: '100%', sm: 480 },
                        bgcolor: theme.palette.background.default,
                    },
                }}
            >
                {selectedAgent && (
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            height: '100%',
                        }}
                    >
                        {/* Drawer Header */}
                        <Box
                            sx={{
                                p: 3,
                                pb: 0,
                                background: `linear-gradient(135deg, ${alpha(
                                    AGENT_COLORS[selectedAgent.name] ||
                                        theme.palette.primary.main,
                                    0.12
                                )}, ${alpha(
                                    AGENT_COLORS[selectedAgent.name] ||
                                        theme.palette.primary.main,
                                    0.04
                                )})`,
                            }}
                        >
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 2,
                                    mb: 2,
                                }}
                            >
                                <Box
                                    sx={{
                                        width: 52,
                                        height: 52,
                                        borderRadius: 3,
                                        background: `linear-gradient(135deg, ${
                                            AGENT_COLORS[selectedAgent.name] ||
                                            theme.palette.primary.main
                                        }, ${alpha(
                                            AGENT_COLORS[selectedAgent.name] ||
                                                theme.palette.primary.main,
                                            0.7
                                        )})`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#fff',
                                        fontSize: 28,
                                        boxShadow: `0 4px 14px ${alpha(
                                            AGENT_COLORS[selectedAgent.name] ||
                                                theme.palette.primary.main,
                                            0.4
                                        )}`,
                                    }}
                                >
                                    {AGENT_ICONS[selectedAgent.name] || (
                                        <SmartToyRoundedIcon />
                                    )}
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                    <Typography
                                        variant="h6"
                                        sx={{ fontWeight: 700 }}
                                    >
                                        {selectedAgent.display_name}
                                    </Typography>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            gap: 0.5,
                                            mt: 0.5,
                                        }}
                                    >
                                        <Chip
                                            label={selectedAgent.model}
                                            size="small"
                                            sx={{
                                                height: 22,
                                                fontSize: '0.7rem',
                                                fontWeight: 600,
                                                bgcolor: alpha(
                                                    MODEL_COLORS[
                                                        selectedAgent.model
                                                    ] ||
                                                        theme.palette.primary
                                                            .main,
                                                    0.15
                                                ),
                                                color:
                                                    MODEL_COLORS[
                                                        selectedAgent.model
                                                    ] ||
                                                    theme.palette.primary.main,
                                            }}
                                        />
                                        {selectedAgent.is_custom && (
                                            <Chip
                                                label="custom"
                                                size="small"
                                                sx={{
                                                    height: 22,
                                                    fontSize: '0.7rem',
                                                    fontWeight: 600,
                                                    bgcolor: alpha(
                                                        theme.palette.secondary
                                                            .main,
                                                        0.15
                                                    ),
                                                    color: theme.palette
                                                        .secondary.main,
                                                }}
                                            />
                                        )}
                                        <Chip
                                            label={
                                                selectedAgent.enabled
                                                    ? t('agents.drawer.active')
                                                    : t('agents.drawer.inactive')
                                            }
                                            size="small"
                                            sx={{
                                                height: 22,
                                                fontSize: '0.7rem',
                                                fontWeight: 600,
                                                bgcolor: alpha(
                                                    selectedAgent.enabled
                                                        ? theme.palette.success
                                                              .main
                                                        : theme.palette.error
                                                              .main,
                                                    0.15
                                                ),
                                                color: selectedAgent.enabled
                                                    ? theme.palette.success.main
                                                    : theme.palette.error.main,
                                            }}
                                        />
                                    </Box>
                                </Box>
                                <IconButton
                                    onClick={() => setSelectedAgent(null)}
                                    size="small"
                                    sx={{
                                        bgcolor: alpha(
                                            theme.palette.text.primary,
                                            0.05
                                        ),
                                    }}
                                >
                                    <CloseRoundedIcon />
                                </IconButton>
                            </Box>

                            <Tabs
                                value={drawerTab}
                                onChange={(_, v) => {
                                    setDrawerTab(v)
                                    if (v === 2 && selectedAgent) {
                                        loadMarkdown(selectedAgent.name)
                                    }
                                }}
                                sx={{
                                    '& .MuiTab-root': {
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        minHeight: 44,
                                    },
                                }}
                            >
                                <Tab
                                    icon={
                                        <InfoOutlinedIcon
                                            sx={{ fontSize: 18 }}
                                        />
                                    }
                                    iconPosition="start"
                                    label={t('agents.drawer.overview')}
                                />
                                <Tab
                                    icon={
                                        <TuneRoundedIcon
                                            sx={{ fontSize: 18 }}
                                        />
                                    }
                                    iconPosition="start"
                                    label={t('agents.drawer.configure')}
                                />
                                <Tab
                                    icon={
                                        <CodeRoundedIcon
                                            sx={{ fontSize: 18 }}
                                        />
                                    }
                                    iconPosition="start"
                                    label={t('agents.drawer.markdown')}
                                />
                            </Tabs>
                        </Box>

                        {/* Tab Content */}
                        <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
                            {/* TAB 0: Overview */}
                            {drawerTab === 0 && (
                                <Box>
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            mb: 3,
                                            lineHeight: 1.7,
                                            color: 'text.secondary',
                                        }}
                                    >
                                        {selectedAgent.description}
                                    </Typography>

                                    <Card
                                        sx={{
                                            mb: 2,
                                            bgcolor: alpha(
                                                theme.palette.background.paper,
                                                0.6
                                            ),
                                        }}
                                    >
                                        <CardContent
                                            sx={{
                                                p: 2.5,
                                                '&:last-child': { pb: 2.5 },
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    justifyContent:
                                                        'space-between',
                                                    alignItems: 'center',
                                                    mb: 1.5,
                                                }}
                                            >
                                                <Typography
                                                    variant="subtitle2"
                                                    sx={{ fontWeight: 700 }}
                                                >
                                                    {t('agents.drawer.status')}
                                                </Typography>
                                                <Switch
                                                    checked={
                                                        selectedAgent.enabled
                                                    }
                                                    onChange={() =>
                                                        handleToggle(
                                                            selectedAgent
                                                        )
                                                    }
                                                    color="success"
                                                />
                                            </Box>
                                            <Divider sx={{ mb: 1.5 }} />
                                            <DetailRow
                                                label={t('agents.drawer.name')}
                                                value={selectedAgent.name}
                                            />
                                            <DetailRow
                                                label={t('agents.drawer.model')}
                                                value={selectedAgent.model}
                                            />
                                            <DetailRow
                                                label={t('agents.drawer.type')}
                                                value={
                                                    selectedAgent.is_custom
                                                        ? t('agents.drawer.typeCustom')
                                                        : t('agents.drawer.typeCore')
                                                }
                                            />
                                        </CardContent>
                                    </Card>

                                    <Card
                                        sx={{
                                            bgcolor: alpha(
                                                theme.palette.background.paper,
                                                0.6
                                            ),
                                        }}
                                    >
                                        <CardContent
                                            sx={{
                                                p: 2.5,
                                                '&:last-child': { pb: 2.5 },
                                            }}
                                        >
                                            <Typography
                                                variant="subtitle2"
                                                sx={{
                                                    fontWeight: 700,
                                                    mb: 1.5,
                                                }}
                                            >
                                                {t('agents.drawer.toolsCount', { count: selectedAgent.tools.length })}
                                            </Typography>
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    flexWrap: 'wrap',
                                                    gap: 0.75,
                                                }}
                                            >
                                                {selectedAgent.tools.length >
                                                0 ? (
                                                    selectedAgent.tools.map(
                                                        (tool) => (
                                                            <Chip
                                                                key={tool}
                                                                label={tool}
                                                                size="small"
                                                                variant="outlined"
                                                                sx={{
                                                                    borderColor:
                                                                        alpha(
                                                                            theme
                                                                                .palette
                                                                                .primary
                                                                                .main,
                                                                            0.3
                                                                        ),
                                                                    color: theme
                                                                        .palette
                                                                        .primary
                                                                        .main,
                                                                    fontWeight: 500,
                                                                }}
                                                            />
                                                        )
                                                    )
                                                ) : (
                                                    <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                    >
                                                        {t('agents.drawer.noTools')}
                                                    </Typography>
                                                )}
                                            </Box>
                                        </CardContent>
                                    </Card>

                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{
                                            mt: 2,
                                            display: 'block',
                                            fontFamily: 'monospace',
                                            fontSize: '0.7rem',
                                        }}
                                    >
                                        {selectedAgent.file_path}
                                    </Typography>
                                </Box>
                            )}

                            {/* TAB 1: Config */}
                            {drawerTab === 1 && (
                                <Box>
                                    {/* Model selector */}
                                    <Typography
                                        variant="subtitle2"
                                        sx={{ fontWeight: 700, mb: 1.5 }}
                                    >
                                        {t('agents.drawer.aiModel')}
                                    </Typography>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            gap: 1,
                                            mb: 3,
                                        }}
                                    >
                                        {AVAILABLE_MODELS.map((m) => (
                                            <Card
                                                key={m.value}
                                                onClick={() =>
                                                    handleModelChange(m.value)
                                                }
                                                sx={{
                                                    flex: 1,
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    border:
                                                        selectedAgent.model ===
                                                        m.value
                                                            ? `2px solid ${m.color}`
                                                            : `2px solid transparent`,
                                                    bgcolor:
                                                        selectedAgent.model ===
                                                        m.value
                                                            ? alpha(
                                                                  m.color,
                                                                  0.08
                                                              )
                                                            : alpha(
                                                                  theme.palette
                                                                      .background
                                                                      .paper,
                                                                  0.6
                                                              ),
                                                    '&:hover': {
                                                        bgcolor: alpha(
                                                            m.color,
                                                            0.12
                                                        ),
                                                    },
                                                }}
                                            >
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
                                                            width: 10,
                                                            height: 10,
                                                            borderRadius: '50%',
                                                            bgcolor: m.color,
                                                            mx: 'auto',
                                                            mb: 1,
                                                        }}
                                                    />
                                                    <Typography
                                                        variant="caption"
                                                        sx={{
                                                            fontWeight: 700,
                                                            display: 'block',
                                                        }}
                                                    >
                                                        {m.label}
                                                    </Typography>
                                                    <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                        sx={{
                                                            fontSize: '0.65rem',
                                                        }}
                                                    >
                                                        {m.value}
                                                    </Typography>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </Box>

                                    {/* Tools */}
                                    <Typography
                                        variant="subtitle2"
                                        sx={{ fontWeight: 700, mb: 1.5 }}
                                    >
                                        {t('agents.drawer.toolsPermissions')}
                                    </Typography>
                                    <Card
                                        sx={{
                                            mb: 3,
                                            bgcolor: alpha(
                                                theme.palette.background.paper,
                                                0.6
                                            ),
                                        }}
                                    >
                                        <CardContent
                                            sx={{
                                                p: 2,
                                                '&:last-child': { pb: 2 },
                                            }}
                                        >
                                            <FormGroup>
                                                {AVAILABLE_TOOLS.map(
                                                    (tool) => (
                                                        <FormControlLabel
                                                            key={tool}
                                                            control={
                                                                <Checkbox
                                                                    size="small"
                                                                    checked={selectedAgent.tools.includes(
                                                                        tool
                                                                    )}
                                                                    onChange={(
                                                                        e
                                                                    ) => {
                                                                        const updated =
                                                                            e
                                                                                .target
                                                                                .checked
                                                                                ? [
                                                                                      ...selectedAgent.tools,
                                                                                      tool,
                                                                                  ]
                                                                                : selectedAgent.tools.filter(
                                                                                      (
                                                                                          t
                                                                                      ) =>
                                                                                          t !==
                                                                                          tool
                                                                                  )
                                                                        handleToolsChange(
                                                                            updated
                                                                        )
                                                                    }}
                                                                />
                                                            }
                                                            label={
                                                                <Typography variant="body2">
                                                                    {tool}
                                                                </Typography>
                                                            }
                                                            sx={{
                                                                borderBottom: `1px solid ${theme.palette.divider}`,
                                                                mx: 0,
                                                                py: 0.25,
                                                                '&:last-child':
                                                                    {
                                                                        borderBottom:
                                                                            'none',
                                                                    },
                                                            }}
                                                        />
                                                    )
                                                )}
                                            </FormGroup>
                                        </CardContent>
                                    </Card>

                                    {/* Toggle */}
                                    <Card
                                        sx={{
                                            bgcolor: alpha(
                                                theme.palette.background.paper,
                                                0.6
                                            ),
                                        }}
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
                                                    justifyContent:
                                                        'space-between',
                                                    alignItems: 'center',
                                                }}
                                            >
                                                <Box>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{ fontWeight: 600 }}
                                                    >
                                                        {selectedAgent.enabled
                                                            ? t('agents.drawer.agentActive')
                                                            : t('agents.drawer.agentInactive')}
                                                    </Typography>
                                                    <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                    >
                                                        {selectedAgent.enabled
                                                            ? t('agents.drawer.agentActiveDesc')
                                                            : t('agents.drawer.agentInactiveDesc')}
                                                    </Typography>
                                                </Box>
                                                <Switch
                                                    checked={
                                                        selectedAgent.enabled
                                                    }
                                                    onChange={() =>
                                                        handleToggle(
                                                            selectedAgent
                                                        )
                                                    }
                                                    color="success"
                                                />
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Box>
                            )}

                            {/* TAB 2: Markdown */}
                            {drawerTab === 2 && (
                                <Box>
                                    <Alert
                                        severity="warning"
                                        icon={
                                            <WarningAmberRoundedIcon fontSize="small" />
                                        }
                                        sx={{ mb: 2 }}
                                    >
                                        <Typography variant="caption">
                                            {t('agents.drawer.markdownWarning')}
                                        </Typography>
                                    </Alert>

                                    {markdownLoading ? (
                                        <Box>
                                            <Skeleton height={24} />
                                            <Skeleton height={24} />
                                            <Skeleton height={24} />
                                            <Skeleton height={200} />
                                        </Box>
                                    ) : (
                                        <>
                                            <TextField
                                                fullWidth
                                                multiline
                                                minRows={16}
                                                maxRows={30}
                                                value={markdown}
                                                onChange={(e) => {
                                                    setMarkdown(e.target.value)
                                                    setMarkdownDirty(true)
                                                }}
                                                sx={{
                                                    '& .MuiInputBase-root': {
                                                        fontFamily:
                                                            '"JetBrains Mono", "Fira Code", monospace',
                                                        fontSize: '0.8rem',
                                                        lineHeight: 1.6,
                                                    },
                                                }}
                                            />
                                            <Box
                                                sx={{
                                                    mt: 2,
                                                    display: 'flex',
                                                    gap: 1,
                                                    justifyContent: 'flex-end',
                                                }}
                                            >
                                                <Button
                                                    variant="contained"
                                                    startIcon={
                                                        <SaveRoundedIcon />
                                                    }
                                                    disabled={!markdownDirty}
                                                    onClick={
                                                        handleSaveMarkdown
                                                    }
                                                    sx={{
                                                        background:
                                                            markdownDirty
                                                                ? `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`
                                                                : undefined,
                                                    }}
                                                >
                                                    {t('agents.drawer.save')}
                                                </Button>
                                            </Box>
                                        </>
                                    )}
                                </Box>
                            )}
                        </Box>
                    </Box>
                )}
            </Drawer>

            {/* ============ SNACKBAR ============ */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={() =>
                    setSnackbar((s) => ({ ...s, open: false }))
                }
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    severity={snackbar.severity}
                    onClose={() =>
                        setSnackbar((s) => ({ ...s, open: false }))
                    }
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    )
}

/* ================================================================
   SUB-COMPONENTS
   ================================================================ */

function AgentCard({
    agent,
    onToggle,
    onClick,
}: {
    agent: AgentInfo
    onToggle: () => void
    onClick: () => void
}) {
    const { t } = useTranslation()
    const theme = useTheme()
    const color = AGENT_COLORS[agent.name] || theme.palette.primary.main
    const icon = AGENT_ICONS[agent.name] || <SmartToyRoundedIcon />

    return (
        <Card
            sx={{
                cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'visible',
                opacity: agent.enabled ? 1 : 0.55,
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: `0 8px 30px ${alpha(color, 0.25)}`,
                },
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    borderRadius: '12px 12px 0 0',
                    background: `linear-gradient(90deg, ${color}, ${alpha(color, 0.4)})`,
                    opacity: agent.enabled ? 1 : 0.3,
                    transition: 'opacity 0.2s',
                },
            }}
            onClick={onClick}
        >
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        mb: 1.5,
                    }}
                >
                    <Box
                        sx={{
                            width: 44,
                            height: 44,
                            borderRadius: 2.5,
                            background: `linear-gradient(135deg, ${color}, ${alpha(color, 0.7)})`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            boxShadow: `0 3px 10px ${alpha(color, 0.35)}`,
                        }}
                    >
                        {icon}
                    </Box>
                    <Switch
                        size="small"
                        checked={agent.enabled}
                        onChange={(e) => {
                            e.stopPropagation()
                            onToggle()
                        }}
                        onClick={(e) => e.stopPropagation()}
                        color="success"
                    />
                </Box>

                <Typography
                    variant="subtitle2"
                    sx={{ mb: 0.5, fontWeight: 700 }}
                >
                    {agent.display_name}
                </Typography>
                <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        mb: 1.5,
                        lineHeight: 1.5,
                    }}
                >
                    {agent.description}
                </Typography>

                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                    }}
                >
                    <Chip
                        label={agent.model}
                        size="small"
                        sx={{
                            height: 20,
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            bgcolor: alpha(
                                MODEL_COLORS[agent.model] ||
                                    theme.palette.primary.main,
                                0.15
                            ),
                            color:
                                MODEL_COLORS[agent.model] ||
                                theme.palette.primary.main,
                        }}
                    />
                    {agent.is_custom && (
                        <Chip
                            label="custom"
                            size="small"
                            sx={{
                                height: 20,
                                fontSize: '0.65rem',
                                fontWeight: 600,
                                bgcolor: alpha(
                                    theme.palette.secondary.main,
                                    0.15
                                ),
                                color: theme.palette.secondary.main,
                            }}
                        />
                    )}
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ ml: 'auto', fontSize: '0.6rem' }}
                    >
                        {agent.tools.length} {t('agents.tools')}
                    </Typography>
                </Box>
            </CardContent>
        </Card>
    )
}

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                py: 0.75,
            }}
        >
            <Typography variant="caption" color="text.secondary">
                {label}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {value}
            </Typography>
        </Box>
    )
}

export const Component = AgentsPage
