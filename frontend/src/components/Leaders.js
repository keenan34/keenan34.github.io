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
      .slice(0, 5); // top 5
  };

  const renderCategory = (label, stat) => (
    <div className="mb-6">
      <h2 className="text-xl font-bold mb-2">{label}</h2>
      <table className="min-w-full text-sm text-left border">
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
      <h1 className="text-2xl font-bold mb-4">League Leaders</h1>
      {renderCategory('Points', 'points')}
      {renderCategory('3PT Made', 'threes')}
      {renderCategory('Rebounds', 'rebounds')}
    </div>
  );
}
