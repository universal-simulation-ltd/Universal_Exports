import { useEffect, useRef, useState } from "react";
import { languages, useI18n, type Language } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { AdvancedMenu } from "@unisim/sdk";

interface Props {
  variant?: "header" | "toolbar" | "rows";
}

// The Actions menu that used to sit next to the product logo inside
// <UniversalAppsNavBar />. Since the merge it renders as `rows` inside the SDK's
// profile pill instead — one control on the right rather than an Actions button
// on the left and an avatar on the right.
//
// `rows` returns the body with NO trigger and NO panel, for the SDK's `actions`
// slot. The "header"/"toolbar" variants keep their own trigger + panel and are
// unchanged, so any call-site still using them behaves exactly as before.
//
// Two things deliberately do NOT appear in the rows variant:
//   • The account block (email + sign out). The SDK's own profile section sits
//     directly beneath these rows and already carries both, off the same
//     Supabase session — in one panel it read as the email twice and two
//     sign-outs.
//   • Nothing replaces the language picker: it stays here, and the app passes
//     `showLanguageSelector={false}` to the navbar so the SDK's row stands down.
//     This picker is the one that actually translates Exports.
export default function FileMenu({ variant = "header" }: Props) {
  const { lang, setLang } = useI18n();
  const { user, signOut } = useAuth();

  const [open, setOpen] = useState(false);
  const [langSubOpen, setLangSubOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentLang = languages.find((l) => l.code === lang) ?? languages[0];
  const asRows = variant === "rows";

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

  // The rows themselves. Inline-styled rather than Tailwind in the `rows`
  // variant: they render inside SDK chrome, so they follow the SDK dropdown's
  // rhythm (8px/14px padding, 13px label) instead of ours. The submenu expands
  // in place — the SDK panel has no room for a flyout.
  const body = asRows ? (
    <>
      <button
        type="button"
        role="menuitem"
        onClick={() => setLangSubOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={langSubOpen}
        style={rowStyle}
        onMouseEnter={rowHoverIn}
        onMouseLeave={rowHoverOut}
      >
        <span aria-hidden="true">{currentLang.flag}</span>
        <span style={{ flex: 1, minWidth: 0, fontWeight: 500 }}>Language</span>
        <span style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          {currentLang.code}
        </span>
        <svg
          viewBox="0 0 12 12"
          width="12"
          height="12"
          aria-hidden="true"
          style={{
            flexShrink: 0,
            transform: langSubOpen ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 150ms cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          <path d="M4 2 L8 6 L4 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {langSubOpen &&
        languages.map((l) => (
          <button
            key={l.code}
            type="button"
            role="menuitem"
            onClick={() => pickLang(l.code)}
            style={{
              ...rowStyle,
              paddingLeft: 34,
              fontWeight: l.code === lang ? 600 : 400,
              color: l.code === lang ? "#c2410c" : REST_COLOR,
              background: l.code === lang ? "#fff7ed" : "transparent",
            }}
            onMouseEnter={(e) => {
              if (l.code === lang) return;
              e.currentTarget.style.background = "#f3f4f6";
            }}
            onMouseLeave={(e) => {
              if (l.code === lang) return;
              e.currentTarget.style.background = "transparent";
            }}
          >
            <span aria-hidden="true">{l.flag}</span>
            <span style={{ flex: 1, minWidth: 0 }}>{l.label}</span>
            {l.code === lang && <span aria-hidden="true">✓</span>}
          </button>
        ))}

      {/* Advanced — the SDK's own category, so every app in the suite has one
          in the same place. Only the rows branch gets it: that is the variant
          <UniversalAppsNavBar actions> renders, and the standalone dropdown
          below is the legacy trigger this app no longer mounts.

          ⚠ privacy={false} on purpose. Universal Exports keeps agreements in a
          database so the other side of a trade can reach them — "never leaves
          this computer" would be false, and false in the one dialog somebody
          opens to check. */}
      <AdvancedMenu
        about={{
          repo:    "https://github.com/universal-simulation-ltd/Universal_Exports",
          privacy: false,
        }}
      />
    </>
  ) : (
    <>
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
    </>
  );

  if (asRows) return body;

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
          {body}
        </div>
      )}
    </div>
  );
}

const REST_COLOR = "#374151";

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  width: "100%",
  padding: "8px 14px",
  fontSize: 13,
  fontFamily: "inherit",
  textAlign: "left",
  border: 0,
  background: "transparent",
  color: REST_COLOR,
  cursor: "pointer",
  transition: "background 120ms, color 120ms",
};

function rowHoverIn(e: React.MouseEvent<HTMLElement>) {
  e.currentTarget.style.background = "#f3f4f6";
}
function rowHoverOut(e: React.MouseEvent<HTMLElement>) {
  e.currentTarget.style.background = "transparent";
}
