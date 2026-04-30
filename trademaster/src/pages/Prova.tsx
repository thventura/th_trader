import React from 'react';
import { Award, CheckCircle2, XCircle, MessageCircle, Lock, Trophy } from 'lucide-react';
import { cn } from '../lib/utils';
import { BRANDING } from '../config/branding';
import { ConfigProva } from '../types';
import { getConfigProva, getResultadoProva, saveResultadoProva } from '../lib/supabaseService';
import { useData } from '../contexts/DataContext';

interface ResultadoProva {
  pontos: number;
  pontos_max: number;
  percentual: number;
  aprovado: boolean;
  data: string;
}

export default function Prova() {
  const { profile, userId } = useData();

  const [config, setConfig] = React.useState<ConfigProva | null>(null);
  const [respostas, setRespostas] = React.useState<Record<string, number>>({});
  const [resultado, setResultado] = React.useState<ResultadoProva | null>(null);
  const [enviado, setEnviado] = React.useState(false);
  const [nome, setNome] = React.useState('Trader');
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (profile) setNome(profile.nome || 'Trader');
  }, [profile]);

  React.useEffect(() => {
    if (!userId) { setLoading(false); return; }
    (async () => {
      try {
        const cfg = await getConfigProva();
        if (cfg) setConfig({ questoes: cfg.questoes || [], nota_minima: cfg.nota_minima, whatsapp_certificado: cfg.whatsapp_certificado || '', ativa: cfg.ativa });
        const res = await getResultadoProva(userId);
        if (res) {
          const r: ResultadoProva = { pontos: 0, pontos_max: 0, percentual: res.nota || 0, aprovado: res.aprovado, data: res.created_at };
          setResultado(r);
          setEnviado(true);
        }
      } catch (err) { console.error(err); }
      setLoading(false);
    })();
  }, [userId]);

  if (loading) return <div className="flex items-center justify-center py-20 text-slate-400">Carregando...</div>;

  // ── Prova não disponível ──
  if (!config || !config.ativa || config.questoes.length === 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <header>
          <h2 className="text-3xl font-bold tracking-tight mb-1">Prova Final</h2>
          <p className="text-slate-400">Certifique seu conhecimento adquirido no curso.</p>
        </header>
        <div className="glass-card p-12 flex flex-col items-center text-center gap-4">
          <div className="p-5 bg-slate-800 rounded-2xl">
            <Lock size={40} className="text-slate-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-300">Prova ainda não disponível</h3>
          <p className="text-slate-500 text-sm max-w-sm">
            A prova final ainda não foi liberada pelo administrador. Continue seus estudos e fique atento!
          </p>
        </div>
      </div>
    );
  }

  const pontos_max = config.questoes.reduce((s, q) => s + q.pontos, 0);

  const handleSubmit = async () => {
    if (!config || !userId) return;
    let pontos = 0;
    config.questoes.forEach(q => {
      if (respostas[q.id] === q.resposta_correta) pontos += q.pontos;
    });
    const percentual = Math.round((pontos / pontos_max) * 100);
    const aprovado = percentual >= config.nota_minima;
    const res: ResultadoProva = { pontos, pontos_max, percentual, aprovado, data: new Date().toISOString() };
    try {
      await saveResultadoProva(userId, { nota: percentual, aprovado, respostas: Object.entries(respostas).map(([qId, ans]) => ({ qId, ans })) });
    } catch (err) { console.error(err); }
    setResultado(res);
    setEnviado(true);
  };

  const todasRespondidas = config.questoes.every(q => respostas[q.id] !== undefined);

  // ── Tela de resultado ──
  if (enviado && resultado) {
    const whatsappUrl = `https://wa.me/${config.whatsapp_certificado}?text=${encodeURIComponent(
      `Olá! Sou ${nome} e fui aprovado(a) na Prova Final do ${BRANDING.appName} com ${resultado.percentual}% de aproveitamento (${resultado.pontos}/${resultado.pontos_max} pontos). Gostaria de solicitar meu certificado!`
    )}`;

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <header>
          <h2 className="text-3xl font-bold tracking-tight mb-1">Prova Final</h2>
          <p className="text-slate-400">Resultado da sua avaliação.</p>
        </header>

        <div className="glass-card p-10 flex flex-col items-center text-center gap-6">
          {resultado.aprovado ? (
            <div className="p-5 bg-trademaster-blue/10 rounded-2xl">
              <Trophy size={48} className="text-trademaster-blue" />
            </div>
          ) : (
            <div className="p-5 bg-red-500/10 rounded-2xl">
              <XCircle size={48} className="text-red-400" />
            </div>
          )}

          <div>
            <div className={cn(
              'text-xs font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full mb-3 inline-block',
              resultado.aprovado
                ? 'bg-trademaster-blue/10 text-trademaster-blue'
                : 'bg-red-500/10 text-red-400'
            )}>
              {resultado.aprovado ? '✓ APROVADO' : '✗ REPROVADO'}
            </div>
            <h3 className="text-4xl font-black mb-1">{resultado.percentual}%</h3>
            <p className="text-slate-400 text-sm">
              {resultado.pontos} de {resultado.pontos_max} pontos · mínimo {config.nota_minima}%
            </p>
          </div>

          {/* Score bar */}
          <div className="w-full max-w-xs">
            <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${resultado.percentual}%`,
                  background: resultado.aprovado
                    ? 'linear-gradient(90deg, #34de00, #2bc900)'
                    : 'linear-gradient(90deg, #ef4444, #dc2626)',
                  boxShadow: resultado.aprovado ? '0 0 12px rgba(52,222,0,0.4)' : '0 0 12px rgba(239,68,68,0.4)',
                }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-bold text-slate-600 mt-1.5">
              <span>0%</span>
              <span className={resultado.aprovado ? 'text-trademaster-blue' : 'text-red-400'}>
                mín. {config.nota_minima}%
              </span>
              <span>100%</span>
            </div>
          </div>

          {resultado.aprovado ? (
            <div className="space-y-3 w-full max-w-sm">
              <p className="text-sm text-slate-300">
                Parabéns, {nome}! Você concluiu o curso com excelência. Clique abaixo para solicitar seu certificado via WhatsApp.
              </p>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-4 rounded-xl text-black font-bold text-sm shadow-lg shadow-trademaster-blue/30 transition-all hover:scale-[1.02]"
                style={{ background: '#25D366' }}
              >
                <MessageCircle size={18} />
                Solicitar Certificado via WhatsApp
              </a>
            </div>
          ) : (
            <div className="space-y-3 w-full max-w-sm">
              <p className="text-sm text-slate-400">
                Você não atingiu a nota mínima de {config.nota_minima}%. Continue estudando os módulos e entre em contato com o instrutor para orientação.
              </p>
              <div className="p-4 bg-white/5 rounded-xl text-sm text-slate-300 text-left space-y-1">
                <p className="font-bold text-slate-200">Sua pontuação:</p>
                <p>{resultado.pontos} pontos de {resultado.pontos_max} ({resultado.percentual}%)</p>
                <p>Faltaram {config.nota_minima - resultado.percentual}% para aprovação.</p>
              </div>
            </div>
          )}

          <p className="text-[11px] text-slate-600">
            Realizada em {new Date(resultado.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>
    );
  }

  // ── Tela de questões ──
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header>
        <h2 className="text-3xl font-bold tracking-tight mb-1">Prova Final</h2>
        <p className="text-slate-400">Responda todas as questões e clique em Finalizar Prova.</p>
      </header>

      {/* Info bar */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 px-4 py-2.5 glass-card">
          <Award size={16} className="text-trademaster-blue" />
          <span className="text-sm font-bold">{config.questoes.length} questões</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 glass-card">
          <CheckCircle2 size={16} className="text-emerald-500" />
          <span className="text-sm font-bold">Mínimo: {config.nota_minima}%</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 glass-card">
          <Trophy size={16} className="text-amber-500" />
          <span className="text-sm font-bold">{pontos_max} pontos</span>
        </div>
        <div className="ml-auto flex items-center gap-2 px-4 py-2.5 glass-card">
          <span className="text-sm text-slate-400">
            {Object.keys(respostas).length}/{config.questoes.length} respondidas
          </span>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {config.questoes.map((q, idx) => {
          const respondida = respostas[q.id] !== undefined;
          return (
            <div
              key={q.id}
              className={cn(
                'glass-card p-6 space-y-4 transition-all',
                respondida ? 'border-trademaster-blue/20' : ''
              )}
            >
              <div className="flex items-start gap-3">
                <span className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0',
                  respondida ? 'bg-trademaster-blue text-black' : 'bg-white/10 text-slate-400'
                )}>
                  {idx + 1}
                </span>
                <p className="text-sm font-medium text-slate-100 leading-relaxed pt-0.5">{q.texto}</p>
              </div>

              {q.imagem_url && (
                <img
                  src={q.imagem_url}
                  alt={`Questão ${idx + 1}`}
                  className="w-full max-h-60 object-contain rounded-xl bg-slate-800"
                />
              )}

              <div className="space-y-2 pl-10">
                {q.opcoes.map((opcao, i) => {
                  const isSelected = respostas[q.id] === i;
                  return (
                    <label
                      key={i}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                        isSelected
                          ? 'bg-trademaster-blue/10 border-trademaster-blue/40 text-white'
                          : 'bg-white/[0.03] border-white/5 text-slate-300 hover:bg-white/[0.06] hover:border-white/10'
                      )}
                    >
                      <input
                        type="radio"
                        name={`questao_${q.id}`}
                        checked={isSelected}
                        onChange={() => setRespostas(prev => ({ ...prev, [q.id]: i }))}
                        className="accent-trademaster-blue w-4 h-4 shrink-0"
                      />
                      <span className="text-xs font-bold text-slate-500 w-4">{['A', 'B', 'C', 'D'][i]}</span>
                      <span className="text-sm">{opcao}</span>
                    </label>
                  );
                })}
              </div>

              {q.pontos > 1 && (
                <p className="text-[10px] text-slate-600 pl-10">{q.pontos} pontos</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit */}
      <div className="glass-card p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-sm text-slate-400">
          {todasRespondidas
            ? 'Todas as questões respondidas. Pronto para finalizar!'
            : `Ainda faltam ${config.questoes.length - Object.keys(respostas).length} questão(ões) sem resposta.`}
        </div>
        <button
          onClick={handleSubmit}
          disabled={!todasRespondidas}
          className="px-8 py-3.5 rounded-xl font-bold text-black transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-trademaster-blue/20"
          style={{ background: '#34de00' }}
          onMouseEnter={e => { if (todasRespondidas) e.currentTarget.style.background = '#2bc900'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#34de00'; }}
        >
          Finalizar Prova
        </button>
      </div>
    </div>
  );
}
