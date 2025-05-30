import { useEffect, useState } from 'react';
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
        const upcoming = data.filter(game => {
          const gameDate = new Date(game.date);
          return gameDate >= today;
        }).slice(0, 10); // limit to next 10 games
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
    <div className="max-w-2xl mx-auto mt-10">
      <h2 className="text-2xl font-bold text-center mb-4">Upcoming Games</h2>
      {upcomingGames.length > 0 ? (
        <Slider {...settings}>
          {upcomingGames.map((game, index) => (
            <div key={index} className="bg-white shadow rounded p-6 text-center">
              <h3 className="text-lg font-semibold">{game.teamA} vs {game.teamB}</h3>
              <p className="text-gray-600">{game.date} — {game.time}</p>
            </div>
          ))}
        </Slider>
      ) : (
        <p className="text-center text-gray-500">No upcoming games found.</p>
      )}
    </div>
  );
}
