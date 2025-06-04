import { useEffect, useState } from 'react';

export default function Leaders() {
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    Promise.all([fetch('/week1.json'), fetch('/week2.json')])
      .then(async ([res1, res2]) => {
        if (!res1.ok) throw new Error('Could not load /week1.json');
        if (!res2.ok) throw new Error('Could not load /week2.json');
        const data1 = await res1.json();
        const data2 = await res2.json();

        // Map to accumulate stats per player
        const playerMap = {};

        const extract = (weekJson) => {
          Object.values(weekJson).forEach((game) => {
            [game.teamA, game.teamB].forEach((team) => {
              team.players.forEach((p) => {
                if (!p.Player) return;
                const name = p.Player;
                const points = p.Points || 0;
                const threes = p['3 PTM'] || 0;
                const rebounds = p.REB || 0;
                const turnovers = p.TOs || 0;

                if (!playerMap[name]) {
                  playerMap[name] = {
                    name,
                    points,
                    threes,
                    rebounds,
                    turnovers,
                  };
                } else {
                  playerMap[name].points += points;
                  playerMap[name].threes += threes;
                  playerMap[name].rebounds += rebounds;
                  playerMap[name].turnovers += turnovers;
                }
              });
            });
          });
        };

        extract(data1);
        extract(data2);

        setPlayers(Object.values(playerMap));
      })
      .catch((err) => {
        console.error(err);
        setPlayers([]);
      });
  }, []);

  const getTop = (stat) =>
    [...players]
      .sort((a, b) => b[stat] - a[stat])
      .slice(0, 10);

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

  if (players.length === 0) {
    return <p className="p-4 text-center text-gray-500">Loading leaders…</p>;
  }

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-center mb-6">League Leaders</h1>
      <div className="flex flex-col gap-8 items-center">
        {renderCategory('Points', 'points')}
        {renderCategory('3PT Made', 'threes')}
        {renderCategory('Rebounds', 'rebounds')}
        {renderCategory('Turnovers', 'turnovers')}
      </div>
    </div>
  );
}
