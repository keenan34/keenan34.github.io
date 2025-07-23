// File: src/App.js
import React from 'react';
import { HashRouter as Router, Routes, Route, Link } from 'react-router-dom';
import TeamList     from './components/TeamList';
import TeamRoster   from './components/TeamRoster';
import Schedule     from './components/Schedule';
import BoxScore     from './components/BoxScore';
import Leaders      from './components/Leaders';
import GameSlider   from './components/GameSlider';
import TopPerformers from './components/TopPerformers';
import PlayerPage   from './components/PlayerPage';
import Footer       from './components/Footer';

import './App.css';

const App = () => (
  <Router>
    <div className="flex flex-col min-h-screen bg-gray-900 text-white">
      {/* Header with Logo and Nav Links */}
      <nav className="bg-gray-800 shadow-md px-5">
        <div className="flex items-center justify-between py-3">
          <Link to="/" className="flex items-center gap-2">
            <img src="/ifnbl-logo.png" alt="IFNBL Logo" className="h-12 w-auto" />
            <h1 className="text-2xl font-bold text-white">IFNBL</h1>
          </Link>
          <ul className="flex space-x-6 text-base">
            <li><Link to="/teams"   className="hover:text-green-400">Teams</Link></li>
            <li><Link to="/schedule" className="hover:text-red-500">Schedule</Link></li>
            <li><Link to="/leaders"  className="hover:text-green-400">Leaders</Link></li>
          </ul>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-grow">
        <Routes>
          {/* Home: Top Performers + Slider */}
          <Route
            path="/"
            element={
              <>
                <TopPerformers week="week7" />
                <div className="text-center px-4">
                  <GameSlider />
                </div>
              </>
            }
          />

          {/* Player profile page */}
          <Route path="/player/:slug" element={<PlayerPage />} />

          {/* Other pages */}
          <Route path="/teams"               element={<TeamList />} />
          <Route path="/teams/:id/roster"    element={<TeamRoster />} />
          <Route path="/schedule"            element={<Schedule />} />
          <Route path="/boxscore/:week/:gameId" element={<BoxScore />} />
          <Route path="/leaders"             element={<Leaders />} />
        </Routes>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  </Router>
);

export default App;
