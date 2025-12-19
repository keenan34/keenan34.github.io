// src/components/PreviousSeasons.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";

export default function PreviousSeasons() {
  const [selectedSeason, setSelectedSeason] = useState(null);

  const seasons = [
    { id: "szn3", label: "Season 3" },
    // add more later:
    // { id: "szn2", label: "Season 2" },
  ];

  return (
    <div className="min-h-screen bg-gray-900 p-6 text-white">
      <h1 className="text-3xl font-bold text-center mb-8">Previous Seasons</h1>

      {/* Season selector */}
      <div className="max-w-xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {seasons.map((s) => {
          const active = selectedSeason === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setSelectedSeason(s.id)}
              className={`rounded-lg p-4 font-semibold transition border ${
                active
                  ? "bg-gray-700 border-green-400"
                  : "bg-gray-800 border-gray-700 hover:bg-gray-700"
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Season nav buttons (only after selecting) */}
      {selectedSeason ? (
        <div className="max-w-xl mx-auto bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-bold text-center mb-4">
            {selectedSeason.toUpperCase()} Navigation
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              to={`/season/${selectedSeason}/teams`}
              className="text-center bg-gray-900 hover:bg-gray-700 transition rounded-lg p-4 font-semibold"
            >
              Teams / Rosters
            </Link>

            <Link
              to={`/season/${selectedSeason}/schedule`}
              className="text-center bg-gray-900 hover:bg-gray-700 transition rounded-lg p-4 font-semibold"
            >
              Schedule
            </Link>

            <Link
              to={`/season/${selectedSeason}/leaders`}
              className="text-center bg-gray-900 hover:bg-gray-700 transition rounded-lg p-4 font-semibold"
            >
              Leaders
            </Link>
          </div>

          <button
            onClick={() => setSelectedSeason(null)}
            className="mt-6 w-full bg-gray-900 hover:bg-gray-700 transition rounded-lg p-3 text-gray-200"
          >
            ← Back to season list
          </button>
        </div>
      ) : (
        <p className="text-center text-gray-400">
          Pick a season to see options.
        </p>
      )}
    </div>
  );
}
