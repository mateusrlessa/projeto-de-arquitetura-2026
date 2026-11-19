// Sobe a API de verdade, com um PGlite novo numa pasta temporária, para cada arquivo de teste.
// O node --test roda cada arquivo em um processo separado, então bancos e limites de tentativas não se misturam.
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, before } from 'node:test'

const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'cuidaaqui-teste-'))

// Precisa vir antes de importar o config: o dotenv não sobrescreve variáveis já definidas.
Object.assign(process.env, {
  NODE_ENV: 'test',
  DATABASE_URL: '',
  PGLITE_DIR: path.join(pasta, 'pglite'),
  UPLOADS_DIR: path.join(pasta, 'uploads'),
  JWT_SECRET: crypto.randomBytes(48).toString('hex'),
  GOOGLE_CLIENT_ID: '',
  SMTP_HOST: '',
  FRONTEND_URL: 'http://localhost:5173',
  CORS_ORIGENS: 'http://localhost:5173',
  TRUST_PROXY: '0',
  ADMIN_NOME: 'Admin Teste',
  ADMIN_EMAIL: 'admin@teste.local',
  ADMIN_SENHA: 'Admin@12345',
  AVALIACAO_EDICAO_MINUTOS: '10',
})

export const ADMIN = { email: process.env.ADMIN_EMAIL, senha: process.env.ADMIN_SENHA }
export const SENHA = 'Senha@123'

// Sem SMTP, o backend escreve os links no log. Os testes leem os links daí, como faria uma pessoa.
const links = []
const logOriginal = console.log
console.log = (...partes) => {
  const texto = partes.join(' ')
  const achado = texto.match(/^\[e-mail não enviado\] (.+) \| Para: (\S+)\n(\S+)$/)
  if (achado) links.push({ assunto: achado[1], para: achado[2], link: achado[3] })
  else logOriginal(...partes)
}
console.warn = () => {}

let servidor
let base
let banco

before(async () => {
  const db = await import('../src/db/index.js')
  await db.iniciarBanco()
  await (await import('../src/db/admin.js')).garantirAdmin()
  banco = db
  const app = (await import('../src/app.js')).default
  await new Promise((resolve) => {
    servidor = app.listen(0, '127.0.0.1', resolve)
  })
  base = `http://127.0.0.1:${servidor.address().port}/api`
})

after(async () => {
  // O fetch mantém conexões keep-alive abertas; sem fechá-las, o close() nunca termina.
  servidor?.closeAllConnections()
  await new Promise((resolve) => servidor ? servidor.close(resolve) : resolve())
  await banco?.fecharBanco()
  fs.rmSync(pasta, { recursive: true, force: true })
})

// Endereço do servidor sem o /api, para buscar os arquivos em /uploads.
export const enderecoServidor = () => base.slice(0, -'/api'.length)

export const query = (...args) => banco.query(...args)
export const queryUm = (...args) => banco.queryUm(...args)

// Faz uma requisição e devolve { status, corpo, cookie }. "cookie" é o cookie de sessão recebido, se houver.
export async function api(metodo, caminho, { token, corpo, cookie, formulario } = {}) {
  const cabecalhos = {}
  if (token) cabecalhos.Authorization = `Bearer ${token}`
  if (cookie) cabecalhos.Cookie = `cuidaaqui_sessao=${cookie}`
  if (corpo !== undefined) cabecalhos['Content-Type'] = 'application/json'

  const resposta = await fetch(`${base}${caminho}`, {
    method: metodo,
    headers: cabecalhos,
    body: formulario ?? (corpo !== undefined ? JSON.stringify(corpo) : undefined),
  })
  const texto = await resposta.text()
  const definido = resposta.headers.getSetCookie().find((c) => c.startsWith('cuidaaqui_sessao='))
  return {
    status: resposta.status,
    corpo: texto ? JSON.parse(texto) : null,
    cookie: definido ? decodeURIComponent(definido.split(';')[0].split('=')[1]) || null : undefined,
  }
}

export async function entrar(email, senha = SENHA) {
  const r = await api('POST', '/auth/login', { corpo: { email, senha } })
  if (r.status !== 200) throw new Error(`Login falhou para ${email}: ${r.status} ${JSON.stringify(r.corpo)}`)
  return { token: r.corpo.token_acesso, cookie: r.cookie, usuario: r.corpo.usuario }
}

let contador = 0
export const emailUnico = (prefixo = 'pessoa') => `${prefixo}.${process.pid}.${++contador}@teste.local`

// Cadastra pela API (como o site faz) e já entra na conta.
export async function cadastrar(tipo, { nome = `Pessoa ${tipo}`, email = emailUnico(tipo.toLowerCase()), senha = SENHA } = {}) {
  const r = await api('POST', '/usuarios', { corpo: { nome_completo: nome, email, senha, tipo_usuario: tipo } })
  if (r.status !== 201) throw new Error(`Cadastro falhou: ${r.status} ${JSON.stringify(r.corpo)}`)
  return entrar(email, senha)
}

// CPF válido gerado a partir de 9 dígitos.
export function gerarCpf(semente) {
  const base = String(semente).padStart(9, '0').slice(-9).split('').map(Number)
  const digito = (numeros) => {
    const soma = numeros.reduce((s, n, i) => s + n * (numeros.length + 1 - i), 0)
    return ((soma * 10) % 11) % 10
  }
  const d1 = digito(base)
  const d2 = digito([...base, d1])
  return [...base, d1, d2].join('')
}

export async function cadastrarCuidadorComPerfil(semente = contador + 100) {
  const conta = await cadastrar('CUIDADOR', { nome: 'Cuida Dora' })
  const r = await api('POST', '/cuidadores', {
    token: conta.token,
    corpo: { cpf: gerarCpf(100000000 + semente), telefone_whatsapp: '(85) 99999-0000', anos_experiencia: 5, funcao: 'Cuidadora' },
  })
  if (r.status !== 201) throw new Error(`Perfil falhou: ${r.status} ${JSON.stringify(r.corpo)}`)
  return conta
}

// Quantos links já foram enviados: passe para tokenDoEmail para esperar só pelos próximos.
export const marcarLinks = () => links.length

// Espera o envio em segundo plano e devolve o token do link mais recente mandado para o e-mail.
export async function tokenDoEmail(email, trecho, desde = 0) {
  for (let i = 0; i < 150; i++) {
    const achado = links.slice(desde).findLast((l) => l.para === email && l.link.includes(trecho))
    if (achado) return new URL(achado.link).hash.replace('#token=', '')
    await new Promise((r) => setTimeout(r, 20))
  }
  throw new Error(`Nenhum link "${trecho}" enviado para ${email}`)
}


