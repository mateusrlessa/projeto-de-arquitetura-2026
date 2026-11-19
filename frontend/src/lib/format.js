export const iniciais = (nome = '') =>
  nome
    .split(' ')
    .filter(Boolean)
    .map((parte) => parte[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

export const primeiroNome = (nome = '') => nome.split(' ')[0]

export function fotoUrl(chave) {
  if (!chave) return null
  return /^https?:\/\//.test(chave) ? chave : `/uploads/${chave}`
}

export const dataLonga = (iso) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

export const plural = (n, singular, pluralForma) => (n === 1 ? singular : pluralForma)

export function linkWhatsapp(telefone, nome) {
  const digitos = telefone.replace(/\D/g, '')
  const numero = digitos.length <= 11 ? `55${digitos}` : digitos
  const texto = `Olá, ${primeiroNome(nome)}! Encontrei seu perfil no CuidaAqui e gostaria de conversar sobre um atendimento.`
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`
}
