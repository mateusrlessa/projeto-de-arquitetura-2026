import app from './app.js'
import { config } from './config.js'
import { iniciarBanco } from './db/index.js'
import { garantirAdmin } from './db/admin.js'

const banco = await iniciarBanco()
await garantirAdmin()

app.listen(config.porta, () => {
  console.log(`Banco de dados: ${banco.nome}`)
  console.log(`Servidor rodando em http://localhost:${config.porta}`)
})
