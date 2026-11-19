export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// O bcrypt do backend só considera os primeiros 72 bytes, e acentos ocupam mais de um byte.
export function erroNovaSenha(senha) {
  if (senha.length < 8) return 'Use pelo menos 8 caracteres'
  if (new TextEncoder().encode(senha).length > 72) return 'Use uma senha mais curta'
  return null
}

// Os links enviados por e-mail trazem o token depois do #.
export const lerTokenDoLink = (hash) => new URLSearchParams(hash.slice(1)).get('token')
