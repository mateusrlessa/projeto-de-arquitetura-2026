import { Router } from 'express'
import { query, queryUm } from '../db/index.js'
import { autenticar, permitir } from '../middlewares/auth.js'
import { cidadeParcialSchema, cidadeSchema, filtrosCidadesSchema } from '../schemas/catalogos.js'
import { statusRegistroSchema } from '../schemas/comum.js'
import { naoEncontrado } from '../utils/erros.js'
import { atualizar, idParam, paginado } from '../utils/sql.js'

const router = Router()
const somenteAdmin = [autenticar, permitir('ADMIN')]

const SELECT_CIDADE = `
  SELECT c.*, e.nome AS estado_nome, c.nome || ' - ' || c.uf AS cidade_estado
  FROM cidades c
  INNER JOIN estados e ON e.uf = c.uf`

async function buscarCidade(id) {
  const cidade = await queryUm(`${SELECT_CIDADE} WHERE c.id = $1`, [id])
  if (!cidade) throw naoEncontrado('Cidade')
  return cidade
}

router.get('/', async (req, res) => {
  const filtros = filtrosCidadesSchema.parse(req.query)
  const condicoes = []
  const params = []

  if (filtros.nome) condicoes.push(`c.nome ILIKE $${params.push(`%${filtros.nome}%`)}`)
  if (filtros.uf) condicoes.push(`c.uf = $${params.push(filtros.uf)}`)
  if (filtros.status) condicoes.push(`c.status = $${params.push(filtros.status)}`)
  const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : ''

  const { total } = await queryUm(`SELECT COUNT(*) AS total FROM cidades c ${where}`, params)
  const { rows } = await query(
    `${SELECT_CIDADE} ${where}
     ORDER BY c.nome, c.uf LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, filtros.limite, (filtros.pagina - 1) * filtros.limite],
  )
  res.json(paginado(rows, total, filtros))
})

router.get('/:cidadeId', async (req, res) => {
  res.json(await buscarCidade(idParam(req.params.cidadeId, 'cidadeId')))
})

router.post('/', somenteAdmin, async (req, res) => {
  const { codigo_ibge, nome, uf } = cidadeSchema.parse(req.body)
  const { id } = await queryUm('INSERT INTO cidades (codigo_ibge, nome, uf) VALUES ($1, $2, $3) RETURNING id', [
    codigo_ibge,
    nome,
    uf,
  ])
  res.status(201).json(await buscarCidade(id))
})

async function atualizarCidade(req, res, schema) {
  const id = idParam(req.params.cidadeId, 'cidadeId')
  if (!(await atualizar('cidades', schema.parse(req.body), { id }))) throw naoEncontrado('Cidade')
  res.json(await buscarCidade(id))
}

router.put('/:cidadeId', somenteAdmin, (req, res) => atualizarCidade(req, res, cidadeSchema))
router.patch('/:cidadeId', somenteAdmin, (req, res) => atualizarCidade(req, res, cidadeParcialSchema))
router.patch('/:cidadeId/status', somenteAdmin, (req, res) => atualizarCidade(req, res, statusRegistroSchema))

// Exclusao logica: a cidade passa para INATIVO.
router.delete('/:cidadeId', somenteAdmin, async (req, res) => {
  const id = idParam(req.params.cidadeId, 'cidadeId')
  if (!(await atualizar('cidades', { status: 'INATIVO' }, { id }))) throw naoEncontrado('Cidade')
  res.json(await buscarCidade(id))
})

export default router
