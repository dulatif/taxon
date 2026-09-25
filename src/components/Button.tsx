import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-interactive-primary hover:bg-interactive-primary-hover text-interactive-primary-text border-transparent',
  secondary: 'bg-surface-secondary hover:bg-surface-hover text-text-primary border-transparent',
  outline: 'bg-transparent border-border-primary hover:bg-surface-secondary text-text-primary',
  ghost:
    'bg-transparent border-transparent hover:bg-surface-secondary text-text-muted hover:text-text-primary',
  danger:
    'bg-red-50 hover:bg-red-100 text-red-800 border-transparent dark:bg-red-500/10 dark:hover:bg-red-500/20 dark:text-red-400',
  success:
    'bg-green-50 hover:bg-green-100 text-green-800 border-transparent dark:bg-green-500/10 dark:hover:bg-green-500/20 dark:text-green-400',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
  icon: 'p-1.5',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center gap-2 rounded-sm font-medium transition-all
        border outline-none focus-visible:ring-2 focus-visible:ring-interactive-primary/50
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `.trim()}
    >
      {children}
    </button>
  );
}
