// Rotas usadas pela tela "Minha conta": PATCH /usuarios/:id e PUT /usuarios/:id/foto-perfil.
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { ADMIN, SENHA, api, cadastrar, emailUnico, enderecoServidor, entrar, marcarLinks, tokenDoEmail } from './ajudantes.js'

// PNG de 1x1 pixel.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)

function formularioFoto(bytes, tipo = 'image/png', nome = 'foto.png') {
  const formulario = new FormData()
  formulario.append('foto', new Blob([bytes], { type: tipo }), nome)
  return formulario
}

describe('nome', () => {
  test('a pessoa troca o próprio nome sem informar a senha', async () => {
    const conta = await cadastrar('CONTRATANTE')
    const r = await api('PATCH', `/usuarios/${conta.usuario.id}`, { token: conta.token, corpo: { nome_completo: '  Nome Novo  ' } })
    assert.equal(r.status, 200)
    assert.equal(r.corpo.nome_completo, 'Nome Novo')
  })

  test('não altera a conta de outra pessoa', async () => {
    const a = await cadastrar('CONTRATANTE')
    const b = await cadastrar('CONTRATANTE')
    const r = await api('PATCH', `/usuarios/${b.usuario.id}`, { token: a.token, corpo: { nome_completo: 'Invasor' } })
    assert.equal(r.status, 403)
  })

  test('o admin troca o próprio nome', async () => {
    const admin = await entrar(ADMIN.email, ADMIN.senha)
    const r = await api('PATCH', `/usuarios/${admin.usuario.id}`, { token: admin.token, corpo: { nome_completo: 'Admin Renomeado' } })
    assert.equal(r.status, 200)
    assert.equal(r.corpo.nome_completo, 'Admin Renomeado')
  })
})

describe('senha', () => {
  test('exige a senha atual correta', async () => {
    const conta = await cadastrar('CONTRATANTE')
    const caminho = `/usuarios/${conta.usuario.id}`

    const semAtual = await api('PATCH', caminho, { token: conta.token, corpo: { senha: 'NovaSenha@1' } })
    assert.equal(semAtual.status, 400)
    assert.equal(semAtual.corpo.detalhes[0].campo, 'senha_atual')

    const errada = await api('PATCH', caminho, { token: conta.token, corpo: { senha: 'NovaSenha@1', senha_atual: 'errada123' } })
    assert.equal(errada.status, 400)
    assert.equal(errada.corpo.detalhes[0].campo, 'senha_atual')

    const curta = await api('PATCH', caminho, { token: conta.token, corpo: { senha: '123', senha_atual: SENHA } })
    assert.equal(curta.status, 400)
    assert.equal(curta.corpo.detalhes[0].campo, 'senha')
  })

  test('trocar a senha encerra as sessões e a nova senha passa a valer', async () => {
    const conta = await cadastrar('CONTRATANTE')
    const outraSessao = await entrar(conta.usuario.email)
    const nova = 'NovaSenha@123'

    const r = await api('PATCH', `/usuarios/${conta.usuario.id}`, { token: conta.token, corpo: { senha: nova, senha_atual: SENHA } })
    assert.equal(r.status, 200)

    assert.equal((await api('GET', '/auth/me', { token: conta.token })).status, 401)
    assert.equal((await api('GET', '/auth/me', { token: outraSessao.token })).status, 401)
    assert.equal((await api('POST', '/auth/refresh', { cookie: outraSessao.cookie })).status, 401)

    assert.equal((await api('POST', '/auth/login', { corpo: { email: conta.usuario.email, senha: SENHA } })).status, 401)
    // É o que a tela faz logo depois de trocar a senha.
    const novaSessao = await entrar(conta.usuario.email, nova)
    assert.equal((await api('GET', '/auth/me', { token: novaSessao.token })).status, 200)
  })
})

describe('e-mail', () => {
  test('exige a senha atual, zera a confirmação e envia o link para o novo endereço', async () => {
    const conta = await cadastrar('CONTRATANTE')
    const caminho = `/usuarios/${conta.usuario.id}`
    const novoEmail = emailUnico('novo')

    const semSenha = await api('PATCH', caminho, { token: conta.token, corpo: { email: novoEmail } })
    assert.equal(semSenha.status, 400)

    const marca = marcarLinks()
    const r = await api('PATCH', caminho, { token: conta.token, corpo: { email: novoEmail.toUpperCase(), senha_atual: SENHA } })
    assert.equal(r.status, 200)
    assert.equal(r.corpo.email, novoEmail)
    assert.equal(r.corpo.email_verificado_em, null)

    // A sessão continua valendo e o login passa a usar o novo e-mail.
    assert.equal((await api('GET', '/auth/me', { token: conta.token })).status, 200)
    await entrar(novoEmail)

    const token = await tokenDoEmail(novoEmail, '/verificar-email', marca)
    assert.equal((await api('POST', '/auth/verificacao-email/confirmar', { corpo: { token } })).status, 200)
    assert.ok((await api('GET', '/auth/me', { token: conta.token })).corpo.email_verificado_em)
  })

  test('enviar o mesmo e-mail não pede senha nem zera a confirmação', async () => {
    const conta = await cadastrar('CONTRATANTE')
    const r = await api('PATCH', `/usuarios/${conta.usuario.id}`, { token: conta.token, corpo: { email: conta.usuario.email } })
    assert.equal(r.status, 200)
  })

  test('não aceita um e-mail que já é de outra conta', async () => {
    const a = await cadastrar('CONTRATANTE')
    const b = await cadastrar('CONTRATANTE')
    const r = await api('PATCH', `/usuarios/${a.usuario.id}`, { token: a.token, corpo: { email: b.usuario.email, senha_atual: SENHA } })
    assert.equal(r.status, 409)
  })

  test('o admin altera o e-mail de outra pessoa sem a senha dela', async () => {
    const conta = await cadastrar('CONTRATANTE')
    const admin = await entrar(ADMIN.email, ADMIN.senha)
    const novoEmail = emailUnico('pelo.admin')
    const r = await api('PATCH', `/usuarios/${conta.usuario.id}`, { token: admin.token, corpo: { email: novoEmail } })
    assert.equal(r.status, 200)
    assert.equal(r.corpo.email, novoEmail)
  })
})

describe('foto de perfil', () => {
  test('envia uma imagem válida, que fica disponível em /uploads', async () => {
    const conta = await cadastrar('CONTRATANTE')
    const r = await api('PUT', `/usuarios/${conta.usuario.id}/foto-perfil`, { token: conta.token, formulario: formularioFoto(PNG) })
    assert.equal(r.status, 200)
    assert.match(r.corpo.foto_perfil_storage_key, /\.png$/)

    const arquivo = await fetch(`${enderecoServidor()}${r.corpo.foto_perfil_url}`)
    assert.equal(arquivo.status, 200)
    assert.deepEqual(Buffer.from(await arquivo.arrayBuffer()), PNG)

    const me = await api('GET', '/auth/me', { token: conta.token })
    assert.equal(me.corpo.foto_perfil_storage_key, r.corpo.foto_perfil_storage_key)
  })

  test('recusa um arquivo que só finge ser imagem', async () => {
    const conta = await cadastrar('CONTRATANTE')
    const falso = formularioFoto(Buffer.from('<script>alert(1)</script>'), 'image/png')
    const r = await api('PUT', `/usuarios/${conta.usuario.id}/foto-perfil`, { token: conta.token, formulario: falso })
    assert.equal(r.status, 400)
  })

  test('recusa tipos que não são imagem', async () => {
    const conta = await cadastrar('CONTRATANTE')
    const pdf = formularioFoto(Buffer.from('%PDF-1.4'), 'application/pdf', 'doc.pdf')
    const r = await api('PUT', `/usuarios/${conta.usuario.id}/foto-perfil`, { token: conta.token, formulario: pdf })
    assert.equal(r.status, 400)
  })

  test('não troca a foto de outra pessoa', async () => {
    const a = await cadastrar('CONTRATANTE')
    const b = await cadastrar('CONTRATANTE')
    const r = await api('PUT', `/usuarios/${b.usuario.id}/foto-perfil`, { token: a.token, formulario: formularioFoto(PNG) })
    assert.equal(r.status, 403)
  })
})
