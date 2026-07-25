import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { OfflineBanner } from "./components/ui/OfflineBanner";
import { LoginPage } from "./features/auth/LoginPage";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { AnalyticsPage } from "./features/analytics/AnalyticsPage";
import { CategoriesPage } from "./features/categories/CategoriesPage";
import { MenuPage } from "./features/menu/MenuPage";
import { SpecialsPage } from "./features/specials/SpecialsPage";
import { EventsPage } from "./features/events/EventsPage";
import { StayPage } from "./features/stay/StayPage";
import { CelebrePage } from "./features/celebre/CelebrePage";
import { HomepagePage } from "./features/homepage/HomepagePage";
import { VideoGalleryPage } from "./features/video-gallery/VideoGalleryPage";
import { OffersPage } from "./features/offers/OffersPage";
import { OfferRegistrationsPage } from "./features/offers/OfferRegistrationsPage";
import { SettingsPage } from "./features/settings/SettingsPage";
import { UsersPage } from "./features/users/UsersPage";
import { NotFoundPage } from "./features/misc/NotFoundPage";

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <OfflineBanner />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/celebre" element={<CelebrePage />} />
            <Route path="/specials" element={<SpecialsPage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/stay" element={<StayPage />} />
            <Route path="/homepage" element={<HomepagePage />} />
            <Route path="/video-gallery" element={<VideoGalleryPage />} />
            <Route path="/offers" element={<OffersPage />} />
            <Route path="/offer-registrations" element={<OfferRegistrationsPage />} />
            <Route
              path="/settings"
              element={
                <ProtectedRoute roles={["owner", "admin"]}>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute roles={["owner", "admin"]}>
                  <UsersPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
