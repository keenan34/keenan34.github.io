// src/components/GameSlider.js
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

export default function GameSlider() {
  const { season } = useParams();
  const activeSeason = season || "szn4";

  const [upcomingGames, setUpcomingGames] = useState([]);

  useEffect(() => {
    fetch(`/seasons/${activeSeason}/full_schedule.json`)
      .then((res) => res.json())
      .then((data) => {
        const today = new Date();
        const upcoming = data
          .filter((game) => new Date(game.date) >= today)
          .slice(0, 10);
        setUpcomingGames(upcoming);
      })
      .catch(console.error);
  }, [activeSeason]);

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
    <div className="max-w-2xl mx-auto mt-3 transform scale-90">
      <h2 className="text-2xl font-bold text-center mb-4 text-white">
        Upcoming Games
      </h2>
      {upcomingGames.length > 0 ? (
        <Slider {...settings}>
          {upcomingGames.map((game, index) => (
            <div key={index} className="text-center px-4 py-1">
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
