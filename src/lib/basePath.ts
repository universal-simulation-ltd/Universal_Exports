// The production build always embeds Vite's base "/exports/" into asset URLs,
// but the app is reachable from two places:
//   - https://opensource.unisim.co.uk/exports/  (portal Worker path prefix)
//   - https://universalexports.app/             (Pages custom domain, at root)
// Anything computed at runtime (router basename, share/sign links, auth
// redirects) must match where THIS page load actually lives, so derive the
// prefix from the URL instead of build-time import.meta.env.BASE_URL. Asset
// loading is unaffected: public/_redirects rewrites /exports/assets/* to
// /assets/* on every host.
const pathname = window.location.pathname;
export const BASE_PATH =
  pathname === "/exports" || pathname.startsWith("/exports/") ? "/exports" : "";
