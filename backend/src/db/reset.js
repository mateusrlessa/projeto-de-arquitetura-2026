import { fecharBanco, iniciarBanco } from './index.js'

// Apaga todas as tabelas e tipos e recria o banco a partir de schema.sql.
const banco = await iniciarBanco()
await banco.exec('DROP SCHEMA public CASCADE; CREATE SCHEMA public;')
await fecharBanco()

await iniciarBanco()
await fecharBanco()
console.log('Banco recriado. Rode "npm run db:seed" para inserir os dados de exemplo.')
