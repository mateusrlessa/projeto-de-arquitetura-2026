import crypto from 'node:crypto'
import 'dotenv/config'

const producao = process.env.NODE_ENV === 'production'

const SEGREDOS_DE_EXEMPLO = new Set(['troque-este-segredo', 'cuidaaqui-dev-secret'])
const SENHA_ADMIN_DE_EXEMPLO = 'Admin@12345'

function segredoJwt() {
  const segredo = process.env.JWT_SECRET
  if (segredo && segredo.length >= 32 && !SEGREDOS_DE_EXEMPLO.has(segredo)) return segredo

  if (producao) throw new Error('Defina no .env um JWT_SECRET aleatório com pelo menos 32 caracteres.')

  // Em desenvolvimento o segredo vale até o servidor reiniciar. A sessão continua no banco,
  // então o frontend só renova o token de acesso.
  console.warn('JWT_SECRET ausente ou fraco no .env: usando um segredo temporário de desenvolvimento.')
  return crypto.randomBytes(48).toString('hex')
}

if (producao && process.env.ADMIN_SENHA === SENHA_ADMIN_DE_EXEMPLO) {
  throw new Error('Troque a ADMIN_SENHA de exemplo antes de rodar em produção.')
}

// Em produção os links não podem cair no log, e o endereço deles não pode vir do cabeçalho Host.
if (producao && !(process.env.SMTP_HOST && process.env.EMAIL_REMETENTE && process.env.FRONTEND_URL)) {
  throw new Error('Defina no .env SMTP_HOST, EMAIL_REMETENTE e FRONTEND_URL para enviar e-mails em produção.')
}

const smtpPorta = Number(process.env.SMTP_PORTA) || 587

export const config = {
  producao,
  porta: Number(process.env.PORT) || 3001,
  // Sem DATABASE_URL o backend usa o PGlite (PostgreSQL embutido) salvo em PGLITE_DIR.
  databaseUrl: process.env.DATABASE_URL,
  pgliteDir: process.env.PGLITE_DIR || './data/pglite',
  jwtSecret: segredoJwt(),
  tokenAcessoExpiracao: process.env.TOKEN_ACESSO_EXPIRACAO || '15m',
  sessaoDias: Number(process.env.SESSAO_DIAS) || 7,
  googleClientId: process.env.GOOGLE_CLIENT_ID || null,
  // Sem SMTP_HOST o backend não envia e-mails: mostra os links no log do servidor.
  smtp: process.env.SMTP_HOST
    ? {
        host: process.env.SMTP_HOST,
        port: smtpPorta,
        secure: smtpPorta === 465,
        requireTLS: producao,
        auth: process.env.SMTP_USUARIO ? { user: process.env.SMTP_USUARIO, pass: process.env.SMTP_SENHA } : undefined,
      }
    : null,
  emailRemetente: process.env.EMAIL_REMETENTE || 'CuidaAqui <nao-responda@cuidaaqui.local>',
  // Endereço do site usado nos links enviados por e-mail.
  frontendUrl: (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, ''),
  validadeTokenMinutos: {
    VERIFICAR_EMAIL: Number(process.env.TOKEN_VERIFICACAO_MINUTOS) || 60,
    RECUPERAR_SENHA: Number(process.env.TOKEN_RECUPERACAO_MINUTOS) || 30,
  },
  // Origens de navegador que podem chamar a API diretamente, separadas por vírgula.
  corsOrigens: (process.env.CORS_ORIGENS || 'http://localhost:5173').split(',').map((o) => o.trim()),
  // Quantidade de proxies na frente da API, usada para identificar o IP real no limite de tentativas.
  trustProxy: Number(process.env.TRUST_PROXY) || 0,
  admin: {
    nome: process.env.ADMIN_NOME || 'Administrador',
    email: process.env.ADMIN_EMAIL,
    senha: process.env.ADMIN_SENHA,
  },
  uploadsDir: process.env.UPLOADS_DIR || './uploads',
  // Minutos, contados a partir do envio, em que o contratante pode editar ou excluir a própria avaliação.
  avaliacaoEdicaoMinutos: Math.max(1, Math.trunc(Number(process.env.AVALIACAO_EDICAO_MINUTOS)) || 10),
}
