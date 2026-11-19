import nodemailer from 'nodemailer'
import { config } from '../config.js'
import { montarEmail, TEXTOS } from './emailTemplate.js'
import { emitirTokenEmail } from './tokens.js'

const transporte = config.smtp ? nodemailer.createTransport(config.smtp) : null

if (!transporte) console.warn('SMTP_HOST ausente no .env: os links de e-mail serão mostrados neste log.')

async function enviarLink(usuario, finalidade) {
  const token = await emitirTokenEmail(usuario, finalidade)
  // O token vai depois do #: o navegador não o envia ao servidor nem a outros sites.
  const link = `${config.frontendUrl}${TEXTOS[finalidade].caminho}#token=${token}`
  const { assunto, html, texto } = montarEmail({
    finalidade,
    nome: usuario.nome_completo,
    link,
    validadeMinutos: config.validadeTokenMinutos[finalidade],
  })

  if (!transporte) {
    console.log(`[e-mail não enviado] ${assunto} | Para: ${usuario.email}\n${link}`)
    return
  }

  await transporte.sendMail({ from: config.emailRemetente, to: usuario.email, subject: assunto, text: texto, html })
}

// Roda em segundo plano: a resposta não espera o envio, então o tempo dela não revela se a conta
// existe, e uma falha no provedor de e-mail não quebra o cadastro.
function enviarEmSegundoPlano(usuario, finalidade) {
  enviarLink(usuario, finalidade).catch((erro) => console.error(`Falha ao enviar e-mail (${finalidade}):`, erro.message))
}

export const enviarVerificacaoEmail = (usuario) => enviarEmSegundoPlano(usuario, 'VERIFICAR_EMAIL')
export const enviarRecuperacaoSenha = (usuario) => enviarEmSegundoPlano(usuario, 'RECUPERAR_SENHA')
