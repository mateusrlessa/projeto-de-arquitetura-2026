import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'

// Colunas de usuarios que podem ser devolvidas pela API (nunca senha_hash).
export const COLUNAS_USUARIO =
  'id, nome_completo, email, email_verificado_em, tipo_usuario, foto_perfil_storage_key, status, bloqueado_em, motivo_bloqueio, criado_em, atualizado_em'

const CUSTO_BCRYPT = 12

// Usado quando a conta não existe ou não tem senha, para o tempo de resposta ser o mesmo.
const HASH_FICTICIO = bcrypt.hashSync(crypto.randomBytes(32).toString('hex'), CUSTO_BCRYPT)

export const gerarHashSenha = (senha) => bcrypt.hash(senha, CUSTO_BCRYPT)
export const conferirSenha = (senha, hash) => bcrypt.compare(senha, hash ?? HASH_FICTICIO)

// Converte o campo "senha" recebido na coluna senha_hash.
export async function comSenhaHash({ senha, ...dados }) {
  return senha === undefined ? dados : { ...dados, senha_hash: await gerarHashSenha(senha) }
}

// Uma conta bloqueada continua bloqueada mesmo depois de excluída: bloqueado_em só é limpo quando o admin
// desbloqueia ou reativa a conta. Enquanto isso, o e-mail e o CPF dela não podem ser usados em outro cadastro.
export const estaBloqueado = (usuario) => usuario.status === 'BLOQUEADO' || usuario.bloqueado_em != null

export const MENSAGEM_EMAIL_BLOQUEADO = 'Este e-mail está bloqueado e não pode ser usado para criar uma conta'
export const MENSAGEM_CPF_BLOQUEADO = 'Este CPF está bloqueado e não pode ser usado em um novo cadastro'
