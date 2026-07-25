import React from 'react';

interface IosButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'destructive' | 'plain';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  type?: 'button' | 'submit';
}

const variants = {
  primary: 'bg-[#34C759] text-white active:bg-[#10B981] dark:bg-[#30D158] dark:text-black dark:active:bg-[#28B34A]',
  secondary: 'bg-[var(--c-bg-input)] text-[var(--c-text-primary)] active:bg-[color-mix(in_srgb,var(--c-bg-input)_85%,var(--c-text-primary))]',
  destructive: 'bg-[#FF3B30] text-white active:bg-[#CC2F26]',
  plain: 'bg-transparent text-[var(--c-accent)] active:bg-[var(--c-bg-input)]',
};

const sizes = {
  small: 'px-3 py-1.5 text-[13px]',
  medium: 'px-4 py-2.5 text-[15px]',
  large: 'px-6 py-3 text-[17px]',
};

export function IosButton({
  children,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  onClick,
  className = '',
  type = 'button',
}: IosButtonProps): React.JSX.Element {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full font-medium transition-all active:scale-[0.97] ${variants[variant]} ${sizes[size]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </button>
  );
}
