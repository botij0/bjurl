import { ChevronDown, Settings2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  EXPIRY_OPTIONS,
  getAliasErrorMessage,
  type ExpiryOption,
} from "@/lib/link-options";
import type { AliasAvailability } from "@/actions/check-alias.action";

interface LinkOptionsPanelProps {
  open: boolean;
  onToggle: () => void;
  customAlias: string;
  onCustomAliasChange: (value: string) => void;
  checkingAlias: boolean;
  availability: AliasAvailability | null;
  expiry: ExpiryOption;
  onExpiryChange: (value: ExpiryOption) => void;
  oneTime: boolean;
  onOneTimeChange: (value: boolean) => void;
}

export const LinkOptionsPanel = ({
  open,
  onToggle,
  customAlias,
  onCustomAliasChange,
  checkingAlias,
  availability,
  expiry,
  onExpiryChange,
  oneTime,
  onOneTimeChange,
}: LinkOptionsPanelProps) => {
  const aliasError = getAliasErrorMessage(availability);
  const aliasAvailable = Boolean(availability?.available && customAlias.trim());

  return (
    <div className="mt-3 text-left">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        <Settings2 className="w-3.5 h-3.5" />
        Options
        <ChevronDown
          className={cn("w-3.5 h-3.5 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="mt-3 p-4 rounded-lg bg-secondary/60 border border-primary/20 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label
              htmlFor="custom-alias"
              className="text-xs uppercase tracking-wider text-muted-foreground"
            >
              Custom alias
            </label>
            <Input
              id="custom-alias"
              type="text"
              value={customAlias}
              maxLength={30}
              placeholder="my-link"
              onChange={(event) => onCustomAliasChange(event.target.value)}
              className="font-mono text-sm bg-background border-primary/30"
            />
            {customAlias.trim() && (
              <p
                className={cn(
                  "text-xs",
                  aliasError
                    ? "text-red-500"
                    : aliasAvailable
                      ? "text-primary"
                      : "text-muted-foreground",
                )}
              >
                {checkingAlias
                  ? "Checking availability..."
                  : aliasError ??
                    (aliasAvailable ? "Alias is available" : "Keep typing...")}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="expiry"
              className="text-xs uppercase tracking-wider text-muted-foreground"
            >
              Expiration
            </label>
            <select
              id="expiry"
              value={expiry}
              onChange={(event) =>
                onExpiryChange(event.target.value as ExpiryOption)
              }
              className="h-9 w-full rounded-md border border-primary/30 bg-background px-3 text-sm font-mono outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            >
              {EXPIRY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <label className="flex items-center gap-2 pt-2 text-sm text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={oneTime}
                onChange={(event) => onOneTimeChange(event.target.checked)}
                className="h-4 w-4 accent-[var(--primary)]"
              />
              One-time link (single click)
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
