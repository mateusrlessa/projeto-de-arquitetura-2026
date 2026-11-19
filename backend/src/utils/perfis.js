import { queryUm } from '../db/index.js'
import { ehAdmin, exigirDonoOuAdmin } from '../middlewares/auth.js'
import { naoEncontrado } from './erros.js'
import { idParam } from './sql.js'

export const podeGerenciar = (usuario, cuidadorId) => ehAdmin(usuario) || usuario?.id === cuidadorId

// Perfil que pode ser consultado: perfis inativos so aparecem para o dono ou ADMIN.
export async function perfilVisivel(req) {
  const cuidadorId = idParam(req.params.cuidadorId, 'cuidadorId')
  const perfil = await queryUm(
    `SELECT pc.usuario_id, pc.status, u.status AS status_usuario
     FROM perfis_cuidadores pc INNER JOIN usuarios u ON u.id = pc.usuario_id
     WHERE pc.usuario_id = $1`,
    [cuidadorId],
  )
  const ativo = perfil?.status === 'ATIVO' && perfil.status_usuario === 'ATIVO'
  if (!perfil || (!ativo && !podeGerenciar(req.usuario, cuidadorId))) throw naoEncontrado('Cuidador')
  return cuidadorId
}

// Perfil que o usuario autenticado pode alterar (dono ou ADMIN).
export async function perfilGerenciavel(req) {
  const cuidadorId = idParam(req.params.cuidadorId, 'cuidadorId')
  const perfil = await queryUm('SELECT usuario_id FROM perfis_cuidadores WHERE usuario_id = $1', [cuidadorId])
  if (!perfil) throw naoEncontrado('Cuidador')
  exigirDonoOuAdmin(req.usuario, cuidadorId)
  return cuidadorId
}
