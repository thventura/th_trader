import { supabase } from './supabase';
import type { Op } from '../types';

// ─── Cache em memória com TTL + deduplicação de requisições ─────────
const cache = new Map<string, { data: any; expira: number }>();
const pendentes = new Map<string, Promise<any>>();

function comCache<T>(chave: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
    const cached = cache.get(chave);
    if (cached && Date.now() < cached.expira) return Promise.resolve(cached.data as T);

    const pendente = pendentes.get(chave);
    if (pendente) return pendente as Promise<T>;

    const promise = fn().then(data => {
        cache.set(chave, { data, expira: Date.now() + ttlMs });
        pendentes.delete(chave);
        return data;
    }).catch(err => {
        pendentes.delete(chave);
        throw err;
    });

    pendentes.set(chave, promise);
    return promise;
}

function invalidarCache(prefixo: string) {
    for (const key of cache.keys()) {
        if (key.startsWith(prefixo)) cache.delete(key);
    }
}

// ─── Auth ────────────────────────────────────────────────
export async function signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    // Auto-create profile row so the user appears in admin panel immediately
    if (data.user) {
        try {
            await supabase.from('profiles').upsert({
                id: data.user.id,
                email: data.user.email,
                role: 'user',
                tier: 'gratuito',
                aprovado_por_admin: true, // Gratuito entra direto, sem espera de aprovação
                banca_inicial: 0,
                banca_atual: 0,
                stop_level: 20,
                win_rate: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            }, { onConflict: 'id' });
        } catch (err) {
            console.warn('[signUp] Could not create profile:', err);
        }
    }

    return data;
}

export async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
}

export async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}

export async function resetPasswordForEmail(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
    });
    if (error) throw error;
}

export async function updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
}

export async function getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
}

export function onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
}

// ─── Profiles ────────────────────────────────────────────
export interface ProfileRow {
    id: string;
    email: string | null;
    nome: string | null;
    foto_url: string | null;
    whatsapp: string | null;
    banca_inicial: number;
    banca_atual: number;
    stop_level: number;
    win_rate: number;
    role: 'admin' | 'user';
    tier: 'gratuito' | 'premium';
    aprovado_por_admin: boolean;
    puma_email: string | null;
    vorna_aprovado_manual?: boolean | null;
    xp?: number;
    level?: number;
    performance_manual?: boolean;
    vps_ativo?: boolean;
    copy_trade_ativo?: boolean;
    trial_expira_em?: string | null;
    acesso_planilha?: boolean;
    modulos_liberados?: string[] | null;
    vorna_identifier?: string | null;
    vorna_senha?: string | null;
    created_at: string;
    updated_at: string;
}

export async function getProfile(userId: string): Promise<ProfileRow | null> {
    return comCache(`profile:${userId}`, 30_000, async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();
            if (error) {
                console.warn('[getProfile] Error fetching profile:', error.code, error.message);
                return null;
            }
            return data;
        } catch (err) {
            console.warn('[getProfile] Unexpected error:', err);
            return null;
        }
    });
}

export async function updateProfile(userId: string, updates: Partial<ProfileRow>) {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', userId)
            .select()
            .single();
        if (error) {
            console.warn('[updateProfile] Error:', error.code, error.message);
            return null;
        }
        invalidarCache('profile:');
        return data;
    } catch (err) {
        console.warn('[updateProfile] Unexpected error:', err);
        return null;
    }
}

export async function getAllProfiles(): Promise<ProfileRow[]> {
    return comCache('allProfiles', 30_000, async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) {
                console.warn('[getAllProfiles] Error:', error.code, error.message);
                return [];
            }
            return data || [];
        } catch (err) {
            console.warn('[getAllProfiles] Unexpected error:', err);
            return [];
        }
    });
}

export async function approveUser(userId: string) {
    return updateProfile(userId, { aprovado_por_admin: true } as Partial<ProfileRow>);
}

export async function upgradeTier(userId: string, tier: 'gratuito' | 'premium') {
    return updateProfile(userId, { tier } as Partial<ProfileRow>);
}

export async function rejectUser(userId: string) {
    try {
        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', userId);
        if (error) console.warn('[rejectUser] Error:', error.code, error.message);
    } catch (err) {
        console.warn('[rejectUser] Unexpected error:', err);
    }
}

export interface CriarAlunoManualInput {
    email: string;
    password: string;
    role: 'admin' | 'user';
    diasAcesso: number | null; // null = vitalício
    dataInicio: string; // ISO date string
    vornaAprovado: boolean;
    acessoPlanilha: boolean;
    modulosLiberados: string[] | null; // null = todos
}

export async function criarAlunoManual(input: CriarAlunoManualInput): Promise<{ userId: string }> {
    const { createClient } = await import('@supabase/supabase-js');
    const url = import.meta.env.VITE_SUPABASE_URL as string;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

    // Use a separate client so the admin session is not touched
    const tempClient = createClient(url, key);
    const { data: authData, error: authError } = await tempClient.auth.signUp({
        email: input.email,
        password: input.password,
    });

    if (authError) throw new Error(authError.message);
    if (!authData.user) throw new Error('Usuário não criado. Verifique se o e-mail já está cadastrado.');

    const userId = authData.user.id;

    const trialExpiraEm = input.diasAcesso !== null
        ? (() => {
            const d = new Date(input.dataInicio);
            d.setDate(d.getDate() + input.diasAcesso);
            return d.toISOString();
        })()
        : null;

    const { error: profileError } = await supabase.from('profiles').upsert({
        id: userId,
        email: input.email,
        role: input.role,
        tier: 'gratuito',
        aprovado_por_admin: true,
        banca_inicial: 0,
        banca_atual: 0,
        stop_level: 20,
        win_rate: 0,
        vorna_aprovado_manual: input.vornaAprovado,
        acesso_planilha: input.acessoPlanilha,
        modulos_liberados: input.modulosLiberados,
        trial_expira_em: trialExpiraEm,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    if (profileError) throw new Error('Usuário criado, mas falha ao salvar perfil: ' + profileError.message);

    invalidarCache('allProfiles');
    return { userId };
}

// ─── Operações ───────────────────────────────────────────
export interface OperacaoRow {
    id: string;
    user_id: string;
    data: string | null;
    hora: string | null;
    corretora: string | null;
    ativo: string | null;
    mercado: 'forex' | 'cripto' | null;
    estrategia: string | null;
    direcao: 'compra' | 'venda' | null;
    resultado: 'vitoria' | 'derrota' | null;
    investido: number;
    payout: number;
    lucro: number;
    timeframe: string | null;
    confianca: number;
    created_at: string;
}

export async function getOperacoes(userId: string): Promise<OperacaoRow[]> {
    return comCache(`ops:${userId}`, 15_000, async () => {
        const { data, error } = await supabase
            .from('operacoes')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    });
}

export async function addOperacao(op: Omit<OperacaoRow, 'id' | 'created_at'>) {
    const { data, error } = await supabase
        .from('operacoes')
        .insert(op)
        .select()
        .single();
    if (error) throw error;
    invalidarCache('ops:');
    return data;
}

export async function upsertOperacoesBatch(ops: Omit<OperacaoRow, 'created_at'>[]) {
    // Upsert expects all non-nullable fields. We must handle deduplication via unique 'id'.
    // In our table 'operacoes', 'id' is standard uuid, but we can assign string IDs from the broker UUID.
    const { data, error } = await supabase
        .from('operacoes')
        .upsert(ops, { onConflict: 'id' })
        .select();
    if (error) {
        // Fallback to inserting one by one ignoring conflicts if upsert fails
        throw error;
    }
    invalidarCache('ops:');
    return data || [];
}

export async function deleteOperacao(opId: string) {
    const { error } = await supabase
        .from('operacoes')
        .delete()
        .eq('id', opId);
    if (error) throw error;
    invalidarCache('ops:');
}

export async function deleteTodasOperacoesUsuario(userId: string) {
    const { error } = await supabase
        .from('operacoes')
        .delete()
        .eq('user_id', userId);
    if (error) throw error;
    invalidarCache(`ops:${userId}`);
}

/**
 * ADMIN: Busca todas as operações de todos os usuários
 */
export async function getTodasOperacoes(): Promise<(OperacaoRow & { profiles: { email: string | null, nome: string | null } })[]> {
    const { data, error } = await supabase
        .from('operacoes')
        .select('*, profiles:user_id(email, nome)')
        .order('created_at', { ascending: false })
        .limit(500);
    if (error) throw error;
    return data as any;
}

/** 
 * ADMIN/USER: Atualiza dados de uma operação específica
 */
export async function updateOperacao(opId: string, updates: Partial<OperacaoRow>) {
    const { data, error } = await supabase
        .from('operacoes')
        .update(updates)
        .eq('id', opId)
        .select()
        .single();
    if (error) throw error;
    invalidarCache('ops:');
    return data;
}

// ─── Módulos ─────────────────────────────────────────────
export async function getModulos() {
    return comCache('modulos', 300_000, async () => {
        const { data, error } = await supabase
            .from('modulos')
            .select('*')
            .order('ordem', { ascending: true });
        if (error) throw error;
        return data || [];
    });
}

export async function upsertModulo(modulo: { id?: string; titulo: string; descricao?: string; capa_url?: string; ordem?: number; em_breve?: boolean }) {
    const { data, error } = await supabase
        .from('modulos')
        .upsert(modulo)
        .select()
        .single();
    if (error) throw error;
    invalidarCache('modulos');
    return data;
}

export async function deleteModulo(id: string) {
    const { error } = await supabase
        .from('modulos')
        .delete()
        .eq('id', id);
    if (error) throw error;
    invalidarCache('modulos');
}

// ─── Aulas ───────────────────────────────────────────────
export async function getAulas() {
    return comCache('aulas', 300_000, async () => {
        const { data, error } = await supabase
            .from('aulas')
            .select('*')
            .order('ordem', { ascending: true });
        if (error) throw error;
        return data || [];
    });
}

export async function upsertAula(aula: Record<string, any>) {
    const { data, error } = await supabase
        .from('aulas')
        .upsert(aula)
        .select()
        .single();
    if (error) throw error;
    invalidarCache('aulas');
    return data;
}

export async function deleteAula(id: string) {
    const { error } = await supabase
        .from('aulas')
        .delete()
        .eq('id', id);
    if (error) throw error;
    invalidarCache('aulas');
}

export async function getAulaProgresso(userId: string) {
    const { data, error } = await supabase
        .from('aula_progresso')
        .select('*')
        .eq('user_id', userId);
    if (error) throw error;
    return data || [];
}

export async function toggleAulaProgresso(userId: string, aulaId: string, concluida: boolean) {
    const { error } = await supabase
        .from('aula_progresso')
        .upsert({ user_id: userId, aula_id: aulaId, concluida }, { onConflict: 'user_id,aula_id' });
    if (error) throw error;
}

// ─── Comentários ─────────────────────────────────────────
export async function getComentarios() {
    return comCache('comentarios', 60_000, async () => {
        const { data, error } = await supabase
            .from('comentarios')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    });
}

export async function addComentario(c: {
    user_id: string;
    aula_id: string;
    aula_titulo: string;
    modulo_titulo: string;
    usuario: string;
    foto_url?: string;
    texto: string;
    data: string;
}) {
    const { data, error } = await supabase
        .from('comentarios')
        .insert({ ...c, status: 'pendente' })
        .select()
        .single();
    if (error) throw error;
    invalidarCache('comentarios');
    return data;
}

export async function updateComentario(id: string, updates: Record<string, any>) {
    const { error } = await supabase
        .from('comentarios')
        .update(updates)
        .eq('id', id);
    if (error) throw error;
    invalidarCache('comentarios');
}

export async function deleteComentario(id: string) {
    const { error } = await supabase
        .from('comentarios')
        .delete()
        .eq('id', id);
    if (error) throw error;
    invalidarCache('comentarios');
}

// ─── Config Prova ────────────────────────────────────────
export async function getConfigProva() {
    return comCache('configProva', 300_000, async () => {
        const { data, error } = await supabase
            .from('config_prova')
            .select('*')
            .limit(1)
            .single();
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    });
}

export async function saveConfigProva(cfg: { questoes: any[]; nota_minima: number; whatsapp_certificado: string; ativa: boolean; id?: string }) {
    if (cfg.id) {
        const { error } = await supabase
            .from('config_prova')
            .update({ ...cfg, updated_at: new Date().toISOString() })
            .eq('id', cfg.id);
        if (error) throw error;
    } else {
        const { error } = await supabase
            .from('config_prova')
            .insert(cfg);
        if (error) throw error;
    }
    invalidarCache('configProva');
}

// ─── Resultado Prova ─────────────────────────────────────
export async function getResultadoProva(userId: string) {
    const { data, error } = await supabase
        .from('resultado_prova')
        .select('*')
        .eq('user_id', userId)
        .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
}

export async function saveResultadoProva(userId: string, resultado: { nota: number; aprovado: boolean; respostas: any[] }) {
    const { error } = await supabase
        .from('resultado_prova')
        .upsert({ user_id: userId, ...resultado }, { onConflict: 'user_id' });
    if (error) throw error;
}

// ─── Avisos ──────────────────────────────────────────────
export async function getAvisos(userCreatedAt?: string) {
    const chave = `avisos:${userCreatedAt || 'all'}`;
    return comCache(chave, 30_000, async () => {
        let query = supabase
            .from('avisos')
            .select('*')
            .order('created_at', { ascending: false });

        if (userCreatedAt) {
            query = query.gte('created_at', userCreatedAt);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    });
}

export async function createAviso(aviso: { titulo: string; mensagem: string; destinatarios: number }) {
    const { data, error } = await supabase
        .from('avisos')
        .insert(aviso)
        .select()
        .single();
    if (error) throw error;
    invalidarCache('avisos:');
    return data;
}

export async function deleteAviso(id: string) {
    const { error } = await supabase
        .from('avisos')
        .delete()
        .eq('id', id);
    if (error) throw error;
    invalidarCache('avisos:');
}

// ─── Ranking e XP ────────────────────────────────────────

export interface RankingEntry {
    id: string;
    nome: string;
    foto_url: string | null;
    banca_inicial: number;
    lucro_total: number;
    vitorias: number;
    total_ops: number;
    win_rate: number;
    lucro_percentual: number;
    score: number;
    level: number;
    xp: number;
}

/** 
 * Calcula o ranking global baseado nos critérios do Protocolo 3P.
 * O score é composto por: 60% Lucro%, 30% WinRate, 10% Bônus Atividade.
 */
export async function getGlobalRanking(): Promise<RankingEntry[]> {
    return comCache('ranking', 60_000, async () => {
        try {
            // 1 query: todos os profiles
            const { data: profiles, error: pErr } = await supabase
                .from('profiles')
                .select('id, nome, foto_url, banca_inicial, banca_atual, win_rate');
            if (pErr) throw pErr;

            // 1 query: todas as operações (agrupamos em JS)
            const { data: todasOps } = await supabase
                .from('operacoes')
                .select('user_id, resultado, lucro');
            const opsPorUser = new Map<string, { total: number; vitorias: number }>();
            (todasOps || []).forEach(op => {
                const entry = opsPorUser.get(op.user_id) || { total: 0, vitorias: 0 };
                entry.total++;
                if (op.resultado === 'vitoria') entry.vitorias++;
                opsPorUser.set(op.user_id, entry);
            });

            // 1 query: todos os progressos de aula
            const { data: todoProgresso } = await supabase
                .from('aula_progresso')
                .select('user_id, aula_id')
                .eq('concluida', true);
            const progressoPorUser = new Map<string, number>();
            (todoProgresso || []).forEach(p => {
                progressoPorUser.set(p.user_id, (progressoPorUser.get(p.user_id) || 0) + 1);
            });

            // Montar ranking sem queries adicionais
            const ranking: RankingEntry[] = (profiles || []).map(p => {
                const userOps = opsPorUser.get(p.id) || { total: 0, vitorias: 0 };
                const total_ops = userOps.total;
                const vitorias = userOps.vitorias;
                const lucro_total = parseFloat((p.banca_atual - p.banca_inicial).toFixed(2));
                const lucro_percentual = p.banca_inicial > 0 ? parseFloat(((lucro_total / p.banca_inicial) * 100).toFixed(2)) : 0;
                const win_rate = total_ops > 0 ? Math.round((vitorias / total_ops) * 100) : 0;

                const score = parseFloat((
                    (lucro_percentual * 0.6) +
                    (win_rate * 0.3) +
                    (Math.min(total_ops / 50, 1) * 10)
                ).toFixed(2));

                // XP e Level calculados localmente
                const aulasConcluidas = progressoPorUser.get(p.id) || 0;
                const baseXP = (total_ops * 20) + (vitorias * 30) + (aulasConcluidas * 100);
                const level = Math.floor(baseXP / 1000) + 1;
                const xp = baseXP % 1000;

                return {
                    id: p.id,
                    nome: p.nome || 'Trader',
                    foto_url: p.foto_url,
                    banca_inicial: p.banca_inicial,
                    lucro_total,
                    vitorias,
                    total_ops,
                    win_rate,
                    lucro_percentual,
                    score,
                    level,
                    xp
                };
            });

            return ranking.sort((a, b) => b.score - a.score);
        } catch (err) {
            console.error('[getGlobalRanking] Error:', err);
            return [];
        }
    });
}

/** 
 * Calcula XP e Level
 * XP = (Opereções * 20) + (Vitórias * 30) + (Aulas Concluídas * 100)
 */
export async function calculateUserStats(userId: string, opsCount: number, winsCount: number) {
    const { data: progresso } = await supabase
        .from('aula_progresso')
        .select('aula_id')
        .eq('user_id', userId)
        .eq('concluida', true);

    const aulasConcluidas = progresso?.length || 0;
    const baseXP = (opsCount * 20) + (winsCount * 30) + (aulasConcluidas * 100);

    // Level formula: cada level exige 1000 XP
    const level = Math.floor(baseXP / 1000) + 1;
    const xp = baseXP % 1000;

    return { xp, level, totalXP: baseXP, aulasConcluidas };
}

// ─── Copy Trade ──────────────────────────────────────────

export async function getSeguidoresCopyTrade(): Promise<ProfileRow[]> {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('copy_trade_ativo', true);
        if (error) {
            console.warn('[getSeguidoresCopyTrade] Error:', error.code, error.message);
            return [];
        }
        return data || [];
    } catch (err) {
        console.warn('[getSeguidoresCopyTrade] Unexpected error:', err);
        return [];
    }
}

export async function updateCopyTradeAtivo(userId: string, ativo: boolean) {
    return updateProfile(userId, { copy_trade_ativo: ativo });
}

export async function replicarOperacoesParaSeguidores(
    ops: Omit<OperacaoRow, 'created_at'>[],
    seguidores: ProfileRow[]
) {
    if (ops.length === 0 || seguidores.length === 0) return;
    const copias: Omit<OperacaoRow, 'created_at'>[] = [];
    for (const seguidor of seguidores) {
        for (const op of ops) {
            copias.push({
                ...op,
                id: `copy_${op.id}_${seguidor.id.slice(0, 8)}`,
                user_id: seguidor.id,
                corretora: op.corretora ? `${op.corretora} | Copy Trade` : 'Copy Trade',
            });
        }
    }
    try {
        await upsertOperacoesBatch(copias);
    } catch (err) {
        console.warn('[replicarOperacoesParaSeguidores] Error:', err);
    }
}

// ─── Helpers ─────────────────────────────────────────────

/** Convert Supabase OperacaoRow to the Op type used in the UI */
export function rowToOp(row: OperacaoRow): Op {
    return {
        id: row.id,
        data: row.data || '',
        hora: row.hora || '',
        corretora: row.corretora || '',
        ativo: row.ativo || '',
        mercado: row.mercado || 'forex',
        estrategia: row.estrategia || '',
        direcao: row.direcao || 'compra',
        resultado: row.resultado || 'derrota',
        investido: row.investido || 0,
        payout: row.payout || 0,
        lucro: row.lucro || 0,
        timeframe: row.timeframe || '',
        confianca: row.confianca || 50,
    };
}
