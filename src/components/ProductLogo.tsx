// Universal Exports brand icon — icon-only by design. The SDK's
// UniversalAppsNavBar renders the product name from the catalogue beside this
// slot, and wraps logo+name in a single home-link when App.tsx passes
// productHomeHref. So no anchor here.
import logo from "@/assets/universal-exports-icon.svg";

export default function ProductLogo() {
  return (
    <img
      src={logo}
      alt=""
      aria-hidden="true"
      className="h-7 w-auto"
    />
  );
}
