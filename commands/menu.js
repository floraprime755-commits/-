import fs from 'fs'
import os from 'os'
import * as db from '../db.js'
import CATEGORIES from '../categories.js'
import { commands } from '../handler.js'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export default {
  name: 'menu',
  async run({ sock, msg, from, args, config }) {
    const settings = db.get('settings', {})
    const style = Number(settings.menuStyle) || 1
    let quoted = true
    const out = (content) => {
      const opts = quoted ? { quoted: msg } : {}
      quoted = false
      return sock.sendMessage(from, content, opts)
    }

    // Catégories + commandes non classées + commandes perso
    const custom = Object.keys(db.get('cases', {}))
    const groups = []
    const known = new Set()
    for (const [title, names] of Object.entries(CATEGORIES)) {
      const list = names.filter((n) => commands.has(n))
      list.forEach((n) => known.add(n))
      if (list.length) groups.push([title, list])
    }
    const others = [...commands.keys()].filter((n) => !known.has(n))
    if (others.length) groups.push(['📁 AUTRES', others])
    if (custom.length) groups.push(['⭐ PERSO', custom])

    // .menu <catégorie>
    const wanted = (args[0] || '').toLowerCase()
    const shown = wanted ? groups.filter(([t]) => t.toLowerCase().includes(wanted)) : groups
    if (!shown.length)
      return out({ text: `❌ Catégorie introuvable.\nDisponibles : ${groups.map(([t]) => t).join(' | ')}` })

    // En-tête
    const up = Date.now() - config.deployedAt.getTime()
    const h = Math.floor(up / 3600000)
    const m = Math.floor((up % 3600000) / 60000)
    const s = Math.floor((up % 60000) / 1000)
    const time = new Date().toLocaleTimeString('en-US', {
      timeZone: config.timezone,
      hour: '2-digit',
      minute: '2-digit'
    })
    const gb = (b) => (b / 1024 ** 3).toFixed(2)
    const total = os.totalmem()
    const info = [
      ['👤 User', config.botName],
      ['⏱ Runtime', `${h}h ${m}m ${s}s`],
      ['🕒 Time', time],
      ['💾 RAM', `${gb(total - os.freemem())} / ${gb(total)} GB`],
      ['🤖 Bot', `${Math.round(process.memoryUsage().rss / 1048576)} MB`],
      ['⚙️ Prefix', `[ ${config.prefix} ]`],
      ['📦 Commands', commands.size + custom.length],
      ['🌐 Mode', settings.mode || 'public']
    ]
    const head =
      style === 1
        ? `╭───────────────⭓\n${info.map(([k, v]) => `│ ${k} : ${v}`).join('\n')}\n╰───────────────⭓\n`
        : `*${config.botName}*\n${info.map(([k, v]) => `${k} : ${v}`).join('\n')}\n`

    // Catégories
    const part = ([t, l]) =>
      style === 1
        ? `\n╭─${t}\n${l.map((n) => `│ • ${n}`).join('\n')}\n╰───────────────⭓\n`
        : style === 2
          ? `\n━━ ${t} ━━\n${l.map((n) => `▸ ${config.prefix}${n}`).join('\n')}\n`
          : `\n*${t}*\n${l.join(' • ')}\n`
    const parts = shown.map(part)
    parts.push(`\n✨ *${config.botName.toUpperCase()}* ✨\n💡 ${config.prefix}menu <catégorie> (ex : ${config.prefix}menu fun)`)

    // Découpe en messages de 3000 caractères maximum
    const chunks = ['']
    for (const p of parts) {
      if (chunks[chunks.length - 1] && (chunks[chunks.length - 1] + p).length > 3000) chunks.push('')
      chunks[chunks.length - 1] += p
    }

    if (!wanted) {
      const img = 'data/botimg.jpg'
      if (fs.existsSync(img)) await out({ image: fs.readFileSync(img), caption: head })
      else chunks[0] = head + chunks[0]
    }
    for (const c of chunks) {
      await out({ text: c })
      await sleep(600)
    }
  }
}
