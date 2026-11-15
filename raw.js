import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore
} from '@whiskeysockets/baileys'
import pino from 'pino'

const log = pino({ level: 'silent' })
let up = 0
let raw = 0

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

  // Messages bruts envoyés par le serveur WhatsApp (avant déchiffrement)
  sock.ws.on('CB:message', (n) => {
    raw++
    console.log('📨 BRUT : le serveur envoie un message | de', n.attrs.from, '| type', n.attrs.type)
  })

  sock.ev.process(async (events) => {
    for (const [name, data] of Object.entries(events)) {
      if (name === 'creds.update') continue
      if (name === 'connection.update') {
        if (data.connection === 'open') { up = Date.now(); console.log('✅ connecté') }
        if (data.receivedPendingNotifications) console.log('📬 file hors-ligne terminée')
        if (data.connection === 'close') {
          up = 0
          console.log('⚠️ coupée, code', data.lastDisconnect?.error?.output?.statusCode)
          setTimeout(start, 3000)
        }
        continue
      }
      if (name === 'messages.upsert') {
        for (const m of data.messages)
          console.log('📥 upsert', data.type, m.key.fromMe ? 'MOI' : 'AUTRE', m.message ? Object.keys(m.message)[0] : 'ILLISIBLE')
      } else {
        console.log('🔔', name)
      }
    }
  })
}

setInterval(() => {
  if (up) console.log(`📡 en ligne ${Math.round((Date.now() - up) / 1000)} s | messages bruts reçus : ${raw}`)
}, 15000)

start()
