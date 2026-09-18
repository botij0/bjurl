import { useEffect, useRef, useState } from "react";

import {
  checkAlias,
  type AliasAvailability,
  type UrlOutcome,
} from "@/api/url-client";

export type AliasReason = "invalid" | "reserved" | "taken";

export type AliasOutcome =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "available" }
  | { state: "unavailable"; reason: AliasReason }
  | { state: "failed" };

export type AliasCheck = (
  alias: string,
  signal?: AbortSignal,
) => Promise<UrlOutcome<AliasAvailability>>;

const DEBOUNCE_MS = 400;

const ALIAS_REASON_MESSAGES: Record<AliasReason, string> = {
  taken: "This alias is already in use",
  reserved: "This alias is reserved",
  invalid: "Use 3-30 letters, numbers, hyphens or underscores",
};

export const aliasReasonMessage = (reason: AliasReason): string =>
  ALIAS_REASON_MESSAGES[reason];

export const aliasMessage = (outcome: AliasOutcome): string | null => {
  if (outcome.state === "unavailable") return aliasReasonMessage(outcome.reason);

  if (outcome.state === "failed") {
    return "Could not check this alias, it will be verified when you create the link";
  }

  return null;
};

const aliasOutcomeOf = (result: UrlOutcome<AliasAvailability>): AliasOutcome => {
  if (!result.ok) return { state: "failed" };

  return result.data.available
    ? { state: "available" }
    : { state: "unavailable", reason: result.data.reason ?? "taken" };
};

export const useAliasCheck = (value: string, check: AliasCheck = checkAlias) => {
  const alias = value.trim();
  const [result, setResult] = useState<{
    alias: string;
    outcome: AliasOutcome;
  } | null>(null);
  const checkRef = useRef(check);

  useEffect(() => {
    checkRef.current = check;
  }, [check]);

  useEffect(() => {
    if (!alias) return;

    let active = true;
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      void checkRef.current(alias, controller.signal).then((result) => {
        if (!active) return;

        setResult({ alias, outcome: aliasOutcomeOf(result) });
      });
    }, DEBOUNCE_MS);

    return () => {
      active = false;
      controller.abort();
      clearTimeout(timeout);
    };
  }, [alias]);

  const outcome: AliasOutcome = !alias
    ? { state: "idle" }
    : result?.alias === alias
      ? result.outcome
      : { state: "checking" };

  return { outcome };
};
