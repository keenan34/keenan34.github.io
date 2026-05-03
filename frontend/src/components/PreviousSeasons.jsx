// src/components/PreviousSeasons.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";

export default function PreviousSeasons() {
  const [selectedSeason, setSelectedSeason] = useState(null);

  const seasons = [
    { id: "szn3", label: "Season 3" },
    { id: "szn4", label: "Season 4" }
    // add more later:
    // { id: "szn2", label: "Season 2" },
  ];

  return (
    <div className="min-h-screen bg-[#f6f8fb] px-4 py-8 text-slate-950 sm:px-6">
      <h1 className="mb-8 text-center text-3xl font-black tracking-tight sm:text-4xl">
        Previous Seasons
      </h1>

      {/* Season selector */}
      <div className="mx-auto mb-8 grid max-w-xl grid-cols-1 gap-4 sm:grid-cols-2">
        {seasons.map((s) => {
          const active = selectedSeason === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setSelectedSeason(s.id)}
              className={`rounded-lg border p-4 font-black transition ${
                active
                  ? "border-blue-300 bg-blue-50 text-blue-700 shadow-sm"
                  : "border-slate-200 bg-white text-slate-800 shadow-sm hover:border-blue-200"
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Season nav buttons (only after selecting) */}
      {selectedSeason ? (
        <div className="mx-auto max-w-xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-center text-xl font-black text-slate-950">
            {selectedSeason.toUpperCase()} Navigation
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Link
              to={`/season/${selectedSeason}/teams`}
              className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center font-black text-slate-900 transition hover:border-blue-300 hover:bg-blue-50"
            >
              Teams / Rosters
            </Link>

            <Link
              to={`/season/${selectedSeason}/schedule`}
              className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center font-black text-slate-900 transition hover:border-blue-300 hover:bg-blue-50"
            >
              Schedule
            </Link>

            <Link
              to={`/season/${selectedSeason}/leaders`}
              className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center font-black text-slate-900 transition hover:border-blue-300 hover:bg-blue-50"
            >
              Leaders
            </Link>
          </div>

          <button
            onClick={() => setSelectedSeason(null)}
            className="mt-6 w-full rounded-lg bg-slate-100 p-3 font-bold text-slate-700 transition hover:bg-slate-200"
          >
            Back to season list
          </button>
        </div>
      ) : (
        <p className="text-center font-bold text-slate-500">
          Pick a season to see options.
        </p>
      )}
    </div>
  );
}
