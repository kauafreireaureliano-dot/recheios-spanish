const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
  const uploadPassword = process.env.UPLOAD_PASSWORD;

  if (!supabaseUrl || !supabaseSecretKey || !uploadPassword) {
    return res.status(500).json({
      error: 'Configuração incompleta. Confira SUPABASE_URL, SUPABASE_SECRET_KEY e UPLOAD_PASSWORD na Vercel.'
    });
  }

  try {
    const body = req.body || {};
    if (body.password !== uploadPassword) {
      return res.status(401).json({ error: 'Senha incorreta.' });
    }

    const kind = body.kind;
    const isVideo = kind === 'video';
    if (!isVideo && kind !== 'audio') {
      return res.status(400).json({ error: 'Tipo de arquivo inválido.' });
    }

    const originalName = String(body.filename || '');
    const extension = (originalName.split('.').pop() || '').toLowerCase();
    const allowed = isVideo
      ? { mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm' }
      : { mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav' };

    const contentType = allowed[extension];
    if (!contentType) {
      return res.status(400).json({ error: 'Formato não permitido.' });
    }

    const requestedType = String(body.contentType || '').toLowerCase();
    if (requestedType && requestedType !== contentType &&
        !(extension === 'wav' && requestedType === 'audio/x-wav')) {
      return res.status(400).json({ error: 'O tipo do arquivo não corresponde à extensão.' });
    }

    const supabase = createClient(supabaseUrl, supabaseSecretKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const safeName = kind + '-' + Date.now() + '.' + extension;
    const path = 'uploads/' + safeName;
    const { data, error } = await supabase.storage
      .from('midias')
      .createSignedUploadUrl(path);

    if (error) {
      console.error('Supabase signed upload error:', error);
      return res.status(502).json({ error: 'Não foi possível gerar a autorização no Supabase.' });
    }

    return res.status(200).json({
      signedUrl: data.signedUrl,
      path,
      contentType,
      publicUrl: supabase.storage.from('midias').getPublicUrl(path).data.publicUrl
    });
  } catch (error) {
    console.error('Upload authorization error:', error);
    return res.status(500).json({ error: 'Falha interna ao preparar o envio.' });
  }
};
