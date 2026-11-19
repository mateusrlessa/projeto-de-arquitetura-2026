import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import SomenteAdmin from './components/SomenteAdmin.jsx'
import SomenteCuidador from './components/SomenteCuidador.jsx'
import SomenteContratante from './components/SomenteContratante.jsx'
import SomenteLogado from './components/SomenteLogado.jsx'
import SomenteParticipante from './components/SomenteParticipante.jsx'
import AdminModeracao from './pages/AdminModeracao.jsx'
import AdminNovoAdmin from './pages/AdminNovoAdmin.jsx'
import AdminUsuarios from './pages/AdminUsuarios.jsx'
import Acesso from './pages/Acesso.jsx'
import Avaliacoes from './pages/Avaliacoes.jsx'
import Cuidadores from './pages/Cuidadores.jsx'
import Contrato from './pages/Contrato.jsx'
import DetalheServico from './pages/DetalheServico.jsx'
import EmBreve from './pages/EmBreve.jsx'
import Inicio from './pages/Inicio.jsx'
import MeuPerfil from './pages/MeuPerfil.jsx'
import MinhaConta from './pages/MinhaConta.jsx'
import NovaSenha from './pages/NovaSenha.jsx'
import PerfilCuidador from './pages/PerfilCuidador.jsx'
import Servicos from './pages/Servicos.jsx'
import RecuperarSenha from './pages/RecuperarSenha.jsx'
import VerificarEmail from './pages/VerificarEmail.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Inicio />} />
        <Route path="cuidadores" element={<Cuidadores />} />
        <Route path="cuidadores/:id" element={<PerfilCuidador />} />
        <Route element={<SomenteContratante />}>
          <Route path="cuidadores/:id/contratar" element={<Contrato />} />
        </Route>
        <Route path="acesso" element={<Acesso />} />
        <Route path="recuperar-senha" element={<RecuperarSenha />} />
        <Route path="nova-senha" element={<NovaSenha />} />
        <Route path="verificar-email" element={<VerificarEmail />} />
        <Route element={<SomenteLogado />}>
          <Route path="minha-conta" element={<MinhaConta />} />
        </Route>
        <Route element={<SomenteParticipante />}>
          <Route path="servicos" element={<Servicos />} />
          <Route path="servicos/:id" element={<DetalheServico />} />
        </Route>
        <Route element={<SomenteCuidador />}>
          <Route path="meu-perfil" element={<MeuPerfil />} />
          <Route path="avaliacoes" element={<Avaliacoes />} />
        </Route>
        <Route element={<SomenteAdmin />}>
          <Route path="admin" element={<Navigate to="/admin/usuarios" replace />} />
          <Route path="admin/usuarios" element={<AdminUsuarios />} />
          <Route path="admin/moderacao" element={<AdminModeracao />} />
          <Route path="admin/novo-admin" element={<AdminNovoAdmin />} />
        </Route>
        <Route path="*" element={<EmBreve />} />
      </Route>
    </Routes>
  )
}
