// src/components/GameSlider.js
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

export default function GameSlider() {
  const { season } = useParams();
  const activeSeason = season || "szn5";

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
      <h2 className="mb-4 text-center text-2xl font-black text-[#0f172a]">
        Upcoming Games
      </h2>
      {upcomingGames.length > 0 ? (
        <Slider {...settings}>
          {upcomingGames.map((game, index) => (
            <div key={index} className="px-4 py-3 text-center">
              <h3 className="text-lg font-black text-[#0f172a]">
                {game.teamA} vs {game.teamB}
              </h3>
              <p className="mt-2 text-sm font-bold text-[#64748b]">
                {game.date} — {game.time}
              </p>
            </div>
          ))}
        </Slider>
      ) : (
        <p className="text-center font-bold text-[#64748b]">No upcoming games found.</p>
      )}
    </div>
  );
}
