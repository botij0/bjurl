import { createBrowserRouter, Navigate } from "react-router";

import { HomePage } from "./pages/HomePage";
import { LinksDashboard } from "./pages/LinksDashboard";
import { LinkStatsPage } from "./pages/LinkStatsPage";

export const appRouter = createBrowserRouter([
  // Main routes
  {
    path: "/",
    index: true,
    element: <HomePage />,
  },
  {
    path: "/links",
    element: <LinksDashboard />,
  },
  {
    path: "/stats/:shortUrl",
    element: <LinkStatsPage />,
  },
  {
    path: "*",
    element: <Navigate to="/" />,
  },
]);
