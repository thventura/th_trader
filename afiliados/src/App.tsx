import { createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Links from './pages/Links';
import Indicacoes from './pages/Indicacoes';
import Estatisticas from './pages/Estatisticas';
import Saques from './pages/Saques';
import Integracoes from './pages/Integracoes';
import Convites from './pages/Convites';
import { useConfig } from './hooks/useConfig';
import type { Config } from './defaultConfig';

interface ConfigContextType {
  config: Config;
  setConfig: (config: Config) => void;
  updateConfig: (updater: (prev: Config) => Config) => void;
  resetConfig: () => void;
}

export const ConfigContext = createContext<ConfigContextType | null>(null);

export function useConfigContext() {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error('useConfigContext must be used within ConfigProvider');
  return ctx;
}

export default function App() {
  const configState = useConfig();

  return (
    <ConfigContext.Provider value={configState}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="links" element={<Links />} />
            <Route path="indicacoes" element={<Indicacoes />} />
            <Route path="estatisticas" element={<Estatisticas />} />
            <Route path="saques" element={<Saques />} />
            <Route path="integracoes" element={<Integracoes />} />
            <Route path="convites" element={<Convites />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigContext.Provider>
  );
}
