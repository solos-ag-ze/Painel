# Copilot Instructions — Painel Solos.ag

## Contexto Rápido
Painel agrícola para cafeicultores: **React 18 + TypeScript + Vite + TailwindCSS + Supabase**. Token JWT do n8n → localStorage (`ze_safra_token`) → RLS em produção.

## Arquitetura
```
App.tsx (useEffect: autenticação + renderContent switch)
├─ Sidebar (menuItems → tab)
├─ DomínioPanel (useState + useEffect)
│  └─ Service.método() [classes estáticas]
│     └─ supabase singleton + RLS
└─ Header + main
```

**Fluxo crítico:**
1. URL `?token=...` → localStorage
2. `AuthService.getInstance().init()` decode JWT + user context
3. DEV → service_role (RLS bypass); PROD → anon + RLS

### Regras Fundamentais
1. **NUNCA query Supabase em componentes** — use Services
2. **Serviços: classe + métodos estáticos** → `FinanceService.getResumoFinanceiro(userId)`
3. **AuthService é singleton** → `AuthService.getInstance().getCurrentUser()`
4. **Token:** localStorage (`ze_safra_token`), JWT decode manual (não via Supabase auth)
5. **DEV auto-bypass:** localhost/127.0.0.1 → service_role sem token

## Serviços Existentes (17)
| Serviço | Responsabilidade | Padrão |
|---------|-----------------|--------|
| `authService` | JWT decode, singleton, user_id | `AuthService.getInstance().getCurrentUser()` |
| `financeService` | Transações, resumo, período, saldo real vs projetado | `getResumoFinanceiro(userId)` → Promise<ResumoFinanceiro> |
| `estoqueService` | Produtos, movimentações FIFO | |
| `activityService` | Lançamentos agrícolas (pulverização, etc.) | |
| `talhaoService` | Talhões (áreas da fazenda) | |
| `propriedadeService` | Propriedades rurais | |
| `maquinaService` | Máquinas e equipamentos | |
| `custoService` / `custoPorTalhaoService` | Análise de custos por safra/talhão | |
| `cotacaoService` | Preço diário café | |
| `weatherService` | Dados meteorológicos | |
| `pragasDoencasService` | Ocorrências de pragas/doenças | |
| `dividasFinanciamentosService` | Gestão de dívidas | |
| `notificationService` | Sistema de notificações | |
| `attachment*Service` | Upload/download de anexos | |

**Todos retornam `[]` ou `null` em erro** (nunca lançam exceção).

## Criar Novo Módulo — Checklist

```bash
# 1. Componente (pasta própria)
src/components/NovoModulo/NovoModuloPanel.tsx

# 2. Service (camelCase, classe estática)
src/services/novoModuloService.ts

# 3. Menu (adicionar em menuItems array)
src/components/Layout/Sidebar.tsx → menuItems[]

# 4. Rota (adicionar case no switch)
src/App.tsx → renderContent() switch

# 5. Import do Panel
src/App.tsx → topo do arquivo
```

### Template Service (Padrão Real)
```typescript
import { supabase, TransacaoFinanceira } from '../lib/supabase';

export class NovoModuloService {
  static async listar(userId: string): Promise<Tipo[]> {
    try {
      const { data, error } = await supabase
        .from('tabela')
        .select('*')
        .eq('user_id', userId);
      
      if (error) {
        console.error('Erro NovoModulo:', error);
        return [];  // ← Sempre retorna [] em erro
      }
      return data || [];
    } catch (err) {
      console.error('Exception:', err);
      return [];
    }
  }
}
```

### Template Panel (Padrão Real)
```tsx
import { useState, useEffect } from 'react';
import { AuthService } from '../../services/authService';
import LoadingSpinner from '../Dashboard/LoadingSpinner';
import { NovoModuloService } from '../../services/novoModuloService';

export default function NovoModuloPanel() {
  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState<Tipo[]>([]);

  useEffect(() => {
    const carregar = async () => {
      try {
        const user = AuthService.getInstance().getCurrentUser();
        if (!user) { setLoading(false); return; }
        
        const items = await NovoModuloService.listar(user.user_id);
        setDados(items);
      } catch (err) {
        console.error('Erro ao carregar:', err);
      } finally {
        setLoading(false);
      }
    };
    carregar();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Título</h2>
      {/* Conteúdo aqui */}
    </div>
  );
}
```

## Libs Obrigatórias — Use Estas

| Necessidade | Lib | Import |
|-------------|-----|--------|
| Ícones | lucide-react | `import { Home, DollarSign } from 'lucide-react'` |
| Datas | date-fns + ptBR | `import { format, startOfMonth, endOfMonth } from 'date-fns'` |
| Formatação data BR | dateUtils | `import { formatDateBR, parseDateFromDB } from '../../lib/dateUtils'` |
| Moeda R$ | currencyFormatter | `import { formatCurrency, formatSmartCurrency } from '../../lib/currencyFormatter'` |
| Conversão unidades | unitConverter | `import { convertToStandardUnit } from '../../lib/unitConverter'` |
| Gráficos | recharts | `import { LineChart, BarChart } from 'recharts'` |
| DatePicker | react-datepicker | `import DatePicker from 'react-datepicker'` |

## Cores Solos.ag — Copie e Cole

```tsx
// Sidebar/Header
bg-[#004417]     // verde escuro principal
text-[#00A651]   // verde accent (ícones ativos)
bg-[#003015]     // item ativo no menu

// Cards
bg-white rounded-xl shadow-sm border border-gray-200 p-6

// Títulos
text-xl font-bold text-gray-900   // ou text-[#092f20]

// Botão primário
bg-[#00A651] hover:bg-[#008c44] text-white px-4 py-2 rounded-lg

// Botão secundário
border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg

// Gradient (logo/avatar)
bg-gradient-to-br from-[#86b646] to-[#397738]
```

## Banco de Dados — Tabelas Principais

| Tabela | Descrição | user_id? |
|--------|-----------|----------|
| `transacoes_financeiras` | Fluxo de caixa, com status (realizada/agendada) | ✅ |
| `lancamentos_agricolas` | Atividades agrícolas (pulverização, adubação, etc.) | ✅ |
| `lancamento_produtos` | Produtos/insumos usados nas atividades | — |
| `lancamento_talhoes` | Talhões vinculados aos lançamentos | — |
| `estoque_de_produtos` | Inventário de insumos (rastreamento FIFO) | ✅ |
| `talhoes` | Áreas/parcelas da fazenda | — |
| `propriedades` | Fazendas gerenciadas | — |
| `vinculo_usuario_propriedade` | Relação user ↔ propriedade | ✅ |
| `cotacao_diaria_cafe` | Preços do café por município | — |
| `pragas_doencas` | Ocorrências de pragas/doenças reportadas | ✅ |
| `dividas_financiamentos` | Gestão de dívidas e empréstimos | ✅ |

**RLS**: Em produção, Supabase aplica Row-Level Security baseado no `user_id` do token JWT. Em DEV, service_role key faz bypass automático (sem validação de RLS).

## Autenticação — Fluxo Completo

1. **URL com token**: `?token=eyJhbGc...` → localStorage `ze_safra_token`
2. **App.tsx useEffect**: Remove token da URL via `window.history.replaceState()`
3. **AuthService.init()**: Decode JWT manual (não Supabase auth nativo) → extrai `sub` (user_id) + `nome`
4. **DEV bypass**: Se localhost/127.0.0.1 e service_role disponível → usa dev user fixo (`c7f13743-67ef-45d4-807c-9f5de81d4999`)
5. **PROD JWT injection**: Token enviado para Supabase via `setAccessToken()` para RLS funcionar

**JWT esperado do n8n:**
```json
{
  "sub": "user-uuid",
  "nome": "Nome do Usuário",
  "email": "user@example.com",
  "role": "authenticated",
  "aud": "authenticated"
}
```

**Detecção de ambiente** (múltiplas verificações para confiabilidade):
- `import.meta.env.MODE === 'development'` (mais confiável)
- `import.meta.env.VITE_ZE_AMBIENTE === 'development'`
- `hostname === 'localhost' || '127.0.0.1' || '192.168.*'`
- `import.meta.env.DEV === true`

---

## Navegação — Tab-based (Sem React Router)

Todos os painéis são renderizados via `switch(activeTab)` em `App.tsx`, controlados pelo `Sidebar`:

```tsx
// Sidebar passa activeTab e setActiveTab
// Cada clique em menuItem → setActiveTab(item.id)
// App.tsx renderContent() renderiza o painel correto
// Sidebar tem menuItems[] com { id, icon, label, description }
```

**Adicionar novo painel:**
1. Criar componente `src/components/NovoModulo/NovoModuloPanel.tsx`
2. Importar em `App.tsx`
3. Adicionar `case 'novo-modulo':` em `renderContent()`
4. Adicionar `{ id: 'novo-modulo', ... }` em `menuItems[]` (Sidebar.tsx)

---

## Comandos

```bash
npm run dev      # Dev server :5173
npm run build    # Build prod
npm run lint     # ESLint
npm run preview  # Preview build
```

## ⚠️ Armadilhas Comuns

1. **Datas**: use `parseDateFromDB()` de `dateUtils.ts` — evita bug de timezone UTC-3
2. **User ID**: sempre pegar de `AuthService.getInstance().getCurrentUser()?.user_id`
3. **Queries Supabase**: sempre tratar `error` e retornar `[]` se falhar
4. **RLS**: em DEV usa service_role (bypass), em PROD aplica RLS via JWT
5. **Valores monetários pequenos**: use `formatSmartCurrency()` para valores < R$ 0,01
6. **Unidades de medida**: estoque usa conversão FIFO — verifique `unitConverter.ts`
7. **Ambiente**: DEV auto-detectado por 4 métodos, DEV_BYPASS logado em console
8. **Componentes Panel**: sempre ter estado `loading` com `<LoadingSpinner />` enquanto carrega
9. **Service retorna []**: Nunca lançar exceção em Service — retornar `[]` ou `null` em erro

