// src/components/BoxScore.jsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

export default function BoxScore() {
  const { week, gameId } = useParams();
  const [data, setData] = useState(null);
  const [scoreA, setScoreA] = useState(null);
  const [scoreB, setScoreB] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch weekN.json and full_schedule.json in parallel
    Promise.all([
      fetch(`/${week}.json`),
      fetch('/full_schedule.json')
    ])
      .then(async ([resWeek, resFull]) => {
        if (!resWeek.ok) throw new Error(`Could not load ${week}.json`);
        if (!resFull.ok) throw new Error('Could not load full_schedule.json');

        const weekJson = await resWeek.json();
        const fullJson = await resFull.json();

        // Extract the box score data for this specific game
        const gameData = weekJson[gameId] || null;
        setData(gameData);

        // Construct combinedGameId (e.g. "week2-game1") to match full_schedule.json
        const combinedGameId = `${week}-${gameId}`;

        // full_schedule.json is assumed to be an array of game objects, each with a .gameId field
        const match = Array.isArray(fullJson)
          ? fullJson.find((g) => g.gameId === combinedGameId)
          : null;

        if (match) {
          setScoreA(match.scoreA);
          setScoreB(match.scoreB);
        } else {
          setScoreA(null);
          setScoreB(null);
        }

        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setData(null);
        setScoreA(null);
        setScoreB(null);
        setLoading(false);
      });
  }, [week, gameId]);

  if (loading) {
    return <p className="text-center py-8">Loading box score...</p>;
  }

  if (!data) {
    return (
      <p className="text-center py-8">
        Box score not found for <strong>{week}</strong> / <strong>{gameId}</strong>
      </p>
    );
  }

  // Calculate each team’s total points from player stats (fallback)
  const computedTeamAScore = data.teamA.players.reduce(
    (sum, p) => sum + (p.Points || 0),
    0
  );
  const computedTeamBScore = data.teamB.players.reduce(
    (sum, p) => sum + (p.Points || 0),
    0
  );

  // Use scoreA/scoreB from full_schedule if available, otherwise fallback
  const displayScoreA = scoreA !== null ? scoreA : computedTeamAScore;
  const displayScoreB = scoreB !== null ? scoreB : computedTeamBScore;

  // Renders one team’s player-table
  const renderTeamTable = (team) => (
    <div className="overflow-x-auto my-4">
      <h3 className="text-xl font-bold my-2">{team.name} Players</h3>
      <table className="min-w-full border text-sm text-center border-collapse">
        <thead>
          <tr className="bg-gray-200 text-sm text-black font-bold">
            <th className="p-2">Player</th>
            <th className="p-2 border-r">PTS</th>
            <th className="p-2">FGM</th>
            <th className="p-2">FGA</th>
            <th className="p-2 border-r">FG%</th>
            <th className="p-2">2PTM</th>
            <th className="p-2">2PTA</th>
            <th className="p-2 border-r">2PT%</th>
            <th className="p-2">3PTM</th>
            <th className="p-2">3PTA</th>
            <th className="p-2 border-r">3PT%</th>
            <th className="p-2">FTM</th>
            <th className="p-2">FTA</th>
            <th className="p-2 border-r">FT%</th>
            <th className="p-2">REB</th>
            <th className="p-2">TOs</th>
            <th className="p-2">Fouls</th>
            <th className="p-2">STLS/BLKS</th>
          </tr>
        </thead>
        <tbody>
          {team.players.map((p, i) => (
            <tr key={i} className="even:bg-gray-100">
              <td className="p-2">{p.Player}</td>
              <td className="p-2">{p.Points ?? 0}</td>
              <td className="p-2">{p.FGM ?? 0}</td>
              <td className="p-2">{p.FGA ?? 0}</td>
              <td className="p-2">{p['FG %'] ?? 0}</td>
              <td className="p-2">{p['2 PTM'] ?? 0}</td>
              <td className="p-2">{p['2 PTA'] ?? 0}</td>
              <td className="p-2">{p['2 Pt %'] ?? 0}</td>
              <td className="p-2">{p['3 PTM'] ?? 0}</td>
              <td className="p-2">{p['3 PTA'] ?? 0}</td>
              <td className="p-2">{p['3 Pt %'] ?? 0}</td>
              <td className="p-2">{p.FTM ?? 0}</td>
              <td className="p-2">{p.FTA ?? 0}</td>
              <td className="p-2">{p['FT %'] ?? 0}</td>
              <td className="p-2">{p.REB ?? 0}</td>
              <td className="p-2">{p.TOs ?? 0}</td>
              <td className="p-2">{p.Fouls ?? 0}</td>
              <td className="p-2">{p['STLS/BLKS'] ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="p-4">
      {/* Title with score included */}
      <h2 className="text-2xl font-bold mb-2">
        {data.teamA.name} {displayScoreA} – {displayScoreB} {data.teamB.name}
      </h2>

      {/* Player tables */}
      {renderTeamTable(data.teamA)}
      {renderTeamTable(data.teamB)}
    </div>
  );
}
