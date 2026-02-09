const stats = [
  { label: "Links Shortened", value: "2.4M+" },
  { label: "Clicks Tracked", value: "18B+" },
  { label: "Uptime", value: "99.9%" },
];

export const StatsBar = () => {
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