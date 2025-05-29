import React from 'react';
import { Link } from 'react-router-dom';

const teams = [
  { id: 1, name: 'YNS' },
  { id: 2, name: 'Mambas' },
  { id: 3, name: 'UMMA' },
  { id: 4, name: 'Team Flight' },
  { id: 5, name: 'Shariah Stepback' },
  { id: 6, name: '0pium Hoopers' },
  { id: 7, name: 'Mujahideens' },
];

const TeamList = () => {
  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold text-center mb-8 text-black">Teams</h2>
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {teams.map(team => (
          <Link
            key={team.id}
            to={`/teams/${encodeURIComponent(team.name)}/roster`}
            className="bg-white rounded-2xl shadow hover:shadow-lg p-6 text-center transform hover:scale-105 transition duration-300 border border-gray-100"
          >
            <h3 className="text-xl font-semibold text-black">{team.name}</h3>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default TeamList;
