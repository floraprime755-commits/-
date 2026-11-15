import { tool, getJSON, getText, translate, quotedText } from '../lib.js'

const BOOKS = [
  'Genèse', 'Exode', 'Lévitique', 'Nombres', 'Deutéronome', 'Josué', 'Juges', 'Ruth', '1 Samuel',
  '2 Samuel', '1 Rois', '2 Rois', '1 Chroniques', '2 Chroniques', 'Esdras', 'Néhémie', 'Esther',
  'Job', 'Psaumes', 'Proverbes', 'Ecclésiaste', 'Cantique des cantiques', 'Ésaïe', 'Jérémie',
  'Lamentations', 'Ézéchiel', 'Daniel', 'Osée', 'Joël', 'Amos', 'Abdias', 'Jonas', 'Michée',
  'Nahum', 'Habacuc', 'Sophonie', 'Aggée', 'Zacharie', 'Malachie', 'Matthieu', 'Marc', 'Luc',
  'Jean', 'Actes', 'Romains', '1 Corinthiens', '2 Corinthiens', 'Galates', 'Éphésiens',
  'Philippiens', 'Colossiens', '1 Thessaloniciens', '2 Thessaloniciens', '1 Timothée',
  '2 Timothée', 'Tite', 'Philémon', 'Hébreux', 'Jacques', '1 Pierre', '2 Pierre', '1 Jean',
  '2 Jean', '3 Jean', 'Jude', 'Apocalypse'
]
const norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

export default [
  tool('calc', async ({ q, reply }) => {
    const expr = q.replace(/,/g, '.').replace(/×/g, '*').replace(/÷/g, '/').replace(/\^/g, '**')
    if (!expr || expr.length > 100 || !/^[0-9+\-*/().%\s]+$/.test(expr))
      return reply('Usage : .calc 2+2*5\nAutorisé : chiffres et + - * / ( ) % ^')
    let r
    try { r = Function(`"use strict"; return (${expr})`)() } catch { return reply('❌ Calcul invalide.') }
    if (typeof r !== 'number' || !Number.isFinite(r)) return reply('❌ Résultat invalide.')
    return reply(`🧮 ${q} = *${Math.round(r * 1e10) / 1e10}*`)
  }),

  tool('roll', async ({ args, reply }) => {
    const a = (args[0] || '1d6').toLowerCase()
    let n = 1, faces = 6
    const m = a.match(/^(\d{1,2})d(\d{1,4})$/)
    if (m) { n = +m[1]; faces = +m[2] } else if (/^\d{1,6}$/.test(a)) faces = +a
    if (n < 1 || faces < 2) return reply('Usage : .roll 2d6 (2 dés à 6 faces) ou .roll 100')
    const rolls = Array.from({ length: n }, () => 1 + Math.floor(Math.random() * faces))
    const total = rolls.reduce((x, y) => x + y, 0)
    return reply(`🎲 ${n}d${faces} : ${rolls.join(' + ')}${n > 1 ? ` = *${total}*` : ''}`)
  }),

  tool('flip', async ({ reply }) => reply(Math.random() < 0.5 ? '🪙 *Pile* !' : '🪙 *Face* !')),

  tool('choose', async ({ q, reply }) => {
    const items = q.split(/\||,/).map((x) => x.trim()).filter(Boolean)
    if (items.length < 2) return reply('Usage : .choose pizza | burger | tacos')
    return reply(`🤔 Je choisis : *${items[Math.floor(Math.random() * items.length)]}*`)
  }),

  tool('translate', async ({ args, q, msg, reply }) => {
    let lang = 'fr'
    let text = q
    if (/^[a-z]{2}(-[a-z]{2,4})?$/i.test(args[0] || '')) {
      lang = args[0].toLowerCase()
      text = q.slice(args[0].length).trim()
    }
    if (!text) text = quotedText(msg)
    if (!text) return reply('Usage : .translate en bonjour\nOu réponds à un message avec : .translate fr')
    const r = await translate(text.slice(0, 1500), lang)
    return reply(`🌐 *${r.from || '?'} → ${lang}*\n\n${r.text}`)
  }),

  tool('currency', async ({ args, reply }) => {
    let [a, c1, c2] = args
    if (Number.isNaN(parseFloat(a))) { c2 = c1; c1 = a; a = '1' }
    const amount = parseFloat(String(a).replace(',', '.'))
    if (!c1 || !c2 || !Number.isFinite(amount)) return reply('Usage : .currency 100 usd xof')
    const d = await getJSON(`https://open.er-api.com/v6/latest/${c1.toUpperCase()}`)
    const rate = d.rates?.[c2.toUpperCase()]
    if (!rate) return reply('❌ Devise inconnue (codes : USD, EUR, XOF, NGN, GHS, MAD…)')
    const f = (n) => n.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
    return reply(
      `💱 *${f(amount)} ${c1.toUpperCase()}* = *${f(amount * rate)} ${c2.toUpperCase()}*\n` +
      `📊 1 ${c1.toUpperCase()} = ${rate} ${c2.toUpperCase()}`
    )
  }),

  tool('shorturl', async ({ args, reply }) => {
    const url = args[0]
    if (!/^https?:\/\/\S+$/i.test(url || '')) return reply('Usage : .shorturl https://lien-tres-long.com/...')
    let short = ''
    try { short = (await getText('https://is.gd/create.php?format=simple&url=' + encodeURIComponent(url))).trim() } catch {}
    if (!short.startsWith('http'))
      short = (await getText('https://tinyurl.com/api-create.php?url=' + encodeURIComponent(url))).trim()
    return reply(`🔗 ${short}`)
  }),

  tool('fact', async ({ reply }) => {
    const d = await getJSON('https://uselessfacts.jsph.pl/api/v2/facts/random?language=en')
    let text = d.text
    try { text = (await translate(d.text, 'fr')).text } catch {}
    return reply(`💡 *Le saviez-vous ?*\n\n${text}`)
  }),

  tool('quote', async ({ reply }) => {
    const d = await getJSON('https://dummyjson.com/quotes/random')
    let text = d.quote
    try { text = (await translate(d.quote, 'fr')).text } catch {}
    return reply(`💬 « ${text} »\n\n— *${d.author}*`)
  }),

  tool('bible', async ({ q, reply }) => {
    const m = q.trim().match(/^(.+?)\s+(\d+)(?:[:.](\d+)(?:-(\d+))?)?$/)
    if (!m) return reply('Usage : .bible jean 3:16\nAutres : .bible psaumes 23 / .bible 1 jean 4:7-8')
    const b = norm(m[1])
    let i = BOOKS.findIndex((x) => norm(x) === b)
    if (i < 0) i = BOOKS.findIndex((x) => norm(x).startsWith(b))
    if (i < 0) return reply('❌ Livre introuvable. Exemple : Jean, Psaumes, 1 Corinthiens')
    const d = await getJSON(`https://api.getbible.net/v2/ls1910/${i + 1}/${m[2]}.json`)
    let verses = d.verses || []
    if (m[3]) verses = verses.filter((v) => v.verse >= +m[3] && v.verse <= +(m[4] || m[3]))
    else verses = verses.slice(0, 15)
    if (!verses.length) return reply('❌ Chapitre ou verset introuvable.')
    const ref = `${BOOKS[i]} ${m[2]}${m[3] ? ':' + m[3] + (m[4] ? '-' + m[4] : '') : ''}`
    return reply(`📖 *${ref}* (Louis Segond 1910)\n\n` + verses.map((v) => `*${v.verse}.* ${String(v.text).trim()}`).join('\n').slice(0, 3000))
  })
]
