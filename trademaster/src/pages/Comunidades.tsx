import React from 'react';
import { MessageCircle, Headphones, Users, ExternalLink, ArrowRight } from 'lucide-react';
import { BRANDING } from '../config/branding';

interface Comunidade {
  titulo: string;
  descricao: string;
  detalhe: string;
  link: string;
  label: string;
  icon: React.ElementType;
  cor: string;
  corBg: string;
  corBorda: string;
  corBotao: string;
}

const comunidades: Comunidade[] = [
  {
    titulo: 'Discord',
    descricao: 'Comunidade principal de traders',
    detalhe:
      'Participe da nossa comunidade no Discord para interagir com outros traders, compartilhar dicas, aprender mais e trocar experiências em tempo real.',
    link: 'https://discord.gg/PPsNv92YKJ',
    label: 'Entrar no Discord',
    icon: MessageCircle,
    cor: 'text-indigo-400',
    corBg: 'bg-indigo-500/10',
    corBorda: 'border-indigo-500/20',
    corBotao: 'bg-indigo-500 hover:bg-indigo-600',
  },
  {
    titulo: 'WhatsApp',
    descricao: 'Comunidade de atualizações e novidades',
    detalhe:
      'Entre para a nossa comunidade no WhatsApp para receber atualizações rápidas, trocar ideias e ficar por dentro das novidades do mercado.',
    link: 'https://chat.whatsapp.com/CPUJI4DQ1Da5JH1ZMAUKDU',
    label: 'Entrar no WhatsApp',
    icon: MessageCircle,
    cor: 'text-emerald-400',
    corBg: 'bg-emerald-500/10',
    corBorda: 'border-emerald-500/20',
    corBotao: 'bg-emerald-500 hover:bg-emerald-600',
  },
  {
    titulo: 'Suporte',
    descricao: 'Atendimento direto com a equipe',
    detalhe:
      'Precisa de ajuda ou tem dúvidas? Clique no link abaixo para entrar em contato diretamente com o nosso suporte e receber orientação personalizada.',
    link: 'https://wa.me/+5588982297684?text=Ola%20gostaria%20de%20tirar%20uma%20duvida',
    label: 'Falar com Suporte',
    icon: Headphones,
    cor: 'text-trademaster-blue',
    corBg: 'bg-trademaster-blue/10',
    corBorda: 'border-trademaster-blue/20',
    corBotao: 'bg-trademaster-blue hover:bg-trademaster-blue/80',
  },
];

export default function Comunidades() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <header>
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 bg-trademaster-blue/10 rounded-xl">
            <Users size={22} className="text-trademaster-blue" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight">Comunidades</h2>
        </div>
        <p className="text-slate-400 max-w-2xl leading-relaxed">
          Faça parte dos nossos grupos exclusivos e acelere sua evolução como trader. Cada canal tem um propósito
          diferente — juntos, criamos uma rede de suporte, aprendizado e crescimento contínuo.
        </p>
      </header>

      {/* Benefícios em destaque */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Networking', desc: 'Conecte-se com traders de todo o Brasil' },
          { label: 'Aprendizado', desc: 'Compartilhe estratégias e análises' },
          { label: 'Suporte', desc: 'Tire dúvidas em tempo real' },
        ].map((b) => (
          <div key={b.label} className="glass-card p-4 flex flex-col gap-1">
            <span className="text-xs font-black uppercase tracking-widest text-trademaster-blue">{b.label}</span>
            <span className="text-sm text-slate-400">{b.desc}</span>
          </div>
        ))}
      </div>

      {/* Cards das comunidades */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {comunidades.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.titulo}
              className={`glass-card p-6 flex flex-col gap-5 border ${c.corBorda} transition-all duration-300 hover:scale-[1.02] hover:shadow-lg`}
            >
              {/* Ícone + título */}
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-2xl ${c.corBg} shrink-0`}>
                  <Icon size={24} className={c.cor} />
                </div>
                <div>
                  <h3 className="text-lg font-bold">{c.titulo}</h3>
                  <p className={`text-xs font-semibold ${c.cor} mt-0.5`}>{c.descricao}</p>
                </div>
              </div>

              {/* Descrição */}
              <p className="text-sm text-slate-400 leading-relaxed flex-1">{c.detalhe}</p>

              {/* Botão */}
              <a
                href={c.link}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl text-black font-bold text-sm transition-all ${c.corBotao} shadow-md`}
              >
                {c.label}
                <ArrowRight size={16} />
              </a>
            </div>
          );
        })}
      </div>

      {/* Rodapé informativo */}
      <div className="glass-card p-5 flex items-start gap-4">
        <div className="p-2.5 bg-amber-500/10 rounded-xl shrink-0">
          <ExternalLink size={18} className="text-amber-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-200 mb-1">Links verificados e seguros</p>
          <p className="text-xs text-slate-500 leading-relaxed">
            Todos os links acima são oficiais da plataforma {BRANDING.appName}. Nunca compartilhe sua senha ou dados
            financeiros em nenhum canal da comunidade. Em caso de dúvidas, use o canal de Suporte.
          </p>
        </div>
      </div>
    </div>
  );
}
