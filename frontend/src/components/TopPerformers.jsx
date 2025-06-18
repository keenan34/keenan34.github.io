import { useEffect, useState } from 'react';

function ProfileImage({ name }) {
  const [error, setError] = useState(false);
  const initials = name.split(' ').map(n => n[0]).join('');
  const src = `/images/players/${name.toLowerCase().replace(/\s+/g, '_')}.png`;

  if (!src || error) {
    return (
      <div className="h-10 w-10 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-200">
        {initials}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      onError={() => setError(true)}
      className="h-10 w-10 rounded-full object-cover"
    />
  );
}

export default function TopPerformers({ week = 'week3' }) {
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    fetch(`/${week}.json`)
      .then(res => res.json())
      .then(json => {
        const all = [];
  
        Object.values(json).forEach(game => {
          const teamAName = game.teamA?.name || '';
          const teamBName = game.teamB?.name || '';
  
          game.teamA?.players?.forEach(player => {
            all.push({ ...player, opponent: teamBName });
          });
  
          game.teamB?.players?.forEach(player => {
            all.push({ ...player, opponent: teamAName });
          });
        });
  
        setPlayers(all);
      })
      .catch(() => setPlayers([]));
  }, [week]);
  

  if (!players.length) return null;

  const topScorer = players.reduce((best, p) => p.Points > (best.Points || 0) ? p : best, {});
  const topRebounder = players.reduce((best, p) => p.REB > (best.REB || 0) ? p : best, {});
  const topStlBlk = players.reduce((best, p) => p['STLS/BLKS'] > ((best['STLS/BLKS']) || 0) ? p : best, {});

  return (
    <div className="p-4 bg-gray-900 rounded-lg mb-1">
      <h2 className="text-xl font-bold text-white mb-4">Top Performers ({week.replace('week', 'Week ')})</h2>
      <div className="flex flex-col gap-2">
        {[
          { label: 'Scoring Leader', stat: 'Points', player: topScorer },
          { label: 'Rebound Leader', stat: 'REB', player: topRebounder },
          { label: 'STL/BLK Leader', stat: 'STLS/BLKS', player: topStlBlk }
        ].map(({ label, stat, player }) => (
          <div key={stat} className="bg-gray-800 p-4 rounded-lg flex items-center">
            <ProfileImage name={player.Player} />
            <div className="ml-3">
              <div className="text-sm text-gray-400">{label}</div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="text-lg font-semibold text-white">{player.Player}</div>
                <div className="text-xs italic text-gray-400">vs {player.opponent}</div>
              </div>
              <div className="text-sm text-gray-300">{player[stat]} {stat}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
