import { Router } from 'express'
import { config } from '../config.js'
import { queryUm } from '../db/index.js'
import { autenticar, lerTokenBearer } from '../middlewares/auth.js'
import {
  limiteConfirmarToken,
  limiteGoogle,
  limiteLoginPorConta,
  limiteLoginPorIp,
  limiteRecuperacaoPorConta,
  limiteRecuperacaoPorIp,
  limiteReenvioVerificacao,
  limiteSessao,
} from '../middlewares/limites.js'
import {
  confirmarEmailSchema,
  loginGoogleSchema,
  loginSchema,
  redefinirSenhaSchema,
  solicitarRecuperacaoSchema,
} from '../schemas/usuarios.js'
import { enviarRecuperacaoSenha, enviarVerificacaoEmail } from '../utils/email.js'
import { AppError } from '../utils/erros.js'
import { verificarCredencialGoogle } from '../utils/google.js'
import {
  consumirTokenEmail,
  criarSessao,
  gerarTokenAcesso,
  renovarSessao,
  revogarSessao,
  revogarSessaoPorToken,
  revogarSessoesDoUsuario,
  verificarTokenAcesso,
} from '../utils/tokens.js'
import { COLUNAS_USUARIO, conferirSenha, estaBloqueado, gerarHashSenha } from '../utils/usuarios.js'

const router = Router()

const COOKIE_SESSAO = 'cuidaaqui_sessao'

// HttpOnly: o JavaScript da página não lê o cookie, então um ataque de XSS não consegue copiá-lo.
const opcoesCookie = {
  httpOnly: true,
  secure: config.producao,
  sameSite: 'strict',
  path: '/api/auth',
}

function responderSessao(res, usuario, { sessaoId, tokenSessao }, status = 200) {
  if (tokenSessao) {
    res.cookie(COOKIE_SESSAO, tokenSessao, { ...opcoesCookie, maxAge: config.sessaoDias * 24 * 60 * 60 * 1000 })
  }
  res.status(status).json({
    tipo_token: 'Bearer',
    token_acesso: gerarTokenAcesso(usuario, sessaoId),
    expira_em: config.tokenAcessoExpiracao,
    usuario,
  })
}

function exigirContaAtiva(status) {
  if (status !== 'ATIVO') throw new AppError(403, status === 'BLOQUEADO' ? 'Conta bloqueada' : 'Conta inativa')
}

router.get('/config', (req, res) => {
  res.json({ google_client_id: config.googleClientId })
})

router.post('/login', limiteLoginPorIp, limiteLoginPorConta, async (req, res) => {
  const { email, senha } = loginSchema.parse(req.body)

  const conta = await queryUm(`SELECT ${COLUNAS_USUARIO}, senha_hash FROM usuarios WHERE LOWER(email) = $1`, [email])
  // A senha é conferida mesmo sem conta: a resposta leva o mesmo tempo e não revela quais e-mails existem.
  const senhaCorreta = await conferirSenha(senha, conta?.senha_hash)
  if (!conta?.senha_hash || !senhaCorreta) throw new AppError(401, 'E-mail ou senha incorretos')
  exigirContaAtiva(conta.status)

  const { senha_hash: _, ...usuario } = conta
  responderSessao(res, usuario, await criarSessao(usuario.id))
})

// Só vincula depois de o e-mail ser confirmado: antes disso a conta pode ter sido criada por outra
// pessoa, que continuaria entrando com a senha depois do vínculo. Contas ADMIN seguem só com senha.
async function vincularGoogle(conta, googleSub) {
  exigirContaAtiva(conta.status)
  if (!conta.email_verificado_em) {
    throw new AppError(409, 'Este e-mail já tem uma conta sem confirmação. Entre com e-mail e senha, ou use "Esqueci minha senha", e confirme o e-mail para usar o Google.')
  }
  const vinculada =
    conta.tipo_usuario !== 'ADMIN' &&
    !conta.google_sub &&
    (await queryUm(
      `UPDATE usuarios SET google_sub = $1, atualizado_em = CURRENT_TIMESTAMP
       WHERE id = $2 AND email = $3 AND google_sub IS NULL AND email_verificado_em IS NOT NULL
       RETURNING ${COLUNAS_USUARIO}`,
      [googleSub, conta.id, conta.email],
    ))
  if (!vinculada) throw new AppError(409, 'Este e-mail já tem uma conta. Entre com e-mail e senha.')

  await revogarSessoesDoUsuario(conta.id)
  return vinculada
}

// Entra com a conta Google, vincula a uma conta com o mesmo e-mail confirmado ou, no primeiro acesso,
// cria a conta com o tipo escolhido.
router.post('/google', limiteGoogle, async (req, res) => {
  const { credencial, tipo_usuario } = loginGoogleSchema.parse(req.body)
  const { googleSub, email, nome } = await verificarCredencialGoogle(credencial)

  let usuario = await queryUm(`SELECT ${COLUNAS_USUARIO} FROM usuarios WHERE google_sub = $1`, [googleSub])
  let contaNova = false

  if (!usuario) {
    const mesmoEmail = await queryUm(`SELECT ${COLUNAS_USUARIO}, google_sub FROM usuarios WHERE LOWER(email) = $1`, [email])
    if (mesmoEmail?.status === 'INATIVO' && !estaBloqueado(mesmoEmail)) {
      // Conta excluída (exclusão lógica): o Google confirma o e-mail, então a conta é reativada e vinculada.
      usuario = await queryUm(
        `UPDATE usuarios SET status = 'ATIVO', google_sub = $1, email_verificado_em = CURRENT_TIMESTAMP,
           atualizado_em = CURRENT_TIMESTAMP
         WHERE id = $2 RETURNING ${COLUNAS_USUARIO}`,
        [googleSub, mesmoEmail.id],
      )
      await revogarSessoesDoUsuario(mesmoEmail.id)
    } else if (mesmoEmail) {
      usuario = await vincularGoogle(mesmoEmail, googleSub)
    } else {
      if (!tipo_usuario) throw new AppError(400, 'Ainda não há conta com este e-mail do Google. Use "Criar conta" para escolher entre contratante e cuidador.')
      usuario = await queryUm(
        `INSERT INTO usuarios (nome_completo, email, email_verificado_em, google_sub, tipo_usuario)
         VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4) RETURNING ${COLUNAS_USUARIO}`,
        [nome, email, googleSub, tipo_usuario],
      )
      contaNova = true
    }
  }
  if (estaBloqueado(usuario)) throw new AppError(403, 'Conta bloqueada')
  // Conta excluída (exclusão lógica): entrar de novo com o Google, que já confirma o e-mail, reativa a conta.
  if (usuario.status === 'INATIVO') {
    usuario = await queryUm(
      `UPDATE usuarios SET status = 'ATIVO', atualizado_em = CURRENT_TIMESTAMP WHERE id = $1 RETURNING ${COLUNAS_USUARIO}`,
      [usuario.id],
    )
  }
  exigirContaAtiva(usuario.status)

  responderSessao(res, usuario, await criarSessao(usuario.id), contaNova ? 201 : 200)
})

// Reenvia o link de confirmação. O primeiro é enviado no cadastro e ao trocar de e-mail.
router.post('/verificacao-email/solicitar', autenticar, limiteReenvioVerificacao, async (req, res) => {
  const conta = await queryUm('SELECT id, nome_completo, email, email_verificado_em FROM usuarios WHERE id = $1', [req.usuario.id])
  if (conta.email_verificado_em) return res.json({ mensagem: 'Seu e-mail já está confirmado.' })

  enviarVerificacaoEmail(conta)
  res.status(202).json({ mensagem: 'Enviamos um novo link de confirmação para o seu e-mail.' })
})

router.post('/verificacao-email/confirmar', limiteConfirmarToken, async (req, res) => {
  const { token } = confirmarEmailSchema.parse(req.body)
  await consumirTokenEmail(token, 'VERIFICAR_EMAIL')
  res.json({ mensagem: 'E-mail confirmado.' })
})

// Responde igual exista ou não a conta, para não revelar quais e-mails estão cadastrados.
router.post('/recuperacao-senha/solicitar', limiteRecuperacaoPorIp, limiteRecuperacaoPorConta, async (req, res) => {
  const { email } = solicitarRecuperacaoSchema.parse(req.body)

  const conta = await queryUm("SELECT id, nome_completo, email FROM usuarios WHERE LOWER(email) = $1 AND status = 'ATIVO'", [email])
  if (conta) enviarRecuperacaoSenha(conta)

  res.status(202).json({ mensagem: 'Se houver uma conta com esse e-mail, enviaremos um link para redefinir a senha.' })
})

router.post('/recuperacao-senha/confirmar', limiteConfirmarToken, async (req, res) => {
  const { token, senha } = redefinirSenhaSchema.parse(req.body)

  const usuarioId = await consumirTokenEmail(token, 'RECUPERAR_SENHA', await gerarHashSenha(senha))
  await revogarSessoesDoUsuario(usuarioId)

  res.json({ mensagem: 'Senha redefinida. Entre com a nova senha.' })
})

router.post('/refresh', limiteSessao, async (req, res) => {
  const token = req.cookies[COOKIE_SESSAO]
  if (!token) throw new AppError(401, 'Sessão não encontrada, faça login novamente')

  try {
    const sessao = await renovarSessao(token)
    const usuario = await queryUm(`SELECT ${COLUNAS_USUARIO} FROM usuarios WHERE id = $1`, [sessao.usuarioId])
    if (!usuario || usuario.status !== 'ATIVO') {
      await revogarSessao(sessao.sessaoId)
      throw new AppError(401, 'Usuário inativo ou bloqueado')
    }
    responderSessao(res, usuario, sessao)
  } catch (erro) {
    if (erro.status === 401) res.clearCookie(COOKIE_SESSAO, opcoesCookie)
    throw erro
  }
})

// Funciona com o token de acesso já vencido, para que sair sempre encerre a sessão.
router.post('/logout', limiteSessao, async (req, res) => {
  const tokenCookie = req.cookies[COOKIE_SESSAO]
  if (tokenCookie) await revogarSessaoPorToken(tokenCookie)

  const bearer = lerTokenBearer(req)
  if (bearer) {
    try {
      await revogarSessao(Number(verificarTokenAcesso(bearer).sid))
    } catch (erro) {
      if (erro.status !== 401) throw erro
    }
  }

  res.clearCookie(COOKIE_SESSAO, opcoesCookie)
  res.status(204).end()
})

router.get('/me', autenticar, async (req, res) => {
  res.json(await queryUm(`SELECT ${COLUNAS_USUARIO} FROM usuarios WHERE id = $1`, [req.usuario.id]))
})

export default router
