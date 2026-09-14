import { describe, expect, test, vi } from "vitest";
import { appRouter } from "./app.router";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";

vi.mock("@/pages/HomePage", () => ({
  HomePage: () => <div data-testid="home-page"></div>,
}));

vi.mock("@/pages/LinksDashboard", () => ({
  LinksDashboard: () => <div data-testid="links-page"></div>,
}));

vi.mock("@/pages/LinkStatsPage", () => ({
  LinkStatsPage: () => <div data-testid="stats-page"></div>,
}));

describe("appRouter", () => {
  test("should be configured as expected", () => {
    expect(appRouter.routes).toMatchSnapshot();
  });

  test("should render home page at root path", () => {
    const router = createMemoryRouter(appRouter.routes, {
      initialEntries: ["/"],
    });
    render(<RouterProvider router={router} />);
    expect(screen.getByTestId("home-page")).toBeDefined();
  });

  test("should render the links dashboard", () => {
    const router = createMemoryRouter(appRouter.routes, {
      initialEntries: ["/links"],
    });
    render(<RouterProvider router={router} />);
    expect(screen.getByTestId("links-page")).toBeDefined();
  });

  test("should render the stats page for a code", () => {
    const router = createMemoryRouter(appRouter.routes, {
      initialEntries: ["/stats/abc123"],
    });
    render(<RouterProvider router={router} />);
    expect(screen.getByTestId("stats-page")).toBeDefined();
  });

  test("should redirect to home page for unknown routes", () => {
    const router = createMemoryRouter(appRouter.routes, {
      initialEntries: ["/otra-pagina-rara"],
    });

    render(<RouterProvider router={router} />);

    expect(screen.getByTestId("home-page")).toBeDefined();
  });
});
