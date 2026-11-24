// Dev server: build sekali lalu sajikan dist/ secara statis.
import { createServer } from 'node:http'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { join, extname, dirname, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from './build.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const distDir = join(root, 'dist')
build({ quiet: true })

const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon' }
const port = Number(process.env.PORT || 4173)

createServer((req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
  if (path.endsWith('/')) path += 'index.html'
  const file = normalize(join(distDir, path))
  if (!file.startsWith(distDir) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain' })
    return res.end('Tidak ditemukan')
  }
  res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' })
  res.end(readFileSync(file))
}).listen(port, () => console.log(`Dev server: http://localhost:${port}`))
