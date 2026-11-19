import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { ADMIN, SENHA, api, cadastrar, emailUnico, entrar, query } from './ajudantes.js'

describe('cadastro e login', () => {
  test('cadastra um contratante, entra e consulta /auth/me', async () => {
    const email = emailUnico('maria')
    const cadastro = await api('POST', '/usuarios', {
      corpo: { nome_completo: 'Maria Teste', email, senha: SENHA, tipo_usuario: 'CONTRATANTE' },
    })
    assert.equal(cadastro.status, 201)
    assert.equal(cadastro.corpo.email, email)
    assert.equal(cadastro.corpo.email_verificado_em, null)
    assert.equal('senha_hash' in cadastro.corpo, false, 'senha_hash nunca é devolvido')

    const login = await api('POST', '/auth/login', { corpo: { email: email.toUpperCase(), senha: SENHA } })
    assert.equal(login.status, 200)
    assert.ok(login.corpo.token_acesso)
    assert.ok(login.cookie, 'login define o cookie de sessão')

    const me = await api('GET', '/auth/me', { token: login.corpo.token_acesso })
    assert.equal(me.status, 200)
    assert.equal(me.corpo.tipo_usuario, 'CONTRATANTE')
  })

  test('recusa e-mail repetido e dados inválidos', async () => {
    const { usuario } = await cadastrar('CONTRATANTE')
    const repetido = await api('POST', '/usuarios', {
      corpo: { nome_completo: 'Outra', email: usuario.email, senha: SENHA, tipo_usuario: 'CONTRATANTE' },
    })
    assert.equal(repetido.status, 409)

    const invalido = await api('POST', '/usuarios', {
      corpo: { nome_completo: '', email: 'sem-arroba', senha: '123', tipo_usuario: 'CONTRATANTE' },
    })
    assert.equal(invalido.status, 400)
    const campos = invalido.corpo.detalhes.map((d) => d.campo)
    assert.deepEqual(campos.sort(), ['email', 'nome_completo', 'senha'])
  })

  test('só um admin cadastra outro admin', async () => {
    const corpo = { nome_completo: 'Novo Admin', email: emailUnico('admin'), senha: SENHA, tipo_usuario: 'ADMIN' }
    assert.equal((await api('POST', '/usuarios', { corpo })).status, 403)

    const contratante = await cadastrar('CONTRATANTE')
    assert.equal((await api('POST', '/usuarios', { corpo, token: contratante.token })).status, 403)

    const admin = await entrar(ADMIN.email, ADMIN.senha)
    const criado = await api('POST', '/usuarios', { corpo, token: admin.token })
    assert.equal(criado.status, 201)
    assert.equal(criado.corpo.tipo_usuario, 'ADMIN')
  })

  test('senha errada e e-mail inexistente recebem a mesma resposta', async () => {
    const { usuario } = await cadastrar('CONTRATANTE')
    const senhaErrada = await api('POST', '/auth/login', { corpo: { email: usuario.email, senha: 'errada123' } })
    const inexistente = await api('POST', '/auth/login', { corpo: { email: emailUnico('ninguem'), senha: 'errada123' } })
    assert.equal(senhaErrada.status, 401)
    assert.equal(inexistente.status, 401)
    assert.deepEqual(senhaErrada.corpo, inexistente.corpo)
  })

  test('conta bloqueada não entra', async () => {
    const { usuario } = await cadastrar('CONTRATANTE')
    const admin = await entrar(ADMIN.email, ADMIN.senha)
    const bloqueio = await api('PATCH', `/usuarios/${usuario.id}/status`, {
      token: admin.token,
      corpo: { status: 'BLOQUEADO', motivo_bloqueio: 'Teste' },
    })
    assert.equal(bloqueio.status, 200)

    const login = await api('POST', '/auth/login', { corpo: { email: usuario.email, senha: SENHA } })
    assert.equal(login.status, 403)
    assert.equal(login.corpo.erro, 'Conta bloqueada')
  })
})

describe('sessão', () => {
  test('rota protegida exige token', async () => {
    assert.equal((await api('GET', '/auth/me')).status, 401)
    assert.equal((await api('GET', '/auth/me', { token: 'token-falso' })).status, 401)
  })

  test('refresh troca o cookie e devolve um novo token de acesso', async () => {
    const conta = await cadastrar('CONTRATANTE')
    const renovada = await api('POST', '/auth/refresh', { cookie: conta.cookie })
    assert.equal(renovada.status, 200)
    assert.ok(renovada.corpo.token_acesso)
    assert.ok(renovada.cookie)
    assert.notEqual(renovada.cookie, conta.cookie)
    assert.equal((await api('GET', '/auth/me', { token: renovada.corpo.token_acesso })).status, 200)
  })

  test('reusar um cookie antigo depois da carência encerra a sessão', async () => {
    const conta = await cadastrar('CONTRATANTE')
    const renovada = await api('POST', '/auth/refresh', { cookie: conta.cookie })
    assert.equal(renovada.status, 200)

    // Simula que a troca aconteceu há um minuto, fora dos 30 segundos de carência.
    await query("UPDATE sessoes SET rotacionado_em = rotacionado_em - INTERVAL '1 minute' WHERE usuario_id = $1", [conta.usuario.id])

    assert.equal((await api('POST', '/auth/refresh', { cookie: conta.cookie })).status, 401)
    // A sessão inteira caiu, inclusive o cookie novo.
    assert.equal((await api('POST', '/auth/refresh', { cookie: renovada.cookie })).status, 401)
  })

  test('logout encerra a sessão', async () => {
    const conta = await cadastrar('CONTRATANTE')
    const saida = await api('POST', '/auth/logout', { token: conta.token, cookie: conta.cookie })
    assert.equal(saida.status, 204)
    assert.equal((await api('GET', '/auth/me', { token: conta.token })).status, 401)
    assert.equal((await api('POST', '/auth/refresh', { cookie: conta.cookie })).status, 401)
  })
})
