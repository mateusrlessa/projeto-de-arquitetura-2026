import { Router } from 'express'
import { query, queryUm } from '../db/index.js'
import { autenticar, autenticarOpcional } from '../middlewares/auth.js'
import { statusRegistroSchema } from '../schemas/comum.js'
import { filtroStatusSchema } from '../schemas/cuidadores.js'
import { AppError, naoEncontrado } from '../utils/erros.js'
import { perfilGerenciavel, perfilVisivel, podeGerenciar } from '../utils/perfis.js'
import { atualizar, idParam } from '../utils/sql.js'

// Filtro de status das listagens: o publico ve apenas ATIVO, o dono ou ADMIN escolhe.
function statusDaListagem(req, cuidadorId) {
  const { status } = filtroStatusSchema.parse(req.query)
  return podeGerenciar(req.usuario, cuidadorId) ? status : 'ATIVO'
}

// Rotas de registros proprios do cuidador (formacoes e experiencias):
// listar, consultar, cadastrar, PUT, PATCH, PATCH status e exclusao logica.
export function criarRotasRegistros({ tabela, nome, param, schema, schemaParcial, camposOpcionais = [], ordem }) {
  const router = Router({ mergeParams: true })

  async function buscar(req, cuidadorId, { gerenciar = false } = {}) {
    const id = idParam(req.params[param], param)
    const registro = await queryUm(`SELECT * FROM ${tabela} WHERE id = $1 AND cuidador_id = $2`, [id, cuidadorId])
    const visivel = registro && (registro.status === 'ATIVO' || gerenciar || podeGerenciar(req.usuario, cuidadorId))
    if (!visivel) throw naoEncontrado(nome)
    return registro
  }

  router.get('/', autenticarOpcional, async (req, res) => {
    const cuidadorId = await perfilVisivel(req)
    const status = statusDaListagem(req, cuidadorId)
    const { rows } = await query(
      `SELECT * FROM ${tabela} WHERE cuidador_id = $1 ${status ? 'AND status = $2' : ''} ORDER BY ${ordem}`,
      status ? [cuidadorId, status] : [cuidadorId],
    )
    res.json(rows)
  })

  router.get(`/:${param}`, autenticarOpcional, async (req, res) => {
    res.json(await buscar(req, await perfilVisivel(req)))
  })

  router.post('/', autenticar, async (req, res) => {
    const cuidadorId = await perfilGerenciavel(req)
    const dados = Object.entries(schema.parse(req.body)).filter(([, v]) => v !== undefined)

    const colunas = ['cuidador_id', ...dados.map(([c]) => c)]
    const valores = [cuidadorId, ...dados.map(([, v]) => v)]
    const registro = await queryUm(
      `INSERT INTO ${tabela} (${colunas.join(', ')})
       VALUES (${valores.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
      valores,
    )
    res.status(201).json(registro)
  })

  async function alterar(req, res, dados) {
    const cuidadorId = await perfilGerenciavel(req)
    const { id } = await buscar(req, cuidadorId, { gerenciar: true })
    res.json(await atualizar(tabela, dados, { id }))
  }

  // PUT substitui todos os campos: os opcionais ausentes viram null.
  router.put(`/:${param}`, autenticar, (req, res) => {
    const dados = schema.parse(req.body)
    for (const campo of camposOpcionais) dados[campo] ??= null
    return alterar(req, res, dados)
  })
  router.patch(`/:${param}`, autenticar, (req, res) => alterar(req, res, schemaParcial.parse(req.body)))
  router.patch(`/:${param}/status`, autenticar, (req, res) => alterar(req, res, statusRegistroSchema.parse(req.body)))
  router.delete(`/:${param}`, autenticar, (req, res) => alterar(req, res, { status: 'INATIVO' }))

  return router
}

// Rotas de relacionamento N:N do cuidador (cidades de atuacao e especializacoes):
// PUT adiciona ou reativa o vinculo e DELETE o inativa.
export function criarRotasVinculos({ tabela, coluna, tabelaAlvo, colunasAlvo, param, nome }) {
  const router = Router({ mergeParams: true })

  // status = status do vinculo; status_cadastro = status da cidade/especializacao no catalogo.
  const SELECT = `
    SELECT a.id, ${colunasAlvo}, a.status AS status_cadastro,
      v.status, v.criado_em, v.atualizado_em
    FROM ${tabela} v INNER JOIN ${tabelaAlvo} a ON a.id = v.${coluna}`

  async function buscar(cuidadorId, alvoId) {
    return queryUm(`${SELECT} WHERE v.cuidador_id = $1 AND v.${coluna} = $2`, [cuidadorId, alvoId])
  }

  router.get('/', autenticarOpcional, async (req, res) => {
    const cuidadorId = await perfilVisivel(req)
    const status = statusDaListagem(req, cuidadorId)
    const { rows } = await query(
      `${SELECT} WHERE v.cuidador_id = $1 ${status ? 'AND v.status = $2' : ''} ORDER BY a.nome`,
      status ? [cuidadorId, status] : [cuidadorId],
    )
    res.json(rows)
  })

  router.get(`/:${param}`, autenticarOpcional, async (req, res) => {
    const cuidadorId = await perfilVisivel(req)
    const vinculo = await buscar(cuidadorId, idParam(req.params[param], param))
    if (!vinculo || (vinculo.status !== 'ATIVO' && !podeGerenciar(req.usuario, cuidadorId))) throw naoEncontrado(nome)
    res.json(vinculo)
  })

  router.put(`/:${param}`, autenticar, async (req, res) => {
    const cuidadorId = await perfilGerenciavel(req)
    const alvoId = idParam(req.params[param], param)

    const alvo = await queryUm(`SELECT status FROM ${tabelaAlvo} WHERE id = $1`, [alvoId])
    if (!alvo) throw naoEncontrado(nome)
    if (alvo.status !== 'ATIVO') throw new AppError(400, `${nome} está inativa`)

    const { inserido } = await queryUm(
      `INSERT INTO ${tabela} (cuidador_id, ${coluna}) VALUES ($1, $2)
       ON CONFLICT (cuidador_id, ${coluna})
       DO UPDATE SET status = 'ATIVO', atualizado_em = CURRENT_TIMESTAMP
       RETURNING (xmax = 0) AS inserido`,
      [cuidadorId, alvoId],
    )
    res.status(inserido ? 201 : 200).json(await buscar(cuidadorId, alvoId))
  })

  router.delete(`/:${param}`, autenticar, async (req, res) => {
    const cuidadorId = await perfilGerenciavel(req)
    const alvoId = idParam(req.params[param], param)
    if (!(await atualizar(tabela, { status: 'INATIVO' }, { cuidador_id: cuidadorId, [coluna]: alvoId }))) {
      throw naoEncontrado(nome)
    }
    res.json(await buscar(cuidadorId, alvoId))
  })

  return router
}
