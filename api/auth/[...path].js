const buildTargetUrl = (requestPath = []) => {
  const baseUrl = process.env.NCB_API_BASE_URL;

  if (!baseUrl) {
    throw new Error('NCB_API_BASE_URL is not configured');
  }

  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  const cleanPath = Array.isArray(requestPath) ? requestPath.join('/') : requestPath;

  return `${cleanBaseUrl}/${cleanPath}`;
};

const parseBody = (req) => new Promise((resolve, reject) => {
  if (req.method === 'GET' || req.method === 'HEAD') {
    resolve(undefined);
    return;
  }

  const chunks = [];

  req.on('data', (chunk) => chunks.push(chunk));
  req.on('end', () => resolve(Buffer.concat(chunks)));
  req.on('error', reject);
});

export default async function handler(req, res) {
  if (!process.env.NCB_SECRET_KEY) {
    res.status(500).json({ error: 'NCB_SECRET_KEY is not configured' });
    return;
  }

  let targetUrl;

  try {
    targetUrl = buildTargetUrl(req.query.path);
  } catch (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const body = await parseBody(req);
  const response = await fetch(targetUrl, {
    method: req.method,
    headers: {
      Authorization: `Bearer ${process.env.NCB_SECRET_KEY}`,
      'Content-Type': req.headers['content-type'] ?? 'application/json'
    },
    body
  });

  const responseBody = Buffer.from(await response.arrayBuffer());

  response.headers.forEach((value, key) => {
    if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(key.toLowerCase())) {
      res.setHeader(key, value);
    }
  });

  res.status(response.status).send(responseBody);
}
