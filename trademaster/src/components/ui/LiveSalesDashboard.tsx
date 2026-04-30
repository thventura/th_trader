import React, { FC, useMemo } from 'react';
import { useRealtimeSalesData, SaleDataPoint, LatestPayment } from '../../hooks/useRealtimeSalesData';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from './card';
import { Badge } from './badge';
import { Separator } from './separator';
import { ScrollArea } from './scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';
import { Button } from './button';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  ShoppingCart, 
  ArrowUpRight, 
  ArrowDownRight,
  RefreshCcw,
  ExternalLink,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: React.ElementType;
  description: string;
}

const MetricCard: FC<MetricCardProps> = ({ title, value, change, trend, icon: Icon, description }) => (
  <Card className="bg-neutral-950/50 border-white/5 overflow-hidden group hover:border-[#3b82f6]/30 transition-all duration-500">
    <CardContent className="p-6 relative">
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <Icon size={48} />
      </div>
      <div className="flex items-center gap-4 mb-4">
        <div className="p-2 rounded-xl bg-[#3b82f6]/10 text-[#3b82f6]">
          <Icon size={20} />
        </div>
        <span className="text-sm font-medium text-neutral-400">{title}</span>
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-2xl font-bold text-white tracking-tight">{value}</h3>
        <div className="flex items-center gap-2">
          <span className={cn(
            "flex items-center text-xs font-bold px-1.5 py-0.5 rounded-md",
            trend === 'up' ? "text-[#3b82f6] bg-[#3b82f6]/10" : "text-red-500 bg-red-500/10"
          )}>
            {trend === 'up' ? <ArrowUpRight size={12} className="mr-0.5" /> : <ArrowDownRight size={12} className="mr-0.5" />}
            {change}
          </span>
          <span className="text-[10px] text-neutral-500">{description}</span>
        </div>
      </div>
    </CardContent>
  </Card>
);

const RealtimeChart: FC<{ data: SaleDataPoint[] }> = ({ data }) => {
  return (
    <div className="h-[300px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
          <XAxis 
            dataKey="time" 
            stroke="#404040" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
            tick={{ fill: '#737373' }}
            dy={10}
          />
          <YAxis 
            stroke="#404040" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
            tick={{ fill: '#737373' }}
            tickFormatter={(value) => `R$${value}`}
          />
          <RechartsTooltip 
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-neutral-900 border border-white/10 p-3 rounded-xl shadow-2xl backdrop-blur-md">
                    <p className="text-[10px] text-neutral-500 uppercase font-bold mb-1">{label}</p>
                    <p className="text-sm font-bold text-[#3b82f6]">{`Lucro: R$${payload[0].value}`}</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area 
            type="monotone" 
            dataKey="revenue" 
            stroke="#3b82f6" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorRevenue)" 
            animationDuration={1500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export const SalesDashboard: FC = () => {
  const { chartData, latestPayments } = useRealtimeSalesData();

  const totalRevenue = useMemo(() => 
    chartData.reduce((acc, curr) => acc + curr.revenue, 0), 
  [chartData]);

  const winRate = useMemo(() => {
    const wins = latestPayments.filter(p => p.status === 'completed').length;
    return latestPayments.length > 0 ? Math.round((wins / latestPayments.length) * 100) : 0;
  }, [latestPayments]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Faturamento Total" 
          value={`R$ ${totalRevenue.toLocaleString()}`} 
          change="+12.5%" 
          trend="up" 
          icon={DollarSign}
          description="vs. período anterior"
        />
        <MetricCard 
          title="Win Rate" 
          value={`${winRate}%`} 
          change="+2.4%" 
          trend="up" 
          icon={TrendingUp}
          description="Média das últimas ops"
        />
        <MetricCard 
          title="Operações" 
          value={chartData.length.toString()} 
          change="+18" 
          trend="up" 
          icon={ShoppingCart}
          description="Novos registros"
        />
        <MetricCard 
          title="Performance" 
          value="9.2/10" 
          change="+0.5" 
          trend="up" 
          icon={Users}
          description="Score de consistência"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-neutral-950/50 border-white/5 p-6 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
            <TrendingUp size={240} />
          </div>
          <CardHeader className="p-0 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold text-white">Evolução de Performance</CardTitle>
                <CardDescription className="text-neutral-500 mt-1">Análise detalhada do crescimento da banca em tempo real.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-900 border border-white/5">
                  <span className="w-2 h-2 rounded-full bg-[#3b82f6] animate-pulse" />
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">LIVE DATA</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <RealtimeChart data={chartData} />
          </CardContent>
          <CardFooter className="p-0 mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#3b82f6]" />
                <span className="text-xs text-neutral-400">Lucro</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-neutral-800" />
                <span className="text-xs text-neutral-400">Projeção</span>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="text-neutral-500 hover:text-white gap-2">
              Ver relatório completo
              <ChevronRight size={14} />
            </Button>
          </CardFooter>
        </Card>

        <Card className="bg-neutral-950/50 border-white/5 flex flex-col group overflow-hidden">
          <CardHeader className="p-6 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold text-white">Últimas operações</CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full border border-white/5">
                      <RefreshCcw size={14} className="text-neutral-500" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-[10px] font-bold">ATUALIZAR LISTA</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            <ScrollArea className="h-[400px]">
              <div className="px-6 space-y-6">
                {latestPayments.map((payment, i) => (
                  <div key={payment.id} className="relative group/item">
                    {i !== latestPayments.length - 1 && (
                      <div className="absolute left-4 top-10 bottom-[-24px] w-px bg-neutral-800" />
                    )}
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 border-neutral-950",
                        payment.status === 'completed' ? "bg-[#3b82f6] text-black" : 
                        payment.status === 'failed' ? "bg-red-500 text-white" : "bg-neutral-800 text-neutral-400"
                      )}>
                        {payment.status === 'completed' ? <CheckCircle2 size={16} /> : 
                         payment.status === 'failed' ? <AlertCircle size={16} /> : <Clock size={16} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-bold text-white truncate">{payment.customer}</p>
                          <span className="text-[10px] font-mono font-bold text-[#3b82f6]">
                            {payment.amount >= 0 ? '+' : ''} R$ {payment.amount.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={cn(
                            "text-[8px] px-1.5 py-0 uppercase font-black",
                            payment.status === 'completed' ? "text-[#3b82f6] border-[#3b82f6]/30 bg-[#3b82f6]/5" : 
                            payment.status === 'failed' ? "text-red-500 border-red-500/30 bg-red-500/5" : "text-neutral-500 border-white/5"
                          )}>
                            {String(payment.status)}
                          </Badge>
                          <span className="text-[10px] text-neutral-600">{payment.time}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="h-6" />
            </ScrollArea>
          </CardContent>
          <CardFooter className="p-4 bg-white/[0.02] border-t border-white/5">
            <Button className="w-full bg-neutral-900 border border-white/10 hover:bg-neutral-800 text-white text-xs font-bold gap-2 group-hover:bg-[#3b82f6] group-hover:text-black transition-all duration-500">
              Gerenciar Fluxo
              <ExternalLink size={14} />
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};
