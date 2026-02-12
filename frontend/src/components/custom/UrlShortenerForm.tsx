import { toast } from "sonner";
import { Link2, ArrowRight, Loader2 } from "lucide-react";
import { useRef, useState, type KeyboardEvent } from "react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createShortUrl } from "@/actions/create-short-url.action";
import { ShortenedResult } from "./ShortenedResult";


export const UrlShortenerForm = () => {
  const [loading, setLoading] = useState(false);
  const [shortUrl, setShortUrl] = useState("");
  const [originalUrl, setOriginalUrl] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    handleShortenUrl();
  };

  const handleShortenUrl = async () => {
    const url = inputRef.current?.value;

    if (!url) return;
    setLoading(true)
    // Todo verify that match an url pattern.

    const urlResponse = await createShortUrl(url.trim());
    if (!urlResponse) {
      toast.error("Something went wrong, please try again", { position: "top-center" })
      setLoading(false)
      return
    }
    setShortUrl(`${import.meta.env.VITE_API_URL}/${urlResponse.shortUrl}`);
    setOriginalUrl(urlResponse.originalUrl);
    setLoading(false)
  };

  return (
    <div className="w-full max-w-2xl mx-auto">

      <div className="flex gap-3 flex-col sm:flex-row">
        <div className="relative flex-1">
          <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Paste your long URL here..."
            ref={inputRef}
            onKeyDown={handleKeyDown}
            className="pl-12 h-14 bg-secondary border-primary/50 text-foreground placeholder:text-muted-foreground font-mono text-sm focus-visible:ring-primary/50 focus-visible:border-primary/80 rounded-lg"
          />
        </div>
        <Button
          onClick={handleShortenUrl}
          className="h-14 px-8 glow-border border dark:border-accent/30 transition-all duration-300 dark:text-secondary-foreground dark:bg-background"
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

      {shortUrl && <ShortenedResult shortUrl={shortUrl} originalUrl={originalUrl} />}
    </div>
  );
};