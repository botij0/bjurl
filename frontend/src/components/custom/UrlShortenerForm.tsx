import { useState } from "react";
import { Link2, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// import ShortenedResult from "./ShortenedResult";

export const UrlShortenerForm = () => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log(e)
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Paste your long URL here..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="pl-12 h-14 bg-secondary/50 border-border/60 text-foreground placeholder:text-muted-foreground font-mono text-sm focus-visible:ring-primary/40 focus-visible:border-primary/40 rounded-lg"
            />
          </div>
          <Button
            type="submit"
            disabled={loading || !url.trim()}
            className="h-14 px-8 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-lg glow-border transition-all duration-300 disabled:opacity-40"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Shorten
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </form>

      {/* {shortUrl && <ShortenedResult shortUrl={shortUrl} originalUrl={originalUrl} />} */}
    </div>
  );
};