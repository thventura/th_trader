import { useState, useCallback } from 'react';
import type { Config } from '../defaultConfig';
import { defaultConfig } from '../defaultConfig';

const STORAGE_KEY = 'afiliados_config';

function loadConfig(): Config {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Config;
      if (parsed.configVersion === defaultConfig.configVersion) {
        return parsed;
      }
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore parse errors
  }
  return defaultConfig;
}

export function useConfig() {
  const [config, setConfigState] = useState<Config>(loadConfig);

  const setConfig = useCallback((newConfig: Config) => {
    setConfigState(newConfig);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
    } catch {
      // ignore storage errors
    }
  }, []);

  const updateConfig = useCallback((updater: (prev: Config) => Config) => {
    setConfigState(prev => {
      const next = updater(prev);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  const resetConfig = useCallback(() => {
    setConfigState(defaultConfig);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return { config, setConfig, updateConfig, resetConfig };
}
