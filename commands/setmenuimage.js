import fs from 'fs'
import { getImage } from '../utils.js'

export default {
  name: 'setmenuimage',
  owner: true,
  async run({ sock, msg, from, args, reply }) {
    let buffer = null

    if (args[0]?.startsWith('http')) {
      const res = await fetch(args[0])
      const type = res.headers.get('content-type') || ''
      if (!res.ok || !type.startsWith('image/'))
        return reply("❌ Ce lien n'est pas une image valide.")
      buffer = Buffer.from(await res.arrayBuffer())
    } else {
      buffer = await getImage(sock, msg, from)
    }

    if (!buffer)
      return reply('📸 Réponds à une image avec *.setmenuimage*, envoie une image avec cette légende, ou donne un lien : *.setmenuimage https://...*')

    fs.mkdirSync('data', { recursive: true })
    fs.writeFileSync('data/botimg.jpg', buffer)
    return reply('✅ Image du menu mise à jour. Teste avec *.menu*')
  }
}
