import type { ButtonHTMLAttributes, ReactNode } from 'react';

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'cta' | 'gold' | 'success';
  size?: 'sm' | 'md' | 'lg';
}

const variants = {
  primary:
    'bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white border border-white/20 quiz-cta-glow quiz-hover-lift font-bold shadow-md hover:brightness-105',
  cta: 'bg-gradient-to-r from-violet-600 via-purple-600 to-pink-500 text-white border border-white/25 quiz-cta-glow quiz-hover-lift font-extrabold shadow-lg hover:brightness-105',
  gold: 'bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 text-amber-950 border border-amber-200/80 quiz-cta-glow quiz-hover-lift font-extrabold shadow-md hover:brightness-105',
  success:
    'bg-gradient-to-r from-emerald-500 to-teal-500 text-white border border-white/20 quiz-hover-lift font-bold shadow-md hover:brightness-105',
  secondary:
    'bg-white/90 text-quiz-text border-2 border-indigo-200/80 shadow-sm quiz-hover-lift hover:border-violet-400/60 hover:bg-white font-semibold',
  danger:
    'bg-red-50 text-red-700 border-2 border-red-300/70 hover:bg-red-100 font-semibold',
  ghost: 'bg-transparent text-quiz-muted hover:text-quiz-text hover:bg-white/50 font-medium',
};

const sizes = {
  sm: 'px-3 py-2 text-sm min-h-[40px] rounded-xl',
  md: 'px-5 py-3 text-base min-h-[48px] rounded-2xl',
  lg: 'px-6 py-4 text-lg min-h-[56px] rounded-2xl',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`box-border inline-flex max-w-full min-w-0 items-center justify-center gap-2 transition-[transform,box-shadow,filter,background-color] duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none whitespace-normal text-center break-words ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
