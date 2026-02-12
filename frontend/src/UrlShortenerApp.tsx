import { Toaster } from "sonner"
import { RouterProvider } from "react-router"

import { appRouter } from "./app.router"
import { ThemeProvider } from "./context/ThemeContext"


export const UrlShortenerApp = () => {
  return (
    <ThemeProvider>
      <RouterProvider router={appRouter} />
      <Toaster />
    </ThemeProvider>
  )
}
