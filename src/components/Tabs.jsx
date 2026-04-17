/**
 * A reusable Tab Switcher component.
 * Stylized as an inline-flex box with button-like segments.
 */
export default function Tabs({ tabs, activeTab, onTabChange, className = '' }) {
  return (
    <div className={`inline-flex rounded-md border border-(--border) bg-(--bg) p-1 ${className}`}>
      {tabs.map((tab) => (
        <button
          type="button"
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${activeTab === tab.key
              ? 'bg-(--accent-bg) text-(--text-h)'
              : 'text-(--text) hover:bg-(--social-bg)'
            }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
