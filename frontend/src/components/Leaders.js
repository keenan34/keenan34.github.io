import { useEffect, useState } from 'react';

export default function Leaders() {
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    fetch('/week1.json')
      .then(res => res.json())
      .then(json => {
        const allPlayers = [];

        Object.values(json).forEach(game => {
          [game.teamA, game.teamB].forEach(team => {
            team.players.forEach(player => {
              if (player.Player && player.Points != null) {
                allPlayers.push({
                  name: player.Player,
                  points: player.Points || 0,
                  threes: player["3 PTM"] || 0,
                  rebounds: player.REB || 0,
                });
              }
            });
          });
        });

        setPlayers(allPlayers);
      });
  }, []);

  const getTop = (stat) => {
    return [...players]
      .sort((a, b) => b[stat] - a[stat])
      .slice(0, 10); // top 10
  };

  const renderCategory = (label, stat) => (
    <div className="bg-white shadow rounded overflow-hidden">
      <h2 className="text-lg font-semibold px-4 pt-4">{label}</h2>
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-200">
          <tr>
            <th className="p-2">Player</th>
            <th className="p-2">{label}</th>
          </tr>
        </thead>
        <tbody>
          {getTop(stat).map((p, i) => (
            <tr key={i} className="even:bg-gray-100">
              <td className="p-2">{p.name}</td>
              <td className="p-2">{p[stat]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">League Leaders</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {renderCategory('Points', 'points')}
        {renderCategory('3PT Made', 'threes')}
        {renderCategory('Rebounds', 'rebounds')}
      </div>
    </div>
  );
}
