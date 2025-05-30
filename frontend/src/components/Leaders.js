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
      .slice(0, 10);
  };

  const renderCategory = (label, stat) => (
  <div className="bg-white shadow rounded overflow-hidden px-4 py-4 w-full max-w-md mx-auto">
    <h2 className="text-lg font-semibold mb-3 text-center">{label}</h2>
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-200">
          <tr>
            <th className="p-2">Player</th>
            <th className="p-2 text-right">{label}</th>
          </tr>
        </thead>
        <tbody>
          {getTop(stat).map((p, i) => (
  <tr key={i} className="even:bg-gray-100">
    <td className="p-2">
      <span className="font-bold mr-1">#{i + 1}</span>{p.name}
    </td>
    <td className="p-2 text-right">{p[stat]}</td>
  </tr>
))}

        </tbody>
      </table>
    </div>
  </div>
);


  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-center mb-6">League Leaders</h1>
      <div className="flex flex-col gap-8 items-center">
        {renderCategory('Points', 'points')}
        {renderCategory('3PT Made', 'threes')}
        {renderCategory('Rebounds', 'rebounds')}
      </div>
    </div>
  );
}
