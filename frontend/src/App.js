// src/App.js
import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import TeamList from './components/TeamList';
import TeamRoster from './components/TeamRoster';
import Schedule from './components/Schedule';
import BoxScore from './components/BoxScore';
import Leaders from './components/Leaders';
import GameSlider from './components/GameSlider';
import TopPerformers from './components/TopPerformers';
import Footer from './components/Footer';
import PlayerPage from "./components/PlayerPage";

import './App.css';

const App = () => {
  return (
    <Router>
      <div className="flex flex-col min-h-screen bg-gray-900 text-white">
        {/* Header with Logo */}
        <nav className="bg-gray-800 shadow-md px-5">
          <div className="w-full flex items-center justify-between py-3">
            <Link to="/" className="flex items-center gap-2">
              <img
                src="/ifnbl-logo.png"
                alt="IFNBL Logo"
                className="h-12 w-auto"
              />
              <h1 className="text-2xl font-bold text-white">IFNBL</h1>
            </Link>

            <ul className="flex space-x-6 text-base">
              <li>
                <Link to="/teams" className="hover:text-green-400">
                  Teams
                </Link>
              </li>
              <li>
                <Link to="/schedule" className="hover:text-red-500">
                  Schedule
                </Link>
              </li>
              <li>
                <Link to="/leaders" className="hover:text-green-400">
                  Leaders
                </Link>
              </li>
            </ul>
          </div>
        </nav>

        <div className="flex-grow">
          <Routes>
            <Route
              path="/"
              element={
                <>
                  <TopPerformers week="week4" />
                  <div className="text-center py-0 px-4">
                    <GameSlider />
                  </div>
                </>
              }
            />

            <Route path="/player/:slug" element={<PlayerPage />} />

            <Route path="/teams" element={<TeamList />} />
            <Route path="/teams/:id/roster" element={<TeamRoster />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/boxscore/:week/:gameId" element={<BoxScore />} />
            <Route path="/leaders" element={<Leaders />} />
          </Routes>
        </div>

        <Footer />
      </div>
    </Router>
  );
};

export default App;
