const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(bodyParser.json({ limit: '20mb' }));
// Habilita CORS – por segurança defina ALLOWED_ORIGIN em produção para seu domínio
const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
app.use(cors({ origin: allowedOrigin }));

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'notas_fiscais';

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env');
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

app.post('/replace-attachment', async (req, res) => {
  try {
    const { transactionId, fileBase64, fileName } = req.body;
    if (!transactionId || !fileBase64 || !fileName) {
      return res.status(400).json({ success: false, error: 'Missing transactionId, fileBase64 or fileName' });
    }

    // upload
    const buffer = Buffer.from(fileBase64, 'base64');
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, buffer, { upsert: true, contentType: 'image/jpeg' });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return res.status(500).json({ success: false, error: uploadError.message });
    }

    // build public URL
    const baseUrl = SUPABASE_URL.replace(/\/+$/, '');
    const publicUrl = `${baseUrl}/storage/v1/object/public/${BUCKET}/${fileName}`;

    // update db
    const { data, error: dbError } = await supabase
      .from('transacoes_financeiras')
      .update({ anexo_compartilhado_url: publicUrl })
      .eq('id_transacao', transactionId);

    if (dbError) {
      console.error('DB update error:', dbError);
      return res.status(500).json({ success: false, error: dbError.message });
    }

    return res.json({ success: true, url: publicUrl });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ success: false, error: err.message || String(err) });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log('Replace-attachment service running on port', port));
