import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { PageContainer } from './components/layout/PageContainer';
import { OfflineBanner } from './components/layout/OfflineBanner';
import { AuthGate } from './components/auth/AuthGate';
import { Loading } from './components/ui';

// Route-level code splitting: each page becomes its own chunk, fetched only
// when its route is actually visited, instead of one bundle containing every
// page up front. Purely a build-output change — no page's behavior, markup,
// or logic is touched by this.
const Home = lazy(() => import('./pages/Home').then((m) => ({ default: m.Home })));
const StatusBoard = lazy(() => import('./pages/StatusBoard').then((m) => ({ default: m.StatusBoard })));
const Profile = lazy(() => import('./pages/Profile').then((m) => ({ default: m.Profile })));
const Help = lazy(() => import('./pages/Help').then((m) => ({ default: m.Help })));
const About = lazy(() => import('./pages/About').then((m) => ({ default: m.About })));
const NotFound = lazy(() => import('./pages/NotFound').then((m) => ({ default: m.NotFound })));

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <OfflineBanner />
      <PageContainer>
        <Suspense fallback={<Loading label="Loading page…" />}>
          <Routes>
            <Route path="/" element={<Home />} />
            {/*
              /board and /profile are the two routes that need alliance
              membership (docs/PROJECT_SPECIFICATION.md Section 5.4 / main.tsx's
              routing note). AuthGate shows the sign-in/loading state or the
              existing AllianceJoinScreen in place of the page until the
              signed-in user has an allianceId claim — this was previously
              built but never mounted anywhere, so the join flow was
              unreachable. Home, Help, and About stay ungated so
              they work before a player has joined anything.
            */}
            <Route
              path="/board"
              element={
                <AuthGate>
                  <StatusBoard />
                </AuthGate>
              }
            />
            <Route
              path="/profile"
              element={
                <AuthGate>
                  <Profile />
                </AuthGate>
              }
            />
            <Route path="/help" element={<Help />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </PageContainer>
      <Footer />
    </div>
  );
}
