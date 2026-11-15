import { groupCmd, num, phones } from '../utils.js'

export default [
  groupCmd('tagall', {}, async ({ sock, from, q, meta, msg }) => {
    const list = meta.participants.map((p) => p.id)
    const text =
      `📢 *Annonce*${q ? '\n' + q : ''}\n\n` +
      list.map((j) => `• @${num(j)}`).join('\n')
    await sock.sendMessage(from, { text, mentions: list }, { quoted: msg })
  }),

  groupCmd('hidetag', {}, async ({ sock, from, q, meta }) => {
    await sock.sendMessage(from, {
      text: q || '📢',
      mentions: meta.participants.map((p) => p.id)
    })
  }),

  groupCmd('vcf', {}, async ({ sock, from, meta, msg, reply }) => {
    const cards = meta.participants
      .map((p) => phones(p)[0])
      .filter(Boolean)
      .map((n, i) => `BEGIN:VCARD\nVERSION:3.0\nFN:${meta.subject} ${i + 1}\nTEL;type=CELL;waid=${n}:+${n}\nEND:VCARD`)
    if (!cards.length) return reply('❌ Aucun numéro exportable.')
    await sock.sendMessage(
      from,
      {
        document: Buffer.from(cards.join('\n')),
        mimetype: 'text/vcard',
        fileName: `${meta.subject}.vcf`
      },
      { quoted: msg }
    )
  })
]
