import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Loader2, RotateCcw, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import StyledQRCode from "@/components/StyledQRCode";
import {
  createSignatureToken,
  listSignatureTokens,
  type AgreementSignature,
} from "@/lib/signatureStore";

interface Props {
  projectId:   string;
  projectName: string;
}

/**
 * Drafter-side panel for the "They Sign" tab on the Export Agreement page.
 *
 * - On mount, loads any existing tokens for this project. If there's a
 *   `signed` row, surface the counter-signature.
 * - Otherwise, offer a "Generate counter-sign link" button. Once generated,
 *   show the QR code + copyable URL.
 * - Polls every 8 s while a token is pending so the panel auto-updates when
 *   the other party signs without a manual refresh.
 */
const CounterSignPanel = ({ projectId, projectName }: Props) => {
  const [tokens,      setTokens]      = useState<AgreementSignature[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [generating,  setGenerating]  = useState(false);

  // The hardcoded "Example" project lives only client-side and is never saved to
  // the backend, so there's nothing to attach a real token to (and creating one
  // would just leave an orphan row). Detect it the same way the rest of the app
  // does (the `demo-` id prefix) and mint the token locally so the QR code and
  // link still render for the demo walkthrough.
  const isDemo = projectId.startsWith("demo-");

  // Pick the most relevant token: the latest signed one if any, else the
  // latest pending. Drafters who regenerate get the freshest pending link.
  const active = tokens.find(t => t.status === "signed")
              ?? tokens.find(t => t.status === "pending")
              ?? null;
  // Include the deploy base path ("/exports/" in production) — the app is
  // served behind the portal Worker's path prefix, so origin alone 404s.
  const signUrl = active
    ? `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, "")}/sign/${active.id}`
    : "";

  // Initial load + polling. Polling stops once we have a signed row — no
  // further state change is possible.
  useEffect(() => {
    // No backend row exists for the demo project — nothing to load or poll.
    if (isDemo) {
      setLoading(false);
      return;
    }

    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      const rows = await listSignatureTokens(projectId);
      if (!active) return;
      setTokens(rows);
      setLoading(false);
      const stillPending = rows.some(r => r.status === "pending");
      if (stillPending) {
        timer = setTimeout(tick, 8000);
      }
    };
    tick();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [projectId, isDemo]);

  const handleGenerate = async () => {
    if (!projectId) {
      toast.error("Save the project first so we can attach the link to it.");
      return;
    }
    // Demo project: mint a token client-side instead of hitting Supabase. The
    // demo project isn't persisted, so a backend token would just be an orphan
    // row. The QR + link still render so the walkthrough is complete.
    if (isDemo) {
      const row: AgreementSignature = {
        id: crypto.randomUUID(),
        project_id: projectId,
        user_id: null,
        project_name: projectName,
        status: "pending",
        counter_signer_name: "",
        counter_signer_signature: "",
        counter_signed_at: null,
        viewed_pdf_at: null,
        created_at: new Date().toISOString(),
      };
      setTokens(prev => [row, ...prev]);
      toast.success("Counter-sign link ready — share the QR or URL with the other party.");
      return;
    }

    setGenerating(true);
    const row = await createSignatureToken({ projectId, projectName });
    setGenerating(false);
    if (row) {
      setTokens(prev => [row, ...prev]);
      toast.success("Counter-sign link ready — share the QR or URL with the other party.");
    } else {
      toast.error("Could not generate a link. Make sure the project is saved and try again.");
    }
  };

  const handleCopy = async () => {
    if (!signUrl) return;
    try {
      await navigator.clipboard.writeText(signUrl);
      toast.success("Link copied to clipboard.");
    } catch {
      toast.error("Could not copy. Please copy the URL manually.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading counter-sign status…
      </div>
    );
  }

  // Completed state — counter-signature on record.
  if (active && active.status === "signed") {
    return (
      <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-center gap-2 text-emerald-700 font-semibold">
          <CheckCircle2 className="h-5 w-5" />
          Counter-signed
        </div>
        <p className="text-sm text-emerald-800">
          <strong>{active.counter_signer_name}</strong> signed on{" "}
          {active.counter_signed_at ? format(new Date(active.counter_signed_at), "PPP p") : "—"}.
        </p>
        {active.counter_signer_signature && (
          <div className="inline-block rounded-md border border-emerald-200 bg-white p-2">
            <img
              src={active.counter_signer_signature}
              alt="Counter-signature"
              className="max-h-[80px] object-contain"
            />
          </div>
        )}
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            disabled={generating}
          >
            <RotateCcw className="mr-2 h-3.5 w-3.5" />
            Send to a new signer
          </Button>
        </div>
      </div>
    );
  }

  // Pending / no-token state.
  return (
    <div className="space-y-4">
      {!active ? (
        <>
          <p className="text-sm text-muted-foreground max-w-md">
            Generate a one-time link to send to the other party. They'll be able
            to open the agreement and counter-sign it from any device.
          </p>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating…</>
            ) : (
              "Generate counter-sign link"
            )}
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground max-w-md">
            Send the QR code or the link below to the other party. The page
            below updates automatically once they sign.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <div className="rounded-2xl border border-border bg-[#0b0b0c] p-2">
              <StyledQRCode value={signUrl} size={192} aria-label="Counter-sign QR code" />
            </div>
            <div className="flex-1 space-y-2 min-w-0">
              <label className="text-xs text-muted-foreground block">Link</label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={signUrl}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="flex-1 min-w-0 rounded-md border border-input bg-secondary/50 px-3 py-2 text-xs font-mono"
                />
                <Button type="button" variant="outline" size="icon" onClick={handleCopy} aria-label="Copy link">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              {active.viewed_pdf_at ? (
                <p className="text-xs text-emerald-700">
                  Other party opened the document — awaiting signature.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Waiting for the other party to open and sign.
                </p>
              )}
              <Button type="button" variant="ghost" size="sm" onClick={handleGenerate} disabled={generating}>
                <RotateCcw className="mr-1 h-3.5 w-3.5" />
                Regenerate link
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CounterSignPanel;
