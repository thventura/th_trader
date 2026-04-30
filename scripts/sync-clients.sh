#!/bin/bash
# Sincroniza todos os forks de clientes com o repo template.
# Requer GitHub CLI instalado: https://cli.github.com/
# Uso: bash scripts/sync-clients.sh

TEMPLATE_REPO="cleytin0101/trademaster-template"  # ajuste para o repo template real

# Lista de repos dos clientes (formato: usuario/repo)
CLIENTS=(
  # "cleytin0101/cliente-a"
  # "cleytin0101/cliente-b"
)

if [ ${#CLIENTS[@]} -eq 0 ]; then
  echo "⚠️  Adicione os repos dos clientes no array CLIENTS deste script."
  exit 1
fi

echo "🔄 Sincronizando ${#CLIENTS[@]} cliente(s) com $TEMPLATE_REPO..."
echo ""

SUCCESS=0
FAILED=0

for client in "${CLIENTS[@]}"; do
  echo -n "  → $client ... "
  if gh repo sync "$client" --source "$TEMPLATE_REPO" 2>/dev/null; then
    echo "✅"
    ((SUCCESS++))
  else
    echo "❌ falhou"
    ((FAILED++))
  fi
done

echo ""
echo "Concluído: $SUCCESS sincronizado(s), $FAILED falhou(ram)."
