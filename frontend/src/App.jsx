import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import Navigation from "./components/Navigation/Navigation";
import * as sessionActions from "./store/session";
import SpotList from './components/SpotList';
import SpotDetail from './components/SpotDetail'; // Import the SpotDetail component
import CreateSpotForm from './components/CreateSpotForm'; // Import the CreateSpotForm component

function Layout() {
  const dispatch = useDispatch();
  const [isLoaded, setIsLoaded] = useState(false);
  useEffect(() => {
    dispatch(sessionActions.restoreUser()).then(() => setIsLoaded(true));
  }, [dispatch]);

  return (
    <>
      <Navigation isLoaded={isLoaded} />
      {isLoaded && <Outlet />}
    </>
  );
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      {
        path: '/',
        element: <SpotList />,
      },
      {
        path: '/spots/:id', // Add route for spot detail
        element: <SpotDetail />,
      },
      {
        path: '/spots/new', // Add route for creating a new spot
        element: <CreateSpotForm />,
      },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
