import { z } from 'zod'
import { STATUS_AVALIACAO, STATUS_REGISTRO, paginacaoSchema, parcial, texto, textoOpcional } from './comum.js'

// Valida os digitos verificadores do CPF.
function cpfValido(cpf) {
  if (/^(\d)\1{10}$/.test(cpf)) return false
  const digito = (tamanho) => {
    let soma = 0
    for (let i = 0; i < tamanho; i++) soma += Number(cpf[i]) * (tamanho + 1 - i)
    return ((soma * 10) % 11) % 10
  }
  return digito(9) === Number(cpf[9]) && digito(10) === Number(cpf[10])
}

// Aceita o CPF com ou sem pontuacao e guarda apenas os 11 digitos.
const cpf = z
  .string()
  .transform((v) => v.replace(/\D/g, ''))
  .pipe(z.string().length(11, 'CPF deve ter 11 dígitos').refine(cpfValido, 'CPF inválido'))

const anoAtual = new Date().getFullYear()
const ano = z.coerce.number().int().min(1900).max(anoAtual)
const idOpcional = z.coerce.number().int().positive().optional()

// ---------- Perfil do cuidador ----------

export const perfilSchema = z.object({
  telefone_whatsapp: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ()-]{8,20}$/, 'Telefone inválido')
    .max(20),
  anos_experiencia: z.coerce.number().int().min(0).max(80),
  funcao: texto(120),
  sobre_mim: textoOpcional(),
})
export const perfilParcialSchema = parcial(perfilSchema)

export const criarPerfilSchema = perfilSchema.extend({
  cpf,
  // Usado apenas por ADMIN para criar o perfil de outro usuario.
  usuario_id: idOpcional,
})

export const cpfSchema = z.object({ cpf })

export const filtrosCuidadoresSchema = paginacaoSchema.extend({
  cidade_id: idOpcional,
  uf: z.string().trim().toUpperCase().length(2).optional(),
  especializacao_id: idOpcional,
  anos_experiencia_min: z.coerce.number().int().min(0).optional(),
  anos_experiencia_max: z.coerce.number().int().min(0).optional(),
  funcao: z.string().trim().min(1).optional(),
  nome: z.string().trim().min(1).optional(),
  nota_minima: z.coerce.number().min(1).max(5).optional(),
})

// Filtro de status nas listagens dos sub-recursos (apenas dono ou ADMIN).
export const filtroStatusSchema = z.object({ status: z.enum(STATUS_REGISTRO).optional() })

// ---------- Formacoes e experiencias ----------

export const formacaoSchema = z.object({
  nome_instituicao: texto(180),
  nome_curso: texto(180),
  ano_conclusao: ano.nullable().optional(),
})
export const formacaoParcialSchema = parcial(formacaoSchema)

const experienciaBase = z.object({
  cargo: texto(120).nullable().optional(),
  nome_local_trabalho: texto(180),
  descricao: textoOpcional(),
  ano_inicio: ano,
  ano_fim: ano.nullable().optional(),
})
export const experienciaSchema = experienciaBase.refine((e) => e.ano_fim == null || e.ano_fim >= e.ano_inicio, {
  message: 'Ano de fim deve ser maior ou igual ao ano de início',
  path: ['ano_fim'],
})
export const experienciaParcialSchema = parcial(experienciaBase)

// ---------- Avaliacoes e respostas ----------

export const avaliacaoSchema = z.object({
  nota: z.coerce.number().int().min(1).max(5),
  comentario: texto(500),
})
export const criarAvaliacaoSchema = avaliacaoSchema.extend({
  contratacao_id: z.coerce.number().int().positive(),
})
export const avaliacaoParcialSchema = parcial(avaliacaoSchema)
export const minhaAvaliacaoQuerySchema = z.object({
  contratacao_id: z.coerce.number().int().positive().optional(),
})
export const statusAvaliacaoSchema = z.object({ status: z.enum(STATUS_AVALIACAO) })

export const filtrosAvaliacoesSchema = paginacaoSchema.extend({
  ordenar: z.enum(['data', 'nota']).default('data'),
  ordem: z.enum(['asc', 'desc']).default('desc'),
})

export const respostaSchema = z.object({ resposta: texto(500) })
