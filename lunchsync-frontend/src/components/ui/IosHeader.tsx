import React from 'react';

interface IosHeaderProps {
  title: string;
  subtitle?: string;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
}

export function IosHeader({ title, subtitle, leftAction, rightAction }: IosHeaderProps): React.JSX.Element {
  return (
    <header className="ios-header sticky top-0 z-40 px-4 pt-[env(safe-area-inset-top)]">
      <div className="flex items-center justify-between h-[44px]">
        {leftAction ?? <div className="w-[60px]" />}
        <div className="flex-1 text-center">
          {!subtitle && (
            <h1 className="text-[17px] font-semibold">{title}</h1>
          )}
        </div>
        {rightAction ?? <div className="w-[60px]" />}
      </div>
      {subtitle && (
        <div className="pb-2">
          <h1 className="text-[34px] font-bold">{title}</h1>
          {subtitle && <p className="text-[13px] text-[#8E8E93] mt-1">{subtitle}</p>}
        </div>
      )}
    </header>
  );
}
