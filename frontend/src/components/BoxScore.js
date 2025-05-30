import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

export default function BoxScore() {
  const { gameId } = useParams(); // Expects gameId like "game1"
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/week1.json')
      .then(res => res.json())
      .then(json => {
        setData(json[gameId]); // Only store the relevant game
        setLoading(false);
      });
  }, [gameId]);

  if (loading) return <p>Loading box score...</p>;
  if (!data) return <p>Box score not found for game ID: {gameId}</p>;

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
            <td className="p-2">{p.Points}</td>
            <td className="p-2">{p.FGM}</td>
            <td className="p-2">{p.FGA}</td>
            <td className="p-2">{p["FG %"]}</td>
            <td className="p-2">{p["2 PTM"]}</td>
            <td className="p-2">{p["2 PTA"]}</td>
            <td className="p-2">{p["2 Pt %"]}</td>
            <td className="p-2">{p["3 PTM"]}</td>
            <td className="p-2">{p["3 PTA"]}</td>
            <td className="p-2">{p["3 Pt %"]}</td>
            <td className="p-2">{p.FTM}</td>
            <td className="p-2">{p.FTA}</td>
            <td className="p-2">{p["FT %"]}</td>
            <td className="p-2">{p.REB}</td>
            <td className="p-2">{p.TOs}</td>
            <td className="p-2">{p.Fouls}</td>
            <td className="p-2">{p["STLS/BLKS"]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">{data.teamA.name} vs {data.teamB.name}</h2>
      {renderTeamTable(data.teamA)}
      {renderTeamTable(data.teamB)}
    </div>
  );
}
