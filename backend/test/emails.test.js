import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { SENHA, api, cadastrar, emailUnico, marcarLinks, query, tokenDoEmail } from './ajudantes.js'

describe('confirmação de e-mail', () => {
  test('o link do cadastro confirma o e-mail uma única vez', async () => {
    const conta = await cadastrar('CONTRATANTE')
    const token = await tokenDoEmail(conta.usuario.email, '/verificar-email')

    const confirmado = await api('POST', '/auth/verificacao-email/confirmar', { corpo: { token } })
    assert.equal(confirmado.status, 200)

    const me = await api('GET', '/auth/me', { token: conta.token })
    assert.ok(me.corpo.email_verificado_em)

    const reuso = await api('POST', '/auth/verificacao-email/confirmar', { corpo: { token } })
    assert.equal(reuso.status, 400)
  })

  test('pedir um novo link invalida o anterior', async () => {
    const conta = await cadastrar('CONTRATANTE')
    const antigo = await tokenDoEmail(conta.usuario.email, '/verificar-email')

    const marca = marcarLinks()
    const reenvio = await api('POST', '/auth/verificacao-email/solicitar', { token: conta.token })
    assert.equal(reenvio.status, 202)
    const novo = await tokenDoEmail(conta.usuario.email, '/verificar-email', marca)
    assert.notEqual(novo, antigo)

    assert.equal((await api('POST', '/auth/verificacao-email/confirmar', { corpo: { token: antigo } })).status, 400)
    assert.equal((await api('POST', '/auth/verificacao-email/confirmar', { corpo: { token: novo } })).status, 200)
  })
})

describe('recuperação de senha', () => {
  test('responde igual exista ou não a conta', async () => {
    const conta = await cadastrar('CONTRATANTE')
    const existe = await api('POST', '/auth/recuperacao-senha/solicitar', { corpo: { email: conta.usuario.email } })
    const naoExiste = await api('POST', '/auth/recuperacao-senha/solicitar', { corpo: { email: emailUnico('ninguem') } })
    assert.equal(existe.status, 202)
    assert.deepEqual(existe.corpo, naoExiste.corpo)
  })

  test('o link redefine a senha, encerra as sessões e confirma o e-mail', async () => {
    const conta = await cadastrar('CONTRATANTE')
    const marca = marcarLinks()
    await api('POST', '/auth/recuperacao-senha/solicitar', { corpo: { email: conta.usuario.email } })
    const token = await tokenDoEmail(conta.usuario.email, '/nova-senha', marca)

    const nova = 'NovaSenha@456'
    const redefinida = await api('POST', '/auth/recuperacao-senha/confirmar', { corpo: { token, senha: nova } })
    assert.equal(redefinida.status, 200)

    assert.equal((await api('GET', '/auth/me', { token: conta.token })).status, 401, 'sessão antiga encerrada')
    assert.equal((await api('POST', '/auth/login', { corpo: { email: conta.usuario.email, senha: SENHA } })).status, 401)

    const login = await api('POST', '/auth/login', { corpo: { email: conta.usuario.email, senha: nova } })
    assert.equal(login.status, 200)
    assert.ok(login.corpo.usuario.email_verificado_em)

    const reuso = await api('POST', '/auth/recuperacao-senha/confirmar', { corpo: { token, senha: 'Outra@7890' } })
    assert.equal(reuso.status, 400)
  })

  test('token vencido recebe a mesma resposta de token inexistente', async () => {
    const conta = await cadastrar('CONTRATANTE')
    const marca = marcarLinks()
    await api('POST', '/auth/recuperacao-senha/solicitar', { corpo: { email: conta.usuario.email } })
    const token = await tokenDoEmail(conta.usuario.email, '/nova-senha', marca)
    await query("UPDATE tokens_email SET expira_em = CURRENT_TIMESTAMP - INTERVAL '1 minute' WHERE usuario_id = $1", [conta.usuario.id])

    const vencido = await api('POST', '/auth/recuperacao-senha/confirmar', { corpo: { token, senha: 'Senha@9999' } })
    const inexistente = await api('POST', '/auth/recuperacao-senha/confirmar', { corpo: { token: 'nao-existe', senha: 'Senha@9999' } })
    assert.equal(vencido.status, 400)
    assert.deepEqual(vencido.corpo, inexistente.corpo)
  })
})
