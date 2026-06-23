// File: src/App.js
import React, { useEffect, useMemo } from "react";
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

function NavLink({ to, children, active }) {
  return (
    <Link to={to} className={"site-nav-link " + (active ? "is-active" : "")}>
      {children}
    </Link>
  );
}

function useActiveSeason() {
  const { pathname } = useLocation();

  const match = pathname.match(/^\/season\/([^/]+)/);
  return match?.[1] || "szn5";
}

function HeaderNav() {
  const { pathname } = useLocation();
  const isActive = (path) =>
    pathname === path || pathname.startsWith(path + "/");

  return (
    <nav className="site-nav">
      <div className="site-nav-inner">
        <Link to="/" className="site-brand">
          <img src="/ifnbl-logo.png" alt="IFNBL Logo" className="site-logo" />
          <h1 className="site-title">IFNBL</h1>
        </Link>

        {/* Mobile friendly scroll */}
        <div className="site-nav-scroll">
          <div className="site-nav-links">
            <NavLink to="/teams" active={isActive("/teams")}>
              Teams
            </NavLink>
            <NavLink to="/schedule" active={isActive("/schedule")}>
              Schedule
            </NavLink>
            <NavLink to="/leaders" active={isActive("/leaders")}>
              Leaders
            </NavLink>
            <NavLink
              to="/previous-seasons"
              active={isActive("/previous-seasons")}
            >
              Previous Seasons
            </NavLink>
          </div>
        </div>
      </div>
    </nav>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    // Stop the browser from restoring the previous page's scroll position.
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    const toTop = () => {
      window.scrollTo(0, 0);
      if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    // Fire immediately, after paint, and after async content has had a beat to
    // lay out — covers SPA navigation, scroll anchoring, and iOS restoration.
    toTop();
    const raf = requestAnimationFrame(toTop);
    const t1 = setTimeout(toTop, 0);
    const t2 = setTimeout(toTop, 120);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [pathname]);
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
      {!isAdminRoute && <HeaderNav />}

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
