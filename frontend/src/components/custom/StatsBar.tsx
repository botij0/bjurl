import { useEffect, useState } from "react";

import { getStats } from "@/api/url-client";
import type { Stats } from "@/interfaces/stats.interface";

export const StatsBar = () => {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let active = true;

    getStats().then((result) => {
      if (!active || !result.ok) return;
      setStats(result.data);
    });

    return () => {
      active = false;
    };
  }, []);

  if (!stats || (stats.urls <= 0 && stats.clicks <= 0)) return null;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="flex items-center gap-10 border-t-2 border-border pt-6">
        {stats.urls > 0 && (
          <div>
            <p className="text-2xl font-bold tabular-nums">{stats.urls}</p>
            <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">
              Links Shortened
            </p>
          </div>
        )}

        {stats.clicks > 0 && (
          <div>
            <p className="text-2xl font-bold tabular-nums">{stats.clicks}</p>
            <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">
              Clicks Tracked
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
