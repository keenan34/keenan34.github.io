// File: src/App.js
import React, { memo, useEffect, useMemo, useState } from "react";
import {
  HashRouter as Router,
  Routes,
  Route,
  Link,
  Navigate,
  useParams,
  useLocation,
} from "react-router-dom";

import TeamList from "./components/TeamList";
import TeamRoster from "./components/TeamRoster";
import Schedule from "./components/Schedule";
import BoxScore from "./components/BoxScore";
import Leaders from "./components/Leaders";
import GameSlider from "./components/GameSlider";
import TopPerformers from "./components/TopPerformers";
import PlayerPage from "./components/PlayerPage";
import Footer from "./components/Footer";
import PreviousSeasons from "./components/PreviousSeasons";
import LeaguePreviewCard from "./components/LeaguePreviewCard";
import AdminLogin from "./admin/AdminLogin";
import AdminGames from "./admin/AdminGames";
import AdminLiveGame from "./admin/AdminLiveGame";
import AdminRoster from "./admin/AdminRoster";

import "./App.css";
import "./admin/Admin.css";

function SeasonRootRedirect() {
  const { season } = useParams();
  return <Navigate to={`/season/${season}/teams`} replace />;
}

function NavLink({ to, children }) {
  return (
    <Link to={to} className="site-nav-link">
      {children}
    </Link>
  );
}

function useActiveSeason() {
  const { pathname } = useLocation();

  const match = pathname.match(/^\/season\/([^/]+)/);
  return match?.[1] || "szn5";
}

const HeaderNav = memo(function HeaderNav({ season }) {
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <>
      <nav className="site-nav">
        <div className="site-nav-inner">
          <Link to="/" className="site-brand">
            <img src="/ifnbl-logo.png" alt="IFNBL Logo" className="site-logo" />
            <h1 className="site-title">IFNBL</h1>
          </Link>

          {/* Mobile friendly scroll */}
          <div className="site-nav-scroll">
            <div className="site-nav-links">
              <NavLink to="/teams">Teams</NavLink>
              <NavLink to="/schedule">Schedule</NavLink>
              <NavLink to="/leaders">Leaders</NavLink>
              <NavLink to="/previous-seasons">
                Previous Seasons
              </NavLink>
            </div>
          </div>

          <button
            type="button"
            className="site-share-button"
            aria-label="Share IFNBL"
            title="Share IFNBL"
            onClick={() => setPreviewOpen(true)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4" />
            </svg>
          </button>
        </div>
      </nav>

      {previewOpen && (
        <LeaguePreviewCard
          season={season}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </>
  );
});

function ScrollToTop() {
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);
  return null;
}

function AppShell() {
  const activeSeason = useActiveSeason();
  const { pathname } = useLocation();
  const isAdminRoute = pathname.startsWith("/admin");

  const themeClass = useMemo(() => {
    if (activeSeason === "szn3") return "theme-szn3";
    if (activeSeason === "szn5") return "theme-szn5";
    return "theme-szn4";
  }, [activeSeason]);

  return (
    <div className={`app-shell ${themeClass} ${isAdminRoute ? "is-admin" : "is-public"}`}>
      <ScrollToTop />
      {!isAdminRoute && <HeaderNav season={activeSeason} />}

      <main className="app-main">
        <Routes>
          {/* ADMIN */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/games" element={<AdminGames />} />
          <Route path="/admin/games/:gameId/live" element={<AdminLiveGame />} />
          <Route path="/admin/roster" element={<AdminRoster />} />

          {/* HOME */}
          <Route
            path="/"
            element={
              <>
                <TopPerformers />
                <div className="text-center px-4">
                  <GameSlider />
                </div>
              </>
            }
          />

          <Route path="/previous-seasons" element={<PreviousSeasons />} />

          {/* CURRENT SEASON */}
          <Route path="/teams" element={<TeamList />} />
          <Route path="/teams/:id/roster" element={<TeamRoster />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/leaders" element={<Leaders />} />
          <Route path="/player/:slug" element={<PlayerPage />} />
          <Route path="/boxscore/:week/:gameId" element={<BoxScore />} />

          {/* SEASON-AWARE */}
          <Route path="/season/:season/teams" element={<TeamList />} />
          <Route
            path="/season/:season/teams/:id/roster"
            element={<TeamRoster />}
          />
          <Route path="/season/:season/schedule" element={<Schedule />} />
          <Route path="/season/:season/leaders" element={<Leaders />} />
          <Route path="/season/:season/player/:slug" element={<PlayerPage />} />
          <Route
            path="/season/:season/boxscore/:week/:gameId"
            element={<BoxScore />}
          />

          <Route path="/season/:season" element={<SeasonRootRedirect />} />
        </Routes>
      </main>

      {!isAdminRoute && <Footer />}
    </div>
  );
}

const App = () => (
  <Router>
    <AppShell />
  </Router>
);

export default App;
