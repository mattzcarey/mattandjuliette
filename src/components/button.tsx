import { Button as BaseButton } from '@base-ui/react'
import type { ComponentPropsWithoutRef } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

type ButtonProps = ComponentPropsWithoutRef<typeof BaseButton> & {
  variant?: ButtonVariant
  size?: ButtonSize
}

const baseClass =
  'inline-flex items-center justify-center rounded-md font-semibold transition disabled:pointer-events-none disabled:opacity-60'

const variantClass: Record<ButtonVariant, string> = {
  primary: 'bg-stone-950 text-white shadow-sm hover:bg-stone-700',
  secondary: 'border border-border bg-card text-foreground hover:bg-muted',
  ghost: 'text-foreground hover:text-primary',
  danger: 'bg-rose-700 text-white shadow-sm hover:bg-rose-800',
}

const sizeClass: Record<ButtonSize, string> = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-3 text-sm',
  lg: 'px-5 py-3 text-sm',
}

export function Button({ className, size = 'md', variant = 'primary', ...props }: ButtonProps): React.ReactElement {
  return (
    <BaseButton
      className={[baseClass, variantClass[variant], sizeClass[size], className].filter(Boolean).join(' ')}
      {...props}
    />
  )
}
