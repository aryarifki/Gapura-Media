// Static site build: renders views/*.dve with DVE into dist/ using data/site.json + data/articles/*.json.
import DVE from '@neabyte/dve'
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const viewsDir = join(root, 'views')
const publicDir = join(root, 'public')
const distDir = join(root, 'dist')
const articlesDir = join(root, 'data', 'articles')

const siteData = JSON.parse(readFileSync(join(root, 'data', 'site.json'), 'utf8'))

export function loadArticles() {
  if (!existsSync(articlesDir)) return []
  return readdirSync(articlesDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(articlesDir, f), 'utf8')))
    .sort((a, b) => String(b.published_at).localeCompare(String(a.published_at)))
}

const dve = new DVE({
  resolveInclude: (path) => readFileSync(join(viewsDir, path), 'utf8'),
  onEmit: (event) => {
    if (event.eventKind === 'view:error') {
      console.error(`[dve] ${event.eventName}:`, event.eventError)
    }
  }
})

const home = dve.compile(readFileSync(join(viewsDir, 'pages', 'home.dve'), 'utf8'), 'home')
dve.validate(home, 'home')
const articlePage = dve.compile(readFileSync(join(viewsDir, 'pages', 'article.dve'), 'utf8'), 'article')
dve.validate(articlePage, 'article')

function escXml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function build({ quiet = false } = {}) {
  rmSync(distDir, { recursive: true, force: true })
  mkdirSync(distDir, { recursive: true })

  const articles = loadArticles()
  const shared = { site: siteData.site, socials: siteData.socials }
  const featured = articles[0] || null
  const rest = articles.slice(1)

  // Beranda
  const homeHtml = dve.render(home, {
    ...shared,
    articles,
    featured,
    rest,
    pageDescription: siteData.site.description,
    canonical: `${siteData.site.url}/`,
    ogImage: featured?.cover?.src || '',
    ogType: 'website'
  }, 'home:id')
  writeFileSync(join(distDir, 'index.html'), homeHtml)
  if (!quiet) console.log(`✓ index.html (${articles.length} artikel)`)

  // Halaman artikel
  for (const article of articles) {
    const others = articles.filter((a) => a.slug !== article.slug).slice(0, 3)
    const html = dve.render(articlePage, {
      ...shared,
      article,
      others,
      pageDescription: article.meta_description,
      canonical: `${siteData.site.url}/artikel/${article.slug}/`,
      ogImage: article.cover?.src || '',
      ogType: 'article'
    }, `article:${article.slug}`)
    const dir = join(distDir, 'artikel', article.slug)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'index.html'), html)
    if (!quiet) console.log(`✓ artikel/${article.slug}/`)
  }

  // Sitemap
  const urls = [`${siteData.site.url}/`, ...articles.map((a) => `${siteData.site.url}/artikel/${a.slug}/`)]
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${escXml(u)}</loc></url>`).join('\n')}\n</urlset>\n`
  writeFileSync(join(distDir, 'sitemap.xml'), sitemap)

  // RSS
  const items = articles.slice(0, 20).map((a) => `    <item>\n      <title>${escXml(a.headline)}</title>\n      <link>${escXml(`${siteData.site.url}/artikel/${a.slug}/`)}</link>\n      <guid>${escXml(`${siteData.site.url}/artikel/${a.slug}/`)}</guid>\n      <pubDate>${new Date(a.published_at).toUTCString()}</pubDate>\n      <description>${escXml(a.meta_description)}</description>\n    </item>`).join('\n')
  const feed = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel>\n    <title>${escXml(siteData.site.name)}</title>\n    <link>${escXml(siteData.site.url)}/</link>\n    <description>${escXml(siteData.site.description)}</description>\n    <language>id</language>\n${items}\n</channel></rss>\n`
  writeFileSync(join(distDir, 'feed.xml'), feed)

  writeFileSync(join(distDir, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${siteData.site.url}/sitemap.xml\n`)
  writeFileSync(join(distDir, '.nojekyll'), '')

  if (existsSync(publicDir)) cpSync(publicDir, distDir, { recursive: true })
  if (!quiet) console.log('✓ build selesai -> dist/')
  return { articles }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  build()
}
