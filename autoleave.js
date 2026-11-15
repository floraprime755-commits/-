import * as db from './db.js'
import { num } from './utils.js'

export function registerAutoLeave(sock) {
  sock.ev.on('groups.upsert', async (groups) => {
    if (!db.get('settings', {}).autoleave) return
    const allowed = db.get('allowedGroups', [])
    const me = [num(sock.user?.id), num(sock.user?.lid || '')].filter(Boolean)
    for (const g of groups) {
      if (allowed.includes(g.id)) continue
      const creator = num(g.owner || g.subjectOwner || '')
      if (creator && me.includes(creator)) continue // groupe créé par toi
      console.log('🚪 Groupe non autorisé quitté :', g.subject)
      await sock.groupLeave(g.id).catch((e) => console.log('Départ impossible :', e.message))
    }
  })
}
