import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8080);

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

http.createServer((req, res) => {
  let url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/') url = '/lp2-agencias-v2-single.html';
  const filePath = path.join(__dirname, url);
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403); return res.end('forbidden');
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end('<h1>404</h1><p>LPs disponíveis:</p><ul><li><a href="/lp2-agencias-v2-single.html">lp2-agencias-v2-single.html (nova)</a></li><li><a href="/lp2-agencias-marketing-eventos.html">lp2-agencias-marketing-eventos.html (original)</a></li><li><a href="/lp1-cdl-associacoes.html">lp1-cdl-associacoes.html</a></li><li><a href="/lp3-demandas-pontuais.html">lp3-demandas-pontuais.html</a></li></ul>');
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log(`\n  LPs Pesquisa Certificação`);
  console.log(`  → http://localhost:${PORT}/                                          (nova LP — default)`);
  console.log(`  → http://localhost:${PORT}/lp2-agencias-v2-single.html               (nova)`);
  console.log(`  → http://localhost:${PORT}/lp2-agencias-marketing-eventos.html       (original)\n`);
});
