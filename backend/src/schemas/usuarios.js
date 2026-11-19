import { z } from 'zod'
import { STATUS_USUARIO, TIPOS_USUARIO, paginacaoSchema, parcial, texto } from './comum.js'

const email = z.string().trim().toLowerCase().pipe(z.email().max(254))
// O bcrypt só considera os primeiros 72 bytes, e acentos ocupam mais de um byte.
const senha = z
  .string()
  .min(8)
  .refine((valor) => Buffer.byteLength(valor) <= 72, { message: 'A senha pode ter no máximo 72 bytes' })

export const loginSchema = z.object({ email, senha: z.string().min(1).max(200) })

// ADMIN nunca é criado pelo login com Google.
export const loginGoogleSchema = z.object({
  credencial: z.string().min(1).max(4096),
  tipo_usuario: z.enum(['CUIDADOR', 'CONTRATANTE']).optional(),
})

export const criarUsuarioSchema = z.object({
  nome_completo: texto(150),
  email,
  senha,
  tipo_usuario: z.enum(TIPOS_USUARIO),
})

// PUT: substitui nome e e-mail; a senha so muda se for enviada.
export const atualizarUsuarioSchema = z.object({
  nome_completo: texto(150),
  email,
  senha: senha.optional(),
  senha_atual: z.string().min(1).max(200).optional(),
})

const tokenEmail = z.string().min(1).max(200)

export const confirmarEmailSchema = z.object({ token: tokenEmail })
export const solicitarRecuperacaoSchema = z.object({ email })
export const redefinirSenhaSchema = z.object({ token: tokenEmail, senha })

export const atualizarUsuarioParcialSchema = parcial(atualizarUsuarioSchema)

export const tipoUsuarioSchema = z.object({ tipo_usuario: z.enum(TIPOS_USUARIO) })

export const statusUsuarioSchema = z.object({
  status: z.enum(STATUS_USUARIO),
  motivo_bloqueio: z.string().trim().min(1).optional(),
})

export const filtrosUsuariosSchema = paginacaoSchema.extend({
  tipo_usuario: z.enum(TIPOS_USUARIO).optional(),
  status: z.enum(STATUS_USUARIO).optional(),
  nome: z.string().trim().min(1).optional(),
  // Procura no nome ou no e-mail.
  busca: z.string().trim().min(1).max(100).optional(),
})
