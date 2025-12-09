import { createBrowserRouter, Navigate } from 'react-router-dom';
import RootLayout from './layouts/RootLayout';
import Dashboard from './features/dashboard/Dashboard';
import Logs from './pages/Logs';
import Users from './pages/Users';
import Settings from './pages/Settings';
import { ProfileSettings } from './features/settings/components/ProfileSettings';

export const router = createBrowserRouter([
    {
        path: "/",
        element: <RootLayout />,
        children: [
            {
                path: "dashboard",
                element: <Dashboard />,
            },
            {
                path: "logs",
                element: <Logs />,
            },
            {
                path: "users",
                element: <Users />,
            },
            {
                path: "settings",
                element: <Settings />,
            },
            {
                path: "profile",
                element: <ProfileSettings />,
            },
            {
                path: "",
                element: <Navigate to="/dashboard" replace />,
            }
        ]
    }
]);
