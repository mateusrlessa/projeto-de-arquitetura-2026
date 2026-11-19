import { Router } from 'express'
import { query, queryUm } from '../db/index.js'
import { autenticar, permitir } from '../middlewares/auth.js'
import { limiteDenuncia } from '../middlewares/limites.js'
import { decisaoSchema, denunciaSchema, filtrosModeracaoSchema } from '../schemas/moderacao.js'
import { AppError, naoEncontrado } from '../utils/erros.js'
import { apagarAvaliacao } from '../utils/avaliacoes.js'
import { idParam, paginado } from '../utils/sql.js'

const router = Router()

const JUNTAS = 'JOIN usuarios uc ON uc.id = a.contratante_id JOIN usuarios ucu ON ucu.id = a.cuidador_id'

// Qualquer usuário logado denuncia um comentário publicado, menos o próprio autor.
router.post('/avaliacoes/:avaliacaoId/denuncias', autenticar, limiteDenuncia, async (req, res) => {
  const id = idParam(req.params.avaliacaoId, 'avaliacaoId')
  const { motivo, detalhe } = denunciaSchema.parse(req.body)

  const avaliacao = await queryUm('SELECT id, contratante_id, status FROM avaliacoes_cuidadores WHERE id = $1', [id])
  if (!avaliacao || avaliacao.status !== 'PUBLICADA') throw naoEncontrado('Avaliação')
  if (avaliacao.contratante_id === req.usuario.id) throw new AppError(403, 'Você não pode denunciar o seu próprio comentário')
  if (req.usuario.tipo_usuario === 'ADMIN') throw new AppError(403, 'Administradores ocultam o comentário diretamente')

  const criada = await queryUm(
    `INSERT INTO denuncias_avaliacoes (avaliacao_id, denunciante_id, motivo, detalhe)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (avaliacao_id, denunciante_id) DO NOTHING
     RETURNING id, avaliacao_id, motivo, status, criado_em`,
    [id, req.usuario.id, motivo, detalhe || null],
  )
  if (!criada) throw new AppError(409, 'Você já denunciou este comentário')
  res.status(201).json(criada)
})

// Fila do admin: comentários com denúncia aberta ou comentários já ocultados.
router.get('/moderacao/avaliacoes', autenticar, permitir('ADMIN'), async (req, res) => {
  const filtros = filtrosModeracaoSchema.parse(req.query)
  const deslocamento = (filtros.pagina - 1) * filtros.limite
  const denunciadas = filtros.situacao === 'DENUNCIADAS'

  const base = denunciadas
    ? `FROM avaliacoes_cuidadores a ${JUNTAS} WHERE a.status = 'PUBLICADA'
       AND EXISTS (SELECT 1 FROM denuncias_avaliacoes d WHERE d.avaliacao_id = a.id AND d.status = 'ABERTA')`
    : `FROM avaliacoes_cuidadores a ${JUNTAS} WHERE a.status = 'OCULTA'`

  const { total } = await queryUm(`SELECT COUNT(*)::int AS total ${base}`)
  const { rows } = await query(
    `SELECT a.id, a.nota, a.comentario, a.status, a.criado_em, a.atualizado_em, a.cuidador_id, a.contratante_id,
       uc.nome_completo AS contratante_nome, ucu.nome_completo AS cuidador_nome,
       (SELECT COUNT(*)::int FROM denuncias_avaliacoes d WHERE d.avaliacao_id = a.id AND d.status = 'ABERTA') AS total_denuncias,
       (SELECT MAX(d.criado_em) FROM denuncias_avaliacoes d WHERE d.avaliacao_id = a.id AND d.status = 'ABERTA') AS ultima_denuncia_em,
       COALESCE((SELECT json_agg(x ORDER BY x.quantidade DESC) FROM (
         SELECT d.motivo, COUNT(*)::int AS quantidade FROM denuncias_avaliacoes d
         WHERE d.avaliacao_id = a.id AND d.status = 'ABERTA' GROUP BY d.motivo) x), '[]'::json) AS motivos,
       COALESCE((SELECT json_agg(y ORDER BY y.criado_em) FROM (
         SELECT du.nome_completo AS denunciante, d.motivo, d.detalhe, d.criado_em FROM denuncias_avaliacoes d
         JOIN usuarios du ON du.id = d.denunciante_id
         WHERE d.avaliacao_id = a.id AND d.status = 'ABERTA' AND d.detalhe IS NOT NULL) y), '[]'::json) AS detalhes
     ${base}
     ORDER BY ${denunciadas ? 'ultima_denuncia_em DESC' : 'a.atualizado_em DESC'}, a.id DESC
     LIMIT $1 OFFSET $2`,
    [filtros.limite, deslocamento],
  )
  res.json(paginado(rows, total, filtros))
})

// Números do selo no menu do admin.
router.get('/moderacao/resumo', autenticar, permitir('ADMIN'), async (req, res) => {
  res.json(
    await queryUm(
      `SELECT
         (SELECT COUNT(DISTINCT d.avaliacao_id)::int FROM denuncias_avaliacoes d
            JOIN avaliacoes_cuidadores a ON a.id = d.avaliacao_id
           WHERE d.status = 'ABERTA' AND a.status = 'PUBLICADA') AS denunciadas,
         (SELECT COUNT(*)::int FROM avaliacoes_cuidadores WHERE status = 'OCULTA') AS ocultas`,
    ),
  )
})

// OCULTAR esconde o comentário e marca as denúncias como procedentes; MANTER descarta as denúncias abertas.
router.post('/moderacao/avaliacoes/:avaliacaoId/decisao', autenticar, permitir('ADMIN'), async (req, res) => {
  const id = idParam(req.params.avaliacaoId, 'avaliacaoId')
  const { decisao } = decisaoSchema.parse(req.body)
  const ocultar = decisao === 'OCULTAR'

  const resultado = await queryUm(
    `WITH alvo AS (SELECT id FROM avaliacoes_cuidadores WHERE id = $1),
     ocultada AS (
       UPDATE avaliacoes_cuidadores SET status = 'OCULTA', atualizado_em = CURRENT_TIMESTAMP
       WHERE id = $1 AND $3::boolean AND status = 'PUBLICADA' RETURNING id),
     resolvidas AS (
       UPDATE denuncias_avaliacoes SET status = $4, resolvida_por = $2, resolvida_em = CURRENT_TIMESTAMP
       WHERE avaliacao_id = $1 AND status = 'ABERTA' RETURNING id)
     SELECT (SELECT COUNT(*) FROM alvo)::int AS existe, (SELECT COUNT(*) FROM resolvidas)::int AS denuncias_resolvidas`,
    [id, req.usuario.id, ocultar, ocultar ? 'PROCEDENTE' : 'IMPROCEDENTE'],
  )
  if (!resultado.existe) throw naoEncontrado('Avaliação')
  res.json({ avaliacao_id: id, decisao, denuncias_resolvidas: resultado.denuncias_resolvidas })
})

// Avaliações de serviços ficam inativas para preservar o vínculo único; avaliações históricas são apagadas.
router.delete('/moderacao/avaliacoes/:avaliacaoId', autenticar, permitir('ADMIN'), async (req, res) => {
  const id = idParam(req.params.avaliacaoId, 'avaliacaoId')
  const avaliacao = await queryUm('SELECT contratacao_id FROM avaliacoes_cuidadores WHERE id = $1', [id])
  if (!avaliacao) throw naoEncontrado('Avaliação')

  if (avaliacao.contratacao_id) {
    await queryUm(
      `UPDATE avaliacoes_cuidadores
       SET status = 'INATIVA', atualizado_em = CURRENT_TIMESTAMP
       WHERE id = $1 RETURNING id`,
      [id],
    )
  } else if (!(await apagarAvaliacao(id))) {
    throw naoEncontrado('Avaliação')
  }
  res.status(204).end()
})

export default router
