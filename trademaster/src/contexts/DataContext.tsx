import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getProfile, getOperacoes, updateProfile, rowToOp, type ProfileRow, type OperacaoRow } from '../lib/supabaseService';
import type { Op } from '../types';

interface DataContextType {
    profile: ProfileRow | null;
    operacoes: Op[];
    operacoesRaw: OperacaoRow[];
    userId: string;
    carregando: boolean;
    recarregarOps: () => Promise<void>;
    atualizarPerfil: (updates: Partial<ProfileRow>) => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

export function useData(): DataContextType {
    const ctx = useContext(DataContext);
    if (!ctx) throw new Error('useData deve ser usado dentro de <DataProvider>');
    return ctx;
}

interface DataProviderProps {
    userId: string;
    children: React.ReactNode;
}

export function DataProvider({ userId, children }: DataProviderProps) {
    const [profile, setProfile] = useState<ProfileRow | null>(null);
    const [operacoesRaw, setOperacoesRaw] = useState<OperacaoRow[]>([]);
    const [operacoes, setOperacoes] = useState<Op[]>([]);
    const [carregando, setCarregando] = useState(true);
    const mountedRef = useRef(true);

    // Carrega profile + operações uma vez
    useEffect(() => {
        mountedRef.current = true;
        let active = true;

        const carregar = async () => {
            try {
                const [p, rows] = await Promise.all([
                    getProfile(userId),
                    getOperacoes(userId),
                ]);
                if (!active) return;
                setProfile(p);
                setOperacoesRaw(rows);
                setOperacoes(rows.map(rowToOp));
            } catch (err) {
                console.error('[DataContext] Erro ao carregar dados:', err);
            } finally {
                if (active) setCarregando(false);
            }
        };

        carregar();
        return () => { active = false; mountedRef.current = false; };
    }, [userId]);

    const recarregarOps = useCallback(async () => {
        try {
            const rows = await getOperacoes(userId);
            if (mountedRef.current) {
                setOperacoesRaw(rows);
                setOperacoes(rows.map(rowToOp));
            }
        } catch (err) {
            console.error('[DataContext] Erro ao recarregar operações:', err);
        }
    }, [userId]);

    const atualizarPerfil = useCallback(async (updates: Partial<ProfileRow>) => {
        try {
            const resultado = await updateProfile(userId, updates);
            if (mountedRef.current && resultado) {
                setProfile(prev => prev ? { ...prev, ...updates, updated_at: new Date().toISOString() } : prev);
            }
        } catch (err) {
            console.error('[DataContext] Erro ao atualizar perfil:', err);
        }
    }, [userId]);

    // Escuta evento global de ops atualizadas (disparado pelos syncs Puma)
    useEffect(() => {
        const handler = () => { recarregarOps(); };
        window.addEventListener('apex-trader:ops-updated', handler);
        return () => window.removeEventListener('apex-trader:ops-updated', handler);
    }, [recarregarOps]);

    return (
        <DataContext.Provider value={{
            profile,
            operacoes,
            operacoesRaw,
            userId,
            carregando,
            recarregarOps,
            atualizarPerfil,
        }}>
            {children}
        </DataContext.Provider>
    );
}
