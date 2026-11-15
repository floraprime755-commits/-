process.on('uncaughtException', (e) => console.log('💥 uncaughtException :', e))
process.on('unhandledRejection', (e) => console.log('💥 unhandledRejection :', e))

// Filtre le bruit de libsignal (Bad MAC, sessions fermées...)
const noisy = [
  'Bad MAC', 'Session error', 'Closing session', 'Closing open session',
  'Failed to decrypt', 'Removing old closed session', 'Opening session', 'Migrating session'
]
for (const k of ['log', 'info', 'warn', 'error']) {
  const orig = console[k].bind(console)
  console[k] = (...a) => {
    const first = typeof a[0] === 'string' ? a[0] : ''
    if (noisy.some((n) => first.includes(n))) return
    orig(...a)
  }
}
