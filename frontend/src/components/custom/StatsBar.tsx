import { useEffect, useState } from "react";

import { getStats } from "@/actions/get-stats.action";
import type { Stats } from "@/interfaces/stats.interface";

export const StatsBar = () => {
  const [stats, setStats] = useState<Stats>({ urls: 0, clicks: 0 });

  useEffect(() => {
    getStats().then((data) => setStats(data));
  }, []);

  return (
    <div className="flex items-center justify-center gap-12 mt-16">
      {stats.urls > 0 && (<div className="text-center">
        <p className="text-2xl font-bold text-gradient">{stats.urls}</p>
        <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">
          Links Shortened
        </p>
      </div>
      )}

      {stats.clicks > 0 && (<div className="text-center">
        <p className="text-2xl font-bold text-gradient">{stats.clicks}</p>
        <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">
          Clicks Tracked
        </p>
      </div>)}
    </div>
  );
};