import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { IosTabBar } from '../ui/IosTabBar';

const tabs = [
  { id: 'menu', label: 'Menu', icon: '🍽️' },
  { id: 'orders', label: 'Pedidos', icon: '📋' },
  { id: 'profile', label: 'Mi Cuenta', icon: '👤' },
];

export function EmployeeLayout(): React.JSX.Element {
  const { logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const activeTab = location.pathname.split('/')[2] ?? 'menu';

  return (
    <div className="min-h-screen bg-[var(--c-bg-base)]">
      <header className="ios-header sticky top-0 z-40 px-4 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center justify-between h-[44px]">
          <div className="flex items-center gap-2">
            <span className="text-[17px] font-semibold">MinaLunch</span>
            <span className="text-[11px] px-2 py-0.5 bg-[#34C759] text-white rounded-full font-medium">
              Empleado
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggle} className="text-[20px]">
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button
              onClick={() => {
                logout();
                navigate('/auth/login');
              }}
              className="text-[15px] text-[#FF3B30]"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="p-4 pb-20">
        <Outlet />
      </main>

      <IosTabBar tabs={tabs} activeTab={activeTab} onTabChange={(id) => navigate(`/employee/${id}`)} />
    </div>
  );
}
