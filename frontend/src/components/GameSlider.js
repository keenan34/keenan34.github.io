// src/components/GameSlider.js
import React, { useEffect, useState } from 'react';
import Slider from 'react-slick';
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

export default function GameSlider() {
  const [upcomingGames, setUpcomingGames] = useState([]);

  useEffect(() => {
    fetch('/full_schedule.json')
      .then(res => res.json())
      .then(data => {
        const today = new Date();
        const upcoming = data
          .filter(game => new Date(game.date) >= today)
          .slice(0, 10);
        setUpcomingGames(upcoming);
      });
  }, []);

  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    autoplay: true,
    autoplaySpeed: 4000,
    slidesToShow: 1,
    slidesToScroll: 1,
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 bg-gray-900 p-6 rounded-lg">
      <h2 className="text-2xl font-bold text-center mb-4 text-white">Upcoming Games</h2>
      {upcomingGames.length > 0 ? (
        <Slider {...settings}>
          {upcomingGames.map((game, index) => (
            <div key={index} className="bg-gray-800 shadow-lg rounded p-6 text-center">
              <h3 className="text-lg font-semibold text-white">
                {game.teamA} vs {game.teamB}
              </h3>
              <p className="text-gray-400 mt-2">
                {game.date} — {game.time}
              </p>
            </div>
          ))}
        </Slider>
      ) : (
        <p className="text-center text-gray-400">No upcoming games found.</p>
      )}
    </div>
  );
}
