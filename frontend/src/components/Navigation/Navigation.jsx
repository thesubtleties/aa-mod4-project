import React from 'react';
import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import ProfileButton from './ProfileButton';
import './Navigation.css';

function Navigation({ isLoaded }) {
  const sessionUser = useSelector(state => state.session.user);

  return (
    <ul>
      <li>
        <NavLink to="/">Home</NavLink>
      </li>
      {isLoaded && (
        <React.Fragment>
          <li className="navbar-icon">
            <img src="/favicon.ico" alt="Favicon" className="navbar-favicon" />
          </li>
          <li className="navbar-title">
            <h1>Airbnb Clone</h1>
          </li>
          {sessionUser && (
            <li>
              <NavLink to="/spots/new">Create a New Spot</NavLink>
            </li>
          )}
          <li className="profile-button">
            <ProfileButton user={sessionUser} />
          </li>
        </React.Fragment>
      )}
    </ul>
  );
}

export default Navigation;
