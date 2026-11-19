import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { Router } from 'express'
import multer from 'multer'
import { config } from '../config.js'
import { query, queryUm } from '../db/index.js'
import { autenticar, autenticarOpcional, ehAdmin, exigirDonoOuAdmin, permitir } from '../middlewares/auth.js'
import { limiteCadastro, limiteSenhaAtual } from '../middlewares/limites.js'
import {
  atualizarUsuarioParcialSchema,
  atualizarUsuarioSchema,
  criarUsuarioSchema,
  filtrosUsuariosSchema,
  statusUsuarioSchema,
  tipoUsuarioSchema,
} from '../schemas/usuarios.js'
import { enviarVerificacaoEmail } from '../utils/email.js'
import { AppError, naoEncontrado, proibido } from '../utils/erros.js'
import { atualizar, idParam, paginado } from '../utils/sql.js'
import { descartarTokensEmail, revogarSessoesDoUsuario } from '../utils/tokens.js'
import { COLUNAS_USUARIO, MENSAGEM_EMAIL_BLOQUEADO, comSenhaHash, conferirSenha, estaBloqueado } from '../utils/usuarios.js'

const router = Router()

const EXTENSOES_FOTO = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }

const upload = multer({
  storage: multer.diskStorage({
    destination: config.uploadsDir,
    filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${EXTENSOES_FOTO[file.mimetype]}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    EXTENSOES_FOTO[file.mimetype] ? cb(null, true) : cb(new AppError(400, 'A foto deve ser JPG, PNG ou WEBP')),
})

// O tipo enviado pelo navegador pode ser falso: confere os primeiros bytes do arquivo salvo.
function bytesCombinam(caminho, mimetype) {
  const fd = fs.openSync(caminho, 'r')
  const b = Buffer.alloc(12)
  fs.readSync(fd, b, 0, 12, 0)
  fs.closeSync(fd)
  if (mimetype === 'image/png') return b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  if (mimetype === 'image/jpeg') return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff
  return b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP'
}

function apagarFoto(storageKey) {
  if (storageKey) fs.rm(path.join(config.uploadsDir, storageKey), { force: true }, () => {})
}

// Um ADMIN não bloqueia nem exclui administradores (nem a si mesmo): evita ficar sem ninguém para gerir o sistema.
function exigirAlvoNaoAdmin(alvo) {
  if (alvo.tipo_usuario === 'ADMIN') throw proibido('Administradores não podem ser bloqueados ou excluídos')
}

async function buscarUsuario(id) {
  const usuario = await queryUm(`SELECT ${COLUNAS_USUARIO} FROM usuarios WHERE id = $1`, [id])
  if (!usuario) throw naoEncontrado('Usuário')
  return usuario
}

router.get('/', autenticar, permitir('ADMIN'), async (req, res) => {
  const filtros = filtrosUsuariosSchema.parse(req.query)
  const condicoes = []
  const params = []

  if (filtros.tipo_usuario) condicoes.push(`tipo_usuario = $${params.push(filtros.tipo_usuario)}`)
  if (filtros.status) condicoes.push(`status = $${params.push(filtros.status)}`)
  if (filtros.nome) condicoes.push(`nome_completo ILIKE $${params.push(`%${filtros.nome}%`)}`)
  if (filtros.busca) {
    // Os curingas do LIKE digitados pela pessoa valem como texto comum.
    const posicao = params.push(`%${filtros.busca.replace(/[\\%_]/g, '\\$&')}%`)
    condicoes.push(`(nome_completo ILIKE $${posicao} OR email ILIKE $${posicao})`)
  }
  const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : ''

  const { total } = await queryUm(`SELECT COUNT(*) AS total FROM usuarios ${where}`, params)
  const { rows } = await query(
    // tem_perfil_cuidador: a tela de admin só oferece "Ver perfil" a quem já preencheu o perfil.
    `SELECT ${COLUNAS_USUARIO},
            EXISTS (SELECT 1 FROM perfis_cuidadores pc WHERE pc.usuario_id = usuarios.id) AS tem_perfil_cuidador
     FROM usuarios ${where}
     ORDER BY nome_completo LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, filtros.limite, (filtros.pagina - 1) * filtros.limite],
  )
  res.json(paginado(rows, total, filtros))
})

router.get('/:usuarioId', autenticar, async (req, res) => {
  const id = idParam(req.params.usuarioId, 'usuarioId')
  exigirDonoOuAdmin(req.usuario, id)
  res.json(await buscarUsuario(id))
})

// Cadastro publico de CUIDADOR ou CONTRATANTE; ADMIN so pode ser criado por outro ADMIN.
router.post('/', limiteCadastro, autenticarOpcional, async (req, res) => {
  const dados = criarUsuarioSchema.parse(req.body)
  if (dados.tipo_usuario === 'ADMIN' && !ehAdmin(req.usuario)) {
    throw proibido('Somente administradores podem cadastrar usuários ADMIN')
  }

  const { nome_completo, email, senha_hash, tipo_usuario } = await comSenhaHash(dados)

  const existente = await queryUm('SELECT id, status, bloqueado_em FROM usuarios WHERE LOWER(email) = $1', [email.toLowerCase()])
  if (existente && estaBloqueado(existente)) throw proibido(MENSAGEM_EMAIL_BLOQUEADO)

  // Conta excluída (exclusão lógica): o novo cadastro reativa a conta antiga com o nome, a senha e o tipo
  // informados agora. O e-mail volta a ficar sem confirmação e as sessões antigas são encerradas.
  if (existente?.status === 'INATIVO') {
    const usuario = await queryUm(
      `UPDATE usuarios SET nome_completo = $1, senha_hash = $2, tipo_usuario = $3, status = 'ATIVO',
         email_verificado_em = NULL, atualizado_em = CURRENT_TIMESTAMP
       WHERE id = $4 RETURNING ${COLUNAS_USUARIO}`,
      [nome_completo, senha_hash, tipo_usuario, existente.id],
    )
    await revogarSessoesDoUsuario(existente.id)
    enviarVerificacaoEmail(usuario)
    return res.status(201).json({ ...usuario, conta_reativada: true })
  }

  const usuario = await queryUm(
    `INSERT INTO usuarios (nome_completo, email, senha_hash, tipo_usuario)
     VALUES ($1, $2, $3, $4) RETURNING ${COLUNAS_USUARIO}`,
    [nome_completo, email, senha_hash, tipo_usuario],
  )
  enviarVerificacaoEmail(usuario)
  res.status(201).json(usuario)
})

async function exigirSenhaAtual(id, senhaAtual) {
  const { senha_hash } = await queryUm('SELECT senha_hash FROM usuarios WHERE id = $1', [id])
  // Uma sessão roubada de conta do Google não pode criar uma senha: isso exige acesso ao e-mail.
  if (!senha_hash) throw new AppError(400, 'Esta conta ainda não tem senha. Para criar uma, use "Esqueci minha senha".')

  if (!senhaAtual || !(await conferirSenha(senhaAtual, senha_hash))) {
    throw new AppError(400, 'Senha atual incorreta', [{ campo: 'senha_atual', mensagem: 'Senha atual incorreta' }])
  }
}

async function atualizarUsuario(req, res, schema) {
  const id = idParam(req.params.usuarioId, 'usuarioId')
  exigirDonoOuAdmin(req.usuario, id)
  const { senha_atual, ...alteracoes } = schema.parse(req.body)
  const anterior = await buscarUsuario(id)

  const trocouEmail = alteracoes.email !== undefined && alteracoes.email !== anterior.email.toLowerCase()

  // Quem controla o e-mail recupera a senha, então uma sessão roubada também não pode trocá-lo.
  // Um ADMIN pode alterar esses dados de outra pessoa sem conhecer a senha dela.
  if ((alteracoes.senha !== undefined || trocouEmail) && id === req.usuario.id) await exigirSenhaAtual(id, senha_atual)
  const dados = await comSenhaHash(alteracoes)

  // O novo endereço ainda não foi confirmado por ninguém.
  if (trocouEmail) dados.email_verificado_em = null

  const usuario = await atualizar('usuarios', dados, { id }, COLUNAS_USUARIO)
  if (!usuario) throw naoEncontrado('Usuário')
  // Trocar a senha encerra todas as sessões da conta, inclusive a de quem pode tê-la roubado.
  if (dados.senha_hash) {
    await revogarSessoesDoUsuario(id)
    await descartarTokensEmail(id, 'RECUPERAR_SENHA')
  }
  if (trocouEmail) enviarVerificacaoEmail(usuario)
  res.json(usuario)
}

router.put('/:usuarioId', autenticar, limiteSenhaAtual, (req, res) => atualizarUsuario(req, res, atualizarUsuarioSchema))
router.patch('/:usuarioId', autenticar, limiteSenhaAtual, (req, res) => atualizarUsuario(req, res, atualizarUsuarioParcialSchema))

router.patch('/:usuarioId/tipo', autenticar, permitir('ADMIN'), async (req, res) => {
  const id = idParam(req.params.usuarioId, 'usuarioId')
  const { tipo_usuario } = tipoUsuarioSchema.parse(req.body)

  const usuario = await atualizar('usuarios', { tipo_usuario }, { id }, COLUNAS_USUARIO)
  if (!usuario) throw naoEncontrado('Usuário')
  res.json(usuario)
})

router.patch('/:usuarioId/status', autenticar, permitir('ADMIN'), async (req, res) => {
  const id = idParam(req.params.usuarioId, 'usuarioId')
  const { status, motivo_bloqueio } = statusUsuarioSchema.parse(req.body)
  if (id === req.usuario.id && status !== 'ATIVO') {
    throw new AppError(400, 'Você não pode desativar ou bloquear a própria conta por esta rota')
  }
  if (status !== 'ATIVO') exigirAlvoNaoAdmin(await buscarUsuario(id))

  const bloqueado = status === 'BLOQUEADO'
  const usuario = await queryUm(
    `UPDATE usuarios SET status = $1,
       bloqueado_em = CASE WHEN $2::boolean THEN CURRENT_TIMESTAMP END,
       motivo_bloqueio = CASE WHEN $2::boolean THEN $3 END,
       atualizado_em = CURRENT_TIMESTAMP
     WHERE id = $4 RETURNING ${COLUNAS_USUARIO}`,
    [status, bloqueado, motivo_bloqueio ?? null, id],
  )
  if (!usuario) throw naoEncontrado('Usuário')
  res.json(usuario)
})

// Exclusao logica: a conta passa para INATIVO.
router.delete('/:usuarioId', autenticar, async (req, res) => {
  const id = idParam(req.params.usuarioId, 'usuarioId')
  exigirDonoOuAdmin(req.usuario, id)
  // Um administrador só sai da plataforma pelo banco de dados, nunca por esta rota.
  if (ehAdmin(req.usuario)) exigirAlvoNaoAdmin(await buscarUsuario(id))

  const usuario = await atualizar('usuarios', { status: 'INATIVO' }, { id }, COLUNAS_USUARIO)
  if (!usuario) throw naoEncontrado('Usuário')
  res.json(usuario)
})

// Envio da foto como multipart/form-data, no campo "foto".
router.put('/:usuarioId/foto-perfil', autenticar, async (req, res) => {
  const id = idParam(req.params.usuarioId, 'usuarioId')
  exigirDonoOuAdmin(req.usuario, id)
  const anterior = await buscarUsuario(id)

  await new Promise((resolve, reject) => upload.single('foto')(req, res, (err) => (err ? reject(err) : resolve())))
  if (!req.file) throw new AppError(400, 'Envie a imagem no campo "foto" (multipart/form-data)')
  if (!bytesCombinam(req.file.path, req.file.mimetype)) {
    apagarFoto(req.file.filename)
    throw new AppError(400, 'O arquivo não é uma imagem JPG, PNG ou WEBP válida')
  }

  const usuario = await atualizar('usuarios', { foto_perfil_storage_key: req.file.filename }, { id }, COLUNAS_USUARIO)
  apagarFoto(anterior.foto_perfil_storage_key)
  res.json({ ...usuario, foto_perfil_url: `/uploads/${req.file.filename}` })
})

router.delete('/:usuarioId/foto-perfil', autenticar, async (req, res) => {
  const id = idParam(req.params.usuarioId, 'usuarioId')
  exigirDonoOuAdmin(req.usuario, id)
  const anterior = await buscarUsuario(id)
  if (!anterior.foto_perfil_storage_key) throw naoEncontrado('Foto de perfil')

  await atualizar('usuarios', { foto_perfil_storage_key: null }, { id })
  apagarFoto(anterior.foto_perfil_storage_key)
  res.status(204).end()
})

export default router
