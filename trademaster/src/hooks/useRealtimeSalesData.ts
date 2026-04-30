import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';

export interface SaleDataPoint {
  time: string;
  sales: number;
  revenue: number;
}

export interface LatestPayment {
  id: string;
  customer: string;
  amount: number;
  time: string;
  status: 'completed' | 'pending' | 'failed';
}

export const useRealtimeSalesData = () => {
  const { operacoes } = useData();
  const [chartData, setChartData] = useState<SaleDataPoint[]>([]);
  const [latestPayments, setLatestPayments] = useState<LatestPayment[]>([]);

  useEffect(() => {
    // Transform operations into chart data
    // For "real-time" feel, we could use the last 20 operations or group by time
    const lastOps = [...operacoes].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()).slice(0, 20).reverse();
    
    const transformed: SaleDataPoint[] = lastOps.map((op, i) => ({
      time: op.data.split('-').slice(1).join('/'),
      sales: 1, // Each operation is 1 sale in this context
      revenue: op.lucro
    }));

    setChartData(transformed);

    // Transform operations into latest payments
    const payments: LatestPayment[] = lastOps.slice(-5).reverse().map(op => ({
      id: op.id.toString(),
      customer: op.ativo, // Using Asset as customer name for context
      amount: op.lucro,
      time: op.data,
      status: op.resultado === 'vitoria' ? 'completed' : op.resultado === 'derrota' ? 'failed' : 'pending'
    }));

    setLatestPayments(payments);
  }, [operacoes]);

  return { chartData, latestPayments };
};
