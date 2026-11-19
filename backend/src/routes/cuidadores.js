import { Router } from 'express'
import { query, queryUm } from '../db/index.js'
import { autenticar, autenticarOpcional, ehAdmin, permitir } from '../middlewares/auth.js'
import { statusRegistroSchema } from '../schemas/comum.js'
import {
  cpfSchema,
  criarPerfilSchema,
  experienciaParcialSchema,
  experienciaSchema,
  filtrosCuidadoresSchema,
  formacaoParcialSchema,
  formacaoSchema,
  perfilParcialSchema,
  perfilSchema,
} from '../schemas/cuidadores.js'
import { AppError, naoEncontrado, proibido } from '../utils/erros.js'
import { perfilGerenciavel, perfilVisivel } from '../utils/perfis.js'
import { atualizar, paginado } from '../utils/sql.js'
import { MENSAGEM_CPF_BLOQUEADO, estaBloqueado } from '../utils/usuarios.js'
import avaliacoesRouter from './avaliacoes.js'
import { criarRotasRegistros, criarRotasVinculos } from './cuidadorRecursos.js'

const router = Router()

// Media e quantidade de avaliacoes publicadas de cada cuidador.
const JOIN_NOTAS = `
  LEFT JOIN LATERAL (
    SELECT ROUND(AVG(a.nota), 2)::float8 AS nota_media, COUNT(*) AS total_avaliacoes
    FROM avaliacoes_cuidadores a
    WHERE a.cuidador_id = pc.usuario_id AND a.status = 'PUBLICADA'
  ) notas ON TRUE`

const CIDADES_ATIVAS = `
  COALESCE((
    SELECT json_agg(json_build_object('id', c.id, 'nome', c.nome, 'uf', c.uf) ORDER BY c.nome)
    FROM cuidador_cidades cc INNER JOIN cidades c ON c.id = cc.cidade_id
    WHERE cc.cuidador_id = pc.usuario_id AND cc.status = 'ATIVO'
  ), '[]')`

const ESPECIALIZACOES_ATIVAS = `
  COALESCE((
    SELECT json_agg(json_build_object('id', e.id, 'nome', e.nome) ORDER BY e.nome)
    FROM cuidador_especializacoes ce INNER JOIN especializacoes e ON e.id = ce.especializacao_id
    WHERE ce.cuidador_id = pc.usuario_id AND ce.status = 'ATIVO'
  ), '[]')`

// Campos publicos do perfil (sem CPF e sem telefone).
const COLUNAS_PUBLICAS = `
  u.id, u.nome_completo, u.foto_perfil_storage_key,
  pc.funcao, pc.anos_experiencia, pc.sobre_mim, pc.status,
  pc.criado_em, pc.atualizado_em,
  notas.nota_media, notas.total_avaliacoes,
  ${CIDADES_ATIVAS} AS cidades,
  ${ESPECIALIZACOES_ATIVAS} AS especializacoes`

// Perfil completo, com formacoes e experiencias ativas. O telefone so vai para usuarios
// logados e o CPF so vai para o proprio cuidador.
async function detalharPerfil(cuidadorId, { incluirTelefone = false, incluirCpf = false } = {}) {
  const perfil = await queryUm(
    `SELECT ${COLUNAS_PUBLICAS}${incluirTelefone || incluirCpf ? ', pc.telefone_whatsapp' : ''}${incluirCpf ? ', pc.cpf, u.email' : ''},
       COALESCE((
         SELECT json_agg(json_build_object('id', f.id, 'nome_instituicao', f.nome_instituicao, 'nome_curso', f.nome_curso, 'ano_conclusao', f.ano_conclusao) ORDER BY f.criado_em)
         FROM formacoes_cursos f WHERE f.cuidador_id = pc.usuario_id AND f.status = 'ATIVO'
       ), '[]') AS formacoes,
       COALESCE((
         SELECT json_agg(json_build_object('id', x.id, 'cargo', x.cargo, 'nome_local_trabalho', x.nome_local_trabalho, 'descricao', x.descricao,
           'ano_inicio', x.ano_inicio, 'ano_fim', x.ano_fim) ORDER BY x.ano_inicio DESC)
         FROM experiencias_profissionais x WHERE x.cuidador_id = pc.usuario_id AND x.status = 'ATIVO'
       ), '[]') AS experiencias
     FROM perfis_cuidadores pc
     INNER JOIN usuarios u ON u.id = pc.usuario_id
     ${JOIN_NOTAS}
     WHERE pc.usuario_id = $1`,
    [cuidadorId],
  )
  if (!perfil) throw naoEncontrado('Cuidador')
  return perfil
}

router.get('/', async (req, res) => {
  const f = filtrosCuidadoresSchema.parse(req.query)
  const condicoes = ["pc.status = 'ATIVO'", "u.status = 'ATIVO'"]
  const params = []

  if (f.cidade_id) {
    condicoes.push(`EXISTS (SELECT 1 FROM cuidador_cidades cc WHERE cc.cuidador_id = pc.usuario_id
      AND cc.status = 'ATIVO' AND cc.cidade_id = $${params.push(f.cidade_id)})`)
  }
  if (f.uf) {
    condicoes.push(`EXISTS (SELECT 1 FROM cuidador_cidades cc INNER JOIN cidades c ON c.id = cc.cidade_id
      WHERE cc.cuidador_id = pc.usuario_id AND cc.status = 'ATIVO' AND c.uf = $${params.push(f.uf)})`)
  }
  if (f.especializacao_id) {
    condicoes.push(`EXISTS (SELECT 1 FROM cuidador_especializacoes ce WHERE ce.cuidador_id = pc.usuario_id
      AND ce.status = 'ATIVO' AND ce.especializacao_id = $${params.push(f.especializacao_id)})`)
  }
  if (f.anos_experiencia_min != null) condicoes.push(`pc.anos_experiencia >= $${params.push(f.anos_experiencia_min)}`)
  if (f.anos_experiencia_max != null) condicoes.push(`pc.anos_experiencia <= $${params.push(f.anos_experiencia_max)}`)
  if (f.funcao) condicoes.push(`pc.funcao ILIKE $${params.push(`%${f.funcao}%`)}`)
  if (f.nome) condicoes.push(`u.nome_completo ILIKE $${params.push(`%${f.nome}%`)}`)
  if (f.nota_minima) condicoes.push(`notas.nota_media >= $${params.push(f.nota_minima)}`)

  const from = `FROM perfis_cuidadores pc INNER JOIN usuarios u ON u.id = pc.usuario_id ${JOIN_NOTAS}
                WHERE ${condicoes.join(' AND ')}`

  const { total } = await queryUm(`SELECT COUNT(*) AS total ${from}`, params)
  const { rows } = await query(
    `SELECT ${COLUNAS_PUBLICAS} ${from}
     ORDER BY notas.nota_media DESC NULLS LAST, u.nome_completo
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, f.limite, (f.pagina - 1) * f.limite],
  )
  res.json(paginado(rows, total, f))
})

// Precisa vir antes de /:cuidadorId.
router.get('/me', autenticar, permitir('CUIDADOR'), async (req, res) => {
  res.json(await detalharPerfil(req.usuario.id, { incluirCpf: true }))
})

router.get('/:cuidadorId', autenticarOpcional, async (req, res) => {
  res.json(await detalharPerfil(await perfilVisivel(req), { incluirTelefone: Boolean(req.usuario) }))
})

// O CUIDADOR cria o proprio perfil; um ADMIN pode criar para outro usuario informando usuario_id.
router.post('/', autenticar, permitir('CUIDADOR', 'ADMIN'), async (req, res) => {
  const { usuario_id, cpf, telefone_whatsapp, anos_experiencia, funcao, sobre_mim } = criarPerfilSchema.parse(req.body)

  let usuarioId = req.usuario.id
  if (ehAdmin(req.usuario)) {
    if (!usuario_id) throw new AppError(400, 'Informe o usuario_id do cuidador')
    usuarioId = usuario_id
  } else if (usuario_id && usuario_id !== req.usuario.id) {
    throw proibido('Você só pode criar o seu próprio perfil')
  }

  const usuario = await queryUm('SELECT tipo_usuario FROM usuarios WHERE id = $1', [usuarioId])
  if (!usuario) throw naoEncontrado('Usuário')
  if (usuario.tipo_usuario !== 'CUIDADOR') throw new AppError(400, 'O usuário precisa ser do tipo CUIDADOR')

  await exigirCpfLiberado(cpf, usuarioId)
  await query(
    `INSERT INTO perfis_cuidadores (usuario_id, cpf, telefone_whatsapp, anos_experiencia, funcao, sobre_mim)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [usuarioId, cpf, telefone_whatsapp, anos_experiencia, funcao, sobre_mim ?? null],
  )
  res.status(201).json(await detalharPerfil(usuarioId, { incluirCpf: true }))
})

// O CPF de uma conta bloqueada não pode ir para outro perfil. Um CPF em uso por outra conta qualquer
// já é recusado pela restrição UNIQUE ("CPF já cadastrado").
async function exigirCpfLiberado(cpf, usuarioId) {
  if (!cpf) return
  const dono = await queryUm(
    `SELECT u.id, u.status, u.bloqueado_em FROM perfis_cuidadores pc JOIN usuarios u ON u.id = pc.usuario_id WHERE pc.cpf = $1`,
    [cpf],
  )
  if (dono && dono.id !== usuarioId && estaBloqueado(dono)) throw proibido(MENSAGEM_CPF_BLOQUEADO)
}

async function atualizarPerfil(req, res, dados) {
  const cuidadorId = await perfilGerenciavel(req)
  await exigirCpfLiberado(dados.cpf, cuidadorId)
  await atualizar('perfis_cuidadores', dados, { usuario_id: cuidadorId })
  res.json(await detalharPerfil(cuidadorId, { incluirCpf: true }))
}

// PUT substitui todos os campos: sobre_mim ausente vira null.
router.put('/:cuidadorId', autenticar, (req, res) => {
  const dados = perfilSchema.parse(req.body)
  return atualizarPerfil(req, res, { ...dados, sobre_mim: dados.sobre_mim ?? null })
})
router.patch('/:cuidadorId', autenticar, (req, res) => atualizarPerfil(req, res, perfilParcialSchema.parse(req.body)))
router.patch('/:cuidadorId/cpf', autenticar, (req, res) => atualizarPerfil(req, res, cpfSchema.parse(req.body)))
router.patch('/:cuidadorId/status', autenticar, (req, res) =>
  atualizarPerfil(req, res, statusRegistroSchema.parse(req.body)),
)

// Exclusao logica: o perfil passa para INATIVO.
router.delete('/:cuidadorId', autenticar, (req, res) => atualizarPerfil(req, res, { status: 'INATIVO' }))

router.use(
  '/:cuidadorId/formacoes',
  criarRotasRegistros({
    tabela: 'formacoes_cursos',
    nome: 'Formação',
    param: 'formacaoId',
    schema: formacaoSchema,
    schemaParcial: formacaoParcialSchema,
    camposOpcionais: ['ano_conclusao'],
    ordem: 'criado_em',
  }),
)

router.use(
  '/:cuidadorId/experiencias',
  criarRotasRegistros({
    tabela: 'experiencias_profissionais',
    nome: 'Experiência',
    param: 'experienciaId',
    schema: experienciaSchema,
    schemaParcial: experienciaParcialSchema,
    camposOpcionais: ['cargo', 'descricao', 'ano_fim'],
    ordem: 'ano_inicio DESC',
  }),
)

router.use(
  '/:cuidadorId/cidades',
  criarRotasVinculos({
    tabela: 'cuidador_cidades',
    coluna: 'cidade_id',
    tabelaAlvo: 'cidades',
    colunasAlvo: 'a.codigo_ibge, a.nome, a.uf',
    param: 'cidadeId',
    nome: 'Cidade',
  }),
)

router.use(
  '/:cuidadorId/especializacoes',
  criarRotasVinculos({
    tabela: 'cuidador_especializacoes',
    coluna: 'especializacao_id',
    tabelaAlvo: 'especializacoes',
    colunasAlvo: 'a.nome, a.descricao',
    param: 'especializacaoId',
    nome: 'Especialização',
  }),
)

router.use('/:cuidadorId/avaliacoes', avaliacoesRouter)

export default router
