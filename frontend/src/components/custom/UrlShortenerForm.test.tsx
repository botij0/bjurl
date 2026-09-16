import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

import { UrlShortenerForm } from "./UrlShortenerForm";

const mockCreateShortUrl = vi.fn();
vi.mock("@/actions/create-short-url.action", () => ({
  createShortUrl: (url: string, options?: unknown) => mockCreateShortUrl(url, options),
}));

const mockCheckAlias = vi.fn();
vi.mock("@/actions/check-alias.action", () => ({
  checkAlias: (alias: string, signal?: AbortSignal) => mockCheckAlias(alias, signal),
}));

const mockAddLinkToHistory = vi.fn();
vi.mock("@/lib/link-history", () => ({
  addLinkToHistory: (link: unknown) => mockAddLinkToHistory(link),
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

const success = (shortUrl = "https://bjurl.test/abc") => ({
  ok: true as const,
  data: { originalUrl: "https://example.com", shortUrl },
});

describe("UrlShortenerForm", () => {
  beforeEach(() => {
    mockCreateShortUrl.mockReset();
    mockCheckAlias.mockReset();
    mockAddLinkToHistory.mockReset();
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
      mockCreateShortUrl.mockResolvedValue(success());

      render(<UrlShortenerForm />);
      const input = screen.getByPlaceholderText(/paste your long url/i);
      await act(async () => {
        fireEvent.change(input, { target: { value: "https://example.com" } });
        fireEvent.click(screen.getByRole("button", { name: /shorten/i }));
      });

      expect(mockCreateShortUrl).toHaveBeenCalledWith("https://example.com", {
        customAlias: undefined,
        expiresAt: undefined,
        maxClicks: undefined,
      });
    });

    test("trims URL before sending", async () => {
      mockCreateShortUrl.mockResolvedValue(success());

      render(<UrlShortenerForm />);
      const input = screen.getByPlaceholderText(/paste your long url/i);
      await act(async () => {
        fireEvent.change(input, { target: { value: "  https://example.com  " } });
        fireEvent.click(screen.getByRole("button", { name: /shorten/i }));
      });

      expect(mockCreateShortUrl).toHaveBeenCalledWith(
        "https://example.com",
        expect.any(Object)
      );
    });

    test("shows ShortenedResult and stores history on success", async () => {
      mockCreateShortUrl.mockResolvedValue(
        success("https://bjurl.test/xyz99")
      );

      render(<UrlShortenerForm />);
      const input = screen.getByPlaceholderText(/paste your long url/i);
      await act(async () => {
        fireEvent.change(input, { target: { value: "https://long.example.com/page" } });
        fireEvent.click(screen.getByRole("button", { name: /shorten/i }));
      });

      const result = await screen.findByTestId("shortened-result");
      expect(result).toBeDefined();
      expect(screen.getByTestId("short-url").innerHTML).toContain(`xyz99`);
      expect(screen.getByTestId("original-url").innerHTML).toContain("https://example.com");
      expect(mockAddLinkToHistory).toHaveBeenCalledWith(
        expect.objectContaining({ shortUrl: "https://bjurl.test/xyz99" })
      );
    });

    test("shows toast and does not set result when createShortUrl fails", async () => {
      mockCreateShortUrl.mockResolvedValue({
        ok: false,
        status: 500,
        error: "Something went wrong, please try again",
      });

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

    test("shows inline error when the alias is taken", async () => {
      mockCheckAlias.mockResolvedValue({ available: true, reason: null });
      mockCreateShortUrl.mockResolvedValue({
        ok: false,
        status: 409,
        reason: "taken",
      });

      render(<UrlShortenerForm />);
      fireEvent.click(screen.getByRole("button", { name: /options/i }));
      fireEvent.change(screen.getByLabelText(/custom alias/i), {
        target: { value: "promo" },
      });

      await screen.findByText(/alias is available/i);

      await act(async () => {
        fireEvent.change(screen.getByPlaceholderText(/paste your long url/i), {
          target: { value: "https://example.com" },
        });
        fireEvent.click(screen.getByRole("button", { name: /^shorten$/i }));
      });

      expect((await screen.findByRole("alert")).innerHTML).toBe(
        "This alias is already in use"
      );
      expect(mockToast).not.toHaveBeenCalled();
    });
  });

  describe("link options", () => {
    test("toggles the options panel", () => {
      render(<UrlShortenerForm />);

      expect(screen.queryByLabelText(/custom alias/i)).toBeNull();

      fireEvent.click(screen.getByRole("button", { name: /options/i }));

      expect(screen.getByLabelText(/custom alias/i)).toBeDefined();
      expect(screen.getByLabelText(/expiration/i)).toBeDefined();
      expect(screen.getByLabelText(/one-time link/i)).toBeDefined();
    });

    test("checks alias availability while typing", async () => {
      mockCheckAlias.mockResolvedValue({ available: true, reason: null });

      render(<UrlShortenerForm />);
      fireEvent.click(screen.getByRole("button", { name: /options/i }));
      fireEvent.change(screen.getByLabelText(/custom alias/i), {
        target: { value: "promo" },
      });

      await screen.findByText(/alias is available/i);

      expect(mockCheckAlias).toHaveBeenCalledWith("promo", expect.any(AbortSignal));
    });

    test("blocks submit when the alias is not available", async () => {
      mockCheckAlias.mockResolvedValue({ available: false, reason: "taken" });

      render(<UrlShortenerForm />);
      fireEvent.click(screen.getByRole("button", { name: /options/i }));
      fireEvent.change(screen.getByLabelText(/custom alias/i), {
        target: { value: "promo" },
      });
      await screen.findByText(/already in use/i);

      await act(async () => {
        fireEvent.change(screen.getByPlaceholderText(/paste your long url/i), {
          target: { value: "https://example.com" },
        });
        fireEvent.click(screen.getByRole("button", { name: /^shorten$/i }));
      });

      expect((await screen.findByRole("alert")).innerHTML).toBe(
        "This alias is already in use"
      );
      expect(mockCreateShortUrl).not.toHaveBeenCalled();
    });

    test("allows submit when the alias check failed", async () => {
      mockCheckAlias.mockResolvedValue(null);
      mockCreateShortUrl.mockResolvedValue(success("https://bjurl.test/promo"));

      render(<UrlShortenerForm />);
      fireEvent.click(screen.getByRole("button", { name: /options/i }));
      fireEvent.change(screen.getByLabelText(/custom alias/i), {
        target: { value: "promo" },
      });
      await screen.findByText(/could not check this alias/i);

      await act(async () => {
        fireEvent.change(screen.getByPlaceholderText(/paste your long url/i), {
          target: { value: "https://example.com" },
        });
        fireEvent.click(screen.getByRole("button", { name: /^shorten$/i }));
      });

      expect(mockCreateShortUrl).toHaveBeenCalledWith(
        "https://example.com",
        expect.objectContaining({ customAlias: "promo" })
      );
    });

    test("sends alias, expiration and one-time options", async () => {
      mockCheckAlias.mockResolvedValue({ available: true, reason: null });
      mockCreateShortUrl.mockResolvedValue(
        success("https://bjurl.test/promo")
      );

      render(<UrlShortenerForm />);
      fireEvent.click(screen.getByRole("button", { name: /options/i }));
      fireEvent.change(screen.getByLabelText(/custom alias/i), {
        target: { value: "promo" },
      });
      await screen.findByText(/alias is available/i);
      fireEvent.change(screen.getByLabelText(/expiration/i), {
        target: { value: "24h" },
      });
      fireEvent.click(screen.getByLabelText(/one-time link/i));

      await act(async () => {
        fireEvent.change(screen.getByPlaceholderText(/paste your long url/i), {
          target: { value: "https://example.com" },
        });
        fireEvent.click(screen.getByRole("button", { name: /^shorten$/i }));
      });

      expect(mockCreateShortUrl).toHaveBeenCalledWith("https://example.com", {
        customAlias: "promo",
        expiresAt: expect.any(String),
        maxClicks: 1,
      });
    });
  });

  describe("handleKeyDown", () => {
    test("submits when Enter is pressed in input", async () => {
      mockCreateShortUrl.mockResolvedValue(success("https://bjurl.test/ent"));

      render(<UrlShortenerForm />);
      const input = screen.getByPlaceholderText(/paste your long url/i);
      await act(async () => {
        fireEvent.change(input, { target: { value: "https://example.com" } });
        fireEvent.keyDown(input, { key: "Enter" });
      });

      expect(mockCreateShortUrl).toHaveBeenCalledWith(
        "https://example.com",
        expect.any(Object)
      );
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
