import { config } from '../config.js'
import { gerarHashSenha } from '../utils/usuarios.js'
import { query, queryUm } from './index.js'

// Cria o primeiro ADMIN a partir do .env, ja que a API nao permite cadastrar ADMIN sem estar logado como um.
export async function garantirAdmin() {
  const { email, senha, nome } = config.admin
  if (!email || !senha) {
    console.warn('ADMIN_EMAIL/ADMIN_SENHA não definidos no .env: nenhum administrador inicial foi criado.')
    return
  }

  const existente = await queryUm('SELECT id FROM usuarios WHERE LOWER(email) = LOWER($1)', [email])
  if (existente) return

  await query("INSERT INTO usuarios (nome_completo, email, senha_hash, tipo_usuario) VALUES ($1, $2, $3, 'ADMIN')", [
    nome,
    email.trim().toLowerCase(),
    await gerarHashSenha(senha),
  ])
  console.log(`Administrador inicial criado: ${email}`)
}
