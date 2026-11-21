const { handleUpload } = require('@vercel/blob/client');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(500).json({ error: 'Armazenamento Vercel Blob ainda não configurado.' });
  }
  if (!process.env.UPLOAD_PASSWORD) {
    return res.status(500).json({ error: 'Configure UPLOAD_PASSWORD nas variáveis de ambiente da Vercel.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const request = new Request('https://' + req.headers.host + req.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });

    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        let payload = {};
        try { payload = JSON.parse(clientPayload || '{}'); } catch (_) {}
        if (payload.password !== process.env.UPLOAD_PASSWORD) {
          throw new Error('Senha incorreta.');
        }
        const isVideo = payload.kind === 'video';
        if (!isVideo && payload.kind !== 'audio') throw new Error('Tipo de arquivo inválido.');
        return {
          allowedContentTypes: isVideo
            ? ['video/mp4', 'video/quicktime', 'video/webm']
            : ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav'],
          addRandomSuffix: false,
          allowOverwrite: true,
          maximumSizeInBytes: isVideo ? 2 * 1024 * 1024 * 1024 : 100 * 1024 * 1024
        };
      }
    });
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Falha no upload.' });
  }
};
