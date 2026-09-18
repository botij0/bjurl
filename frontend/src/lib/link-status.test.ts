import { describe, expect, test } from "vitest";

import { linkStatus } from "./link-status";

const now = new Date("2026-09-16T12:00:00Z");

describe("linkStatus", () => {
  test("should call an unbounded link active", () => {
    expect(linkStatus({ expiresAt: null, maxClicks: null }, 3, now)).toEqual({
      expired: false,
      oneTime: false,
      consumed: false,
      summary: "Active",
    });
  });

  test("should keep an expiry that has not passed yet", () => {
    const status = linkStatus(
      { expiresAt: "2026-10-01T00:00:00.000Z", maxClicks: null },
      0,
      now,
    );

    expect(status.expired).toBe(false);
    expect(status.summary).toMatch(/^Until /);
  });

  test("should call a past expiry expired", () => {
    const status = linkStatus(
      { expiresAt: "2026-09-01T00:00:00.000Z", maxClicks: null },
      0,
      now,
    );

    expect(status.expired).toBe(true);
    expect(status.summary).toBe("Expired");
  });

  test("should report the expiry and the click limit together when both apply", () => {
    const status = linkStatus(
      { expiresAt: "2026-10-01T00:00:00.000Z", maxClicks: 5 },
      2,
      now,
    );

    expect(status.expired).toBe(false);
    expect(status.summary).toMatch(/^Until .+ · Max 5 clicks$/);
  });

  test("should name the click limit", () => {
    const status = linkStatus({ expiresAt: null, maxClicks: 5 }, 2, now);

    expect(status.oneTime).toBe(false);
    expect(status.consumed).toBe(false);
    expect(status.summary).toBe("Max 5 clicks");
  });

  test("should mark a single-click link as one-time", () => {
    const status = linkStatus({ expiresAt: null, maxClicks: 1 }, 0, now);

    expect(status.oneTime).toBe(true);
    expect(status.consumed).toBe(false);
  });

  test("should mark a link as consumed once the limit is reached", () => {
    expect(linkStatus({ expiresAt: null, maxClicks: 3 }, 3, now).consumed).toBe(
      true,
    );
    expect(linkStatus({ expiresAt: null, maxClicks: 3 }, 2, now).consumed).toBe(
      false,
    );
  });

  test("should keep expired and consumed independent", () => {
    const status = linkStatus(
      { expiresAt: "2026-09-01T00:00:00.000Z", maxClicks: 3 },
      5,
      now,
    );

    expect(status.expired).toBe(true);
    expect(status.consumed).toBe(true);
    expect(status.summary).toBe("Expired");
  });

  test("should leave one-time false when there is no limit", () => {
    expect(linkStatus({}, 0, now).oneTime).toBe(false);
    expect(linkStatus({}, 0, now).consumed).toBe(false);
  });
});
