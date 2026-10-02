import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import RootLayout from './layouts/RootLayout';

/**
 * PERFORMANCE: Lazy load non-critical routes
 * 
 * This reduces initial bundle size by code-splitting each page.
 * Pages are loaded on-demand when the user navigates to them.
 * 
 * Expected improvement:
 * - Initial bundle: ~710KB → ~500KB (30% reduction)
 * - Faster Time to Interactive on first load
 */

// Lazy-loaded page components
const Dashboard = lazy(() => import('./features/dashboard/Dashboard'));
const Logs = lazy(() => import('./pages/Logs'));
const Users = lazy(() => import('./pages/Users'));
const Settings = lazy(() => import('./pages/Settings'));
const ProfileSettings = lazy(() => import('./features/settings/components/ProfileSettings').then(m => ({ default: m.ProfileSettings })));

// Loading fallback component
const PageLoader = () => (
    <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
            <div className="w-10 h-10 border-3 border-[#00F0FF] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-white/50 text-sm">Loading...</p>
        </div>
    </div>
);

// Wrap lazy components with Suspense
const withSuspense = (Component: React.LazyExoticComponent<React.ComponentType>) => (
    <Suspense fallback={<PageLoader />}>
        <Component />
    </Suspense>
);

export const router = createBrowserRouter([
    {
        path: "/",
        element: <RootLayout />,
        children: [
            {
                path: "dashboard",
                element: withSuspense(Dashboard),
            },
            {
                path: "logs",
                element: withSuspense(Logs),
            },
            {
                path: "users",
                element: withSuspense(Users),
            },
            {
                path: "settings",
                element: withSuspense(Settings),
            },
            {
                path: "profile",
                element: withSuspense(ProfileSettings),
            },
            {
                path: "",
                element: <Navigate to="/dashboard" replace />,
            }
        ]
    }
]);
