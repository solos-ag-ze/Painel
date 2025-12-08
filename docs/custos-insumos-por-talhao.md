# Custos de Insumos por Talhão

## Visão Geral

O sistema agora calcula os custos de insumos por talhão baseado nos **lançamentos agrícolas reais** registrados, em vez de usar distribuição proporcional por área.

## Como Funciona

### 1. Estrutura de Dados

O cálculo utiliza as seguintes tabelas:

- **`lancamentos_agricolas`**: Atividades agrícolas registradas
- **`lancamento_produtos`**: Produtos utilizados em cada atividade
  - `produto_id`: ID do produto no estoque
  - `quantidade_val`: Quantidade utilizada
  - `quantidade_un`: Unidade de medida
  - `custo_total_item`: **Custo total já calculado** (quantidade × preço)
  - `nome_produto`: Nome do produto
- **`lancamento_talhoes`**: Talhões onde cada atividade foi realizada

### 2. Cálculo dos Custos

O processo de cálculo segue estas etapas:

1. **Buscar atividades**: Filtra atividades agrícolas no período da safra/mês
2. **Buscar produtos**: Identifica produtos utilizados nas atividades (com `custo_total_item`)
3. **Buscar talhões**: Identifica em quais talhões as atividades foram realizadas
4. **Distribuir custos**: 
   - Usa o `custo_total_item` já calculado na tabela
   - Se uma atividade foi realizada em múltiplos talhões, divide o custo igualmente

### 3. Exemplo Prático

**Cenário:**
- NPK 10-10-10 custa R$ 150,00/saco
- Atividade: Adubação no Talhão 1
- Quantidade: 100 sacos

**Resultado:**
- Talhão 1: R$ 15.000,00 em insumos (100 × R$ 150)

**Cenário com múltiplos talhões:**
- NPK 10-10-10 custa R$ 150,00/saco
- Atividade: Adubação nos Talhões 1 e 2
- Quantidade: 100 sacos

**Resultado:**
- Talhão 1: R$ 7.500,00 em insumos (100 × R$ 150 ÷ 2)
- Talhão 2: R$ 7.500,00 em insumos (100 × R$ 150 ÷ 2)

## Implementação Técnica

### Função Principal

```typescript
async function getCustosInsumosPorTalhao(
  userId: string,
  dataInicio: Date | null,
  dataFim: Date | null
): Promise<Record<string, number>>
```

**Retorna:** Mapa `{ talhao_id: custo_total }`

### Integração no Service

A função `getCustosPorTalhao()` foi atualizada para:

```typescript
// Antes (depreciado): Distribuição proporcional por área
const totalInsumosEstoque = await getTotalMovimentacoesEstoque(userId, dataInicio, dataFim);
for (const id of Object.keys(resultado)) {
  const talhao = resultado[id];
  const proporcao = talhao.area / totalArea;
  talhao.insumos = totalInsumosEstoque * proporcao;
}

// Agora: Custos reais por talhão
const custosInsumosPorTalhao = await getCustosInsumosPorTalhao(userId, dataInicio, dataFim);
for (const talhaoId of Object.keys(custosInsumosPorTalhao)) {
  if (resultado[talhaoId]) {
    resultado[talhaoId].insumos = custosInsumosPorTalhao[talhaoId];
  }
}
```

## Requisitos de Dados

Para que os custos sejam calculados corretamente, é necessário:

1. **Atividades registradas**: Lançamentos agrícolas com data no período
2. **Produtos vinculados**: Produtos associados às atividades com `custo_total_item` preenchido
3. **Talhões vinculados**: Talhões onde as atividades foram realizadas

## Logs e Diagnóstico

O sistema gera logs detalhados para diagnóstico:

```
🌱 Buscando custos de insumos das atividades agrícolas...
📋 Atividades encontradas: 45
📦 Produtos utilizados: 120
✅ Custos de insumos calculados: {
  talhoes: 8,
  totalGeral: 125430.50
}
```

## Comparação com Método Antigo

### Método Antigo (Proporcional por Área)
- ✅ Simples de implementar
- ❌ Não reflete a realidade das aplicações
- ❌ Talhões maiores sempre têm mais custo
- ❌ Não considera intensidade de uso

### Método Novo (Baseado em Atividades)
- ✅ Reflete aplicações reais
- ✅ Precisão por talhão
- ✅ Rastreabilidade completa
- ✅ Suporta múltiplos talhões por atividade
- ⚠️ Requer dados completos

## Próximos Passos

Para melhorar ainda mais o cálculo:

1. **Custos de aplicação**: Adicionar custo de mão de obra e maquinário
2. **Detalhamento**: Criar view de produtos por talhão
3. **Histórico**: Comparar custos entre safras
4. **Alertas**: Notificar quando produtos não têm preço cadastrado

## Suporte

Em caso de dúvidas ou custos inconsistentes:

1. Verifique se as atividades têm produtos vinculados
2. Confirme se os produtos têm preço no estoque
3. Verifique se as atividades estão vinculadas aos talhões corretos
4. Consulte os logs no console do navegador
