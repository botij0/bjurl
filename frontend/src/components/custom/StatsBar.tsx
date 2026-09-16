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

  return (
    <div className="flex items-center justify-center gap-12 mt-16">
      {stats && stats.urls > 0 && (
        <div className="text-center">
          <p className="text-2xl font-bold text-gradient">{stats.urls}</p>
          <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">
            Links Shortened
          </p>
        </div>
      )}

      {stats && stats.clicks > 0 && (
        <div className="text-center">
          <p className="text-2xl font-bold text-gradient">{stats.clicks}</p>
          <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">
            Clicks Tracked
          </p>
        </div>
      )}
    </div>
  );
};
