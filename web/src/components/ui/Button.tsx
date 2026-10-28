import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'ghost';

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-ink hover:bg-[#ff6b77] active:bg-[#e63e4c]',
  ghost: 'border border-line-strong text-bone hover:border-bone hover:bg-white/5 active:bg-white/10',
};

export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 px-5 font-display text-sm font-semibold tracking-[0.12em] uppercase transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
