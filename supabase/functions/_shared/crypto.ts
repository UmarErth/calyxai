const encoder = new TextEncoder()

function bytesToBase64(bytes: Uint8Array) { return btoa(String.fromCharCode(...bytes)) }
function base64ToBytes(value: string) { return Uint8Array.from(atob(value), c => c.charCodeAt(0)) }
async function keyFromSecret(secret: string) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(secret))
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt'])
}
export async function encrypt(value: string, secret: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await keyFromSecret(secret), encoder.encode(value))
  return { ciphertext: bytesToBase64(new Uint8Array(ciphertext)), iv: bytesToBase64(iv) }
}
export async function decrypt(ciphertext: string, iv: string, secret: string) {
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: base64ToBytes(iv) }, await keyFromSecret(secret), base64ToBytes(ciphertext))
  return new TextDecoder().decode(plaintext)
}
