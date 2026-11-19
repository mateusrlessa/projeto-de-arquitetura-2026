import { z } from 'zod'

// Mensagens de validacao do zod em portugues.
z.config(z.locales.pt())

export const STATUS_REGISTRO = ['ATIVO', 'INATIVO']
export const STATUS_USUARIO = ['ATIVO', 'INATIVO', 'BLOQUEADO']
export const STATUS_AVALIACAO = ['PUBLICADA', 'OCULTA', 'INATIVA']
export const TIPOS_USUARIO = ['CUIDADOR', 'CONTRATANTE', 'ADMIN']

export const statusRegistroSchema = z.object({ status: z.enum(STATUS_REGISTRO) })

export const paginacaoSchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(20),
})

// Texto obrigatorio, sem espacos nas pontas.
export const texto = (max) => z.string().trim().min(1).max(max)

// Texto opcional que aceita null para limpar o valor.
export const textoOpcional = () => z.string().trim().nullable().optional()

// Versao do schema para PATCH: todos os campos opcionais, mas ao menos um.
export function parcial(schema) {
  return schema.partial().refine((dados) => Object.values(dados).some((v) => v !== undefined), {
    message: 'Informe ao menos um campo para atualizar',
  })
}
