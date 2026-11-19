import rateLimit, { ipKeyGenerator } from 'express-rate-limit'

const QUINZE_MINUTOS = 15 * 60 * 1000
const UMA_HORA = 60 * 60 * 1000

// Os contadores ficam em memória: com mais de uma instância da API, use um store compartilhado.
const limitar = (opcoes) =>
  rateLimit({
    windowMs: QUINZE_MINUTOS,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { erro: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' },
    ...opcoes,
  })

const chaveIp = (req) => ipKeyGenerator(req.ip)

// Só contam as tentativas que falharam: uma para adivinhar a senha de uma conta,
// outra para testar várias contas a partir do mesmo IP.
export const limiteLoginPorConta = limitar({
  limit: 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `${chaveIp(req)}:${String(req.body?.email).trim().toLowerCase()}`,
})
export const limiteLoginPorIp = limitar({ limit: 50, skipSuccessfulRequests: true, keyGenerator: chaveIp })

export const limiteCadastro = limitar({ windowMs: UMA_HORA, limit: 20, keyGenerator: chaveIp })
export const limiteGoogle = limitar({ limit: 30, keyGenerator: chaveIp })
export const limiteSessao = limitar({ limit: 120, keyGenerator: chaveIp })

// O limite por conta ignora o IP para que ninguém encha de e-mails a caixa de outra pessoa.
// Vale igual para e-mails que não existem, então não revela quais estão cadastrados.
export const limiteRecuperacaoPorIp = limitar({ windowMs: UMA_HORA, limit: 20, keyGenerator: chaveIp })
export const limiteRecuperacaoPorConta = limitar({
  windowMs: UMA_HORA,
  limit: 5,
  keyGenerator: (req) => String(req.body?.email).trim().toLowerCase(),
})
export const limiteConfirmarToken = limitar({ limit: 30, keyGenerator: chaveIp })

// Os dois abaixo rodam depois de autenticar, então contam por usuário.
export const limiteReenvioVerificacao = limitar({ windowMs: UMA_HORA, limit: 5, keyGenerator: (req) => String(req.usuario.id) })

// Só conta os erros ao enviar senha ou e-mail, para quem usa uma sessão roubada não adivinhar a senha atual.
export const limiteSenhaAtual = limitar({
  limit: 10,
  skipSuccessfulRequests: true,
  skip: (req) => req.body?.senha === undefined && req.body?.email === undefined,
  keyGenerator: (req) => String(req.usuario.id),
})

// Denúncias de comentários: por usuário, para ninguém encher a fila de moderação.
export const limiteDenuncia = limitar({ windowMs: UMA_HORA, limit: 30, keyGenerator: (req) => String(req.usuario.id) })
