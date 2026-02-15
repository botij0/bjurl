import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

import { UrlShortenerForm } from "./UrlShortenerForm";

const mockCreateShortUrl = vi.fn();
vi.mock("@/actions/create-short-url.action", () => ({
  createShortUrl: (url: string) => mockCreateShortUrl(url),
}));

const mockToast = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => mockToast(...args),
  },
}));

vi.mock("./ShortenedResult", () => ({
  ShortenedResult: ({ shortUrl, originalUrl }: { shortUrl: string; originalUrl: string }) => (
    <div data-testid="shortened-result">
      <span data-testid="short-url">{shortUrl}</span>
      <span data-testid="original-url">{originalUrl}</span>
    </div>
  ),
}));


describe("UrlShortenerForm", () => {

  beforeEach(() => {
    mockCreateShortUrl.mockReset();
    mockToast.mockClear();
  });
  describe("handleShortenUrl", () => {
    test("shows error when input is empty and Shorten is clicked", async () => {
      render(<UrlShortenerForm />);
      const button = screen.getByRole("button", { name: /shorten/i });

      await act(async () => {
        fireEvent.click(button);
      });

      expect(((await screen.findByRole("alert")).innerHTML)).toBe("Please enter a URL.");
      expect(mockCreateShortUrl).not.toHaveBeenCalled();
    });

    test("shows error when URL is invalid", async () => {
      render(<UrlShortenerForm />);
      const input = screen.getByPlaceholderText(/paste your long url/i);

      await act(async () => {
        fireEvent.change(input, { target: { value: "not-a-valid-url" } });
        fireEvent.click(screen.getByRole("button", { name: /shorten/i }));
      });

      expect((await screen.findByRole("alert")).innerHTML).toContain(
        "Please enter a valid URL (e.g. https://example.com)."
      );
      expect(mockCreateShortUrl).not.toHaveBeenCalled();
    });

    test("accepts valid URL and calls createShortUrl", async () => {
      mockCreateShortUrl.mockResolvedValue({
        originalUrl: "https://example.com",
        shortUrl: "abc12",
      });

      render(<UrlShortenerForm />);
      const input = screen.getByPlaceholderText(/paste your long url/i);
      await act(async () => {
        fireEvent.change(input, { target: { value: "https://example.com" } });
        fireEvent.click(screen.getByRole("button", { name: /shorten/i }));
      });

      expect(mockCreateShortUrl).toHaveBeenCalledWith("https://example.com");
    });

    test("trims URL before sending", async () => {
      mockCreateShortUrl.mockResolvedValue({
        originalUrl: "https://example.com",
        shortUrl: "xyz",
      });

      render(<UrlShortenerForm />);
      const input = screen.getByPlaceholderText(/paste your long url/i);
      await act(async () => {
        fireEvent.change(input, { target: { value: "  https://example.com  " } });
        fireEvent.click(screen.getByRole("button", { name: /shorten/i }));
      });

      expect(mockCreateShortUrl).toHaveBeenCalledWith("https://example.com");
    });

    test("shows ShortenedResult with short and original URL on success", async () => {
      mockCreateShortUrl.mockResolvedValue({
        originalUrl: "https://long.example.com/page",
        shortUrl: "xyz99",
      });

      render(<UrlShortenerForm />);
      const input = screen.getByPlaceholderText(/paste your long url/i);
      await act(async () => {
        fireEvent.change(input, { target: { value: "https://long.example.com/page" } });
        fireEvent.click(screen.getByRole("button", { name: /shorten/i }));
      });

      const result = await screen.findByTestId("shortened-result");
      expect(result).toBeDefined();
      expect(screen.getByTestId("short-url").innerHTML).toContain(`xyz99`);
      expect(screen.getByTestId("original-url").innerHTML).toContain("https://long.example.com/page");
    });

    test("shows toast and does not set result when createShortUrl returns null", async () => {
      mockCreateShortUrl.mockResolvedValue(null);

      render(<UrlShortenerForm />);
      const input = screen.getByPlaceholderText(/paste your long url/i);
      await act(async () => {
        fireEvent.change(input, { target: { value: "https://example.com" } });
        fireEvent.click(screen.getByRole("button", { name: /shorten/i }));
      });

      await vi.waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith("Something went wrong, please try again", {
          position: "top-center",
        });
      });
      expect(screen.queryByTestId("shortened-result")).toBeNull();
    });
  });

  describe("handleKeyDown", () => {
    test("submits when Enter is pressed in input", async () => {
      mockCreateShortUrl.mockResolvedValue({
        originalUrl: "https://example.com",
        shortUrl: "ent",
      });

      render(<UrlShortenerForm />);
      const input = screen.getByPlaceholderText(/paste your long url/i);
      await act(async () => {
        fireEvent.change(input, { target: { value: "https://example.com" } });
        fireEvent.keyDown(input, { key: "Enter" });
      });

      expect(mockCreateShortUrl).toHaveBeenCalledWith("https://example.com");
    });

    test("does not submit when other keys are pressed", () => {
      render(<UrlShortenerForm />);
      const input = screen.getByPlaceholderText(/paste your long url/i);
      act(() => {
        fireEvent.change(input, { target: { value: "https://example.com" } });
        fireEvent.keyDown(input, { key: "a" });
        fireEvent.keyDown(input, { key: "Tab" });
        fireEvent.keyDown(input, { key: "Shift" });
      });

      expect(mockCreateShortUrl).not.toHaveBeenCalled();
    });
  });
});
