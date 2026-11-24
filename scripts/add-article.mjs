// Ambil satu draf Gapura yang SUDAH TERBIT dari API dashboard dan ubah menjadi
// berkas artikel situs: data/articles/<slug>.json
// Pakai: node scripts/add-article.mjs --draft <id> [--desk <nama>] [--api <baseUrl>]
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback
}
const draftId = opt('draft', '')
const api = opt('api', 'https://gapura.avenia.my.id').replace(/\/$/, '')
if (!draftId) {
  console.error('Wajib: --draft <id>')
  process.exit(1)
}

const res = await fetch(`${api}/api/drafts/${draftId}`)
if (!res.ok) {
  console.error(`GET draf ${draftId} gagal: HTTP ${res.status}`)
  process.exit(1)
}
const draft = await res.json()
if (draft.status !== 'published') {
  console.error(`Draf ${draftId} belum terbit (status: ${draft.status}) — artikel situs hanya dibuat untuk konten terbit.`)
  process.exit(1)
}

const md = draft.article_metadata || {}
const textOf = (block) => (typeof block === 'string' ? block : block?.text || '')
const headline = md.headline || draft.topic_title || ''
if (!headline || !Array.isArray(md.sections) || !md.sections.length) {
  console.error(`Draf ${draftId} tidak memiliki article_metadata lengkap.`)
  process.exit(1)
}

const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 72).replace(/-+$/g, '')
const slug = slugify(md.seo_title || headline)

const targets = draft.publication_targets || []
const publishedAt = targets.map((t) => t.published_at).filter(Boolean).sort()[0] || draft.updated_at
const dateLabel = new Intl.DateTimeFormat('id-ID', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta'
}).format(new Date(publishedAt))

const coverSlide = (draft.rendered_slides || []).find((s) => s.slide_no === 1) || {}
const coverSrc = coverSlide.image_url ? `${api}${coverSlide.image_url}` : ''
const permalink = (platform) => targets.find((t) => t.platform === platform)?.permalink || ''

const deskGuess = (() => {
  const h = `${headline} ${(draft.slides || [])[0]?.data?.kicker || ''}`.toLowerCase()
  if (/ihsg|bei|saham|bursa|ojk|investor|pasar modal/.test(h)) return 'Bursa'
  if (/kpk|pengadilan|kejaksaan|undang-undang|\buu\b|hukum|polisi|tersangka/.test(h)) return 'Hukum'
  if (/mpr|dpr|presiden|prabowo|menteri|partai|pilkada|pemilu|wapres|kabinet/.test(h)) return 'Politik'
  if (/banjir|lingkungan|hutan|iklim|sampah|polusi/.test(h)) return 'Lingkungan'
  if (/rupiah|inflasi|bank indonesia|ekonomi|anggaran|apbn|umkm|harga/.test(h)) return 'Ekonomi'
  return 'Nasional'
})()

const sources = []
const seenHosts = new Set()
for (const fact of draft.article_facts || []) {
  const url = fact?.source_url
  if (!url) continue
  let host = ''
  try { host = new URL(url).hostname.replace(/^www\./, '') } catch { continue }
  if (seenHosts.has(host)) continue
  seenHosts.add(host)
  sources.push({ name: fact.source_name || host, url })
}

const article = {
  slug,
  draft_id: Number(draftId),
  headline,
  seo_title: md.seo_title || headline,
  meta_description: md.meta_description || '',
  desk: opt('desk', deskGuess),
  kicker: (draft.slides || [])[0]?.data?.kicker || '',
  published_at: publishedAt,
  date_label: dateLabel,
  cover: {
    src: coverSrc,
    credit: coverSlide.data?.credit || (draft.slides || [])[0]?.data?.credit || '',
    alt: headline
  },
  lead: textOf(md.lead),
  takeaways: (md.takeaways || []).map(textOf).filter(Boolean),
  sections: md.sections.map((s) => ({
    heading: s.heading || '',
    paragraphs: (s.paragraphs || []).map(textOf).filter(Boolean)
  })),
  sources,
  social: { instagram: permalink('instagram'), facebook: permalink('facebook') }
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dir = join(root, 'data', 'articles')
if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
const out = join(dir, `${slug}.json`)
writeFileSync(out, JSON.stringify(article, null, 2) + '\n')
console.log(`Artikel tersimpan: data/articles/${slug}.json (draf #${draftId}, desk ${article.desk}, ${article.sections.length} bagian, ${sources.length} sumber)`)
