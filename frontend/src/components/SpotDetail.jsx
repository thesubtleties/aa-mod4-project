import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { FaStar } from 'react-icons/fa';

function SpotDetail() {
  const { id } = useParams();
  const [spot, setSpot] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const currentUser = useSelector(state => state.session.user);

  useEffect(() => {
    const fetchSpotDetails = async () => {
      try {
        const spotResponse = await fetch(`/api/spots/${id}`);
        const reviewsResponse = await fetch(`/api/spots/${id}/reviews`);
        
        if (!spotResponse.ok || !reviewsResponse.ok) {
          throw new Error('Failed to fetch data');
        }
        
        const spotData = await spotResponse.json();
        const reviewsData = await reviewsResponse.json();
        
        setSpot(spotData);
        setReviews(reviewsData.Reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSpotDetails();
  }, [id]);

  const handleReserveClick = () => {
    alert('Feature coming soon');
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  const reviewDisplay = spot.numReviews > 0 
    ? (
      <>
        <FaStar />
        <span>{Number(spot.avgStarRating).toFixed(1)}</span>
        <span> · </span>
        <span>{spot.numReviews} {spot.numReviews === 1 ? 'Review' : 'Reviews'}</span>
      </>
    )
    : (
      <>
        <FaStar />
        <span>New</span>
      </>
    );

  const canPostReview = currentUser && currentUser.id !== spot.Owner.id && reviews.length === 0;

  return (
    <div className="spot-detail">
      <h1>{spot.name}</h1>
      <p>Location: {spot.city}, {spot.state}, {spot.country}</p>
      <div className="images">
        {spot.SpotImages && spot.SpotImages.length > 0 ? (
          <>
            <img src={spot.SpotImages[0].url} alt={spot.name} className="large-image" />
            <div className="small-images">
              {spot.SpotImages.slice(1, 5).map((image, index) => (
                <img key={index} src={image.url} alt={`${spot.name} ${index + 1}`} className="small-image" />
              ))}
            </div>
          </>
        ) : (
          <p>No images available</p>
        )}
      </div>
      <p>Hosted by {spot.Owner.firstName}, {spot.Owner.lastName}</p>
      <p>{spot.description}</p>
      <div className="callout-box">
        <p>${spot.price} <span>night</span></p>
        <div className="review-summary">
          {reviewDisplay}
        </div>
        <button className="reserve-button" onClick={handleReserveClick}>Reserve</button>
      </div>
      <div className="reviews-section">
        <h2>
          {reviewDisplay}
        </h2>
        <div className="reviews-list">
          {reviews.length > 0 ? (
            reviews.map(review => (
              <div key={review.id} className="review">
                <h3>{review.User.firstName}</h3>
                <p>{new Date(review.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                <p>{review.review}</p>
              </div>
            ))
          ) : canPostReview ? (
            <p>Be the first to post a review!</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default SpotDetail;
