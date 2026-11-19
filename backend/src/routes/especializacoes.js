import { Router } from 'express'
import { query, queryUm } from '../db/index.js'
import { autenticar, permitir } from '../middlewares/auth.js'
import {
  especializacaoParcialSchema,
  especializacaoSchema,
  filtrosEspecializacoesSchema,
} from '../schemas/catalogos.js'
import { statusRegistroSchema } from '../schemas/comum.js'
import { naoEncontrado } from '../utils/erros.js'
import { atualizar, idParam } from '../utils/sql.js'

const router = Router()
const somenteAdmin = [autenticar, permitir('ADMIN')]

router.get('/', async (req, res) => {
  const { status } = filtrosEspecializacoesSchema.parse(req.query)
  const { rows } = await query(
    `SELECT * FROM especializacoes ${status ? 'WHERE status = $1' : ''} ORDER BY nome`,
    status ? [status] : [],
  )
  res.json(rows)
})

router.get('/:especializacaoId', async (req, res) => {
  const id = idParam(req.params.especializacaoId, 'especializacaoId')
  const especializacao = await queryUm('SELECT * FROM especializacoes WHERE id = $1', [id])
  if (!especializacao) throw naoEncontrado('Especialização')
  res.json(especializacao)
})

router.post('/', somenteAdmin, async (req, res) => {
  const { nome, descricao } = especializacaoSchema.parse(req.body)
  res
    .status(201)
    .json(
      await queryUm('INSERT INTO especializacoes (nome, descricao) VALUES ($1, $2) RETURNING *', [
        nome,
        descricao ?? null,
      ]),
    )
})

async function atualizarEspecializacao(req, res, dados) {
  const id = idParam(req.params.especializacaoId, 'especializacaoId')
  const especializacao = await atualizar('especializacoes', dados, { id })
  if (!especializacao) throw naoEncontrado('Especialização')
  res.json(especializacao)
}

// PUT substitui todos os campos: descricao ausente vira null.
router.put('/:especializacaoId', somenteAdmin, (req, res) => {
  const { nome, descricao } = especializacaoSchema.parse(req.body)
  return atualizarEspecializacao(req, res, { nome, descricao: descricao ?? null })
})
router.patch('/:especializacaoId', somenteAdmin, (req, res) =>
  atualizarEspecializacao(req, res, especializacaoParcialSchema.parse(req.body)),
)
router.patch('/:especializacaoId/status', somenteAdmin, (req, res) =>
  atualizarEspecializacao(req, res, statusRegistroSchema.parse(req.body)),
)

// Exclusao logica: a especializacao passa para INATIVO.
router.delete('/:especializacaoId', somenteAdmin, (req, res) =>
  atualizarEspecializacao(req, res, { status: 'INATIVO' }),
)

export default router
