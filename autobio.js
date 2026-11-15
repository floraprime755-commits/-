import * as db from './db.js'
import config from './config.js'

export async function updateBio(sock) {
  const s = db.get('settings', {})
  const up = Date.now() - config.deployedAt.getTime()
  const h = Math.floor(up / 3600000)
  const m = Math.floor((up % 3600000) / 60000)
  const time = new Date().toLocaleTimeString('fr-FR', {
    timeZone: config.timezone,
    hour: '2-digit',
    minute: '2-digit'
  })
  try {
    await sock.updateProfileStatus(
      `🤖 ${s.botName || config.botName} • ${time} • actif depuis ${h}h ${m}min`
    )
    return true
  } catch (e) {
    console.log('Auto-bio :', e.message)
    return false
  }
}

let timer = null
export function startBio(sock) {
  clearInterval(timer)
  const tick = () => {
    if (db.get('settings', {}).autobio) updateBio(sock)
  }
  setTimeout(tick, 30000)
  timer = setInterval(tick, 5 * 60 * 1000)
}
