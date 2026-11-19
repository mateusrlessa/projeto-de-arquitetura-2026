import { Router } from 'express'
import { config } from '../config.js'
import { query, queryUm } from '../db/index.js'
import { autenticar, autenticarOpcional, ehAdmin, permitir } from '../middlewares/auth.js'
import {
  avaliacaoParcialSchema,
  avaliacaoSchema,
  criarAvaliacaoSchema,
  filtrosAvaliacoesSchema,
  minhaAvaliacaoQuerySchema,
  respostaSchema,
  statusAvaliacaoSchema,
} from '../schemas/cuidadores.js'
import { statusRegistroSchema } from '../schemas/comum.js'
import { AppError, naoEncontrado, proibido } from '../utils/erros.js'
import { perfilVisivel } from '../utils/perfis.js'
import { atualizar, idParam, paginado } from '../utils/sql.js'

const SELECT_AVALIACAO = `
  SELECT a.id, a.contratacao_id, a.cuidador_id, a.contratante_id, u.nome_completo AS contratante_nome,
    a.nota, a.comentario, a.status, a.criado_em, a.atualizado_em,
    a.criado_em + make_interval(mins => ${config.avaliacaoEdicaoMinutos}) AS editavel_ate,
    CURRENT_TIMESTAMP < a.criado_em + make_interval(mins => ${config.avaliacaoEdicaoMinutos}) AS dentro_do_prazo,
    -- Segundos que faltam, medidos pelo relógio do banco: o contador da tela não depende do relógio do usuário.
    GREATEST(0, CEIL(EXTRACT(EPOCH FROM a.criado_em + make_interval(mins => ${config.avaliacaoEdicaoMinutos}) - CURRENT_TIMESTAMP)))::int AS segundos_para_editar,
    CASE WHEN r.id IS NULL THEN NULL ELSE json_build_object(
      'id', r.id, 'resposta', r.resposta, 'criado_em', r.criado_em, 'atualizado_em', r.atualizado_em
    ) END AS resposta
  FROM avaliacoes_cuidadores a
  INNER JOIN usuarios u ON u.id = a.contratante_id
  LEFT JOIN respostas_avaliacoes r ON r.avaliacao_id = a.id AND r.status = 'ATIVO'`

const ehAutor = (usuario, avaliacao) => usuario?.id === avaliacao.contratante_id

// Avaliacoes nao publicadas so aparecem para o autor, o cuidador avaliado ou ADMIN.
function podeVer(usuario, avaliacao) {
  return (
    avaliacao.status === 'PUBLICADA' ||
    ehAdmin(usuario) ||
    ehAutor(usuario, avaliacao) ||
    usuario?.id === avaliacao.cuidador_id
  )
}

async function buscarAvaliacao(avaliacaoId, cuidadorId) {
  const params = [avaliacaoId]
  const filtroCuidador = cuidadorId ? `AND a.cuidador_id = $${params.push(cuidadorId)}` : ''
  const avaliacao = await queryUm(`${SELECT_AVALIACAO} WHERE a.id = $1 ${filtroCuidador}`, params)
  if (!avaliacao) throw naoEncontrado('Avaliação')
  return avaliacao
}

const avaliacaoDoContratante = (contratanteId, cuidadorId, contratacaoId) =>
  contratacaoId
    ? queryUm(
        `${SELECT_AVALIACAO}
         WHERE a.contratante_id = $1 AND a.cuidador_id = $2 AND a.contratacao_id = $3`,
        [contratanteId, cuidadorId, contratacaoId],
      )
    : queryUm(
        `${SELECT_AVALIACAO}
         WHERE a.contratante_id = $1 AND a.cuidador_id = $2
           AND a.contratacao_id IS NULL AND a.status <> 'INATIVA'
         ORDER BY a.criado_em DESC LIMIT 1`,
        [contratanteId, cuidadorId],
      )

// ============================================================
// /cuidadores/:cuidadorId/avaliacoes
// ============================================================

const router = Router({ mergeParams: true })

router.get('/', autenticarOpcional, async (req, res) => {
  const cuidadorId = await perfilVisivel(req)
  const f = filtrosAvaliacoesSchema.parse(req.query)
  const coluna = f.ordenar === 'nota' ? 'a.nota' : 'a.criado_em'
  const direcao = f.ordem === 'asc' ? 'ASC' : 'DESC'

  const where = "WHERE a.cuidador_id = $1 AND a.status = 'PUBLICADA'"
  const { total } = await queryUm(`SELECT COUNT(*) AS total FROM avaliacoes_cuidadores a ${where}`, [cuidadorId])
  const { rows } = await query(
    `${SELECT_AVALIACAO} ${where} ORDER BY ${coluna} ${direcao}, a.id DESC LIMIT $2 OFFSET $3`,
    [cuidadorId, f.limite, (f.pagina - 1) * f.limite],
  )
  res.json(paginado(rows, total, f))
})

// Precisa vir antes de /:avaliacaoId.
router.get('/resumo', autenticarOpcional, async (req, res) => {
  const cuidadorId = await perfilVisivel(req)
  const resumo = await queryUm(
    `SELECT ROUND(AVG(nota), 2)::float8 AS nota_media,
       COUNT(*) AS total_avaliacoes,
       COUNT(*) FILTER (WHERE nota = 1) AS nota_1,
       COUNT(*) FILTER (WHERE nota = 2) AS nota_2,
       COUNT(*) FILTER (WHERE nota = 3) AS nota_3,
       COUNT(*) FILTER (WHERE nota = 4) AS nota_4,
       COUNT(*) FILTER (WHERE nota = 5) AS nota_5
     FROM avaliacoes_cuidadores
     WHERE cuidador_id = $1 AND status = 'PUBLICADA'`,
    [cuidadorId],
  )
  res.json({
    cuidador_id: cuidadorId,
    nota_media: resumo.nota_media,
    total_avaliacoes: resumo.total_avaliacoes,
    por_nota: { 1: resumo.nota_1, 2: resumo.nota_2, 3: resumo.nota_3, 4: resumo.nota_4, 5: resumo.nota_5 },
  })
})

// Consulta a avaliação de uma contratação específica ou, sem ID, a avaliação histórica sem serviço.
router.get('/minha', autenticar, permitir('CONTRATANTE'), async (req, res) => {
  const cuidadorId = await perfilVisivel(req)
  const { contratacao_id: contratacaoId } = minhaAvaliacaoQuerySchema.parse(req.query)

  if (contratacaoId) {
    const contratacao = await queryUm(
      `SELECT id FROM contratacoes
       WHERE id = $1 AND contratante_id = $2 AND cuidador_id = $3`,
      [contratacaoId, req.usuario.id, cuidadorId],
    )
    if (!contratacao) throw naoEncontrado('Contratação')
  }

  res.json(await avaliacaoDoContratante(req.usuario.id, cuidadorId, contratacaoId))
})

router.get('/:avaliacaoId', autenticarOpcional, async (req, res) => {
  const cuidadorId = await perfilVisivel(req)
  const avaliacao = await buscarAvaliacao(idParam(req.params.avaliacaoId, 'avaliacaoId'), cuidadorId)
  if (!podeVer(req.usuario, avaliacao)) throw naoEncontrado('Avaliação')
  res.json(avaliacao)
})

router.post('/', autenticar, permitir('CONTRATANTE'), async (req, res) => {
  const cuidadorId = await perfilVisivel(req)
  const { contratacao_id: contratacaoId, nota, comentario } = criarAvaliacaoSchema.parse(req.body)
  const contratacao = await queryUm(
    `SELECT contratante_id, cuidador_id, status
     FROM contratacoes WHERE id = $1`,
    [contratacaoId],
  )
  if (!contratacao) throw naoEncontrado('Contratação')
  if (contratacao.contratante_id !== req.usuario.id) {
    throw proibido('Somente o contratante da contratação pode avaliá-la')
  }
  if (contratacao.cuidador_id !== cuidadorId) {
    throw new AppError(400, 'A contratação não corresponde ao cuidador informado')
  }
  if (contratacao.status !== 'CONCLUIDA') {
    throw new AppError(409, 'A contratação precisa estar concluída para receber uma avaliação')
  }

  const criada = await queryUm(
    `INSERT INTO avaliacoes_cuidadores (contratacao_id, contratante_id, cuidador_id, nota, comentario)
     SELECT c.id, c.contratante_id, c.cuidador_id, $4, $5
     FROM contratacoes c
     WHERE c.id = $1 AND c.contratante_id = $2 AND c.cuidador_id = $3 AND c.status = 'CONCLUIDA'
     ON CONFLICT (contratacao_id) WHERE contratacao_id IS NOT NULL DO NOTHING
     RETURNING id`,
    [contratacaoId, req.usuario.id, cuidadorId, nota, comentario],
  )
  if (!criada) throw new AppError(409, 'Esta contratação já possui uma avaliação')

  res.status(201).json(await buscarAvaliacao(criada.id))
})

// Alteracoes permitidas somente ao contratante autor da avaliacao e, por pouco tempo, depois do envio.
// Fora do prazo so um ADMIN remove o comentario (DELETE /moderacao/avaliacoes/:id).
async function alterarAvaliacao(req, res, dados, { exclusao = false } = {}) {
  const cuidadorId = idParam(req.params.cuidadorId, 'cuidadorId')
  const avaliacao = await buscarAvaliacao(idParam(req.params.avaliacaoId, 'avaliacaoId'), cuidadorId)
  if (avaliacao.status === 'INATIVA') throw naoEncontrado('Avaliação')
  if (!ehAutor(req.usuario, avaliacao)) throw proibido('Somente o autor pode alterar esta avaliação')

  if (!avaliacao.dentro_do_prazo) {
    throw proibido(
      `O prazo de ${config.avaliacaoEdicaoMinutos} ${config.avaliacaoEdicaoMinutos === 1 ? 'minuto' : 'minutos'} para ${exclusao ? 'excluir' : 'editar'} esta avaliação terminou`,
    )
  }
  if (!exclusao && avaliacao.resposta) {
    throw proibido('Esta avaliação já foi respondida pelo cuidador e não pode mais ser editada')
  }

  if (exclusao) {
    await atualizar('avaliacoes_cuidadores', { status: 'INATIVA' }, { id: avaliacao.id })
    return res.status(204).end()
  }
  await atualizar('avaliacoes_cuidadores', dados, { id: avaliacao.id })
  res.json(await buscarAvaliacao(avaliacao.id))
}

router.put('/:avaliacaoId', autenticar, permitir('CONTRATANTE'), (req, res) => alterarAvaliacao(req, res, avaliacaoSchema.parse(req.body)))
router.patch('/:avaliacaoId', autenticar, permitir('CONTRATANTE'), (req, res) =>
  alterarAvaliacao(req, res, avaliacaoParcialSchema.parse(req.body)),
)

// Exclusão lógica: a contratação continua reservada para esta avaliação.
router.delete('/:avaliacaoId', autenticar, permitir('CONTRATANTE'), (req, res) =>
  alterarAvaliacao(req, res, null, { exclusao: true }),
)

export default router

// ============================================================
// /avaliacoes/:avaliacaoId (status e resposta do cuidador)
// ============================================================

export const avaliacoesGeraisRouter = Router()

avaliacoesGeraisRouter.patch('/:avaliacaoId/status', autenticar, permitir('ADMIN'), async (req, res) => {
  const id = idParam(req.params.avaliacaoId, 'avaliacaoId')
  const { status } = statusAvaliacaoSchema.parse(req.body)
  if (!(await atualizar('avaliacoes_cuidadores', { status }, { id }))) throw naoEncontrado('Avaliação')
  res.json(await buscarAvaliacao(id))
})

const buscarResposta = (avaliacaoId) =>
  queryUm('SELECT * FROM respostas_avaliacoes WHERE avaliacao_id = $1', [avaliacaoId])

// Carrega a avaliacao e garante que o usuario e o cuidador avaliado.
async function avaliacaoDoCuidador(req) {
  const avaliacao = await buscarAvaliacao(idParam(req.params.avaliacaoId, 'avaliacaoId'))
  if (avaliacao.status === 'INATIVA') throw naoEncontrado('Avaliação')
  if (req.usuario.id !== avaliacao.cuidador_id) throw proibido('Somente o cuidador avaliado pode responder')
  return avaliacao
}

avaliacoesGeraisRouter.get('/:avaliacaoId/resposta', autenticarOpcional, async (req, res) => {
  const avaliacao = await buscarAvaliacao(idParam(req.params.avaliacaoId, 'avaliacaoId'))
  if (!podeVer(req.usuario, avaliacao)) throw naoEncontrado('Avaliação')

  const resposta = await buscarResposta(avaliacao.id)
  const gerencia = ehAdmin(req.usuario) || req.usuario?.id === avaliacao.cuidador_id
  if (!resposta || (resposta.status !== 'ATIVO' && !gerencia)) throw naoEncontrado('Resposta')
  res.json(resposta)
})

avaliacoesGeraisRouter.post('/:avaliacaoId/resposta', autenticar, permitir('CUIDADOR'), async (req, res) => {
  const avaliacao = await avaliacaoDoCuidador(req)
  const { resposta } = respostaSchema.parse(req.body)

  const existente = await buscarResposta(avaliacao.id)
  if (existente) {
    throw new AppError(
      409,
      existente.status === 'ATIVO'
        ? 'Essa avaliação já possui resposta'
        : 'Essa avaliação tem uma resposta inativa; use PUT para reativá-la',
    )
  }

  res
    .status(201)
    .json(
      await queryUm('INSERT INTO respostas_avaliacoes (avaliacao_id, resposta) VALUES ($1, $2) RETURNING *', [
        avaliacao.id,
        resposta,
      ]),
    )
})

// PUT tambem reativa uma resposta INATIVO.
avaliacoesGeraisRouter.put('/:avaliacaoId/resposta', autenticar, permitir('CUIDADOR'), async (req, res) => {
  const avaliacao = await avaliacaoDoCuidador(req)
  const { resposta } = respostaSchema.parse(req.body)

  const atualizada = await atualizar('respostas_avaliacoes', { resposta, status: 'ATIVO' }, { avaliacao_id: avaliacao.id })
  if (!atualizada) throw naoEncontrado('Resposta')
  res.json(atualizada)
})

avaliacoesGeraisRouter.patch('/:avaliacaoId/resposta', autenticar, permitir('CUIDADOR'), async (req, res) => {
  const avaliacao = await avaliacaoDoCuidador(req)
  const { resposta } = respostaSchema.parse(req.body)

  const existente = await buscarResposta(avaliacao.id)
  if (!existente || existente.status !== 'ATIVO') throw naoEncontrado('Resposta')
  res.json(await atualizar('respostas_avaliacoes', { resposta }, { id: existente.id }))
})

avaliacoesGeraisRouter.patch('/:avaliacaoId/resposta/status', autenticar, permitir('ADMIN'), async (req, res) => {
  const id = idParam(req.params.avaliacaoId, 'avaliacaoId')
  const { status } = statusRegistroSchema.parse(req.body)
  const resposta = await atualizar('respostas_avaliacoes', { status }, { avaliacao_id: id })
  if (!resposta) throw naoEncontrado('Resposta')
  res.json(resposta)
})

// Exclusao logica: a resposta passa para INATIVO.
avaliacoesGeraisRouter.delete('/:avaliacaoId/resposta', autenticar, permitir('CUIDADOR'), async (req, res) => {
  const avaliacao = await avaliacaoDoCuidador(req)
  const existente = await buscarResposta(avaliacao.id)
  if (!existente || existente.status !== 'ATIVO') throw naoEncontrado('Resposta')
  res.json(await atualizar('respostas_avaliacoes', { status: 'INATIVO' }, { id: existente.id }))
})
