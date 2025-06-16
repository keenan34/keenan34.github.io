// src/components/Leaders.jsx
import { useEffect, useState } from 'react';

// Utility: slugify name to match image filenames in public/images/players
const slugify = (str) =>
  str
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');

// Base URL for public assets
const PUBLIC_URL = process.env.PUBLIC_URL || '';

// ProfileImage: tries to load PNG by slug; on failure, shows initials
function ProfileImage({ name }) {
  const [error, setError] = useState(false);
  const slug = slugify(name);
  const src = `${PUBLIC_URL}/images/players/${slug}.png`;
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('');

  if (error) {
    return (
      <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-200 mr-2">
        {initials}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      width="32"
      height="32"
      className="h-8 w-8 flex-shrink-0 rounded-full object-cover mr-2"
      onError={() => setError(true)}
    />
  );
}

export default function Leaders() {
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    Promise.all([fetch('/week1.json'), fetch('/week2.json')])
      .then(async ([res1, res2]) => {
        if (!res1.ok) throw new Error('Could not load /week1.json');
        if (!res2.ok) throw new Error('Could not load /week2.json');
        const data1 = await res1.json();
        const data2 = await res2.json();

        const playerMap = {};
        const extractWeek = (weekJson) => {
          Object.values(weekJson).forEach((game) => {
            ['teamA', 'teamB'].forEach((side) => {
              game[side].players.forEach((p) => {
                if (!p.Player) return;
                const name = p.Player;
                const pts = Number(p.Points || 0);
                const threes = Number(p['3 PTM'] || 0);
                const rebounds = Number(p.REB || 0);
                const turnovers = Number(p.TOs || 0);
                const fouls = Number(p.Fouls || 0);
                const stlBlk = Number(p['STLS/BLKS'] || 0);

                if (!playerMap[name]) {
                  playerMap[name] = {
                    name,
                    totalPts: pts,
                    total3: threes,
                    totalReb: rebounds,
                    totalTO: turnovers,
                    totalFouls: fouls,
                    totalStlBlk: stlBlk,
                    games: 1,
                  };
                } else {
                  playerMap[name].totalPts += pts;
                  playerMap[name].total3 += threes;
                  playerMap[name].totalReb += rebounds;
                  playerMap[name].totalTO += turnovers;
                  playerMap[name].totalFouls += fouls;
                  playerMap[name].totalStlBlk += stlBlk;
                  playerMap[name].games += 1;
                }
              });
            });
          });
        };

        extractWeek(data1);
        extractWeek(data2);

        const arrayWithAverages = Object.values(playerMap).map((p) => {
          const g = p.games || 1;
          return {
            name: p.name,
            totalPts: p.totalPts,
            total3: p.total3,
            totalReb: p.totalReb,
            totalTO: p.totalTO,
            totalFouls: p.totalFouls,
            totalStlBlk: p.totalStlBlk,
            avgPts: Number((p.totalPts / g).toFixed(1)),
            avg3: Number((p.total3 / g).toFixed(1)),
            avgReb: Number((p.totalReb / g).toFixed(1)),
            avgTO: Number((p.totalTO / g).toFixed(1)),
            avgFouls: Number((p.totalFouls / g).toFixed(1)),
            avgStlBlk: Number((p.totalStlBlk / g).toFixed(1)),
          };
        });

        setPlayers(arrayWithAverages);
      })
      .catch((err) => {
        console.error('Error loading leader data:', err);
        setPlayers([]);
      });
  }, []);

  const getTopByAverage = (avgKey) =>
    [...players].sort((a, b) => b[avgKey] - a[avgKey]).slice(0, 10);

  const renderCategory = ({ label, avgKey, totalKey, avgLabel, totalLabel }) => {
    const top10 = getTopByAverage(avgKey);

    return (
      <div className="w-full max-w-md mx-auto rounded-lg overflow-hidden shadow-lg bg-gray-800">
        <div className="bg-gray-900 py-3">
          <h2 className="text-center text-lg font-semibold text-white">{label}</h2>
        </div>
        <div className="bg-gray-700 p-2 rounded-b-lg">
          <table className="w-full text-sm table-fixed">
            <thead className="bg-gray-600">
              <tr>
                <th className="p-2 text-left text-gray-200">Player</th>
                <th className="p-2 text-right w-16 text-gray-200">{avgLabel}</th>
                <th className="p-2 text-right w-20 text-gray-200">{totalLabel}</th>
              </tr>
            </thead>
            <tbody>
              {top10.map((p, idx) => (
                <tr key={p.name} className={idx % 2 === 1 ? 'bg-gray-700' : 'bg-gray-800'}>
                  <td className="p-2 flex items-center whitespace-nowrap text-white">
                    <ProfileImage name={p.name} />
                    <span className="font-bold mr-1">#{idx + 1}</span>
                    <span className="font-bold">{p.name}</span>
                  </td>
                  <td className="p-2 text-right w-16 text-white">
                    <span className="text-xl font-bold">{p[avgKey]}</span>
                  </td>
                  <td className="p-2 text-right w-20 text-white">
                    <span className="font-bold">{p[totalKey]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (players.length === 0) {
    return <p className="text-center py-6 text-gray-400">Loading leaders…</p>;
  }

  return (
    <div className="bg-gray-900 p-4">
      <h1 className="text-2xl font-bold text-center mb-6 text-white">League Leaders</h1>
      <div className="flex flex-col gap-8 items-center">
        {renderCategory({ label: 'Points', avgKey: 'avgPts', totalKey: 'totalPts', avgLabel: 'PTS/G', totalLabel: 'PTS' })}
        {renderCategory({ label: '3PT Made', avgKey: 'avg3', totalKey: 'total3', avgLabel: '3PT/G', totalLabel: '3PT' })}
        {renderCategory({ label: 'Rebounds', avgKey: 'avgReb', totalKey: 'totalReb', avgLabel: 'REB/G', totalLabel: 'REB' })}
        {renderCategory({ label: 'STLS/BLKS', avgKey: 'avgStlBlk', totalKey: 'totalStlBlk', avgLabel: 'STL/BLK/G', totalLabel: 'STL/BLK' })}
        {renderCategory({ label: 'Turnovers', avgKey: 'avgTO', totalKey: 'totalTO', avgLabel: 'TO/G', totalLabel: 'TO' })}
        {renderCategory({ label: 'Fouls', avgKey: 'avgFouls', totalKey: 'totalFouls', avgLabel: 'FLS/G', totalLabel: 'FLS' })}
      </div>
    </div>
  );
}
