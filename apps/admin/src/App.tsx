import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from './components/layout/AdminLayout';
import { RequireAdminAuth } from './components/auth/RequireAdminAuth';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { UsersPage } from './pages/UsersPage';
import { ContentPage } from './pages/ContentPage';
import { CreatorsPage } from './pages/CreatorsPage';
import { LiberAnalyticsPage } from './pages/LiberAnalyticsPage';
import { FeatureFlagsPage } from './pages/FeatureFlagsPage';
import { ReviewsPage } from './pages/ReviewsPage';

import { HonorsPage } from './pages/HonorsPage';
import { CollectionsPage } from './pages/CollectionsPage';
import { DefaultAvatarsPage } from './pages/DefaultAvatarsPage';
import { RanksPage } from './pages/RanksPage';
import { CirclesPage } from './pages/CirclesPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAdminAuth />}>
          <Route element={<AdminLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="content" element={<ContentPage />} />
            <Route path="creators" element={<CreatorsPage />} />
            <Route path="reviews" element={<ReviewsPage />} />
            <Route path="ai-liber" element={<LiberAnalyticsPage />} />
            <Route path="honors" element={<HonorsPage />} />
            <Route path="collections" element={<CollectionsPage />} />
            <Route path="avatars"     element={<DefaultAvatarsPage />} />
            <Route path="ranks"       element={<RanksPage />} />
            <Route path="circles"     element={<CirclesPage />} />
            <Route path="settings"    element={<FeatureFlagsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
};
