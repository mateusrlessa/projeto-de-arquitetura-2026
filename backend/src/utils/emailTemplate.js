// Monta o e-mail (HTML e texto simples) dos links de confirmação de e-mail e de recuperação de senha.
// O HTML usa tabelas e estilos inline, porque programas de e-mail ignoram CSS externo e layouts modernos.

const COR = {
  marca: '#358a90',
  botao: '#2d7e84',
  marcaClara: '#eaf5f5',
  textoMarca: '#1f5f64',
  fundo: '#f7f5f1',
  tinta: '#2b3436',
  corpo: '#4a5557',
  suave: '#5b6567',
  borda: '#dfe3e2',
}
const FONTE = "'Segoe UI', Helvetica, Arial, sans-serif"

const escapar = (texto) =>
  String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

// 30 -> "30 minutos"; 60 -> "1 hora"; 120 -> "2 horas".
export function duracao(minutos) {
  if (minutos % 60 === 0) {
    const horas = minutos / 60
    return `${horas} ${horas === 1 ? 'hora' : 'horas'}`
  }
  return `${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`
}

export const TEXTOS = {
  VERIFICAR_EMAIL: {
    assunto: 'Confirme seu e-mail no CuidaAqui',
    caminho: '/verificar-email',
    titulo: 'Confirme seu e-mail',
    introducao: 'Falta só um passo para ativar sua conta no CuidaAqui. Clique no botão abaixo para confirmar este endereço de e-mail.',
    introducaoTexto: 'Falta só um passo para ativar sua conta no CuidaAqui. Para confirmar este endereço de e-mail, abra este link:',
    botao: 'Confirmar e-mail',
    previa: 'Confirme seu e-mail para ativar sua conta.',
    avisoTitulo: 'Não criou uma conta?',
    aviso: 'Ignore esta mensagem e não abra o link: nada será alterado.',
  },
  RECUPERAR_SENHA: {
    assunto: 'Redefina sua senha do CuidaAqui',
    caminho: '/nova-senha',
    titulo: 'Redefina sua senha',
    introducao: 'Recebemos um pedido para redefinir a senha da sua conta no CuidaAqui. Clique no botão abaixo para criar uma nova senha.',
    introducaoTexto: 'Recebemos um pedido para redefinir a senha da sua conta no CuidaAqui. Para criar uma nova senha, abra este link:',
    botao: 'Criar nova senha',
    previa: 'Use o link para criar uma nova senha.',
    avisoTitulo: 'Não pediu essa mudança?',
    aviso:
      'Ignore esta mensagem: sua senha continua a mesma. Por segurança, não encaminhe este e-mail nem compartilhe o link com ninguém. O CuidaAqui nunca pede sua senha por e-mail.',
  },
}

export function montarEmail({ finalidade, nome, link, validadeMinutos, ano = new Date().getFullYear() }) {
  const t = TEXTOS[finalidade]
  const primeiroNome = nome ? String(nome).trim().split(/\s+/)[0] : ''
  const saudacao = primeiroNome ? `Olá, ${primeiroNome}!` : 'Olá!'
  const validade = `O link vale por ${duracao(validadeMinutos)} e só pode ser usado uma vez.`

  const texto = [
    t.assunto,
    '',
    saudacao,
    '',
    t.introducaoTexto,
    '',
    link,
    '',
    validade,
    '',
    `${t.avisoTitulo} ${t.aviso}`,
    '',
    '--',
    `CuidaAqui © ${ano}`,
    'Mensagem automática, por favor não responda.',
  ].join('\n')

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapar(t.assunto)}</title>
</head>
<body style="margin:0;padding:0;background:${COR.fundo};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escapar(t.previa)} ${escapar(validade)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COR.fundo};">
<tr><td align="center" style="padding:24px 12px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid ${COR.borda};border-radius:16px;">
    <tr><td style="padding:40px 40px 0 40px;font-family:${FONTE};font-size:26px;font-weight:bold;color:${COR.marca};">CuidaAqui</td></tr>
    <tr><td style="padding:20px 40px 0 40px;font-family:${FONTE};font-size:30px;line-height:36px;font-weight:bold;color:${COR.tinta};">${escapar(t.titulo)}</td></tr>
    <tr><td style="padding:20px 40px 0 40px;font-family:${FONTE};font-size:16px;line-height:26px;color:${COR.tinta};">${escapar(saudacao)}</td></tr>
    <tr><td style="padding:8px 40px 0 40px;font-family:${FONTE};font-size:16px;line-height:26px;color:${COR.corpo};">${escapar(t.introducao)}</td></tr>
    <tr><td align="center" style="padding:28px 40px 0 40px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td bgcolor="${COR.botao}" style="border-radius:12px;">
          <a href="${escapar(link)}" style="display:inline-block;padding:16px 36px;font-family:${FONTE};font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:12px;">${escapar(t.botao)}</a>
        </td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:28px 40px 0 40px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td bgcolor="${COR.marcaClara}" style="border-radius:12px;padding:14px 16px;font-family:${FONTE};font-size:14px;line-height:21px;color:${COR.textoMarca};">${escapar(validade)}</td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:28px 40px 0 40px;font-family:${FONTE};font-size:13px;line-height:20px;color:${COR.suave};">Se o botão não funcionar, copie e cole este endereço no navegador:</td></tr>
    <tr><td style="padding:8px 40px 0 40px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td bgcolor="${COR.fundo}" style="border-radius:8px;padding:12px;font-family:Consolas,Menlo,monospace;font-size:12px;line-height:18px;color:${COR.tinta};word-break:break-all;"><a href="${escapar(link)}" style="color:${COR.tinta};text-decoration:none;">${escapar(link)}</a></td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:28px 40px 0 40px;"><div style="height:1px;line-height:1px;background:${COR.borda};">&nbsp;</div></td></tr>
    <tr><td style="padding:24px 40px 40px 40px;font-family:${FONTE};font-size:13px;line-height:21px;color:${COR.suave};"><strong style="color:${COR.tinta};">${escapar(t.avisoTitulo)}</strong> ${escapar(t.aviso)}</td></tr>
  </table>
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;">
    <tr><td align="center" style="padding:20px 12px 0 12px;font-family:${FONTE};font-size:12px;line-height:18px;color:${COR.suave};">CuidaAqui © ${ano} · Mensagem automática, por favor não responda.</td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`

  return { assunto: t.assunto, html, texto }
}
