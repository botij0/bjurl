import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getShortCode } from "@/lib/short-code";

export const QrCodePanel = ({ url }: { url: string }) => {
  const [dataUrl, setDataUrl] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;

    QRCode.toDataURL(url, { width: 512, margin: 2 })
      .then((value) => {
        if (active) setDataUrl(value);
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      active = false;
    };
  }, [url]);

  const handleDownload = () => {
    if (!dataUrl) return;

    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `bjurl-${getShortCode(url)}-qr.png`;
    link.click();
  };

  return (
    <div className="mt-4 flex flex-col items-center gap-3">
      {failed ? (
        <p className="text-sm text-destructive">
          Could not generate the QR code, please try again
        </p>
      ) : dataUrl ? (
        <img
          src={dataUrl}
          alt={`QR code for ${url}`}
          className="w-44 h-44 rounded-lg border border-border bg-white p-2"
        />
      ) : (
        <div className="w-44 h-44 rounded-lg border border-border bg-secondary animate-pulse" />
      )}

      <Button
        size="sm"
        variant="outline"
        onClick={handleDownload}
        disabled={!dataUrl}
      >
        <Download className="w-4 h-4" />
        Download PNG
      </Button>
    </div>
  );
};
