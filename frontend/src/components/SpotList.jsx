import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // Import Link from react-router-dom
import { FaStar } from 'react-icons/fa'; // Import the star icon

function SpotList() {
  const [spots, setSpots] = useState([]);

  useEffect(() => {
    const fetchSpots = async () => {
      try {
        const response = await fetch('/api/spots');
        const data = await response.json();
        setSpots(data.Spots);
      } catch (error) {
        console.error('Error fetching spots:', error);
      }
    };

    fetchSpots();
  }, []);

  return (
    <div className="spot-list">
      {spots.map((spot) => (
        <Link to={`/spots/${spot.id}`} key={spot.id} className="spot-tile-link">
          <div className="spot-tile" title={spot.name}>
            <img src={spot.previewImage} alt={spot.name} className="thumbnail" />
            <div className="spot-info">
              <h2>{spot.name}</h2>
              <p>{spot.city}, {spot.state}</p>
              <div className="rating">
                <FaStar /> {/* Star icon */}
                <span>{spot.avgRating !== null ? Number(spot.avgRating).toFixed(1) : "New"}</span>
              </div>
            </div>
            <p className="price">${spot.price} per night</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default SpotList;
