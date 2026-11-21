const { handleUpload } = require('@vercel/blob/client');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(500).json({
      error: 'BLOB_READ_WRITE_TOKEN ausente. Conecte um Vercel Blob Store a este projeto e ao ambiente Production.'
    });
  }

  if (!process.env.UPLOAD_PASSWORD) {
    return res.status(500).json({
      error: 'UPLOAD_PASSWORD ausente. Cadastre essa variável nas configurações da Vercel.'
    });
  }

  try {
    // A Vercel já entrega req.body processado pelo body parser padrão.
    // handleUpload deve receber o IncomingMessage original para preservar
    // os dados da requisição usados na geração do token.
    const body = req.body;

    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        let payload = {};
        try {
          payload = JSON.parse(clientPayload || '{}');
        } catch (_) {
          throw new Error('Dados de autorização inválidos.');
        }

        if (payload.password !== process.env.UPLOAD_PASSWORD) {
          throw new Error('Senha incorreta.');
        }

        const isVideo = payload.kind === 'video';
        if (!isVideo && payload.kind !== 'audio') {
          throw new Error('Tipo de arquivo inválido.');
        }

        return {
          allowedContentTypes: isVideo
            ? ['video/mp4', 'video/quicktime', 'video/webm']
            : ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav'],
          addRandomSuffix: false,
          allowOverwrite: true,
          maximumSizeInBytes: isVideo
            ? 2 * 1024 * 1024 * 1024
            : 100 * 1024 * 1024
        };
      }
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Vercel Blob upload token error:', error);
    return res.status(400).json({
      error: error.message || 'Falha ao gerar autorização de upload.'
    });
  }
};
