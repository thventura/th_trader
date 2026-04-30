import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Link2,
  Users,
  BarChart2,
  Wallet,
  Plug,
  Mail,
  LogOut,
} from 'lucide-react';
import { useConfigContext } from '../App';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { path: '/links', label: 'Links', icon: Link2, end: false },
  { path: '/indicacoes', label: 'Indicações', icon: Users, end: false },
  { path: '/estatisticas', label: 'Estatísticas', icon: BarChart2, end: false },
  { path: '/saques', label: 'Saques', icon: Wallet, end: false },
  { path: '/integracoes', label: 'Integrações', icon: Plug, end: false },
  { path: '/convites', label: 'Convites', icon: Mail, end: false },
];

export default function Layout() {
  const { config } = useConfigContext();
  const inicial = config.usuario.nome.charAt(0).toUpperCase();

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#06080e' }}>
      {/* Sidebar */}
      <aside
        className="w-[210px] flex-shrink-0 flex flex-col border-r"
        style={{ backgroundColor: '#06080e', borderColor: '#162030', minHeight: '100vh', position: 'sticky', top: 0, height: '100vh' }}
      >
        {/* Logo */}
        <div className="flex items-center px-4 py-4">
          <img src="https://i.imgur.com/SgHzAr8.png" alt="Pumabroker" style={{ height: '38px', width: 'auto' }} />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-1 overflow-y-auto">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors ${
                  isActive
                    ? 'text-green-400 bg-green-500/10'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon size={15} color={isActive ? '#4ade80' : '#9ca3af'} />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="px-3 py-3 border-t" style={{ borderColor: '#162030' }}>
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
              style={{ backgroundColor: '#22c55e' }}
            >
              {inicial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate leading-tight">
                {config.usuario.nome.split(' ').slice(0, 3).join(' ')} ...
              </p>
              <p className="text-gray-400 text-xs truncate leading-tight">{config.usuario.email}</p>
            </div>
          </div>
          <button className="flex items-center gap-1.5 text-gray-400 hover:text-white text-xs mt-1 transition-colors">
            <LogOut size={13} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto" style={{ minHeight: '100vh' }}>
        <Outlet />
      </main>
    </div>
  );
}
