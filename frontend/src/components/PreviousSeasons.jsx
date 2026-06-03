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
    <div className="min-h-screen bg-[#0f172a] px-4 py-8 text-[#e2e8f0] sm:px-6">
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
                  ? "border-[#38bdf8] bg-[rgba(56,189,248,0.12)] text-[#38bdf8] shadow-sm"
                  : "border-[#334155] bg-[#1e293b] text-[#e2e8f0] shadow-sm hover:border-[#38bdf8]"
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Season nav buttons (only after selecting) */}
      {selectedSeason ? (
        <div className="mx-auto max-w-xl rounded-lg border border-[#334155] bg-[#1e293b] p-6 shadow-sm">
          <h2 className="mb-4 text-center text-xl font-black text-[#e2e8f0]">
            {selectedSeason.toUpperCase()} Navigation
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Link
              to={`/season/${selectedSeason}/teams`}
              className="rounded-lg border border-[#334155] bg-[#0f172a] p-4 text-center font-black text-[#e2e8f0] transition hover:border-[#38bdf8] hover:bg-[rgba(56,189,248,0.08)]"
            >
              Teams / Rosters
            </Link>

            <Link
              to={`/season/${selectedSeason}/schedule`}
              className="rounded-lg border border-[#334155] bg-[#0f172a] p-4 text-center font-black text-[#e2e8f0] transition hover:border-[#38bdf8] hover:bg-[rgba(56,189,248,0.08)]"
            >
              Schedule
            </Link>

            <Link
              to={`/season/${selectedSeason}/leaders`}
              className="rounded-lg border border-[#334155] bg-[#0f172a] p-4 text-center font-black text-[#e2e8f0] transition hover:border-[#38bdf8] hover:bg-[rgba(56,189,248,0.08)]"
            >
              Leaders
            </Link>
          </div>

          <button
            onClick={() => setSelectedSeason(null)}
            className="mt-6 w-full rounded-lg bg-[#0f172a] p-3 font-bold text-[#94a3b8] transition hover:bg-[#334155]"
          >
            Back to season list
          </button>
        </div>
      ) : (
        <p className="text-center font-bold text-[#94a3b8]">
          Pick a season to see options.
        </p>
      )}
    </div>
  );
}
