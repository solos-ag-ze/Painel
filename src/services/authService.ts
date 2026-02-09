// src/services/authService.ts

export interface JWTPayload {
  sub: string;          // UUID do usuário (vem como "sub" no JWT assinado pelo n8n)
  nome?: string;
  email?: string;
  role?: string;        // deve ser "authenticated"
  aud?: string;         // deve ser "authenticated"
  exp?: number;
  iat?: number;
}

// 🔧 Detecta ambiente de desenvolvimento usando múltiplas verificações
const isDevelopment = () => {
  // Método 1: Vite MODE (mais confiável)
  if (import.meta.env.MODE === 'development') return true;

  // Método 2: Variável customizada
  if (import.meta.env.VITE_ZE_AMBIENTE === 'development') return true;

  // Método 3: Verificação de hostname (localhost/127.0.0.1)
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')) {
      return true;
    }
  }

  // Método 4: Verificação DEV explícita
  if (import.meta.env.DEV === true) return true;

  return false;
};

const DEV_BYPASS = isDevelopment();

// 🔓 Permite acesso com usuário demo em produção (configurável)
const ALLOW_DEMO_USER = String(import.meta.env.VITE_ALLOW_DEMO_USER || '').toLowerCase() === 'true';

// Log de diagnóstico
if (typeof window !== 'undefined') {
  console.log('🔍 Debug Ambiente:', {
    'import.meta.env.MODE': import.meta.env.MODE,
    'import.meta.env.DEV': import.meta.env.DEV,
    'import.meta.env.PROD': import.meta.env.PROD,
    'VITE_ZE_AMBIENTE': import.meta.env.VITE_ZE_AMBIENTE,
    'window.location.hostname': window.location.hostname,
    'DEV_BYPASS ativo': DEV_BYPASS
  });
}

export class AuthService {
  private static instance: AuthService;
  private currentUser: { user_id: string; nome: string } | null = null;
  private readonly TOKEN_KEY = 'ze_safra_token';

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // 🔧 Usuário fake no DEV (bypass)
  private getBypassedDevUser() {
    return {
      user_id: 'c7f13743-67ef-45d4-807c-9f5de81d4999',
      nome: 'Dev User - Teste',
    };
  }

  // 👤 Usuário demo para produção (quando VITE_ALLOW_DEMO_USER=true)
  private getDemoUser() {
    return {
      user_id: 'c7f13743-67ef-45d4-807c-9f5de81d4999',
      nome: 'Usuário Demo',
    };
  }

  // 🔑 Inicializa sessão ao carregar app
  async init(): Promise<{ user_id: string; nome: string } | null> {
    const token = localStorage.getItem(this.TOKEN_KEY);

    if (token) {
      // 🔍 Em DEV, apenas loga o token sem validar
      if (DEV_BYPASS) {
        console.log('🔑 [DEV] Token encontrado; usando modo desenvolvimento com bypass');
      } else {
        console.log('🔑 [PRODUCTION] Token encontrado, decodificando...');
      }

      try {
        const payloadB64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload: JWTPayload = JSON.parse(atob(payloadB64));

        console.log('🔍 JWT Payload decodificado:', {
          sub: payload.sub,
          nome: payload.nome,
          email: payload.email,
          role: payload.role,
          aud: payload.aud,
          exp: payload.exp ? new Date(payload.exp * 1000).toISOString() : 'N/A',
          ambiente: DEV_BYPASS ? 'development' : 'production',
          rlsStatus: DEV_BYPASS ? '⚠️ BYPASS (service_role)' : '✅ ATIVO (anon key + user_id nas queries)'
        });

        // Verificar se token expirou
        if (payload.exp && payload.exp < Date.now() / 1000) {
          console.error('❌ Token expirado!');
          localStorage.removeItem(this.TOKEN_KEY);
          if (!DEV_BYPASS) {
            return null;
          }
        }

        if (!payload?.sub) {
          console.error('❌ JWT inválido: sem campo `sub`');
          throw new Error('JWT inválido: sem `sub`');
        }

        this.currentUser = {
          user_id: payload.sub,
          nome: payload.nome || payload.email || 'Usuário',
        };

        console.log('✅ Sessão restaurada via JWT n8n:', this.currentUser);
        console.log('🔑 User ID que será usado nas queries:', payload.sub);
        console.log('📝 IMPORTANTE: RLS ativo - queries filtradas por user_id');
        return this.currentUser;
      } catch (err) {
        console.error('❌ Falha ao decodificar JWT:', err);
        if (!DEV_BYPASS) {
          return null;
        }
        console.warn('⚠️ [DEV] Prosseguindo com usuário de bypass devido a falha no token');
      }
    } else {
      console.warn('⚠️ Nenhum token encontrado no localStorage');
    }

    // 🔓 Bypass em desenvolvimento
    if (DEV_BYPASS) {
      const dev = this.getBypassedDevUser();
      this.currentUser = dev;
      console.log('🔓 MODO DESENVOLVIMENTO ATIVO - Bypass habilitado');
      console.log('👤 Usuário de desenvolvimento:', dev);
      return dev;
    }

    // 👤 Modo demo em produção (se habilitado)
    if (ALLOW_DEMO_USER && !DEV_BYPASS) {
      const demo = this.getDemoUser();
      this.currentUser = demo;
      console.log('🎭 MODO DEMO ATIVO - Acesso com usuário demo');
      console.log('👤 Usuário demo:', demo);
      console.log('⚠️ ATENÇÃO: Modo demo ativo em produção!');
      return demo;
    }

    return null;
  }

  // 🚪 Logout
  async logout() {
    this.currentUser = null;
    localStorage.removeItem(this.TOKEN_KEY);
    // não chama supabase.auth.signOut(), porque não usamos GoTrue
  }

  getCurrentUser() {
    return this.currentUser;
  }

  isAuthenticated() {
    return this.currentUser !== null;
  }
}
