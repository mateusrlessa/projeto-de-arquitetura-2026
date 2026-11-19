import { Router } from 'express'
import { query, queryUm } from '../db/index.js'
import { autenticar, permitir } from '../middlewares/auth.js'
import { criarContratacaoSchema, filtrosContratacoesSchema, termoContratacaoSchema } from '../schemas/contratacoes.js'
import { AppError, naoEncontrado } from '../utils/erros.js'
import { idParam, paginado } from '../utils/sql.js'
import { gerarTermoContratacao, TERMO_CONTRATACAO_VERSAO } from '../utils/termoContratacao.js'

const router = Router()
const somenteParticipantes = [autenticar, permitir('CONTRATANTE', 'CUIDADOR')]

const SELECT_CONTRATACAO = `
  SELECT c.*, uc.nome_completo AS contratante_nome, ucu.nome_completo AS cuidador_nome,
    a.id AS avaliacao_id, a.status AS avaliacao_status
  FROM contratacoes c
  INNER JOIN usuarios uc ON uc.id = c.contratante_id
  INNER JOIN usuarios ucu ON ucu.id = c.cuidador_id
  LEFT JOIN avaliacoes_cuidadores a ON a.contratacao_id = c.id`

const SELECT_LISTA = `
  SELECT c.id, c.contratante_id, c.cuidador_id,
    uc.nome_completo AS contratante_nome, ucu.nome_completo AS cuidador_nome,
    c.termo_versao, c.termo_gerado_em,
    c.contratante_confirmado_em, c.cuidador_confirmado_em,
    c.cuidador_informou_realizacao_em, c.contratante_confirmou_realizacao_em,
    c.status, c.criado_em, c.atualizado_em,
    a.id AS avaliacao_id, a.status AS avaliacao_status
  FROM contratacoes c
  INNER JOIN usuarios uc ON uc.id = c.contratante_id
  INNER JOIN usuarios ucu ON ucu.id = c.cuidador_id
  LEFT JOIN avaliacoes_cuidadores a ON a.contratacao_id = c.id`

function filtroParticipante(usuario) {
  return usuario.tipo_usuario === 'CONTRATANTE' ? 'contratante_id' : 'cuidador_id'
}

async function buscarContratacao(id, usuario) {
  const coluna = filtroParticipante(usuario)
  const contratacao = await queryUm(
    `${SELECT_CONTRATACAO} WHERE c.id = $1 AND c.${coluna} = $2`,
    [id, usuario.id],
  )
  if (!contratacao) throw naoEncontrado('Contratação')
  return contratacao
}

async function buscarPartes(contratanteId, cuidadorId) {
  return queryUm(
    `SELECT contratante.nome_completo AS contratante_nome, cuidador.nome_completo AS cuidador_nome
     FROM usuarios contratante
     INNER JOIN perfis_cuidadores perfil ON perfil.usuario_id = $2
     INNER JOIN usuarios cuidador ON cuidador.id = perfil.usuario_id
     WHERE contratante.id = $1
       AND contratante.tipo_usuario = 'CONTRATANTE'
       AND contratante.status = 'ATIVO'
       AND cuidador.tipo_usuario = 'CUIDADOR'
       AND cuidador.status = 'ATIVO'
       AND perfil.status = 'ATIVO'
       AND contratante.id <> cuidador.id`,
    [contratanteId, cuidadorId],
  )
}

router.get('/termo', autenticar, permitir('CONTRATANTE'), async (req, res) => {
  const { cuidador_id: cuidadorId } = termoContratacaoSchema.parse(req.query)
  const partes = await buscarPartes(req.usuario.id, cuidadorId)
  if (!partes) throw naoEncontrado('Cuidador ativo')

  const geradoEm = new Date()
  res.json({
    termo_conteudo: gerarTermoContratacao({
      contratante: partes.contratante_nome,
      cuidador: partes.cuidador_nome,
      geradoEm,
    }),
    termo_versao: TERMO_CONTRATACAO_VERSAO,
    termo_gerado_em: geradoEm,
  })
})

router.post('/', autenticar, permitir('CONTRATANTE'), async (req, res) => {
  const { cuidador_id: cuidadorId } = criarContratacaoSchema.parse(req.body)
  const partes = await buscarPartes(req.usuario.id, cuidadorId)
  if (!partes) throw naoEncontrado('Cuidador ativo')

  const geradoEm = new Date()
  const termo = gerarTermoContratacao({
    contratante: partes.contratante_nome,
    cuidador: partes.cuidador_nome,
    geradoEm,
  })

  const criada = await queryUm(
    `INSERT INTO contratacoes (
       contratante_id, cuidador_id, termo_conteudo, termo_versao, termo_gerado_em,
       contratante_confirmado_em, status, criado_em, atualizado_em
     )
     SELECT $1, $2, $3, $4, $5, $5, 'AGUARDANDO_CONFIRMACAO_CUIDADOR', $5, $5
     WHERE EXISTS (
       SELECT 1
       FROM usuarios contratante
       INNER JOIN perfis_cuidadores perfil ON perfil.usuario_id = $2
       INNER JOIN usuarios cuidador ON cuidador.id = perfil.usuario_id
       WHERE contratante.id = $1
         AND contratante.tipo_usuario = 'CONTRATANTE'
         AND contratante.status = 'ATIVO'
         AND cuidador.tipo_usuario = 'CUIDADOR'
         AND cuidador.status = 'ATIVO'
         AND perfil.status = 'ATIVO'
         AND contratante.id <> cuidador.id
     )
     RETURNING id`,
    [req.usuario.id, cuidadorId, termo, TERMO_CONTRATACAO_VERSAO, geradoEm],
  )
  if (!criada) throw naoEncontrado('Cuidador ativo')

  res.status(201).json(await queryUm(`${SELECT_CONTRATACAO} WHERE c.id = $1`, [criada.id]))
})

router.get('/', somenteParticipantes, async (req, res) => {
  const filtros = filtrosContratacoesSchema.parse(req.query)
  const coluna = filtroParticipante(req.usuario)
  const parametros = [req.usuario.id]
  const condicoes = [`c.${coluna} = $1`]
  if (filtros.status) condicoes.push(`c.status = $${parametros.push(filtros.status)}`)
  const where = `WHERE ${condicoes.join(' AND ')}`

  const { total } = await queryUm(`SELECT COUNT(*) AS total FROM contratacoes c ${where}`, parametros)
  const { rows } = await query(
    `${SELECT_LISTA} ${where}
     ORDER BY c.criado_em DESC, c.id DESC
     LIMIT $${parametros.length + 1} OFFSET $${parametros.length + 2}`,
    [...parametros, filtros.limite, (filtros.pagina - 1) * filtros.limite],
  )
  res.json(paginado(rows, total, filtros))
})

router.get('/:contratacaoId', somenteParticipantes, async (req, res) => {
  const id = idParam(req.params.contratacaoId, 'contratacaoId')
  res.json(await buscarContratacao(id, req.usuario))
})

async function executarTransicao(req, res, { coluna, condicao, atualizacao, mensagem }) {
  const id = idParam(req.params.contratacaoId, 'contratacaoId')
  await buscarContratacao(id, req.usuario)

  const atualizada = await queryUm(
    `UPDATE contratacoes
     SET ${atualizacao}, atualizado_em = CURRENT_TIMESTAMP
     WHERE id = $1 AND ${coluna} = $2 AND ${condicao}
     RETURNING id`,
    [id, req.usuario.id],
  )
  if (!atualizada) throw new AppError(409, mensagem)

  res.json(await buscarContratacao(id, req.usuario))
}

router.patch('/:contratacaoId/confirmacao', autenticar, permitir('CUIDADOR'), async (req, res) =>
  executarTransicao(req, res, {
    coluna: 'cuidador_id',
    condicao: "status = 'AGUARDANDO_CONFIRMACAO_CUIDADOR' AND cuidador_confirmado_em IS NULL",
    atualizacao: "cuidador_confirmado_em = CURRENT_TIMESTAMP, status = 'CONFIRMADA'",
    mensagem: 'A contratação já foi confirmada ou não está aguardando confirmação do cuidador',
  }),
)

router.patch('/:contratacaoId/realizacao', autenticar, permitir('CUIDADOR'), async (req, res) =>
  executarTransicao(req, res, {
    coluna: 'cuidador_id',
    condicao: "status = 'CONFIRMADA' AND cuidador_informou_realizacao_em IS NULL",
    atualizacao: "cuidador_informou_realizacao_em = CURRENT_TIMESTAMP, status = 'AGUARDANDO_CONFIRMACAO_CONTRATANTE'",
    mensagem: 'A contratação precisa estar confirmada e ainda não pode ter realização informada',
  }),
)

router.patch('/:contratacaoId/confirmacao-realizacao', autenticar, permitir('CONTRATANTE'), async (req, res) =>
  executarTransicao(req, res, {
    coluna: 'contratante_id',
    condicao: "status = 'AGUARDANDO_CONFIRMACAO_CONTRATANTE' AND contratante_confirmou_realizacao_em IS NULL",
    atualizacao: "contratante_confirmou_realizacao_em = CURRENT_TIMESTAMP, status = 'CONCLUIDA'",
    mensagem: 'A realização ainda não foi informada pelo cuidador ou a contratação já foi concluída',
  }),
)

export default router
