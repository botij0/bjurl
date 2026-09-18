import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";

import { ShortenedResult } from "./ShortenedResult";

const props = {
  shortUrl: "https://bjurl.test/abc123",
  originalUrl: "https://example.com/page",
};

const renderResult = () =>
  render(
    <MemoryRouter>
      <ShortenedResult {...props} />
    </MemoryRouter>,
  );

describe("ShortenedResult", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn() },
    });
  });

  test("should label the original URL correctly", () => {
    renderResult();

    expect(screen.getByText(/Original URL:/)).toBeDefined();
    expect(screen.queryByText(/Original URl:/)).toBeNull();
  });

  test("should render the open and stats actions as real links", () => {
    renderResult();

    const open = screen.getByLabelText("Open short URL");
    expect(open.tagName).toBe("A");
    expect(open.getAttribute("href")).toBe(props.shortUrl);

    const stats = screen.getByLabelText("View statistics");
    expect(stats.tagName).toBe("A");
    expect(stats.getAttribute("href")).toBe("/stats/abc123");
  });

  test("should announce a successful copy", async () => {
    vi.mocked(navigator.clipboard.writeText).mockResolvedValue(undefined);

    renderResult();
    fireEvent.click(screen.getByLabelText("Copy short URL"));

    expect(await screen.findByText("Copied to clipboard")).toBeDefined();
  });

  test("should announce a failed copy without throwing", async () => {
    vi.mocked(navigator.clipboard.writeText).mockRejectedValue(
      new Error("denied"),
    );

    renderResult();
    fireEvent.click(screen.getByLabelText("Copy short URL"));

    expect(
      await screen.findByText("Could not copy to clipboard"),
    ).toBeDefined();
  });
});
