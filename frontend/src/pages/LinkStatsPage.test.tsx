import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import type { ReactNode } from "react";

import { LinkStatsPage } from "./LinkStatsPage";
import type { LinkStats } from "@/interfaces/linkStats.interface";

const mockGetLinkStats = vi.fn();
vi.mock("@/api/url-client", () => ({
  getLinkStats: (shortUrl: string) => mockGetLinkStats(shortUrl),
}));

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  AreaChart: () => <div data-testid="area-chart" />,
  Area: () => <div data-testid="area" />,
  CartesianGrid: () => null,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
}));

const stats: LinkStats = {
  shortUrl: "abc123",
  originalUrl: "https://example.com/page",
  totalClicks: 7,
  uniqueClicks: 3,
  createdAt: "2026-09-01T10:00:00.000Z",
  expiresAt: null,
  maxClicks: null,
  clicksByDay: [
    { date: "2026-09-10", count: 2 },
    { date: "2026-09-11", count: 5 },
  ],
  topReferrers: [
    { referrer: "https://google.com", count: 5 },
    { referrer: "direct", count: 2 },
  ],
  topDevices: [
    { device: "mobile", count: 4 },
    { device: "desktop", count: 3 },
  ],
  topCountries: [{ country: "ES", count: 4 }],
};

const renderPage = (code = "abc123") => {
  const router = createMemoryRouter(
    [{ path: "/stats/:shortUrl", element: <LinkStatsPage /> }],
    { initialEntries: [`/stats/${code}`] },
  );

  return render(<RouterProvider router={router} />);
};

describe("LinkStatsPage", () => {
  beforeEach(() => {
    mockGetLinkStats.mockReset();
    localStorage.clear();
  });

  test("should render the link analytics", async () => {
    mockGetLinkStats.mockResolvedValue({ ok: true, data: stats });

    renderPage();

    expect(await screen.findByText("Total clicks")).toBeDefined();
    expect(mockGetLinkStats).toHaveBeenCalledWith("abc123");
    expect(screen.getByText("7")).toBeDefined();
    expect(screen.getByText("Unique visitors")).toBeDefined();
    expect(screen.getAllByText("3").length).toBeGreaterThan(0);
    expect(screen.getByText("https://example.com/page")).toBeDefined();
    expect(screen.getByText("https://google.com")).toBeDefined();
    expect(screen.getByText("mobile")).toBeDefined();
    expect(screen.getByText("ES")).toBeDefined();
    expect(screen.getByTestId("area-chart")).toBeDefined();
  });

  test("should show a not found state", async () => {
    mockGetLinkStats.mockResolvedValue({ ok: false, kind: "not_found" });

    renderPage("missing");

    expect(await screen.findByText("Link not found")).toBeDefined();
    expect(screen.getByText("missing")).toBeDefined();
  });

  test("should show an empty state when there are no clicks", async () => {
    mockGetLinkStats.mockResolvedValue({
      ok: true,
      data: {
        ...stats,
        totalClicks: 0,
        uniqueClicks: 0,
        clicksByDay: [],
        topReferrers: [],
        topDevices: [],
        topCountries: [],
      },
    });

    renderPage();

    expect(
      await screen.findByText(/no clicks yet/i),
    ).toBeDefined();
    expect(screen.getByText(/no referrer data yet/i)).toBeDefined();
  });

  test("should tell a failed load apart from a missing link", async () => {
    mockGetLinkStats.mockResolvedValue({ ok: false, kind: "error" });

    renderPage();

    expect(await screen.findByText("Could not load analytics")).toBeDefined();
    expect(screen.queryByText("Link not found")).toBeNull();
    expect(screen.getByRole("button", { name: /try again/i })).toBeDefined();
  });

  test("should report the link status from one place", async () => {
    mockGetLinkStats.mockResolvedValue({
      ok: true,
      data: { ...stats, maxClicks: 3 },
    });

    renderPage();

    expect(await screen.findByText("Status")).toBeDefined();
    expect(screen.getByText("Max 3 clicks")).toBeDefined();
  });
});
