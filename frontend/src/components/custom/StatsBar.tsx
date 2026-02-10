import { useEffect, useState } from "react";
import { getStats } from "@/actions/get-stats.action";

export const StatsBar = () => {
  const [stats, setStats] = useState<{ label: string; value: string }[]>([]);

  useEffect(() => {
    getStats().then((data) => setStats(data));
  }, []);

  return (
    <div className="flex items-center justify-center gap-12 mt-16">
      {stats.map((stat) => (
        <div key={stat.label} className="text-center">
          <p className="text-2xl font-bold text-gradient">{stat.value}</p>
          <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">
            {stat.label}
          </p>
        </div>
      ))}
    </div>
  );
};