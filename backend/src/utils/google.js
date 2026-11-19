import { OAuth2Client } from 'google-auth-library'
import { config } from '../config.js'
import { AppError } from './erros.js'

const cliente = new OAuth2Client()

// Confere assinatura, emissor, validade e se o token foi emitido para este aplicativo.
export async function verificarCredencialGoogle(credencial) {
  if (!config.googleClientId) throw new AppError(503, 'Login com Google não configurado')

  let dados
  try {
    const ticket = await cliente.verifyIdToken({ idToken: credencial, audience: config.googleClientId })
    dados = ticket.getPayload()
  } catch {
    throw new AppError(401, 'Não foi possível validar a conta Google')
  }

  if (!dados?.sub || !dados.email || !dados.email_verified) {
    throw new AppError(401, 'A conta Google precisa ter um e-mail verificado')
  }
  return {
    googleSub: dados.sub,
    email: dados.email.trim().toLowerCase(),
    nome: (dados.name?.trim() || dados.email.split('@')[0]).slice(0, 150),
  }
}
