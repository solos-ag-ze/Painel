// src/services/authService.ts
import { setAccessToken } from '../lib/supabase';

export interface JWTPayload {
  sub: string;          // UUID do usuário (vem como "sub" no JWT assinado pelo n8n)
  nome?: string;
  email?: string;
  role?: string;        // deve ser "authenticated"
  aud?: string;         // deve ser "authenticated"
  exp?: number;
  iat?: number;
}

const DEV_BYPASS = import.meta.env.VITE_ZE_AMBIENTE === 'development';

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
      nome: 'Gabriel - Teste',
    };
  }

  // 🔑 Inicializa sessão ao carregar app
  async init(): Promise<{ user_id: string; nome: string } | null> {
    if (DEV_BYPASS) {
      const dev = this.getBypassedDevUser();
      this.currentUser = dev;
      console.log('🔓 Dev bypass ativo:', dev);
      return dev;
    }

    const token = localStorage.getItem(this.TOKEN_KEY);
    if (!token) {
      console.warn('⚠️ Nenhum token encontrado no localStorage');
      return null;
    }

    // 👉 injeta o token no supabase
    try {
      await setAccessToken(token);
    } catch (e) {
      console.error('❌ Falha ao setar token no Supabase:', e);
      return null;
    }

    // 🔍 decodifica o JWT
    try {
      const payloadB64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload: JWTPayload = JSON.parse(atob(payloadB64));

      if (!payload?.sub) throw new Error('JWT inválido: sem `sub`');

      this.currentUser = {
        user_id: payload.sub,
        nome: payload.nome || payload.email || 'Usuário',
      };

      console.log('✅ Sessão restaurada via JWT custom:', this.currentUser);
      return this.currentUser;
    } catch (err) {
      console.error('❌ Falha ao decodificar JWT:', err);
      return null;
    }
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
