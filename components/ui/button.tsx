import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center font-sans font-medium rounded-lg transition-all duration-150 cursor-pointer select-none active:scale-98 disabled:opacity-40 disabled:pointer-events-none disabled:active:scale-100',
  {
    variants: {
      variant: {
        default: 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text-on)] shadow-xs font-semibold',
        outline: 'border border-[var(--border-strong)] bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] shadow-3xs',
        secondary: 'bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-default)] hover:border-[var(--border-strong)] shadow-3xs',
        ghost: 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]',
        destructive: 'bg-[var(--danger)] hover:bg-[var(--danger-hover)] text-white shadow-xs font-semibold',
        link: 'bg-transparent text-[var(--accent)] hover:underline p-0 rounded-none inline-flex hover:text-[var(--accent-hover)]',
      },
      size: {
        default: 'h-9 px-4 py-2 text-sm',
        xs: 'h-7 px-2.5 rounded-md text-3xs font-mono uppercase tracking-wider',
        sm: 'h-8 px-3 rounded-md text-xs',
        lg: 'h-10 px-5 rounded-lg text-sm',
        icon: 'h-9 w-9 p-0 flex items-center justify-center shrink-0',
        'icon-xs': 'h-7 w-7 p-0 rounded-md flex items-center justify-center shrink-0',
        'icon-sm': 'h-8 w-8 p-0 rounded-md flex items-center justify-center shrink-0',
        'icon-lg': 'h-10 w-10 p-0 rounded-lg flex items-center justify-center shrink-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Button, buttonVariants }
