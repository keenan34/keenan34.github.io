import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const TeamRoster = () => {
  const { id } = useParams(); // URL param, like 'Mambas' or 'YNS'
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/team_rosters.json')
      .then(res => res.json())
      .then(data => {
        const teamName = decodeURIComponent(id); // for names like Shariah%20Stepback
        setRoster(data[teamName] || []);
        setLoading(false);
      });
  }, [id]);

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold text-center mb-6 text-black">{decodeURIComponent(id)} Roster</h2>

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
