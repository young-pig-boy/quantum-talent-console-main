import { createServer } from 'http';
import { parse } from 'url';
import dns from 'dns';
import next from 'next';

// Node 原生 fetch 默认 DNS 顺序为 verbatim（IPv6 优先），
// 本机 IPv6 常不可达时连 Supabase 会间歇性 10s 超时（UND_ERR_CONNECT_TIMEOUT），
// 强制 IPv4 优先可显著提稳提速。
dns.setDefaultResultOrder('ipv4first');

const dev = process.env.COZE_PROJECT_ENV !== 'PROD';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '5000', 10);

// Create Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  });
  server.once('error', err => {
    console.error(err);
    process.exit(1);
  });
  server.listen(port, () => {
    console.log(
      `> Server listening at http://${hostname}:${port} as ${
        dev ? 'development' : process.env.COZE_PROJECT_ENV
      }`,
    );
  });
});
