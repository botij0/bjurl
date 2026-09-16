import { useEffect, useRef, useState } from "react";

import {
  checkAlias,
  type AliasAvailability,
} from "@/actions/check-alias.action";

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
) => Promise<AliasAvailability | null>;

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
      void checkRef.current(alias, controller.signal).then((availability) => {
        if (!active) return;

        setResult({
          alias,
          outcome: !availability
            ? { state: "failed" }
            : availability.available
              ? { state: "available" }
              : { state: "unavailable", reason: availability.reason ?? "taken" },
        });
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
