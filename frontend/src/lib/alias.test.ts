import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { AliasAvailability, UrlOutcome } from "@/api/url-client";
import { aliasMessage, aliasReasonMessage, useAliasCheck, type AliasCheck } from "./alias";

const available: UrlOutcome<AliasAvailability> = {
  ok: true,
  data: { available: true, reason: null },
};

const unavailable = (reason: AliasAvailability["reason"]): UrlOutcome<AliasAvailability> => ({
  ok: true,
  data: { available: false, reason },
});

describe("aliasReasonMessage", () => {
  test("should own the copy for every verdict", () => {
    expect(aliasReasonMessage("taken")).toBe("This alias is already in use");
    expect(aliasReasonMessage("reserved")).toBe("This alias is reserved");
    expect(aliasReasonMessage("invalid")).toBe(
      "Use 3-30 letters, numbers, hyphens or underscores",
    );
  });
});

describe("aliasMessage", () => {
  test("should stay quiet while the verdict is undecided", () => {
    expect(aliasMessage({ state: "idle" })).toBeNull();
    expect(aliasMessage({ state: "checking" })).toBeNull();
    expect(aliasMessage({ state: "available" })).toBeNull();
  });

  test("should answer the verdict for an unavailable alias", () => {
    expect(aliasMessage({ state: "unavailable", reason: "taken" })).toBe(
      "This alias is already in use",
    );
    expect(aliasMessage({ state: "unavailable", reason: "reserved" })).toBe(
      "This alias is reserved",
    );
    expect(aliasMessage({ state: "unavailable", reason: "invalid" })).toBe(
      "Use 3-30 letters, numbers, hyphens or underscores",
    );
  });

  test("should warn without blocking when the check failed", () => {
    expect(aliasMessage({ state: "failed" })).toContain(
      "verified when you create the link",
    );
  });
});

describe("useAliasCheck", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("should stay idle until an alias is typed", () => {
    const check = vi.fn<AliasCheck>();

    const { result } = renderHook(
      ({ value }) => useAliasCheck(value, check),
      { initialProps: { value: "" } },
    );

    expect(result.current.outcome).toEqual({ state: "idle" });
    expect(check).not.toHaveBeenCalled();
  });

  test("should debounce the check, trim the alias and pass an abort signal", async () => {
    const check = vi.fn<AliasCheck>().mockResolvedValue(available);

    const { result } = renderHook(
      ({ value }) => useAliasCheck(value, check),
      { initialProps: { value: "  promo  " } },
    );

    expect(result.current.outcome).toEqual({ state: "checking" });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(399);
    });
    expect(check).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(check).toHaveBeenCalledWith("promo", expect.any(AbortSignal));
    expect(result.current.outcome).toEqual({ state: "available" });
  });

  test("should report the verdict for an unavailable alias", async () => {
    const check = vi.fn<AliasCheck>().mockResolvedValue(unavailable("reserved"));

    const { result } = renderHook(
      ({ value }) => useAliasCheck(value, check),
      { initialProps: { value: "api" } },
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(result.current.outcome).toEqual({
      state: "unavailable",
      reason: "reserved",
    });
  });

  test("should report a failed check instead of pretending nothing happened", async () => {
    const check = vi
      .fn<AliasCheck>()
      .mockResolvedValue({ ok: false, kind: "error" });

    const { result } = renderHook(
      ({ value }) => useAliasCheck(value, check),
      { initialProps: { value: "promo" } },
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(result.current.outcome).toEqual({ state: "failed" });
  });

  test("should abort the check in flight when the alias changes", async () => {
    const check = vi.fn<AliasCheck>().mockResolvedValue(available);

    const { rerender } = renderHook(
      ({ value }) => useAliasCheck(value, check),
      { initialProps: { value: "promo" } },
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    const signal = check.mock.calls[0][1];

    expect(signal?.aborted).toBe(false);

    rerender({ value: "other" });

    expect(signal?.aborted).toBe(true);
  });

  test("should ignore a stale answer for an alias that is no longer typed", async () => {
    let resolveStale: (value: UrlOutcome<AliasAvailability>) => void = () => {};
    const stale = new Promise<UrlOutcome<AliasAvailability>>((resolve) => {
      resolveStale = resolve;
    });
    const check = vi
      .fn<AliasCheck>()
      .mockReturnValueOnce(stale)
      .mockResolvedValue(available);

    const { result, rerender } = renderHook(
      ({ value }) => useAliasCheck(value, check),
      { initialProps: { value: "promo" } },
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(check).toHaveBeenCalledTimes(1);

    rerender({ value: "other" });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(result.current.outcome).toEqual({ state: "available" });

    await act(async () => {
      resolveStale(unavailable("taken"));
      await Promise.resolve();
    });

    expect(result.current.outcome).toEqual({ state: "available" });
  });
});
