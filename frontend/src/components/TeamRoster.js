import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const teamColors = {
  "Team Flight": "bg-teal-700 text-white",
  "YNS": "bg-purple-900 text-white",
  "UMMA": "bg-yellow-500 text-black",
  "Mambas": "bg-black text-white",
  "Shariah Stepback": "bg-green-900 text-white",
  "Mujahideens": "bg-red-600 text-white",
  "Opium Hoopers": "bg-black text-pink-400",
};

const TeamRoster = () => {
  const { id } = useParams();
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const teamName = decodeURIComponent(id);
  const colorClass = teamColors[teamName] || "bg-black text-pink-500";

  useEffect(() => {
  fetch('/team_rosters.json')
    .then(res => res.json())
    .then(data => {
      setRoster(data[teamName] || []);
      setLoading(false);
    });
}, [teamName]);


  return (
    <div className="p-6">
      <h2 className={`text-3xl font-bold text-center mb-6 p-4 rounded ${colorClass}`}>
        {teamName} Roster
      </h2>

      {loading ? (
        <p className="text-center text-gray-600">Loading...</p>
      ) : (
        <div className="max-w-xl mx-auto space-y-4">
          {roster.length === 0 ? (
            <p className="text-center text-red-500">No players found.</p>
          ) : (
            roster.map((player, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl shadow p-4 flex justify-between items-center"
              >
                <span className="font-semibold text-gray-800">{player.name}</span>
                <span className="text-gray-600">#{player.number}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default TeamRoster;
