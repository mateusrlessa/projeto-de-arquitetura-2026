import app from '../backend/src/app.js'
import { iniciarBanco } from '../backend/src/db/index.js'
import { garantirAdmin } from '../backend/src/db/admin.js'

// Na Vercel a API roda como função serverless: o banco é iniciado uma vez por instância.
let pronto

export default async function handler(req, res) {
  pronto ??= iniciarBanco().then(() => garantirAdmin())
  try {
    await pronto
  } catch (erro) {
    pronto = undefined
    throw erro
  }
  return app(req, res)
}
