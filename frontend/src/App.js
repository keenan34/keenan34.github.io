import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import TeamList from './components/TeamList';
import TeamRoster from './components/TeamRoster';
import Schedule from './components/Schedule';
import BoxScore from './components/BoxScore';
import Leaders from './components/Leaders';
import './App.css';

const App = () => {
  return (
    <Router>
      <div>
        {/* Header with Logo */}
        <nav className="bg-black text-white shadow-md">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src="/ifnbl-logo.png" alt="IFNBL Logo" className="h-12 w-auto" />
              <h1 className="text-2xl font-bold text-white">IFNBL</h1>
            </div>
            <ul className="flex space-x-6 text-lg">
              <li><Link to="/" className="hover:text-red-500">Home</Link></li>
              <li><Link to="/teams" className="hover:text-green-400">Teams</Link></li>
              <li><Link to="/schedule" className="hover:text-red-500">Schedule</Link></li>
              <li><Link to="/leaders" className="hover:text-blue-400">Leaders</Link></li>
            </ul>
          </div>
        </nav>

        <Routes>
          <Route path="/" element={
            <div className="text-center py-20 px-4">
              <h1 className="text-4xl font-extrabold text-black mb-4">
                Welcome to IFN Basketball League 🏀
              </h1>
              <p className="text-lg text-gray-700 max-w-xl mx-auto">
                Check to see scores, schedule, and rosters.
              </p>
            </div>
          } />

          <Route path="/teams" element={<TeamList />} />
          <Route path="/teams/:id/roster" element={<TeamRoster />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/boxscore/week1/:gameId" element={<BoxScore />} />
          <Route path="/leaders" element={<Leaders />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
