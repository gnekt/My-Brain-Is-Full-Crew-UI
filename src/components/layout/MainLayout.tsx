import { Outlet } from 'react-router'
import { Box } from '@mui/material'
import Sidebar, { DRAWER_WIDTH } from './Sidebar'

export default function MainLayout() {
    return (
        <Box sx={{ display: 'flex', height: '100vh' }}>
            <Sidebar />
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    width: `calc(100% - ${DRAWER_WIDTH}px)`,
                    overflow: 'auto',
                    p: 3,
                }}
            >
                <Outlet />
            </Box>
        </Box>
    )
}
