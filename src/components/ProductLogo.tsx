// Universal Exports wordmark — the click target the SuiteSwitcher dropdown
// attaches to inside <UniversalAppsNavBar />.
import logo from "@/assets/universal-exports-logo.svg";

export default function ProductLogo() {
  return (
    <a
      href="/"
      aria-label="Universal Exports — home"
      className="inline-flex items-center no-underline px-1 py-0.5 rounded-md hover:bg-slate-50 transition-transform duration-200 ease-out hover:scale-[1.02] origin-left"
    >
      <img src={logo} alt="Universal Exports" className="h-7 w-auto" />
    </a>
  );
}
