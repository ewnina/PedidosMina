import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { IosTabBar } from '../ui/IosTabBar';

const tabs = [
  { id: 'dashboard', label: 'Inicio', icon: '🏠' },
  { id: 'providers', label: 'Proveedores', icon: '🏪' },
  { id: 'accounts', label: 'Cuentas', icon: '👤' },
];

export function AdminLayout(): React.JSX.Element {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const activeTab = location.pathname.split('/')[2] ?? 'dashboard';

  const handleTabChange = (tabId: string) => {
    navigate(`/admin/${tabId}`);
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7]">
      <header className="ios-header sticky top-0 z-40 px-4 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center justify-between h-[44px]">
          <div className="flex items-center gap-2">
            <span className="text-[17px] font-semibold">LunchSync</span>
            {user?.role === 'superuser' && (
              <span className="text-[11px] px-2 py-0.5 bg-[#FF9500] text-white rounded-full font-medium">
                Admin
              </span>
            )}
          </div>
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
      </header>

      <main className="p-4 pb-20">
        <Outlet />
      </main>

      <IosTabBar tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
}
