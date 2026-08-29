var memory = global._macroSentinelPersistentFallback || {}
global._macroSentinelPersistentFallback = memory

function redisUrl() { return process.env.UPSTASH_REDIS_REST_URL }
function redisToken() { return process.env.UPSTASH_REDIS_REST_TOKEN }

async function command(parts) {
  if (!redisUrl() || !redisToken()) return null
  var response = await fetch(redisUrl() + '/' + parts.map(encodeURIComponent).join('/'), {
    headers: { Authorization: 'Bearer ' + redisToken() }
  })
  if (!response.ok) throw new Error('Shared cache request failed')
  var data = await response.json()
  return data.result
}

export function storageMode() {
  return redisUrl() && redisToken() ? 'redis' : 'memory'
}

export async function read(key) {
  var result = await command(['get', key])
  if (result === null) return memory[key] || null
  try { return typeof result === 'string' ? JSON.parse(result) : result } catch (_) { return null }
}

export async function write(key, value, seconds) {
  var body = JSON.stringify(value)
  var result = await command(['set', key, body, 'EX', String(seconds)])
  if (result === null) memory[key] = value
  return result
}

export async function takeLock(key, seconds) {
  var result = await command(['set', key, '1', 'NX', 'EX', String(seconds)])
  if (result === null) {
    if (memory[key]) return false
    memory[key] = 1
    setTimeout(function() { delete memory[key] }, seconds * 1000)
    return true
  }
  return result === 'OK'
}

export async function releaseLock(key) {
  var result = await command(['del', key])
  if (result === null) delete memory[key]
  return result
}
