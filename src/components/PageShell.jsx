/**
 * Thin shell wrapper kept for route wrapping in main.jsx.
 * The NavSidebar is now injected per-page via <PageHeader>.
 */
export default function PageShell({ children }) {
  return <>{children}</>
}
