// frontend/src/components/Layout.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import Navigation from './Navigation'; // Assuming you have a Navigation component

function Layout() {
  return (
    <div>
      <Navigation />
      <main>
        <Outlet />
      </main>
      {/* You can add a footer here if needed */}
    </div>
  );
}

export default Layout;

