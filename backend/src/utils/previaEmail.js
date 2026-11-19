// Gera os e-mails de exemplo em arquivos HTML para abrir no navegador, sem precisar de SMTP nem de banco.
// Uso: npm run email:previa
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { montarEmail, TEXTOS } from './emailTemplate.js'

const pasta = path.join(os.tmpdir(), 'cuidaaqui-previa-email')
fs.mkdirSync(pasta, { recursive: true })

for (const [finalidade, validadeMinutos] of [['RECUPERAR_SENHA', 30], ['VERIFICAR_EMAIL', 60]]) {
  const link = `http://localhost:5173${TEXTOS[finalidade].caminho}#token=k9Jx2mQp7VdR4tYwB1nLsUe8HcA3GfZ0oXiN5aMbT6E`
  const { html, texto } = montarEmail({ finalidade, nome: 'Maria Souza', link, validadeMinutos })
  const base = path.join(pasta, finalidade === 'RECUPERAR_SENHA' ? 'recuperar-senha' : 'confirmar-email')
  fs.writeFileSync(`${base}.html`, html)
  fs.writeFileSync(`${base}.txt`, texto)
  console.log(`${base}.html`)
}
