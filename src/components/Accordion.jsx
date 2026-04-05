import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Accordion({ title, subtitle,subItems }) {
  const [isOpen, setIsOpen] = useState(false)
  const [openNested, setOpenNested] = useState({})
  const navigate = useNavigate()

  const handleNavigate = (l) => {
    if (l) navigate(l)
  }

  const toggleNested = (idx) => {
    setOpenNested((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }))
  }

  return (
    <div className="overflow-hidden rounded-md border border-(--border) bg-(--bg) transition-all duration-300 hover:border-(--accent-border) hover:shadow-(--shadow)">
      <div
        className="group flex cursor-pointer items-start justify-between gap-4 p-5"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex-1 text-left">
          <h3 className="m-0 text-lg font-semibold text-(--text-h)">{title}</h3>
          <p className="mt-1 text-sm text-(--text)/80">{subtitle}</p>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`inline-block text-lg text-(--accent) transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`}
            aria-hidden="true"
          >
            ›
          </span>
        </div>
      </div>

      <div
        className={`grid transition-all duration-300 ease-out ${
          isOpen
            ? 'grid-rows-[1fr] border-t border-(--border) opacity-100'
            : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          {subItems && subItems.length > 0 ? (
            <div className="space-y-3 p-4">
              {subItems.map((subItem, idx) => (
                subItem.children && subItem.children.length > 0 ? (
                  <div
                    key={idx}
                    className="overflow-hidden rounded-md border border-(--border) bg-(--social-bg)"
                  >
                    <button
                      type="button"
                      className="flex w-full items-start justify-between gap-3 p-3 text-left transition-all duration-200 hover:bg-(--accent-bg)/25"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleNested(idx)
                      }}
                    >
                      <span className="min-w-0">
                        <p className="m-0 text-sm font-medium text-(--text-h)">{subItem.title}</p>
                        <p className="mt-1 text-xs leading-relaxed text-(--text)/80">{subItem.description}</p>
                      </span>
                      <span
                        className={`inline-block shrink-0 text-sm text-(--accent) transition-transform duration-300 ${openNested[idx] ? 'rotate-90' : ''}`}
                        aria-hidden="true"
                      >
                        ›
                      </span>
                    </button>

                    <div
                      className={`grid transition-all duration-300 ease-out ${
                        openNested[idx]
                          ? 'grid-rows-[1fr] border-t border-(--border) opacity-100'
                          : 'grid-rows-[0fr] opacity-0'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="space-y-2 p-3">
                          {subItem.children.map((child, childIdx) => (
                            <button
                              key={childIdx}
                              type="button"
                              className="w-full rounded-md border border-(--border) bg-(--bg) p-2.5 text-left transition-all duration-200 hover:border-(--accent-border) hover:bg-(--accent-bg)/30"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleNavigate(child.link)
                              }}
                            >
                              <p className="m-0 text-sm font-medium text-(--text-h)">{child.title}</p>
                              <p className="mt-1 text-xs leading-relaxed text-(--text)/80">{child.description}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    key={idx}
                    className="w-full rounded-md border border-(--border) bg-(--social-bg) p-3 text-left transition-all duration-200 hover:border-(--accent-border) hover:bg-(--accent-bg)/30"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleNavigate(subItem.link)
                    }}
                  >
                    <p className="m-0 text-sm font-medium text-(--text-h)">{subItem.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-(--text)/80">
                      {subItem.description}
                    </p>
                  </button>
                )
              ))}
            </div>
          ) : (
            <p className="p-4 text-sm text-(--text)/80">No sub-items yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
