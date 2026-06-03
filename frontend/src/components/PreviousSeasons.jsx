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
    <div className="min-h-screen bg-[#f8fafc] px-4 py-8 text-[#0f172a] sm:px-6">
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
                  ? "border-[#0284c7] bg-[rgba(56,189,248,0.12)] text-[#0284c7] shadow-sm"
                  : "border-[#e2e8f0] bg-[#ffffff] text-[#0f172a] shadow-sm hover:border-[#0284c7]"
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Season nav buttons (only after selecting) */}
      {selectedSeason ? (
        <div className="mx-auto max-w-xl rounded-lg border border-[#e2e8f0] bg-[#ffffff] p-6 shadow-sm">
          <h2 className="mb-4 text-center text-xl font-black text-[#0f172a]">
            {selectedSeason.toUpperCase()} Navigation
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Link
              to={`/season/${selectedSeason}/teams`}
              className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4 text-center font-black text-[#0f172a] transition hover:border-[#0284c7] hover:bg-[rgba(56,189,248,0.08)]"
            >
              Teams / Rosters
            </Link>

            <Link
              to={`/season/${selectedSeason}/schedule`}
              className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4 text-center font-black text-[#0f172a] transition hover:border-[#0284c7] hover:bg-[rgba(56,189,248,0.08)]"
            >
              Schedule
            </Link>

            <Link
              to={`/season/${selectedSeason}/leaders`}
              className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4 text-center font-black text-[#0f172a] transition hover:border-[#0284c7] hover:bg-[rgba(56,189,248,0.08)]"
            >
              Leaders
            </Link>
          </div>

          <button
            onClick={() => setSelectedSeason(null)}
            className="mt-6 w-full rounded-lg bg-[#f8fafc] p-3 font-bold text-[#64748b] transition hover:bg-[#0f172a]"
          >
            Back to season list
          </button>
        </div>
      ) : (
        <p className="text-center font-bold text-[#64748b]">
          Pick a season to see options.
        </p>
      )}
    </div>
  );
}
