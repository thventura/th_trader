import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BRANDING } from '../config/branding';
import { 
  ChevronRight, 
  Shield, 
  Clock, 
  Star, 
  Zap, 
  CheckCircle2, 
  TrendingUp, 
  BrainCircuit, 
  LayoutDashboard, 
  MessageCircle, 
  Award,
  ArrowRight,
  Play,
  LineChart,
  Check
} from 'lucide-react';
import { CustomVideoPlayer } from '../components/CustomVideoPlayer';
import confetti from 'canvas-confetti';
import { Button } from '../components/ui/button';

const COLORS = {
  primary: '#34de00',
  primaryDark: '#2bc900',
  secondary: '#7fff00',
  bg: '#000000',
  card: '#0f172a',
};

const Quiz = () => {
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setProgress((step / 10) * 100);
  }, [step]);

  const nextStep = () => setStep(prev => prev + 1);

  useEffect(() => {
    if (step === 9) {
      const timer = setTimeout(() => {
        setStep(10);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const handleFinish = () => {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: [COLORS.primary, '#ffffff', COLORS.secondary]
    });
  };

  useEffect(() => {
    if (step === 10) {
      handleFinish();
    }
  }, [step]);

  interface QuizContainerProps {
    children: React.ReactNode;
    title?: string;
    subtitle?: string;
    className?: string;
    key?: React.Key;
  }

  const QuizContainer = ({ children, title, subtitle, className }: QuizContainerProps) => (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`max-w-[600px] mx-auto w-full px-4 ${className || ''}`}
    >
      {title && <h2 className="text-2xl md:text-3xl font-black text-center mb-4 leading-tight uppercase tracking-tight">{title}</h2>}
      {subtitle && <p className="text-slate-400 text-center mb-8 font-medium leading-relaxed">{subtitle}</p>}
      {children}
    </motion.div>
  );

  const OptionButton = ({ text, onClick, icon: Icon }: { text: string, onClick: () => void, icon?: any }) => (
    <button 
      onClick={onClick}
      className="w-full group relative flex items-center justify-between p-5 mb-4 rounded-2xl bg-white border border-white hover:bg-slate-200 transition-all text-left overflow-hidden shadow-[0_4px_20px_rgba(255,255,255,0.1)]"
    >
      <span className="text-lg font-bold text-black group-hover:text-black transition-colors relative z-10">{text}</span>
      <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center group-hover:bg-black transition-all relative z-10">
        {Icon ? <Icon size={20} className="text-white transition-colors" /> : <ChevronRight size={20} className="text-white transition-colors" />}
      </div>
    </button>
  );

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col items-center py-10 overflow-x-hidden">
      {/* Header / Logo */}
      <div className="mb-8 px-6 w-full flex justify-between items-center max-w-[1200px]">
        <img src={BRANDING.logoUrl} alt={BRANDING.logoAlt} className="h-8" />
        {step > 0 && step < 11 && (
          <div className="hidden md:flex items-center gap-2 bg-white/5 px-4 py-1.5 rounded-full border border-white/10">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Análise de Perfil em Tempo Real</span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {step > 0 && step < 11 && (
        <div className="w-full max-w-[500px] px-6 mb-12">
          <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-primary shadow-[0_0_15px_rgba(52,222,0,0.5)]"
            />
          </div>
          <div className="flex justify-between mt-2">
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Progresso</span>
             <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{Math.round(progress)}%</span>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* STEP 0: APRESENTAÇÃO INICIAL */}
        {step === 0 && (
          <QuizContainer key="step0">
            <div className="text-center mb-12 mt-4 md:mt-10">
              <div className="inline-flex items-center gap-2 text-[10px] font-black text-primary bg-primary/5 border border-primary/60 px-8 py-2.5 rounded-full mb-8 uppercase tracking-[3px] shadow-[0_0_20px_rgba(52,222,0,0.15)]">
                é exclusivo para traders
              </div>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-black mb-8 tracking-tighter leading-[1.1] uppercase">
                <span className="text-white">Aprenda como</span> <br />
                <span style={{ color: '#34de00' }}>fazer R$50 por</span> <br />
                <span style={{ color: '#34de00' }}>dia <span style={{ fontStyle: 'italic' }}>operando.</span></span>
              </h1>
              <p className="text-lg md:text-xl text-white max-w-[600px] mx-auto leading-relaxed mb-12 font-medium">
                Você vai perceber que <span className="font-black">NÃO É IMPOSSÍVEL</span> conquistar seus objetivos, desde que faça as escolhas certas e tome as ações corretas!
              </p>
            </div>

            {/* VSL Placeholder */}
            <div className="relative aspect-video w-full rounded-2xl border border-white/10 shadow-[0_0_50px_rgba(52,222,0,0.15)] overflow-hidden mb-10">
              <CustomVideoPlayer videoId="C2qoRxiOkhs" />
            </div>

            <div className="space-y-4">
              <button 
                onClick={nextStep}
                className="w-full group relative flex items-center justify-between p-6 rounded-2xl bg-white border-2 border-white hover:bg-slate-100 transition-all text-left overflow-hidden shadow-[0_0_30px_rgba(255,255,255,0.2)]"
              >
                <span className="text-xl font-black text-black uppercase tracking-tight relative z-10 italic">
                  Quero aprender a operar agora!
                </span>
                <div className="w-12 h-12 rounded-xl bg-black flex items-center justify-center group-hover:scale-110 transition-all relative z-10 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                  <ChevronRight size={24} className="text-white" />
                </div>
              </button>
            </div>
          </QuizContainer>
        )}

        {/* STEP 1: PRIMEIRA PERGUNTA */}
        {step === 1 && (
          <QuizContainer key="step1">
            <div className="flex justify-center mb-8">
              <img src="https://i.imgur.com/59VrluF.gif" alt="Impacto" className="w-full max-w-[400px] rounded-2xl border border-white/10 shadow-2xl" />
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-center mb-4 uppercase">NA HORA DE OPERAR, O QUE MAIS TE TRAVA?</h2>
            <p className="text-slate-400 text-center mb-8 font-medium">Identificando sua maior barreira emocional hoje.</p>
            <OptionButton text="Medo de errar e perder dinheiro" onClick={nextStep} />
            <OptionButton text="Falta de confiança na leitura do gráfico" onClick={nextStep} />
          </QuizContainer>
        )}

        {/* STEP 2: SEGUNDA PERGUNTA */}
        {step === 2 && (
          <QuizContainer key="step2">
            <div className="flex justify-center mb-8">
              <img src="https://i.imgur.com/95hFK9T.gif" alt="Clareza" className="w-full max-w-[400px] rounded-2xl border border-white/10 shadow-2xl" />
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-center mb-4 uppercase">VOCÊ SENTE QUE FALTA CLAREZA NO SEU OPERACIONAL?</h2>
            <p className="text-slate-400 text-center mb-8 font-medium">O excesso de informação pode ser seu maior inimigo.</p>
            <OptionButton text="Sim, isso é exatamente o que eu sinto." onClick={nextStep} />
            <OptionButton text="Não, mas preciso de algo estruturado." onClick={nextStep} />
          </QuizContainer>
        )}

        {/* STEP 3: TERCEIRA PERGUNTA */}
        {step === 3 && (
          <QuizContainer key="step3">
            <div className="flex justify-center mb-8">
              <img src="https://i.imgur.com/4uCQ3pZ.gif" alt="Transformação" className="w-full max-w-[400px] rounded-2xl border border-white/10 shadow-2xl" />
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-center mb-4 uppercase">E SE VOCÊ TIVESSE UMA ESTRATÉGIA COMPROVADA?</h2>
            <p className="text-slate-400 text-center mb-8 font-medium">Imagine os resultados da consistência profissional.</p>
            <OptionButton text="Mudaria minha confiança e meus resultados." onClick={nextStep} />
            <OptionButton text="Seria o divisor de águas que eu tanto busco." onClick={nextStep} />
          </QuizContainer>
        )}

        {/* STEP 4: QUARTA PERGUNTA */}
        {step === 4 && (
          <QuizContainer key="step4">
            <div className="flex justify-center mb-8">
              <img src="https://i.imgur.com/Lxb4lJa.gif" alt="Comprometimento" className="w-full max-w-[400px] rounded-2xl border border-white/10 shadow-2xl" />
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-center mb-4 uppercase">VOCÊ ESTÁ PRONTO PARA DAR O PRÓXIMO PASSO?</h2>
            <p className="text-slate-400 text-center mb-8 font-medium">O comprometimento é o primeiro degrau do lucro.</p>
            <OptionButton text="Sim, estou pronto para investir agora." onClick={nextStep} />
            <OptionButton text="Tenho dúvidas, mas quero conhecer." onClick={nextStep} />
          </QuizContainer>
        )}

        {/* STEP 5: APRESENTAÇÃO DO PRODUTO (RESTAURADO) */}
        {step === 5 && (
          <QuizContainer key="step5">
            <div className="text-center mb-8">
              <h3 className="text-primary font-black uppercase tracking-[3px] text-sm mb-4">Prepare-se para a transformação</h3>
              <div className="flex justify-center mb-8">
                <img src="https://i.imgur.com/hdBhY9I.png" alt="Estrutura Completa" className="w-full max-w-[400px] rounded-2xl border border-white/10 shadow-2xl" />
              </div>
              <h2 className="text-2xl md:text-3xl font-black uppercase mb-4 tracking-tighter leading-tight">Não é um curso, <br /> é uma estrutura completa</h2>
            </div>
            <div className="space-y-3 mb-10">
              {[
                { label: 'O robô de automação automática', price: 'R$ 997' },
                { label: 'Aulas ao vivo segunda a sexta', price: 'R$ 497 /mês' },
                { label: 'Dados reais da planilha', price: 'R$ 97 /mês' },
                { label: 'Check-in e trade psicológicos', price: 'R$ 97 /mês' },
                { label: 'Curso com aulas gravadas', price: 'R$ 497' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-slate-900 border border-white/10 uppercase font-black text-[10px] tracking-widest">
                  <span className="text-slate-200">{item.label}</span>
                  <span className="text-red-500 line-through opacity-80">{item.price}</span>
                </div>
              ))}
              <div className="p-5 rounded-xl bg-primary/5 border border-primary/20 flex justify-between items-center mt-6">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Valor Total Acumulado</span>
                <span className="text-xl font-black text-red-500 line-through">R$ 2.185</span>
              </div>
            </div>
            <button onClick={nextStep} className="w-full bg-white text-black font-black text-lg py-5 rounded-2xl flex items-center justify-center gap-3 hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] transition-all uppercase tracking-tight">
              ESTOU PRONTO PARA O PRÓXIMO PASSO <ArrowRight size={22} />
            </button>
          </QuizContainer>
        )}

        {/* STEP 6: CONFIRMAÇÃO DE INTERESSE (RESTAURADO) */}
        {step === 6 && (
          <QuizContainer key="step6">
             <div className="flex justify-center mb-8">
              <img src="https://i.imgur.com/l1bLNoa.gif" alt="Interesse" className="w-full max-w-[400px] rounded-2xl border border-white/10 shadow-2xl" />
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-center mb-4 uppercase">VOCÊ SE SENTE CONFORTÁVEL COM O VALOR QUE VAI RECEBER?</h1>
            <p className="text-slate-400 text-center mb-8 font-medium">O {BRANDING.appName} é o investimento mais inteligente para sua carreira.</p>
            <OptionButton text="Sim, estou pronto para garantir minha vaga!" onClick={() => setStep(9)} />
            <OptionButton text="Com certeza, quero aproveitar essa oportunidade!" onClick={() => setStep(9)} />
          </QuizContainer>
        )}

        {/* STEP 9: ANÁLISE DE PERFIL IA */}
        {step === 9 && (
          <QuizContainer key="step9" className="text-center">
             <div className="mb-12">
               <motion.div 
                 animate={{ rotate: 360 }}
                 transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                 className="w-32 h-32 border-4 border-primary/20 border-t-primary rounded-full mx-auto flex items-center justify-center mb-8"
               >
                 <BrainCircuit size={48} className="text-primary animate-pulse" />
               </motion.div>
               <h2 className="text-3xl font-black uppercase mb-4 tracking-tighter">Processando Perfil</h2>
               <p className="text-slate-500 font-bold uppercase tracking-[4px] text-xs">Aguarde os insights da IA...</p>
             </div>

             <div className="space-y-3 max-w-[400px] mx-auto">
                {[
                  { l: 'Verificando histórico de consistência...', d: 1 },
                  { l: 'Analisando barreiras emocionais detectadas...', d: 2 },
                  { l: 'Calculando potencial de lucro com automação...', d: 3 },
                  { l: 'Sincronizando com as vagas disponíveis...', d: 4 },
                ].map((line, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: line.d }}
                    className="flex items-center gap-3 text-sm font-bold text-slate-400"
                  >
                    <CheckCircle2 size={16} className="text-primary" />
                    {line.l}
                  </motion.div>
                ))}
              </div>
           </QuizContainer>
        )}

        {/* STEP 10: OFERTA FINAL IRRESISTÍVEL */}
        {step === 10 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-[1200px] mx-auto px-6 py-10"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
              {/* LEFT COLUMN: BONUSES */}
              <div className="space-y-10">
                <div>
                  <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[2px] text-primary bg-primary/8 border border-primary/15 px-4 py-1.5 rounded-full mb-6 shadow-[0_0_15px_rgba(52,222,0,0.1)]">
                    Resumo da Oferta
                  </div>
                  <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-[1] mb-8 uppercase text-white">
                    Tudo Que Você Precisa em <span className="text-primary">Um Único Lugar</span>
                  </h2>
                  <p className="text-slate-400 mb-8 font-medium text-lg leading-relaxed">Dentro da {BRANDING.appName}, você terá:</p>
                  
                  <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-5 mb-10">
                    {[
                      'Robôs automáticos',
                      'Dashboard de performance',
                      'Análise psicológica com IA',
                      'Curso completo de trading',
                      'Ranking de traders',
                      'Comunidade privada',
                      'Aulas ao vivo de segunda a sexta-feira',
                      'Premiação em dinheiro',
                      'Certificação'
                    ].map((item, idx) => (
                      <motion.li 
                        key={idx}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: idx * 0.1 }}
                        className="flex items-center gap-4 text-lg md:text-xl font-bold text-slate-100 group"
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-[0_0_10px_rgba(52,222,0,0.2)]">
                           <Check size={18} className="text-primary stroke-[3px]" />
                        </div>
                        {item}
                      </motion.li>
                    ))}
                  </ul>

                  <div className="border border-primary/30 p-8 rounded-2xl bg-primary/5 backdrop-blur-sm relative overflow-hidden group shadow-[0_0_30px_rgba(52,222,0,0.05)]">
                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <p className="text-2xl md:text-3xl font-black text-white italic relative z-10">Tudo em uma única assinatura.</p>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: PRICING CARD */}
              <div className="lg:sticky lg:top-10">
                <div className="border border-white/10 p-8 md:p-12 rounded-[2.5rem] bg-[#0A0A0A] shadow-[0_0_80px_rgba(52,222,0,0.05)] relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                  
                  <div className="text-center mb-10">
                    <h3 className="text-3xl md:text-4xl font-black text-white mb-6 tracking-tight leading-tight">A Hora de Agir é Agora!</h3>
                    <p className="text-slate-400 text-lg leading-relaxed max-w-[400px] mx-auto font-medium">
                      Se você quer parar de operar no impulso e começar a tratar o trading como um processo profissional…
                    </p>
                  </div>

                  <div className="bg-[#050505] border border-white/5 rounded-3xl p-8 relative mb-10 group hover:border-primary/20 transition-all">
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-black font-black text-[10px] px-6 py-2 rounded-full uppercase tracking-[2px] shadow-[0_0_25px_rgba(52,222,0,0.6)] z-20">
                      MELHOR CUSTO-BENEFÍCIO
                    </div>

                    <div className="text-center mb-8 pt-4">
                      <p className="text-slate-300 font-bold uppercase tracking-[3px] text-xs mb-4">Plano Protocolo 3P</p>
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-2xl font-black text-slate-500">R$</span>
                        <span className="text-7xl font-black text-white tracking-tighter">47</span>
                        <span className="text-xl font-bold text-slate-500 ml-2 self-end mb-2">/mês</span>
                      </div>
                    </div>

                    <ul className="space-y-4 mb-10">
                      {[
                        { text: 'O Robô de Automação Automática' },
                        { text: 'Aulas ao Vivo Segunda a Sexta' },
                        { text: 'Dados Reais da Planilha' },
                        { text: 'Check-in e Trade Psicológicos' },
                        { text: 'Curso com Aulas Gravadas' }
                      ].map((feature, i) => (
                        <li key={i} className="flex items-center gap-3 text-sm font-bold text-slate-300">
                          <Check size={14} className="text-primary stroke-[3px]" />
                          {feature.text}
                        </li>
                      ))}
                    </ul>

                    <a 
                      href="https://pay.cakto.com.br/anasupy_808501" 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-3 bg-primary text-black font-black text-xl py-6 rounded-2xl hover:shadow-[0_0_50px_rgba(52,222,0,0.6)] transition-all scale-100 hover:scale-[1.03] active:scale-[0.98]"
                    >
                      GARANTIR MINHA VAGA <ArrowRight size={22} className="animate-pulse" />
                    </a>
                  </div>

                  <div className="text-center space-y-4">
                    <p className="text-xs font-black text-slate-600 uppercase tracking-[4px]">PAGAMENTO PROCESSADO POR CAKTO</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1]">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.03]" 
             style={{ backgroundImage: `radial-gradient(${COLORS.primary} 0.5px, transparent 0.5px)`, backgroundSize: '24px 24px' }} />
      </div>
    </div>
  );
};

export default Quiz;
