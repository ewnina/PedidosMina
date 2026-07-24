import React from 'react';

interface IosCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function IosCard({ children, className = '', onClick }: IosCardProps): React.JSX.Element {
  return (
    <div
      onClick={onClick}
      className={`ios-card p-4 transition-transform active:scale-[0.98] ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
