import { useEffect, useRef, useState } from "react";
import { languages, useI18n, type Language } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  variant?: "header" | "toolbar";
}

// Mirrors the Universal PDF Actions menu (header variant) — the dropdown that
// sits next to the product logo inside <UniversalAppsNavBar />. For Exports it
// carries the language picker and the auth controls that used to live in the
// secondary strip above the app.
export default function FileMenu({ variant = "header" }: Props) {
  const { lang, setLang } = useI18n();
  const { user, signOut } = useAuth();

  const [open, setOpen] = useState(false);
  const [langSubOpen, setLangSubOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentLang = languages.find((l) => l.code === lang) ?? languages[0];

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setLangSubOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (langSubOpen) setLangSubOpen(false);
        else setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, langSubOpen]);

  function pickLang(code: Language) {
    setLang(code);
    setLangSubOpen(false);
    setOpen(false);
  }

  const triggerClass =
    variant === "header"
      ? "h-8 px-3 rounded-md bg-secondary hover:bg-secondary/80 text-foreground text-sm font-medium ring-1 ring-border flex items-center gap-1.5"
      : "h-10 px-3 rounded bg-secondary hover:bg-secondary/80 text-foreground text-sm font-medium flex items-center gap-1.5";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={triggerClass}
        aria-haspopup="true"
        aria-expanded={open}
      >
        Actions
        <svg viewBox="0 0 12 12" className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true">
          <path d="M2 4 L6 8 L10 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-56 bg-popover text-popover-foreground rounded-lg shadow-xl border border-border z-50 overflow-hidden">
          {/* Language submenu */}
          <button
            onClick={() => setLangSubOpen((v) => !v)}
            className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-accent text-sm"
            aria-haspopup="true"
            aria-expanded={langSubOpen}
          >
            <span aria-hidden="true">{currentLang.flag}</span>
            <span className="flex-1 text-left">Language</span>
            <span className="text-[11px] text-muted-foreground uppercase tracking-wide mr-1">{currentLang.code}</span>
            <svg viewBox="0 0 12 12" className={`w-3 h-3 transition-transform ${langSubOpen ? "-rotate-90" : ""}`} aria-hidden="true">
              <path d="M4 2 L8 6 L4 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {langSubOpen && (
            <div className="border-t border-border bg-muted/40">
              {languages.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => pickLang(l.code)}
                  className={`w-full flex items-center gap-3 pl-8 pr-3 py-2 text-sm transition-colors ${
                    l.code === lang
                      ? "text-primary font-medium bg-primary/10"
                      : "text-foreground hover:bg-accent"
                  }`}
                >
                  <span aria-hidden="true">{l.flag}</span>
                  <span className="flex-1 text-left">{l.label}</span>
                  {l.code === lang && <span aria-hidden="true">✓</span>}
                </button>
              ))}
            </div>
          )}

          {/* Account — signed-in users still see their email + sign-out so
              they can leave the session, but anonymous visitors no longer get
              a "Sign in" prompt. Saving projects to the cloud is currently
              gated by sign-in elsewhere; the eventual model is to keep the
              app free to use and only ask for payment when saving. */}
          {user && (
            <>
              <div
                className="px-3 py-2 text-[11px] text-muted-foreground border-t border-border truncate"
                title={user.email ?? ""}
              >
                {user.email}
              </div>
              <button
                onClick={() => {
                  setOpen(false);
                  void signOut();
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-accent text-sm border-t border-border"
              >
                <span aria-hidden="true">⎋</span>
                <span className="flex-1 text-left">Sign out</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
