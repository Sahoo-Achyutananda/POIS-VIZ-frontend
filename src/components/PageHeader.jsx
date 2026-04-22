import NavSidebar from './NavSidebar'

/**
 * Consistent top-level header bar used on every PA page.
 * Renders inside the page's main section bounding box.
 *
 * Usage in a page:
 *   <PageHeader title="CS8.401 Minicrypt Clique Explorer - PA3: CPA Basics" />
 */
export default function PageHeader({ title }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-(--border) bg-(--social-bg) px-3 py-2">
      <NavSidebar />
      <strong className="text-sm text-(--text-h)">{title}</strong>
    </div>
  )
}
