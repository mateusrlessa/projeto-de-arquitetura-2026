import fs from 'node:fs'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { config } from './config.js'
import { rotaNaoEncontrada, tratarErros } from './middlewares/erros.js'
import authRouter from './routes/auth.js'
import { avaliacoesGeraisRouter } from './routes/avaliacoes.js'
import cidadesRouter from './routes/cidades.js'
import contratacoesRouter from './routes/contratacoes.js'
import cuidadoresRouter from './routes/cuidadores.js'
import especializacoesRouter from './routes/especializacoes.js'
import estadosRouter from './routes/estados.js'
import moderacaoRouter from './routes/moderacao.js'
import usuariosRouter from './routes/usuarios.js'

fs.mkdirSync(config.uploadsDir, { recursive: true })

const app = express()

app.set('trust proxy', config.trustProxy)
app.use(helmet())
app.use(cors({ origin: config.corsOrigens }))
app.use(express.json())
app.use(cookieParser())
app.use('/uploads', express.static(config.uploadsDir))

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/auth', authRouter)
app.use('/api/usuarios', usuariosRouter)
app.use('/api/cuidadores', cuidadoresRouter)
app.use('/api/contratacoes', contratacoesRouter)
app.use('/api/estados', estadosRouter)
app.use('/api/cidades', cidadesRouter)
app.use('/api/especializacoes', especializacoesRouter)
app.use('/api/avaliacoes', avaliacoesGeraisRouter)
app.use('/api', moderacaoRouter)

app.use(rotaNaoEncontrada)
app.use(tratarErros)

export default app
