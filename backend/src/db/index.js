import fs from 'node:fs'
import { config } from '../config.js'

// Interface única para os dois drivers: query(sql, params) -> { rows, rowCount }.
let driver

async function conectar() {
  if (config.databaseUrl) {
    const pg = (await import('pg')).default
    // BIGINT (OID 20) e retornado como number em vez de string.
    pg.types.setTypeParser(20, Number)
    const pool = new pg.Pool({ connectionString: config.databaseUrl })
    return {
      nome: 'PostgreSQL',
      query: (sql, params) => pool.query(sql, params),
      exec: (sql) => pool.query(sql),
      fechar: () => pool.end(),
    }
  }

  const { PGlite, types } = await import('@electric-sql/pglite')
  fs.mkdirSync(config.pgliteDir, { recursive: true })
  const db = new PGlite(config.pgliteDir, { parsers: { [types.INT8]: Number } })
  return {
    nome: `PGlite (${config.pgliteDir})`,
    query: async (sql, params) => {
      const r = await db.query(sql, params)
      return { rows: r.rows, rowCount: r.affectedRows ?? r.rows.length }
    },
    exec: (sql) => db.exec(sql),
    fechar: () => db.close(),
  }
}

export async function iniciarBanco() {
  driver = await conectar()

  const { rows } = await driver.query("SELECT to_regclass('public.usuarios') AS tabela")
  if (!rows[0].tabela) {
    const schema = fs.readFileSync(new URL('./schema.sql', import.meta.url), 'utf8')
    await driver.exec(schema)
    console.log('Tabelas criadas a partir de schema.sql')
  }
  await driver.exec(fs.readFileSync(new URL('./migracoes.sql', import.meta.url), 'utf8'))
  return driver
}

export function query(sql, params = []) {
  if (!driver) throw new Error('Banco de dados não iniciado')
  return driver.query(sql, params)
}

export async function queryUm(sql, params = []) {
  const { rows } = await query(sql, params)
  return rows[0] ?? null
}

export function fecharBanco() {
  return driver?.fechar()
}
