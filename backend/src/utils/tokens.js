import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { query, queryUm } from '../db/index.js'
import { AppError } from './erros.js'

const ALGORITMO = 'HS256'

// Tempo para aceitar o token anterior quando duas abas renovam a sessão ao mesmo tempo.
const CARENCIA_SEGUNDOS = 30

const hash = (token) => crypto.createHash('sha256').update(token).digest('hex')
const novoTokenAleatorio = () => crypto.randomBytes(32).toString('base64url')

export function gerarTokenAcesso(usuario, sessaoId) {
  return jwt.sign({ sub: String(usuario.id), sid: String(sessaoId) }, config.jwtSecret, {
    algorithm: ALGORITMO,
    expiresIn: config.tokenAcessoExpiracao,
  })
}

export function verificarTokenAcesso(token) {
  try {
    const payload = jwt.verify(token, config.jwtSecret, { algorithms: [ALGORITMO] })
    // Tokens emitidos antes das sessões no banco não têm sid.
    if (!Number.isInteger(Number(payload.sub)) || !Number.isInteger(Number(payload.sid))) throw new Error()
    return payload
  } catch {
    throw new AppError(401, 'Token de acesso inválido ou expirado')
  }
}

export async function criarSessao(usuarioId) {
  await query('DELETE FROM sessoes WHERE expira_em < CURRENT_TIMESTAMP')

  const tokenSessao = novoTokenAleatorio()
  const { id } = await queryUm(
    `INSERT INTO sessoes (usuario_id, token_hash, expira_em)
     VALUES ($1, $2, CURRENT_TIMESTAMP + make_interval(days => $3::int)) RETURNING id`,
    [usuarioId, hash(tokenSessao), config.sessaoDias],
  )
  return { sessaoId: id, tokenSessao }
}

// Troca o token da sessão a cada uso. Sem tokenSessao no retorno, o cookie atual continua valendo.
export async function renovarSessao(token) {
  const tokenHash = hash(token)
  const tokenSessao = novoTokenAleatorio()

  const renovada = await queryUm(
    `UPDATE sessoes
     SET token_hash = $1, token_hash_anterior = token_hash, rotacionado_em = CURRENT_TIMESTAMP,
         expira_em = CURRENT_TIMESTAMP + make_interval(days => $3::int)
     WHERE token_hash = $2 AND revogada_em IS NULL AND expira_em > CURRENT_TIMESTAMP
     RETURNING id, usuario_id`,
    [hash(tokenSessao), tokenHash, config.sessaoDias],
  )
  if (renovada) return { sessaoId: renovada.id, usuarioId: renovada.usuario_id, tokenSessao }

  const anterior = await queryUm(
    `SELECT id, usuario_id, rotacionado_em > CURRENT_TIMESTAMP - make_interval(secs => $2::int) AS na_carencia
     FROM sessoes
     WHERE token_hash_anterior = $1 AND revogada_em IS NULL AND expira_em > CURRENT_TIMESTAMP`,
    [tokenHash, CARENCIA_SEGUNDOS],
  )
  if (anterior?.na_carencia) return { sessaoId: anterior.id, usuarioId: anterior.usuario_id, tokenSessao: null }

  // Um token já trocado voltou a ser usado depois da carência: pode ter sido roubado.
  if (anterior) await revogarSessao(anterior.id)
  throw new AppError(401, 'Sessão encerrada, faça login novamente')
}

export const revogarSessao = (sessaoId) =>
  query('UPDATE sessoes SET revogada_em = CURRENT_TIMESTAMP WHERE id = $1 AND revogada_em IS NULL', [sessaoId])

export const revogarSessaoPorToken = (token) =>
  query('UPDATE sessoes SET revogada_em = CURRENT_TIMESTAMP WHERE token_hash = $1 AND revogada_em IS NULL', [hash(token)])

export const revogarSessoesDoUsuario = (usuarioId) =>
  query('UPDATE sessoes SET revogada_em = CURRENT_TIMESTAMP WHERE usuario_id = $1 AND revogada_em IS NULL', [usuarioId])

// Cria o token de um link enviado por e-mail. Só o link mais recente de cada finalidade vale.
export async function emitirTokenEmail(usuario, finalidade) {
  await query('DELETE FROM tokens_email WHERE expira_em < CURRENT_TIMESTAMP OR (usuario_id = $1 AND finalidade = $2)', [
    usuario.id,
    finalidade,
  ])

  const token = novoTokenAleatorio()
  await query(
    `INSERT INTO tokens_email (usuario_id, finalidade, token_hash, email, expira_em)
     VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP + make_interval(mins => $5::int))`,
    [usuario.id, finalidade, hash(token), usuario.email, config.validadeTokenMinutos[finalidade]],
  )
  return token
}

// Apaga o token e altera a conta no mesmo comando, então duas requisições com o mesmo link não passam
// juntas. A posse do link prova o acesso à caixa de entrada, por isso os dois fluxos confirmam o e-mail.
export async function consumirTokenEmail(token, finalidade, senhaHash = null) {
  const usuario = await queryUm(
    `WITH consumido AS (
       DELETE FROM tokens_email
       WHERE token_hash = $1 AND finalidade = $2 AND expira_em > CURRENT_TIMESTAMP
       RETURNING usuario_id, email
     )
     UPDATE usuarios u
     SET email_verificado_em = COALESCE(u.email_verificado_em, CURRENT_TIMESTAMP),
         senha_hash = COALESCE($3, u.senha_hash),
         atualizado_em = CURRENT_TIMESTAMP
     FROM consumido c
     WHERE u.id = c.usuario_id AND u.email = c.email AND u.status = 'ATIVO'
     RETURNING u.id`,
    [hash(token), finalidade, senhaHash],
  )
  // A mesma resposta para vencido, já usado e inexistente.
  if (!usuario) throw new AppError(400, 'Link inválido ou expirado. Solicite um novo.')
  return usuario.id
}

export const descartarTokensEmail = (usuarioId, finalidade) =>
  query('DELETE FROM tokens_email WHERE usuario_id = $1 AND finalidade = $2', [usuarioId, finalidade])
