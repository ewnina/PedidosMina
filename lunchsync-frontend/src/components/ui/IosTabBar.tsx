import React from 'react';

interface Tab {
  id: string;
  label: string;
  icon: string;
}

interface IosTabBarProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function IosTabBar({ tabs, activeTab, onTabChange }: IosTabBarProps): React.JSX.Element {
  return (
    <nav className="ios-tabbar fixed bottom-0 left-0 right-0 safe-bottom z-50">
      <div className="flex justify-around items-center h-[50px]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              activeTab === tab.id ? 'text-[var(--c-accent)]' : 'text-[var(--c-text-secondary)]'
            }`}
          >
            <span className="text-[24px]">{tab.icon}</span>
            <span className="text-[10px] mt-0.5">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
