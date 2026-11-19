import { Link } from 'react-router-dom'

export default function EmBreve() {
  return (
    <section className="mx-auto max-w-md py-16 text-center">
      <h1 className="font-titulo text-3xl font-bold">Essa página ainda não existe</h1>
      <p className="mt-3 text-suave">
        Ela está nos nossos planos, mas ainda não ficou pronta. Enquanto isso, que tal encontrar um cuidador?
      </p>
      <Link to="/cuidadores" className="mt-6 inline-block rounded-full bg-marca px-6 py-2.5 text-sm font-semibold text-white hover:bg-marca-escura">
        Buscar cuidadores
      </Link>
    </section>
  )
}
