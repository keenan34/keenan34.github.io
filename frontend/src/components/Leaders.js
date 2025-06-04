// src/components/Leaders.jsx
import { useEffect, useState } from 'react';

export default function Leaders() {
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    // Fetch both week JSONs in parallel
    Promise.all([fetch('/week1.json'), fetch('/week2.json')])
      .then(async ([res1, res2]) => {
        if (!res1.ok) throw new Error('Could not load /week1.json');
        if (!res2.ok) throw new Error('Could not load /week2.json');
        const data1 = await res1.json();
        const data2 = await res2.json();

        // 1) Accumulate totals + game count per player
        const playerMap = {};
        const extractWeek = (weekJson) => {
          Object.values(weekJson).forEach((game) => {
            ['teamA', 'teamB'].forEach((side) => {
              game[side].players.forEach((p) => {
                if (!p.Player) return;
                const name      = p.Player;
                const pts       = Number(p.Points     || 0);
                const threes    = Number(p['3 PTM']   || 0);
                const rebounds  = Number(p.REB        || 0);
                const turnovers = Number(p.TOs        || 0);
                const fouls     = Number(p.Fouls      || 0);
                const stlBlk    = Number(p['STLS/BLKS'] || 0);

                if (!playerMap[name]) {
                  playerMap[name] = {
                    name,
                    totalPts:    pts,
                    total3:      threes,
                    totalReb:    rebounds,
                    totalTO:     turnovers,
                    totalFouls:  fouls,
                    totalStlBlk: stlBlk,
                    games:       1,
                  };
                } else {
                  playerMap[name].totalPts    += pts;
                  playerMap[name].total3      += threes;
                  playerMap[name].totalReb    += rebounds;
                  playerMap[name].totalTO     += turnovers;
                  playerMap[name].totalFouls  += fouls;
                  playerMap[name].totalStlBlk += stlBlk;
                  playerMap[name].games       += 1;
                }
              });
            });
          });
        };

        extractWeek(data1);
        extractWeek(data2);

        // 2) Convert map → array, computing per‐game averages
        const arrayWithAverages = Object.values(playerMap).map((p) => {
          const g = p.games || 1;
          return {
            name:       p.name,
            /* Totals */
            totalPts:    p.totalPts,
            total3:      p.total3,
            totalReb:    p.totalReb,
            totalTO:     p.totalTO,
            totalFouls:  p.totalFouls,
            totalStlBlk: p.totalStlBlk,
            /* Averages (one decimal) */
            avgPts:      Number((p.totalPts    / g).toFixed(1)),
            avg3:        Number((p.total3      / g).toFixed(1)),
            avgReb:      Number((p.totalReb    / g).toFixed(1)),
            avgTO:       Number((p.totalTO     / g).toFixed(1)),
            avgFouls:    Number((p.totalFouls  / g).toFixed(1)),
            avgStlBlk:   Number((p.totalStlBlk / g).toFixed(1)),
          };
        });

        setPlayers(arrayWithAverages);
      })
      .catch((err) => {
        console.error('Error loading leader data:', err);
        setPlayers([]);
      });
  }, []);

  // 3) Top 10 by averageKey (descending)
  const getTopByAverage = (avgKey) =>
    [...players]
      .sort((a, b) => b[avgKey] - a[avgKey])
      .slice(0, 10);

  /**
   * Renders one leaderboard card with:
   *  - Header (white)
   *  - Data table on light gray
   *  - Rank + name in bold, all numbers bold
   *  - AVG column width reduced (w-16) to shift left
   *
   * Props:
   *   label:      e.g. "Points"
   *   avgKey:     e.g. "avgPts"
   *   totalKey:   e.g. "totalPts"
   *   avgLabel:   e.g. "PTS/G"
   *   totalLabel: e.g. "PTS"
   */
  const renderCategory = ({
    label,
    avgKey,
    totalKey,
    avgLabel,
    totalLabel,
  }) => {
    const top10 = getTopByAverage(avgKey);

    return (
      <div className="w-full max-w-md mx-auto rounded-lg overflow-hidden shadow-md">
        {/* Card header stays white */}
        <div className="bg-white py-3">
          <h2 className="text-center text-lg font-semibold">{label}</h2>
        </div>

        {/* Data table on a light gray background */}
        <div className="bg-gray-100 p-2 rounded-b-lg">
          <table className="w-full text-sm table-fixed">
            <thead className="bg-gray-200">
              <tr>
                <th className="p-2 text-left">Player</th>
                {/* AVG column at w-16 instead of w-20 */}
                <th className="p-2 text-right w-16">{avgLabel}</th>
                {/* TOTAL remains w-20 */}
                <th className="p-2 text-right w-20">{totalLabel}</th>
              </tr>
            </thead>
            <tbody>
              {top10.map((p, idx) => (
                <tr
                  key={p.name}
                  className={idx % 2 === 1 ? 'bg-gray-50' : ''}
                >
                  <td className="p-2">
                    {/* Rank + name bold */}
                    <span className="font-bold mr-1">#{idx + 1}</span>
                    <span className="font-bold">{p.name}</span>
                  </td>
                  {/* AVG column: text-xl, bold, fixed w-16 */}
                  <td className="p-2 text-right w-16">
                    <span className="text-xl font-bold">{p[avgKey]}</span>
                  </td>
                  {/* TOTAL column: bold, fixed w-20 */}
                  <td className="p-2 text-right w-20">
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
    return <p className="text-center py-6 text-gray-500">Loading leaders…</p>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <h1 className="text-2xl font-bold text-center mb-6">League Leaders</h1>
      <div className="flex flex-col gap-8 items-center">
        {renderCategory({
          label:      'Points',
          avgKey:     'avgPts',
          totalKey:   'totalPts',
          avgLabel:   'PTS/G',
          totalLabel: 'PTS',
        })}
        {renderCategory({
          label:      '3PT Made',
          avgKey:     'avg3',
          totalKey:   'total3',
          avgLabel:   '3PT/G',
          totalLabel: '3PT',
        })}
        {renderCategory({
          label:      'Rebounds',
          avgKey:     'avgReb',
          totalKey:   'totalReb',
          avgLabel:   'REB/G',
          totalLabel: 'REB',
        })}
        {renderCategory({
          label:      'STLS/BLKS',
          avgKey:     'avgStlBlk',
          totalKey:   'totalStlBlk',
          avgLabel:   'STL/BLK /G',
          totalLabel: 'STL/BLK',
        })}
        {renderCategory({
          label:      'Turnovers',
          avgKey:     'avgTO',
          totalKey:   'totalTO',
          avgLabel:   'TO/G',
          totalLabel: 'TO',
        })}
        {renderCategory({
          label:      'Fouls',
          avgKey:     'avgFouls',
          totalKey:   'totalFouls',
          avgLabel:   'FLS/G',
          totalLabel: 'FLS',
        })}
      </div>
    </div>
  );
}
