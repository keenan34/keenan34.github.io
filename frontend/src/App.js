// File: src/App.js
import React, { useMemo } from "react";
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

import "./App.css";

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

  // supports: /season/szn3/... or default current season
  const match = pathname.match(/^\/season\/([^/]+)/);
  return match?.[1] || "szn4";
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

function AppShell() {
  const activeSeason = useActiveSeason();

  // pick a theme per season
  const themeClass = useMemo(() => {
    if (activeSeason === "szn3") return "theme-szn3";
    return "theme-szn4";
  }, [activeSeason]);

  return (
    <div className={`app-shell ${themeClass}`}>
      <HeaderNav />

      <main className="app-main">
        <Routes>
          {/* HOME */}
          <Route
            path="/"
            element={
              <>
                <TopPerformers week="week3" />
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

      <Footer />
    </div>
  );
}

const App = () => (
  <Router>
    <AppShell />
  </Router>
);

export default App;
