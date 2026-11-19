import { Router } from 'express'
import { query, queryUm } from '../db/index.js'
import { autenticar, permitir } from '../middlewares/auth.js'
import {
  atualizarEstadoParcialSchema,
  atualizarEstadoSchema,
  criarEstadoSchema,
  filtrosEstadosSchema,
  uf as ufSchema,
} from '../schemas/catalogos.js'
import { statusRegistroSchema } from '../schemas/comum.js'
import { naoEncontrado } from '../utils/erros.js'
import { atualizar } from '../utils/sql.js'

const router = Router()
const somenteAdmin = [autenticar, permitir('ADMIN')]

router.get('/', async (req, res) => {
  const { status } = filtrosEstadosSchema.parse(req.query)
  const { rows } = await query(
    `SELECT * FROM estados ${status ? 'WHERE status = $1' : ''} ORDER BY nome`,
    status ? [status] : [],
  )
  res.json(rows)
})

router.get('/:uf', async (req, res) => {
  const estado = await queryUm('SELECT * FROM estados WHERE uf = $1', [ufSchema.parse(req.params.uf)])
  if (!estado) throw naoEncontrado('Estado')
  res.json(estado)
})

router.post('/', somenteAdmin, async (req, res) => {
  const { uf, nome } = criarEstadoSchema.parse(req.body)
  res.status(201).json(await queryUm('INSERT INTO estados (uf, nome) VALUES ($1, $2) RETURNING *', [uf, nome]))
})

async function atualizarEstado(req, res, schema) {
  const estado = await atualizar('estados', schema.parse(req.body), { uf: ufSchema.parse(req.params.uf) })
  if (!estado) throw naoEncontrado('Estado')
  res.json(estado)
}

router.put('/:uf', somenteAdmin, (req, res) => atualizarEstado(req, res, atualizarEstadoSchema))
router.patch('/:uf', somenteAdmin, (req, res) => atualizarEstado(req, res, atualizarEstadoParcialSchema))
router.patch('/:uf/status', somenteAdmin, (req, res) => atualizarEstado(req, res, statusRegistroSchema))

// Exclusao logica: o estado passa para INATIVO.
router.delete('/:uf', somenteAdmin, async (req, res) => {
  const estado = await atualizar('estados', { status: 'INATIVO' }, { uf: ufSchema.parse(req.params.uf) })
  if (!estado) throw naoEncontrado('Estado')
  res.json(estado)
})

export default router
