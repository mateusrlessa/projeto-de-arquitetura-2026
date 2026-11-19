import { queryUm } from '../db/index.js'
import { AppError, proibido } from '../utils/erros.js'
import { verificarTokenAcesso } from '../utils/tokens.js'

export function lerTokenBearer(req) {
  const [esquema, token] = (req.headers.authorization || '').split(' ')
  return esquema === 'Bearer' && token ? token : null
}

async function carregarUsuario(req) {
  const token = lerTokenBearer(req)
  if (!token) return null

  const payload = verificarTokenAcesso(token)
  const usuario = await queryUm(
    `SELECT u.id, u.nome_completo, u.email, u.tipo_usuario, u.status,
       s.revogada_em IS NULL AND s.expira_em > CURRENT_TIMESTAMP AS sessao_ativa
     FROM usuarios u
     LEFT JOIN sessoes s ON s.id = $2 AND s.usuario_id = u.id
     WHERE u.id = $1`,
    [Number(payload.sub), Number(payload.sid)],
  )
  if (!usuario || usuario.status !== 'ATIVO') throw new AppError(401, 'Usuário inativo ou bloqueado')
  if (!usuario.sessao_ativa) throw new AppError(401, 'Sessão encerrada, faça login novamente')

  delete usuario.sessao_ativa
  req.sessaoId = Number(payload.sid)
  return usuario
}

// Exige um token de acesso valido.
export async function autenticar(req, res, next) {
  req.usuario = await carregarUsuario(req)
  if (!req.usuario) throw new AppError(401, 'Token de acesso não informado')
  next()
}

// Identifica o usuario se houver token, mas permite acesso anonimo.
export async function autenticarOpcional(req, res, next) {
  req.usuario = await carregarUsuario(req)
  next()
}

// Restringe a rota aos tipos de usuario informados. Use depois de autenticar.
export function permitir(...tipos) {
  return (req, res, next) => {
    if (!tipos.includes(req.usuario.tipo_usuario)) throw proibido()
    next()
  }
}

export const ehAdmin = (usuario) => usuario?.tipo_usuario === 'ADMIN'

// Permite a acao apenas ao dono do recurso ou a um ADMIN.
export function exigirDonoOuAdmin(usuario, donoId) {
  if (!ehAdmin(usuario) && usuario?.id !== donoId) throw proibido()
}
