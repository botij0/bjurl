import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";

import { LinksDashboard } from "./LinksDashboard";
import type { LinkSummary } from "@/interfaces/linkStats.interface";

const mockGetBatchStats = vi.fn();
vi.mock("@/api/url-client", () => ({
  getBatchStats: (shortUrls: string[]) => mockGetBatchStats(shortUrls),
}));

const history = [
  {
    shortUrl: "https://bjurl.test/one",
    originalUrl: "https://one.com",
    createdAt: "2026-09-01T10:00:00.000Z",
    expiresAt: null,
    maxClicks: null,
  },
  {
    shortUrl: "https://bjurl.test/two",
    originalUrl: "https://two.com",
    createdAt: "2026-09-02T10:00:00.000Z",
    expiresAt: null,
    maxClicks: 1,
  },
];

const summaries: LinkSummary[] = [
  {
    shortUrl: "one",
    originalUrl: "https://one.com",
    totalClicks: 4,
    createdAt: "2026-09-01T10:00:00.000Z",
    expiresAt: null,
    maxClicks: null,
  },
  {
    shortUrl: "two",
    originalUrl: "https://two.com",
    totalClicks: 1,
    createdAt: "2026-09-02T10:00:00.000Z",
    expiresAt: null,
    maxClicks: 1,
  },
];

const renderDashboard = () =>
  render(
    <MemoryRouter initialEntries={["/links"]}>
      <LinksDashboard />
    </MemoryRouter>,
  );

describe("LinksDashboard", () => {
  beforeEach(() => {
    localStorage.clear();
    mockGetBatchStats.mockReset();
  });

  test("should show an empty state when there is no history", async () => {
    renderDashboard();

    expect(await screen.findByText("No links yet")).toBeDefined();
    expect(mockGetBatchStats).not.toHaveBeenCalled();
  });

  test("should list the stored links with click counts", async () => {
    localStorage.setItem("bjurl:links", JSON.stringify(history));
    mockGetBatchStats.mockResolvedValue({ ok: true, data: summaries });

    renderDashboard();

    expect(await screen.findByText("https://bjurl.test/one")).toBeDefined();
    expect(screen.getByText("https://bjurl.test/two")).toBeDefined();
    expect(await screen.findByText("4")).toBeDefined();
    expect(screen.getByText("One-time")).toBeDefined();
    expect(mockGetBatchStats).toHaveBeenCalledWith(["one", "two"]);
  });

  test("should link to the stats page for each link", async () => {
    localStorage.setItem("bjurl:links", JSON.stringify(history));
    mockGetBatchStats.mockResolvedValue({ ok: true, data: summaries });

    renderDashboard();

    const statsLinks = await screen.findAllByLabelText("View statistics");
    expect(statsLinks).toHaveLength(2);
  });

  test("should remove a link from the history", async () => {
    localStorage.setItem("bjurl:links", JSON.stringify(history));
    mockGetBatchStats.mockResolvedValue({ ok: true, data: summaries });

    renderDashboard();

    await screen.findByText("https://bjurl.test/one");
    fireEvent.click(screen.getAllByLabelText("Remove from history")[0]);

    expect(screen.queryByText("https://bjurl.test/one")).toBeNull();
    expect(screen.getByText("https://bjurl.test/two")).toBeDefined();
  });

  test("should clear the history", async () => {
    localStorage.setItem("bjurl:links", JSON.stringify(history));
    mockGetBatchStats.mockResolvedValue({ ok: true, data: summaries });

    renderDashboard();

    await screen.findByText("https://bjurl.test/one");
    fireEvent.click(screen.getByRole("button", { name: /clear history/i }));

    expect(screen.queryByText("https://bjurl.test/one")).toBeNull();
    expect(screen.getByText("No links yet")).toBeDefined();
  });

  test("should say so when the click counts could not be loaded", async () => {
    localStorage.setItem("bjurl:links", JSON.stringify(history));
    mockGetBatchStats.mockResolvedValue({ ok: false, kind: "error" });

    renderDashboard();

    expect(await screen.findByText(/could not load click counts/i)).toBeDefined();
    expect(screen.getByText("https://bjurl.test/one")).toBeDefined();
  });

  test("should report a consumed link on the row", async () => {
    localStorage.setItem("bjurl:links", JSON.stringify(history));
    mockGetBatchStats.mockResolvedValue({ ok: true, data: summaries });

    renderDashboard();

    expect(await screen.findByText("Limit reached")).toBeDefined();
    expect(screen.getByText("One-time")).toBeDefined();
  });
});
