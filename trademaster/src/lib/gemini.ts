export const analyzeMindset = async (mindsetData: any, lastOperations: any[]) => {
  const res = await fetch('/api/gemini-analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mindsetData, lastOperations }),
  });

  if (!res.ok) {
    throw new Error('Erro ao analisar mindset via IA.');
  }

  return res.json();
};
