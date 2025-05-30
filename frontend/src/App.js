import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import TeamList from './components/TeamList';
import TeamRoster from './components/TeamRoster';
import Schedule from './components/Schedule';
import BoxScore from './components/BoxScore';
import Leaders from './components/Leaders';
import GameSlider from './components/GameSlider';
import Footer from './components/Footer';

import './App.css';

const App = () => {
  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        {/* Header with Logo */}
        <nav className="bg-black text-white shadow-md">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-1">
              <img src="/ifnbl-logo.png" alt="IFNBL Logo" className="h-12 w-auto" />
<h1 className="text-2xl font-bold text-white pr-4">IFNBL</h1>
            </Link>
            <ul className="flex space-x-6 text-base">
              <li><Link to="/teams" className="hover:text-green-400">Teams</Link></li>
              <li><Link to="/schedule" className="hover:text-red-500">Schedule</Link></li>
              <li><Link to="/leaders" className="hover:text-blue-400">Leaders</Link></li>
            </ul>
          </div>
        </nav>

        <div className="flex-grow">
          <Routes>
            <Route path="/" element={
              <div className="text-center py-20 px-4">
                <h1 className="text-4xl font-extrabold text-black mb-4">
                  Welcome to IFN Basketball League 🏀
                </h1>
                <p className="text-lg text-gray-700 max-w-xl mx-auto">
                  Check to see scores, schedule, and rosters.
                </p>
                <GameSlider />
              </div>
            } />

            <Route path="/teams" element={<TeamList />} />
            <Route path="/teams/:id/roster" element={<TeamRoster />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/boxscore/week1/:gameId" element={<BoxScore />} />
            <Route path="/leaders" element={<Leaders />} />
          </Routes>
        </div>

        <Footer />
      </div>
    </Router>
  );
};

export default App;
