import { Routes, Route, Navigate } from 'react-router-dom' 
import { useState } from 'react'
import './index.css' 
import { useAuth } from './hooks/useAuth'
import LoginPage from './pages/LoginPage'
import Layout from './components/Layout'

// TSY ILAY DASHBOARD TALOHA INTSONY
// import AdminDashboard from './pages/dashboards/AdminDashboard'
// import AcheteurDashboard from './pages/dashboards/AcheteurDashboard'
// import CommercialDashboard from './pages/dashboards/CommercialDashboard'
// import ComptableDashboard from './pages/dashboards/ComptableDashboard'
// import MagasinierDashboard from './pages/dashboards/MagasinierDashboard'

// CRUD Pages
import UsersPage from './pages/UsersPage' 
import UserForm from './components/UserForm' 
import ProduitsPage from './pages/ProduitsPage'
import ProduitForm from './components/ProduitForm'
import FournisseursPage from './pages/FournisseursPage'
import FournisseurForm from './components/FournisseurForm'
import ClientsPage from './pages/ClientsPage'
import ClientForm from './components/ClientForm'
import StockPage from './pages/StockPage'
import MouvementStockForm from './components/MouvementStockForm'
import AchatLayout from "./pages/achat/AchatLayout";
import VenteLayout from "./pages/vente/VenteLayout"; 
import PilotageDashboard from './pages/pilotage/PilotageDashboard'
import InventairePage from './pages/InventairePage'
import ReglementPage from './pages/ReglementPage'
import ChauffeurPage from './pages/parametrage/ChauffeurPage'
import FournisseurPortalPage from './pages/Portal/FournisseurPortalPage';

function App() {
  const { user, login, logout, loading } = useAuth()
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (u, p) => {
    try {
      setError('')
      setIsLoading(true)
      await login(u, p)
    } catch {
      setError('Login échoué. Vérifie username/password')
    }
    setIsLoading(false)
  }

  if(loading) return <p style={{textAlign: 'center', marginTop: 100}}>Chargement...</p>
  if(!user) return <LoginPage onLogin={handleLogin} error={error} loading={isLoading} />

  // ESORINA FA TSY ILANA INTSONY
  // const renderDashboardByRole = () => { ... }

  const canAccessAchat = ['ADMIN', 'ACHETEUR', 'MAGASINIER', 'COMPTABLE', 'COMMERCIAL'].includes(user.role)
  const canAccessVente = ['ADMIN', 'COMMERCIAL', 'COMPTABLE', 'MAGASINIER'].includes(user.role)
  const isAdmin = user.role === 'ADMIN'

  return (
    <Layout user={user} onLogout={logout}>
      <Routes>
        {/* ITO IHANY NO ROUTE "/" - Pilotage no default ho an'ny rehetra */}
        <Route path="/" element={<PilotageDashboard />} />
        
        <Route path="/users" element={isAdmin ? <UsersPage /> : <Navigate to="/" />} /> 
        <Route path="/produits" element={<ProduitsPage />} /> 
        <Route path="/fournisseur" element={<FournisseursPage />} /> 
        <Route path="/clients" element={<ClientsPage />} /> 
        <Route path="/stock" element={<StockPage />} />
        <Route path="/inventaire" element={<InventairePage />} />
        <Route path="/reglement" element={<ReglementPage />} />
        <Route path="/chauffeurs" element={<ChauffeurPage />} />
        <Route path="/portail/dp/:id" element={<FournisseurPortalPage />} />
        {canAccessAchat && <Route path="/achat/*" element={<AchatLayout />} />}
        {canAccessVente && <Route path="/vente/*" element={<VenteLayout />} />}

        {/* FORMS ADMIN */}
        {isAdmin && (
          <>
            <Route path="/users/new" element={<UserForm />} />
            <Route path="/users/:id/edit" element={<UserForm />} />
            <Route path="/produits/new" element={<ProduitForm />} />
            <Route path="/produits/:id/edit" element={<ProduitForm />} /> 
            <Route path="/clients/new" element={<ClientForm />} />
            <Route path="/clients/:id/edit" element={<ClientForm />} />
            <Route path="/fournisseur/new" element={<FournisseurForm />} />
            <Route path="/fournisseur/:id/edit" element={<FournisseurForm />} />
            <Route path="/stock/new" element={<MouvementStockForm />} />
            <Route path="/stock/:id/edit" element={<MouvementStockForm />} />
          </>
        )}

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  )
}
export default App