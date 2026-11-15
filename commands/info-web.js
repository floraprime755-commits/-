const enc = encodeURIComponent

const get = async (url, type = 'json') => {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(10000),
    headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 13) EldoradoBot' }
  })
  if (!res.ok) throw new Error('HTTP ' + res.status)
  return type === 'json' ? res.json() : res.text()
}

const clip = (s = '', n = 800) => (s.length > n ? s.slice(0, n - 1) + '…' : s)
const clean = (s = '') =>
  s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim()

// Les erreurs réseau ne plantent pas le bot
const web = (name, fn) => ({
  name,
  async run(ctx) {
    try {
      return await fn(ctx)
    } catch (e) {
      return ctx.reply(`⚠️ Service indisponible pour le moment (${e.message}). Réessaie plus tard.`)
    }
  }
})

const WMO = {
  0: '☀️ Ciel dégagé', 1: '🌤️ Plutôt dégagé', 2: '⛅ Partiellement nuageux', 3: '☁️ Couvert',
  45: '🌫️ Brouillard', 48: '🌫️ Brouillard givrant', 51: '🌦️ Bruine légère', 53: '🌦️ Bruine',
  55: '🌦️ Bruine forte', 61: '🌧️ Pluie légère', 63: '🌧️ Pluie', 65: '🌧️ Forte pluie',
  71: '🌨️ Neige légère', 73: '🌨️ Neige', 75: '❄️ Forte neige', 80: '🌦️ Averses légères',
  81: '🌧️ Averses', 82: '⛈️ Fortes averses', 95: '⛈️ Orage', 96: '⛈️ Orage avec grêle',
  99: '⛈️ Orage violent'
}

const LEAGUES = {
  pl: 'eng.1', epl: 'eng.1', liga: 'esp.1', bundesliga: 'ger.1', seriea: 'ita.1',
  ligue1: 'fra.1', ucl: 'uefa.champions', uel: 'uefa.europa', mls: 'usa.1'
}
const NAMES = {
  'eng.1': '🏴 Premier League', 'esp.1': '🇪🇸 LaLiga', 'ger.1': '🇩🇪 Bundesliga',
  'ita.1': '🇮🇹 Serie A', 'fra.1': '🇫🇷 Ligue 1', 'uefa.champions': '🏆 Ligue des champions',
  'uefa.europa': '🏆 Europa League', 'usa.1': '🇺🇸 MLS'
}

async function board(code) {
  const d = await get(`https://site.api.espn.com/apis/site/v2/sports/soccer/${code}/scoreboard`)
  return (d.events || []).map((e) => {
    const c = e.competitions[0].competitors
    const h = c.find((x) => x.homeAway === 'home')
    const a = c.find((x) => x.homeAway === 'away')
    const st = e.status.type
    const when =
      st.state === 'pre' ? '🕒 ' + st.shortDetail
      : st.state === 'in' ? '🔴 ' + (e.status.displayClock || st.shortDetail)
      : '✅ ' + st.shortDetail
    const score = st.state === 'pre' ? 'vs' : `${h.score} - ${a.score}`
    return { state: st.state, line: `${h.team.displayName} ${score} ${a.team.displayName}\n   ${when}` }
  })
}

export default [
  web('google', async ({ q, reply }) => {
    if (!q) return reply('Usage : .google ta recherche')
    let out = `🔎 *${q}*\n`
    try {
      const html = await get('https://html.duckduckgo.com/html/?q=' + enc(q), 'text')
      const items = [...html.matchAll(
        /class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g
      )].slice(0, 5)
      items.forEach((m, i) => {
        let url = m[1]
        const u = url.match(/uddg=([^&]+)/)
        if (u) url = decodeURIComponent(u[1])
        out += `\n${i + 1}. *${clean(m[2])}*\n${clip(clean(m[3]), 160)}\n${url}\n`
      })
    } catch {}
    return reply(out + `\n🌐 Voir sur Google : https://www.google.com/search?q=${enc(q)}`)
  }),

  web('wikipedia', async ({ sock, msg, from, q, reply }) => {
    if (!q) return reply('Usage : .wikipedia sujet')
    const s = await get(`https://fr.wikipedia.org/w/api.php?action=opensearch&search=${enc(q)}&limit=1&format=json`)
    const title = s[1]?.[0]
    if (!title) return reply('❌ Aucun article trouvé.')
    const d = await get(`https://fr.wikipedia.org/api/rest_v1/page/summary/${enc(title)}`)
    const caption = `📚 *${d.title}*\n\n${clip(d.extract, 900)}\n\n🔗 ${d.content_urls?.desktop?.page || ''}`
    if (d.thumbnail?.source)
      return sock.sendMessage(from, { image: { url: d.thumbnail.source }, caption }, { quoted: msg })
    return reply(caption)
  }),

  web('weather', async ({ q, reply }) => {
    if (!q) return reply('Usage : .weather ville')
    const g = await get(`https://geocoding-api.open-meteo.com/v1/search?name=${enc(q)}&count=1&language=fr`)
    const p = g.results?.[0]
    if (!p) return reply('❌ Ville introuvable.')
    const w = await get(
      `https://api.open-meteo.com/v1/forecast?latitude=${p.latitude}&longitude=${p.longitude}` +
      '&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code' +
      '&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=1'
    )
    const c = w.current
    const d = w.daily
    return reply(
      `🌍 *${p.name}${p.country ? ', ' + p.country : ''}*\n${WMO[c.weather_code] || '🌡️'}\n\n` +
      `🌡️ ${c.temperature_2m}°C (ressenti ${c.apparent_temperature}°C)\n` +
      `💧 Humidité : ${c.relative_humidity_2m}%\n💨 Vent : ${c.wind_speed_10m} km/h\n` +
      `📈 Min / Max : ${d.temperature_2m_min[0]}° / ${d.temperature_2m_max[0]}°\n` +
      `☔ Pluie : ${d.precipitation_probability_max[0]}%`
    )
  }),

  web('define', async ({ args, reply }) => {
    const word = args[0]
    if (!word) return reply('Usage : .define mot')
    for (const lang of ['fr', 'en']) {
      try {
        const d = (await get(`https://api.dictionaryapi.dev/api/v2/entries/${lang}/${enc(word)}`))[0]
        const meanings = d.meanings.slice(0, 3).map((m) => `• _${m.partOfSpeech}_ : ${m.definitions[0].definition}`)
        return reply(`📖 *${d.word}* ${d.phonetic || ''} (${lang})\n\n${meanings.join('\n')}`)
      } catch {}
    }
    return reply('❌ Définition introuvable.')
  }),

  web('lyrics', async ({ sock, msg, from, q, reply }) => {
    if (!q) return reply('Usage : .lyrics titre ou artiste')
    const d = await get(`https://itunes.apple.com/search?term=${enc(q)}&entity=song&limit=1`)
    const t = d.results?.[0]
    if (!t) return reply('❌ Titre introuvable.')
    const caption =
      `🎵 *${t.trackName}*\n👤 ${t.artistName}\n💿 ${t.collectionName}\n📅 ${t.releaseDate?.slice(0, 4)}\n\n` +
      `📝 Paroles : https://genius.com/search?q=${enc(t.artistName + ' ' + t.trackName)}`
    return sock.sendMessage(
      from,
      { image: { url: t.artworkUrl100.replace('100x100', '600x600') }, caption },
      { quoted: msg }
    )
  }),

  web('scores', async ({ args, reply }) => {
    const code = LEAGUES[(args[0] || 'pl').toLowerCase()]
    if (!code) return reply(`Usage : .scores ${Object.keys(LEAGUES).join(' / ')}`)
    const games = await board(code)
    if (!games.length) return reply(`${NAMES[code]}\n\nAucun match aujourd'hui.`)
    return reply(`${NAMES[code]}\n\n` + games.slice(0, 15).map((g) => g.line).join('\n\n'))
  }),

  web('livescore', async ({ reply }) => {
    const codes = [...new Set(Object.values(LEAGUES))]
    const res = await Promise.allSettled(codes.map((c) => board(c)))
    let out = ''
    res.forEach((r, i) => {
      if (r.status !== 'fulfilled') return
      const live = r.value.filter((g) => g.state === 'in')
      if (live.length) out += `${NAMES[codes[i]]}\n${live.map((g) => g.line).join('\n')}\n\n`
    })
    return reply(out || '😴 Aucun match en direct en ce moment.')
  })
]
