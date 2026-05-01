import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { accordionData } from '../data/accordian_data'
import { ArrowRight, ArrowLeft, ChevronRight } from 'lucide-react'

/**
 * Slide-out sidebar drawer showing the full homepage accordion tree.
 * Trigger: hamburger button injected into the page header.
 */
export default function NavSidebar() {
  const [open, setOpen] = useState(false)
  const [openPart, setOpenPart] = useState({})
  const [openNested, setOpenNested] = useState({})
  const navigate = useNavigate()
  const location = useLocation()

  const togglePart = (idx) =>
    setOpenPart((prev) => ({ ...prev, [idx]: !prev[idx] }))

  const toggleNested = (partIdx, itemIdx) =>
    setOpenNested((prev) => ({
      ...prev,
      [`${partIdx}-${itemIdx}`]: !prev[`${partIdx}-${itemIdx}`],
    }))

  const go = (link) => {
    if (link) {
      navigate(link)
      setOpen(false)
    }
  }

  return (
    <>
      {/* Hamburger trigger button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        className="flex items-center justify-center w-7 h-7 rounded-md border border-(--border) bg-(--bg) hover:border-(--accent-border) hover:bg-(--accent-bg) transition-all"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect y="1"  width="14" height="1.5" rx="0.75" fill="currentColor" className="text-(--text-h)" />
          <rect y="6"  width="14" height="1.5" rx="0.75" fill="currentColor" className="text-(--text-h)" />
          <rect y="11" width="14" height="1.5" rx="0.75" fill="currentColor" className="text-(--text-h)" />
        </svg>
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 left-0 z-[400] h-full w-80 bg-(--bg) border-r border-(--border) shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between border-b border-(--border) bg-(--accent-bg) px-4 py-3 flex-shrink-0">
          <span
            className="text-sm font-semibold text-(--text-h) cursor-pointer hover:text-(--accent) transition-colors"
            onClick={() => go('/')}
          >
            POIS Project
          </span>
          <button
            onClick={() => setOpen(false)}
            className="text-[11px] font-bold text-slate-400 hover:text-(--text-h) uppercase tracking-widest transition-colors"
          >
            Close
          </button>
        </div>

        {/* Scrollable tree */}
        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-2">
          {/* Clique Explorer — direct bar, no expansion */}
          <button
            type="button"
            onClick={() => go('/clique-explorer')}
            className={`group w-full rounded-md border px-3 py-2.5 text-left transition-all duration-200 ${
              location.pathname === '/clique-explorer'
                ? 'border-amber-400/60 bg-amber-500/15'
                : 'border-amber-500/25 bg-amber-500/5 hover:border-amber-400/50 hover:bg-amber-500/10'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex-1 min-w-0">
                <p className="m-0 text-[10px] font-black uppercase tracking-widest text-amber-400/70 mb-0.5">Unified Explorer</p>
                <p className={`m-0 text-xs font-semibold leading-snug ${location.pathname === '/clique-explorer' ? 'text-amber-200' : 'text-amber-100/80 group-hover:text-amber-100'}`}>
                  Minicrypt Clique Explorer
                </p>
              </span>
              <ArrowRight className="w-4 h-4 shrink-0 text-amber-400/60 group-hover:text-amber-300 transition-all duration-200 group-hover:translate-x-0.5" />
            </div>
          </button>

          {accordionData.map((part, partIdx) => (
            <div
              key={partIdx}
              className="overflow-hidden rounded-md border border-(--border) bg-(--bg) transition-all duration-200 hover:border-(--accent-border)"
            >
              {/* Part header */}
              <button
                type="button"
                className="flex w-full items-start justify-between gap-3 p-3 text-left hover:bg-(--accent-bg)/25 transition-colors"
                onClick={() => togglePart(partIdx)}
              >
                <span className="flex-1 min-w-0">
                  <p className="m-0 text-xs font-semibold text-(--text-h) leading-snug">{part.title}</p>
                  <p className="mt-0.5 text-[10px] leading-snug text-(--text)/70">{part.subtitle}</p>
                </span>
                <ChevronRight
                  className={`w-4 h-4 shrink-0 text-(--accent) transition-transform duration-200 ${openPart[partIdx] ? 'rotate-90' : ''}`}
                />
              </button>

              {/* Part items */}
              <div
                className={`grid transition-all duration-300 ease-out ${
                  openPart[partIdx]
                    ? 'grid-rows-[1fr] border-t border-(--border) opacity-100'
                    : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="overflow-hidden">
                  <div className="space-y-1.5 p-2">
                    {part.subItems?.map((item, itemIdx) =>
                      item.children && item.children.length > 0 ? (
                        // Sub-accordion (nested)
                        <div
                          key={itemIdx}
                          className="overflow-hidden rounded border border-(--border) bg-(--social-bg)"
                        >
                          <button
                            type="button"
                            className="flex w-full items-start justify-between gap-2 px-2.5 py-2 text-left hover:bg-(--accent-bg)/20 transition-colors"
                            onClick={() => toggleNested(partIdx, itemIdx)}
                          >
                            <span className="flex-1 min-w-0">
                              <p className="m-0 text-[11px] font-medium text-(--text-h) leading-snug">{item.title}</p>
                            </span>
                            <ChevronRight
                              className={`w-3.5 h-3.5 shrink-0 text-(--accent) transition-transform duration-200 ${
                                openNested[`${partIdx}-${itemIdx}`] ? 'rotate-90' : ''
                              }`}
                            />
                          </button>

                          <div
                            className={`grid transition-all duration-300 ease-out ${
                              openNested[`${partIdx}-${itemIdx}`]
                                ? 'grid-rows-[1fr] border-t border-(--border) opacity-100'
                                : 'grid-rows-[0fr] opacity-0'
                            }`}
                          >
                            <div className="overflow-hidden">
                              <div className="space-y-1 p-2">
                                {item.children.map((child, childIdx) => (
                                  <button
                                    key={childIdx}
                                    type="button"
                                    onClick={() => go(child.link)}
                                    className={`w-full rounded border px-2.5 py-1.5 text-left transition-all duration-150 text-[10px] font-medium ${
                                      location.pathname === child.link
                                        ? 'border-(--accent) bg-(--accent-bg) text-(--accent)'
                                        : 'border-(--border) bg-(--bg) text-(--text-h) hover:border-(--accent-border) hover:bg-(--accent-bg)/20'
                                    }`}
                                  >
                                    {child.title}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        // Leaf item
                        <button
                          key={itemIdx}
                          type="button"
                          onClick={() => go(item.link)}
                          className={`w-full rounded border px-2.5 py-2 text-left transition-all duration-150 ${
                            location.pathname === item.link
                              ? 'border-(--accent) bg-(--accent-bg) text-(--accent)'
                              : 'border-(--border) bg-(--social-bg) text-(--text-h) hover:border-(--accent-border) hover:bg-(--accent-bg)/20'
                          }`}
                        >
                          <p className="m-0 text-[11px] font-medium leading-snug">{item.title}</p>
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Back to home */}
        <div className="flex-shrink-0 border-t border-(--border) p-3">
          <button
            onClick={() => go('/')}
            className="w-full rounded-md border border-(--border) bg-(--social-bg) px-3 py-2 text-[11px] font-semibold text-(--text-h) hover:border-(--accent-border) hover:bg-(--accent-bg)/30 transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5 inline mr-1" /> Back to Homepage
          </button>
        </div>
      </div>
    </>
  )
}
