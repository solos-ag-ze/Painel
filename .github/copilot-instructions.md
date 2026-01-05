# Copilot Instructions — Painel Solos.ag

## Contexto Essencial

SPA agrícola para cafeicultores: **React 18 + TypeScript + Vite + TailwindCSS + Supabase**. Autenticação via JWT do n8n (armazenado em `localStorage` como `ze_safra_token`). Supabase usa RLS em produção, bypass em DEV.

## Arquitetura e Fluxo

```
App.tsx (autenticação + renderContent switch)
├─ Sidebar (menuItems → activeTab)
├─ [Domínio]Panel (useState/useEffect)
│   └─ Service.método() [classe estática]
│       └─ supabase singleton (RLS/DEV bypass)
└─ Header + main
```

**Navegação:** Tab-based, sem React Router. Sidebar controla `activeTab`; App.tsx faz switch para renderizar painéis.

## Padrões e Convenções

- **Nunca** query Supabase direto em componentes — use sempre Services (classe + métodos estáticos)
- **AuthService** é singleton: `AuthService.getInstance().getCurrentUser()`
- **Token:** JWT manual, decode local, nunca Supabase Auth nativo
- **DEV:** localhost/127.0.0.1 usa service_role (bypass RLS)
- **PROD:** JWT injetado no Supabase client para RLS
- **Services retornam `[]` ou `null` em erro** (nunca lançam exceção)
- **Painéis**: sempre estado `loading` com `<LoadingSpinner />` ao carregar
- **User ID:** sempre via `AuthService.getInstance().getCurrentUser()?.user_id`
- **Datas:** use `parseDateFromDB()` (`lib/dateUtils.ts`) para evitar bugs de timezone
- **Valores monetários:** use `formatCurrency`/`formatSmartCurrency` (`lib/currencyFormatter.ts`)
- **Unidades:** estoque usa conversão FIFO (`lib/unitConverter.ts`)

## Serviços Principais (src/services/)

| Serviço         | Responsabilidade        | Exemplo                                      |
| --------------- | ----------------------- | -------------------------------------------- |
| authService     | JWT decode, user_id     | `AuthService.getInstance().getCurrentUser()` |
| financeService  | Transações, resumo      | `FinanceService.getResumoFinanceiro(userId)` |
| activityService | Lançamentos agrícolas   | `ActivityService.getLancamentos(userId, 50)` |
| estoqueService  | Produtos, movimentações | `EstoqueService.getProdutos()`               |
| talhaoService   | Talhões, áreas          | `TalhaoService.getTalhoes(userId)`           |

## Criar Novo Módulo

1. Criar componente: `src/components/NovoModulo/NovoModuloPanel.tsx`
2. Criar service: `src/services/novoModuloService.ts` (classe estática)
3. Adicionar ao menu: `Sidebar.tsx` → `menuItems[]`
4. Adicionar ao switch: `App.tsx` → `renderContent()`

## Comandos Úteis

```bash
npm run dev      # Dev server :5173
npm run build    # Build prod
npm run lint     # ESLint
npm run preview  # Preview build
```

## Armadilhas Comuns

- Sempre trate `error` em queries Supabase e retorne `[]`/`null`
- Nunca lance exceção em Services
- Use sempre os utilitários de data/moeda/unidade
- DEV bypass detectado por múltiplos métodos (env/hostname)
- Não use React Router; navegação é por tab-state

## Exemplos de Arquivos-Chave

- Navegação/tab: [src/App.tsx], [src/components/Layout/Sidebar.tsx]
- Service pattern: [src/services/authService.ts], [src/services/financeService.ts]
- Utilitários: [src/lib/dateUtils.ts], [src/lib/currencyFormatter.ts], [src/lib/unitConverter.ts]

---

### Template Service (Padrão Real)

```typescript

```
