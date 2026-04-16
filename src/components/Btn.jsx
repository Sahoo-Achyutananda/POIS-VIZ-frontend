/**
 * Reusable Button — matches the project-wide PA1/PA2/PA3 accent style.
 *
 * Props:
 *   variant  : 'primary' (default) | 'secondary' | 'ghost'
 *   size     : 'sm' | 'md' (default) | 'lg'
 *   fullWidth: boolean
 *   ...rest  : any native <button> prop (onClick, disabled, type, etc.)
 */
export default function Btn({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  ...rest
}) {
  const base =
    'inline-flex items-center justify-center rounded-md border font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-(--shadow) active:translate-y-0 disabled:cursor-wait disabled:opacity-60 select-none'

  const variants = {
    primary:   'border-(--accent-border) bg-(--accent-bg)   text-(--text-h)',
    secondary: 'border-(--border)        bg-(--social-bg)   text-(--text-h)  hover:border-(--accent-border)',
    ghost:     'border-(--border)        bg-transparent      text-(--text)    hover:bg-(--social-bg)',
  }

  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-2.5 text-sm',
  }

  const width = fullWidth ? 'w-full' : 'w-fit'

  return (
    <button
      type="button"
      className={`${base} ${variants[variant] ?? variants.primary} ${sizes[size] ?? sizes.md} ${width} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
