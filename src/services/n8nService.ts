export class N8nService {
  /**
   * Envia um payload para o webhook do n8n configurado em VITE_N8N_WEBHOOK_URL.
   * O webhook URL deve ser configurado em .env (VITE_N8N_WEBHOOK_URL).
   */
  static async sendActivityWebhook(payload: any): Promise<any> {
    const url = import.meta.env.VITE_N8N_WEBHOOK_URL;
    if (!url) {
      console.warn('VITE_N8N_WEBHOOK_URL não está configurado — pulando envio para n8n');
      return null;
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch { data = text; }

      if (!res.ok) {
        console.error('n8n webhook retornou erro', res.status, data);
        throw new Error(`n8n webhook error ${res.status}`);
      }

      return data;
    } catch (err) {
      console.error('Erro ao enviar webhook para n8n:', err);
      throw err;
    }
  }
}
