import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore
} from '@whiskeysockets/baileys'
import pino from 'pino'

const log = pino({ level: 'silent' })
let upSince = 0

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('session')
  const { version } = await fetchLatestBaileysVersion()
  const sock = makeWASocket({
    version,
    logger: log,
    printQRInTerminal: false,
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, log) },
    browser: ['Ubuntu', 'Chrome', '20.0.04'],
    syncFullHistory: false
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'open') {
      upSince = Date.now()
      console.log('✅ connecté. Envoie .test depuis ton téléphone.')
    }
    if (connection === 'close') {
      const e = lastDisconnect?.error
      const code = e?.output?.statusCode
      console.log('⚠️ coupée — code', code, '—', e?.message)
      upSince = 0
      if (code === 401) {
        console.log('🚫 WhatsApp a déconnecté cette session.')
        process.exit(1)
      }
      setTimeout(start, 3000)
    }
  })

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    for (const m of messages) {
      const t = Number(m.messageTimestamp?.toNumber?.() ?? m.messageTimestamp) || 0
      const age = t ? Math.round(Date.now() / 1000 - t) : '?'
      const qui = m.key.fromMe ? 'MOI (mon téléphone)' : 'UN AUTRE'
      if (!m.message) {
        console.log(`🔒 ILLISIBLE — de ${qui} — type ${type} — âge ${age}s`)
        continue
      }
      const text = m.message.conversation || m.message.extendedTextMessage?.text || ''
      console.log(`📥 LU — de ${qui} — type ${type} — âge ${age}s — « ${text.slice(0, 30)} »`)
      if (text.startsWith('.') && age < 60) {
        await sock.sendMessage(m.key.remoteJid, { text: '✅ DIAG : message reçu' }, { quoted: m })
        console.log('➡️ réponse envoyée')
      }
    }
  })
}

setInterval(() => {
  if (upSince) console.log(`📡 en ligne depuis ${Math.round((Date.now() - upSince) / 1000)} s`)
}, 15000)

start()
