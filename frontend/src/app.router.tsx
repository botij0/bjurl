import { createBrowserRouter, Navigate } from "react-router";

import { HomePage } from "./pages/HomePage";

export const appRouter = createBrowserRouter([
  // Main routes
  {
    path: "/",
    index: true,
    element: <HomePage />,
  },
  {
    path: "*",
    element: <Navigate to="/" />,
  },
]);
