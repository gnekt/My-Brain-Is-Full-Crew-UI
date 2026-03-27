import { createBrowserRouter, RouterProvider } from 'react-router'
import MainLayout from '@/components/layout/MainLayout'

const createAppRouter = () =>
    createBrowserRouter([
        {
            element: <MainLayout />,
            children: [
                {
                    path: '/',
                    lazy: () => import('@/app/routes/dashboard'),
                },
                {
                    path: '/setup',
                    lazy: () => import('@/app/routes/setup'),
                },
                {
                    path: '/agents',
                    lazy: () => import('@/app/routes/agents'),
                },
                {
                    path: '/settings',
                    lazy: () => import('@/app/routes/settings'),
                },
            ],
        },
    ])

export default function AppRouter() {
    return <RouterProvider router={createAppRouter()} />
}
