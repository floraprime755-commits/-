import './guard.js'
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore
} from '@whiskeysockets/baileys'
import pino from 'pino'
import readline from 'readline'
import config from './config.js'
import { loadCommands, handleMessage } from './handler.js'
import { registerEvents } from './events.js'

const DEBUG = !!process.env.DEBUG
const log = pino({ level: 'silent' })
let pairingRequested = false
let current = null
let up = 0
let ready = false
let raw = 0

const ask = (q) => new Promise((res) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  rl.question(q, (a) => { rl.close(); res(a.replace(/[^0-9]/g, '')) })
})

const age = (m) => {
  const t = Number(m.messageTimestamp?.toNumber?.() ?? m.messageTimestamp)
  return t ? Date.now() / 1000 - t : 0
}

const markReady = () => {
  if (ready) return
  ready = true
  console.log('🟢 PRÊT : envoie ta commande maintenant (ex : .ping)')
}

// Libère les messages bloqués en mémoire tampon après la connexion
setInterval(() => {
  if (!up || !current) return
  const buf = current.ev.isBuffering?.()
  const t = Date.now() - up
  if (DEBUG) console.log(`📡 ${Math.round(t / 1000)} s | bruts ${raw} | buffer ${buf ? 'OUI' : 'non'}`)
  if (buf && t > 20000) {
    try { current.ev.flush(true) } catch (e) { console.log('flush impossible :', e.message) }
    markReady()
  } else if (!buf && t > 8000) {
    markReady()
  }
}, 5000)

async function startBot() {
  await loadCommands()
  const { state, saveCreds } = await useMultiFileAuthState('session')
  const { version } = await fetchLatestBaileysVersion()

  let number = null
  if (!state.creds.registered) number = await ask('Ton numéro avec indicatif, sans + : ')

  const sock = makeWASocket({
    version,
    logger: log,
    printQRInTerminal: false,
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, log) },
    browser: ['Ubuntu', 'Chrome', '20.0.04'],
    syncFullHistory: false
  })
  current = sock

  sock.ev.on('creds.update', saveCreds)
  registerEvents(sock)
  sock.ws.on('CB:message', () => raw++)

  if (number && !pairingRequested) {
    pairingRequested = true
    setTimeout(async () => {
      try {
        console.log('\n🔑 CODE :', await sock.requestPairingCode(number), '\n')
      } catch (e) {
        console.log('Erreur code :', e.message)
      }
    }, 4000)
  }

  sock.ev.on('connection.update', ({ connection, lastDisconnect, receivedPendingNotifications }) => {
    if (receivedPendingNotifications) markReady()
    if (connection === 'open') {
      up = Date.now()
      ready = false
      console.log(`✅ ${config.botName} connecté. Synchronisation en cours : attends « 🟢 PRÊT »…`)
    }
    if (connection === 'close') {
      up = 0
      const code = lastDisconnect?.error?.output?.statusCode
      console.log('Connexion fermée, code :', code)
      if (code === 440) console.log('⚠️ Une autre instance utilise cette session : pkill -f node')
      if (code === DisconnectReason.loggedOut) {
        console.log('Session fermée par WhatsApp. Supprime le dossier session et relance.')
        process.exit(0)
      }
      if (!sock.authState.creds.registered) process.exit(0)
      setTimeout(startBot, 3000)
    }
  })

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    for (const msg of messages) {
      if (DEBUG) {
        const t = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
        console.log("📩", type, "âge", Math.round(age(msg)), "s", msg.key.fromMe ? 'moi' : 'autre',
          msg.message ? Object.keys(msg.message)[0] : 'ILLISIBLE', t ? `« ${t.slice(0, 20)} »` : '')
      }
      if (!msg.message || (type !== "notify" && age(msg) > 120)) continue
      try {
        await handleMessage(sock, msg)
      } catch (e) {
        console.log('Erreur commande :', e.message)
      }
    }
  })
}

startBot()
