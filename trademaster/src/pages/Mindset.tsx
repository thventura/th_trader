import React from 'react';
import { Sparkles, CheckCircle2, AlertCircle, History, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { analyzeMindset } from '../lib/gemini';
import CerebroAnimado from '../components/CerebroAnimado';
import { useData } from '../contexts/DataContext';

const emocoes = [
  { value: 'calmo', label: 'Calmo / Centrado' },
  { value: 'ansioso', label: 'Ansioso / Agitado' },
  { value: 'cansado', label: 'Cansado / Desmotivado' },
  { value: 'euforico', label: 'Eufórico / Confiante demais' },
  { value: 'irritado', label: 'Irritado / Frustrado' },
  { value: 'triste', label: 'Triste / Desanimado' },
];

function SliderField({ label, value, onChange, lowLabel = 'BAIXO', highLabel = 'ALTO' }: {
  label: string; value: number; onChange: (v: number) => void; lowLabel?: string; highLabel?: string;
}) {
  const pct = ((value - 1) / 4) * 100;
  const color = pct <= 30 ? '#ef4444' : pct <= 60 ? '#f59e0b' : '#3b82f6';
  return (
    <label className="block">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-slate-300">{label}</span>
        <span className="text-sm font-bold" style={{ color }}>{value}/5</span>
      </div>
      <input
        type="range" min="1" max="5"
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-apex-trader-primary"
      />
      <div className="flex justify-between text-[10px] text-slate-600 mt-1 uppercase">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </label>
  );
}

export default function Mindset() {
  const navigate = useNavigate();
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [result, setResult] = React.useState<any>(null);

  // Ops do DataContext (compartilhado entre páginas)
  const { operacoesRaw, operacoes } = useData();
  const opsData = React.useMemo(
    () => operacoesRaw.map(r => ({ resultado: r.resultado || 'derrota', lucro: r.lucro || 0 })),
    [operacoesRaw]
  );

  const [formData, setFormData] = React.useState({
    horas_sono: 7,
    nivel_estresse: 3,
    nivel_energia: 3,
    nivel_concentracao: 3,
    medo_perda: 2,
    estado_emocional: 'calmo',
    seguiu_plano: 'sim' as 'sim' | 'parcialmente' | 'nao',
    ultimo_resultado_influencia: 'nao' as 'sim' | 'nao',
    reflexao_pessoal: '',
  });

  const gerarFeedbackLocal = () => {
    const alertas: string[] = [];
    let score = 0;
    let detalhes: string[] = [];

    if (formData.horas_sono >= 7) { score += 2; }
    else if (formData.horas_sono >= 6) { score += 1; alertas.push('Sono abaixo do ideal — tente garantir pelo menos 7h.'); }
    else { alertas.push('Sono insuficiente. O mercado pode esperar; seu cérebro, não.'); }

    if (formData.nivel_estresse <= 2) { score += 2; }
    else if (formData.nivel_estresse <= 3) { score += 1; alertas.push('Estresse elevado pode afetar sua tomada de decisão.'); }
    else { alertas.push('Nível de estresse alto: alto risco de decisões impulsivas.'); }

    if (formData.nivel_energia >= 4) { score += 2; }
    else if (formData.nivel_energia >= 3) { score += 1; alertas.push('Energia moderada — seja seletivo nas entradas.'); }
    else { alertas.push('Energia baixa reduz tempo de reação e atenção.'); }

    if (formData.nivel_concentracao >= 4) { score += 2; }
    else if (formData.nivel_concentracao >= 3) { score += 1; alertas.push('Concentração mediana — evite operar com distrações.'); }
    else { alertas.push('Concentração baixa: alto risco de erros de leitura.'); }

    if (formData.medo_perda <= 2) { score += 1; }
    else if (formData.medo_perda >= 4) { alertas.push('Medo de perda elevado pode gerar hesitação ou revenge trading.'); }

    if (formData.estado_emocional === 'calmo') { score += 2; }
    else if (['ansioso', 'irritado', 'euforico'].includes(formData.estado_emocional)) {
      alertas.push(`Estado emocional "${formData.estado_emocional}" pode distorcer sua leitura do mercado.`);
      score -= 1;
    }

    if (formData.seguiu_plano === 'sim') { score += 2; }
    else if (formData.seguiu_plano === 'parcialmente') { score += 1; alertas.push('Siga seu plano 100% — desvios são onde os prejuízos nascem.'); }
    else { alertas.push('Você não seguiu seu plano. Revise suas regras antes de operar.'); }

    if (formData.ultimo_resultado_influencia === 'sim') {
      alertas.push('Cada operação é independente — não deixe o resultado anterior te influenciar.');
      score -= 1;
    }

    // Análise de performance das ops recentes
    let cicloMsg = '';
    try {
      const opsRaw = opsData.length > 0 ? JSON.stringify(opsData) : null;
      if (opsRaw) {
        const opsRecentes: Array<{ resultado: string; lucro: number }> = JSON.parse(opsRaw);
        if (opsRecentes.length >= 3) {
          const ultimas = opsRecentes.slice(0, Math.min(5, opsRecentes.length));
          const wins = ultimas.filter(op => op.resultado === 'vitoria').length;
          const losses = ultimas.length - wins;
          const wr = Math.round((wins / ultimas.length) * 100);

          let streakCount = 1;
          const tipoStreak = opsRecentes[0].resultado;
          for (let i = 1; i < opsRecentes.length; i++) {
            if (opsRecentes[i].resultado === tipoStreak) streakCount++;
            else break;
          }

          if (tipoStreak === 'derrota' && streakCount >= 2) {
            score -= 2;
            if (streakCount >= 3) {
              cicloMsg = `Você está em um ciclo de perdas com ${streakCount} derrotas consecutivas. Considerando a taxa de acerto de ${wr}% nas últimas ${ultimas.length} operações, é fundamental agir com cautela agora. Antes de continuar, responda: você está seguindo seu setup à risca ou tomando decisões impulsivas? O mercado apresenta condições favoráveis à sua estratégia? Recomendamos uma pausa imediata — proteger a banca é sempre a decisão mais inteligente. Se os losses persistirem após retomar, encerre a sessão e retome amanhã com a cabeça mais fresca.`;
              detalhes = [
                `${streakCount} derrotas consecutivas detectadas — sinal de alerta máximo`,
                `Taxa de acerto recente: ${wr}% nas últimas ${ultimas.length} operações`,
                'Evite "revenge trading" — entradas forçadas agravam o ciclo de perdas',
                'Revise os critérios de entrada: você está seguindo seu setup?',
                'Considere encerrar a sessão e retomar com mentalidade zerada amanhã',
              ];
            } else {
              cicloMsg = `Você está com ${streakCount} derrotas seguidas e ${wr}% de acerto nas últimas ${ultimas.length} entradas. Vale a pena dar um passo atrás: o mercado está dentro das condições do seu setup? Você está respeitando seu plano ou tomando entradas duvidosas? Um ciclo de losses pode ser passageiro, mas ignorar os sinais cedo é onde as perdas se agravam. Aumente sua seletividade e aguarde por setups de alta qualidade antes de entrar novamente.`;
              detalhes = [
                `${streakCount} losses seguidos — atenção ao padrão`,
                `Win rate recente: ${wr}% (${wins}W/${losses}L nas últimas ${ultimas.length} ops)`,
                'Verifique se as condições do mercado estão alinhadas com sua estratégia',
                'Prefira aguardar: menos operações, mais qualidade e seletividade',
              ];
            }
          } else if (tipoStreak === 'vitoria' && streakCount >= 3) {
            score += 1;
            cicloMsg = `Você tem seguido um excelente ciclo de vitórias com ${streakCount} wins consecutivos e ${wr}% de taxa de acerto nas últimas ${ultimas.length} operações — seu setup está funcionando muito bem! No entanto, esse é exatamente o momento onde muitos traders cometem erros: o excesso de confiança pode levar a entradas fora do setup, aumento excessivo de risco ou abandono das regras de gerenciamento. Mantenha a calma, continue com sua estratégia atual e não altere o que está gerando resultado. A consistência a longo prazo vale mais do que qualquer sequência isolada.`;
            detalhes = [
              `${streakCount} vitórias consecutivas — performance sólida`,
              `Taxa de acerto: ${wr}% nas últimas ${ultimas.length} operações`,
              'Não aumente o valor das entradas por conta da euforia',
              'Mantenha os mesmos critérios de entrada que estão gerando resultado',
              'Documente o que está funcionando para replicar nas próximas sessões',
            ];
          } else if (wr < 40 && ultimas.length >= 4) {
            score -= 1;
            cicloMsg = `Seu desempenho recente mostra apenas ${wr}% de acerto nas últimas ${ultimas.length} operações (${wins}W/${losses}L). Essa taxa abaixo de 40% é um indicador importante: algo no seu processo de entrada precisa ser revisto. Não force operações para tentar recuperar as perdas — isso apenas piora o quadro. Opere com muito mais seletividade, aumente os critérios de qualidade para cada entrada ou faça uma pausa para analisar o que está diferente.`;
            detalhes = [
              `Win rate: ${wr}% — abaixo do nível sustentável`,
              `${losses} losses em ${ultimas.length} operações recentes`,
              'Revise seus critérios de entrada e o contexto do mercado',
              'Menos operações, mais qualidade — espere por setups mais claros',
            ];
          } else if (wr >= 70) {
            cicloMsg = `Excelente desempenho: ${wr}% de acerto nas últimas ${ultimas.length} operações. Seu processo está sólido e consistente. Continue monitorando sem alterar o que está funcionando — a consistência é construída repetindo boas práticas, não mudando estratégias em momentos de performance positiva.`;
            detalhes = [
              `Win rate: ${wr}% — performance acima da média`,
              'Continue executando o mesmo setup com a mesma disciplina',
              'Documente o que está funcionando para replicar nas próximas sessões',
            ];
          }
        }
      }
    } catch { /* sem dados de ops */ }

    const pronto = score >= 10;
    let recomendacao_ia = '';
    if (cicloMsg) {
      recomendacao_ia = cicloMsg;
      if (!pronto && alertas.length > 0) {
        recomendacao_ia += ` Além disso: ${alertas.slice(0, 2).join(' ')}`;
      }
    } else {
      recomendacao_ia = pronto
        ? `Você está em boas condições para operar hoje. ${alertas.length > 0 ? 'Atenção: ' + alertas[0] : 'Mantenha o foco, siga o plano e opere com disciplina e consistência.'}`
        : `Recomendamos cautela antes de operar. ${alertas.join(' ')} Preserve sua banca e aguarde um momento mais equilibrado para garantir a qualidade das suas decisões.`;
      if (alertas.length > 0) detalhes = [...alertas];
    }
    return { pronto, recomendacao_ia, detalhes };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAnalyzing(true);
    try {
      let lastOps: Array<{ resultado_operacao: string; resultado: number }> = [];
      try {
        if (opsData.length > 0) {
          lastOps = opsData.slice(0, 5).map((op: any) => ({
            resultado_operacao: op.resultado,
            resultado: op.lucro,
          }));
        }
      } catch { }
      if (lastOps.length === 0) {
        lastOps = [
          { resultado_operacao: 'vitoria', resultado: 50 },
          { resultado_operacao: 'derrota', resultado: -30 },
        ];
      }
      const analysis = await analyzeMindset(formData, lastOps);
      setResult(analysis);
    } catch {
      setResult(gerarFeedbackLocal());
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10">

      {/* ===== HERO: Cérebro (esquerda) + Texto (direita) ===== */}
      <header className="relative flex flex-col md:flex-row items-center gap-6 md:gap-12">
        <div className="w-full md:w-1/2 flex items-center justify-center">
          <CerebroAnimado />
        </div>

        <div className="w-full md:w-1/2 text-center md:text-left">
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight mb-4">
            <span className="bg-gradient-to-r from-apex-trader-primary to-[#93c5fd] bg-clip-text text-transparent">
              Check-in de Mindset
            </span>
          </h2>
          <p className="text-lg md:text-xl font-semibold text-apex-trader-primary mb-4">
            Sua mente é sua ferramenta mais importante.
          </p>
          <p className="text-sm md:text-base text-slate-400 leading-relaxed max-w-xl">
            Como você está hoje? Preencha o formulário abaixo e receba sua análise
            de prontidão personalizada antes de operar.
          </p>
        </div>
      </header>

      {/* ===== FORMULÁRIO: Full-width ===== */}
      <div className="glass-card p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Coluna esquerda */}
            <div className="space-y-6">
              <label className="block">
                <span className="text-sm font-medium text-slate-300">Horas de Sono</span>
                <input
                  type="number" step="0.5" min="0" max="12"
                  className="mt-1 block w-full bg-slate-800 border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-apex-trader-primary outline-none transition-all"
                  value={formData.horas_sono}
                  onChange={e => setFormData({ ...formData, horas_sono: Number(e.target.value) })}
                />
              </label>

              <div className="grid grid-cols-2 gap-4">
                <SliderField label="Estresse" value={formData.nivel_estresse} onChange={v => setFormData({ ...formData, nivel_estresse: v })} lowLabel="BAIXO" highLabel="ALTO" />
                <SliderField label="Energia" value={formData.nivel_energia} onChange={v => setFormData({ ...formData, nivel_energia: v })} lowLabel="BAIXA" highLabel="ALTA" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <SliderField label="Concentração" value={formData.nivel_concentracao} onChange={v => setFormData({ ...formData, nivel_concentracao: v })} lowLabel="BAIXA" highLabel="ALTA" />
                <SliderField label="Medo de Perda" value={formData.medo_perda} onChange={v => setFormData({ ...formData, medo_perda: v })} lowLabel="NENHUM" highLabel="ALTO" />
              </div>

              <label className="block">
                <span className="text-sm font-medium text-slate-300">Estado Emocional</span>
                <select
                  className="mt-1 block w-full bg-slate-800 border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-apex-trader-primary outline-none transition-all"
                  value={formData.estado_emocional}
                  onChange={e => setFormData({ ...formData, estado_emocional: e.target.value })}
                >
                  {emocoes.map(em => <option key={em.value} value={em.value}>{em.label}</option>)}
                </select>
              </label>
            </div>

            {/* Coluna direita */}
            <div className="space-y-6">
              <label className="block">
                <span className="text-sm font-medium text-slate-300">Seguiu seu plano de trading ontem?</span>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {([['sim', 'Sim'], ['parcialmente', 'Parcialmente'], ['nao', 'Não']] as const).map(([v, l]) => (
                    <button
                      key={v} type="button"
                      onClick={() => setFormData({ ...formData, seguiu_plano: v })}
                      className={cn(
                        'py-2.5 rounded-xl text-xs font-bold transition-all border',
                        formData.seguiu_plano === v
                          ? v === 'sim' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : v === 'parcialmente' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                              : 'bg-red-500/10 border-red-500/30 text-red-400'
                          : 'bg-white/5 border-white/5 text-slate-500 hover:text-white'
                      )}
                    >{l}</button>
                  ))}
                </div>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-300">O último resultado está te influenciando hoje?</span>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {([['sim', 'Sim — estou pensando nele'], ['nao', 'Não — mente limpa']] as const).map(([v, l]) => (
                    <button
                      key={v} type="button"
                      onClick={() => setFormData({ ...formData, ultimo_resultado_influencia: v })}
                      className={cn(
                        'py-2.5 rounded-xl text-xs font-bold transition-all border',
                        formData.ultimo_resultado_influencia === v
                          ? v === 'sim' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : 'bg-white/5 border-white/5 text-slate-500 hover:text-white'
                      )}
                    >{l}</button>
                  ))}
                </div>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-300">Reflexão Pessoal</span>
                <textarea
                  rows={4}
                  placeholder="Como você se sente em relação ao mercado hoje? Há algo te preocupando?"
                  className="mt-1 block w-full bg-slate-800 border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-apex-trader-primary outline-none transition-all resize-none"
                  value={formData.reflexao_pessoal}
                  onChange={e => setFormData({ ...formData, reflexao_pessoal: e.target.value })}
                />
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={isAnalyzing}
            className="w-full bg-apex-trader-primary hover:bg-[#2563eb] disabled:opacity-50 text-black font-bold py-4 rounded-xl shadow-lg shadow-apex-trader-primary/20 transition-all flex items-center justify-center gap-2"
          >
            {isAnalyzing ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Analisando com IA...
              </>
            ) : (
              <>
                <Sparkles size={20} />
                Analisar Prontidão
              </>
            )}
          </button>
        </form>
      </div>

      {/* ===== RESPOSTA DA ANÁLISE ===== */}
      {result ? (
        <div className={cn(
          'glass-card p-8 border-l-4 animate-in fade-in slide-in-from-bottom-4',
          result.pronto ? 'border-l-emerald-500' : 'border-l-red-500'
        )}>
          <div className="flex items-center gap-3 mb-6">
            {result.pronto ? (
              <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg"><CheckCircle2 size={24} /></div>
            ) : (
              <div className="p-2 bg-red-500/10 text-red-500 rounded-lg"><AlertCircle size={24} /></div>
            )}
            <div>
              <h3 className="text-xl font-bold">{result.pronto ? 'Pronto para Operar' : 'Recomendação: Pausa'}</h3>
              <p className="text-xs text-slate-500">Análise baseada no seu check-in</p>
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-5 mb-4">
            <p className="text-slate-200 leading-relaxed text-sm">"{result.recomendacao_ia}"</p>
          </div>

          {result.detalhes && result.detalhes.length > 0 && (
            <div className="mb-5">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Pontos de Atenção</p>
              <div className="space-y-1.5">
                {result.detalhes.map((d: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-400 p-2.5 bg-white/[0.03] rounded-lg border border-white/5">
                    <span className="text-apex-trader-primary font-bold shrink-0 mt-0.5">›</span>
                    {d}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mini summary bars */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Energia', val: formData.nivel_energia },
              { label: 'Concentração', val: formData.nivel_concentracao },
              { label: 'Equilíbrio', val: 6 - formData.nivel_estresse },
              { label: 'Controle Emoc.', val: formData.medo_perda <= 2 ? 5 : formData.medo_perda <= 3 ? 3 : 1 },
            ].map(item => (
              <div key={item.label} className="flex flex-col gap-1.5">
                <div className="flex justify-between">
                  <span className="text-[10px] font-bold uppercase text-slate-500">{item.label}</span>
                  <span className="text-[10px] font-bold text-slate-400">{item.val}/5</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${(item.val / 5) * 100}%`,
                      background: item.val >= 4 ? '#3b82f6' : item.val >= 3 ? '#f59e0b' : '#ef4444',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {result.pronto && (
            <button
              onClick={() => navigate('/dashboard/operacoes')}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-all"
            >
              Iniciar Sessão de Trading
            </button>
          )}
          {!result.pronto && (
            <div className="flex items-start gap-3 p-4 bg-red-500/5 rounded-xl border border-red-500/10">
              <ShieldAlert size={18} className="text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-300">Proteja sua banca. Um dia de pausa vale mais do que uma série de decisões tomadas no estado errado.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="glass-card p-8 flex flex-col items-center justify-center text-center h-48 opacity-50">
          <Sparkles size={48} className="text-slate-600 mb-4" />
          <p className="text-slate-400">Preencha o formulário e receba sua análise de prontidão personalizada.</p>
        </div>
      )}

      {/* ===== HISTÓRICO (por último) ===== */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4 text-slate-300">
          <History size={18} />
          <h4 className="font-semibold">Histórico Recente</h4>
        </div>
        <div className="space-y-2">
          {operacoes.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs italic">
              Nenhuma análise realizada recentemente.
            </div>
          ) : (
            operacoes.slice(0, 3).map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm p-3 bg-white/5 rounded-xl">
                <span className="text-slate-400 text-xs">{new Date(item.data).toLocaleDateString('pt-BR')}</span>
                <span className="text-xs text-slate-500">{item.ativo} · {item.estrategia}</span>
                <span className={cn(
                  'text-[10px] font-bold px-2 py-1 rounded-lg',
                  item.resultado === 'vitoria' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                )}>
                  {item.resultado === 'vitoria' ? 'WIN' : 'LOSS'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
