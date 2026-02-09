import { RouterProvider } from "react-router"
import { appRouter } from "./app.router"


export const UrlShortenerApp = () => {
  return (
    <RouterProvider router={appRouter} />
  )
}
