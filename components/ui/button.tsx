'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ring-offset-background active:translate-y-px',
  {
    variants: {
      variant: {
        default:
          'text-white bg-gradient-to-br from-[#1D8B94] to-[#10606F] shadow-[0_10px_22px_-14px_rgba(16,96,111,0.9)] hover:brightness-110',
        destructive: 'text-white bg-[#F43F5E] hover:brightness-110',
        outline: 'bg-white text-[#0A3D4A] ring-1 ring-inset ring-[#98D8D0]/70 hover:bg-[#F4FAF8]',
        secondary: 'bg-[#E2F4F0] text-[#10606F] hover:bg-[#D6EEEA]',
        ghost: 'text-[#0A3D4A] hover:bg-[#E2F4F0]/70',
        link: 'text-[#10606F] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3 text-[12px]',
        lg: 'h-11 px-6',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  ),
);
Button.displayName = 'Button';

export { Button, buttonVariants };
