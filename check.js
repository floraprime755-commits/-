import fs from 'fs'
const core = ['config', 'db', 'utils', 'security', 'events', 'notify', 'autobio', 'autoleave', 'handler']
for (const f of core) {
  try { await import(`./${f}.js`); console.log('✅', f + '.js') }
  catch (e) { console.log('❌', f + '.js →', e.message.split('\n')[0]) }
}
for (const f of fs.readdirSync('commands')) {
  try { await import(`./commands/${f}`); console.log('✅ commands/' + f) }
  catch (e) { console.log('❌ commands/' + f, '→', e.message.split('\n')[0]) }
}
process.exit(0)
