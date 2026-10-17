import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10.5px] font-bold tracking-[0.02em] transition-colors focus:outline-none',
  {
    variants: {
      variant: {
        default: 'bg-[#0A3D4A] text-[#E2F4F0]',
        secondary: 'bg-[#E2F4F0] text-[#10606F]',
        destructive: 'bg-[#FDE7EC] text-[#B3253F]',
        outline: 'text-[#0A3D4A] ring-1 ring-inset ring-[#98D8D0]/60',
        info: 'bg-[#E2F4F0] text-[#10606F]',
        success: 'bg-[#DCF7EE] text-[#0F6B55]',
        warning: 'bg-[#FFF5E4] text-[#8A5408]',
        danger: 'bg-[#FDE7EC] text-[#B3253F]',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
