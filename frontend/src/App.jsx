import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth.jsx'
import Login from './pages/Login.jsx'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import BonsCommande from './pages/BonsCommande.jsx'
import Ventes from './pages/Ventes.jsx'
import Stock from './pages/Stock.jsx'
import Charges from './pages/Charges.jsx'
import Catalogue from './pages/Catalogue.jsx'
import Clients from './pages/Clients.jsx'
import Archives from './pages/Archives.jsx'
import FichesTechniques from './pages/FichesTechniques.jsx'
import Paye from './pages/Paye.jsx'
import Utilisateurs from './pages/Utilisateurs.jsx'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="flex h-screen items-center justify-center text-bjc-500 text-sm">
      Chargement...
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="bons-commande" element={<BonsCommande />} />
        <Route path="ventes" element={<Ventes />} />
        <Route path="stock" element={<Stock />} />
        <Route path="charges" element={<Charges />} />
        <Route path="catalogue" element={<Catalogue />} />
        <Route path="fiches-techniques" element={<FichesTechniques />} />
        <Route path="clients" element={<Clients />} />
        <Route path="archives" element={<Archives />} />
        <Route path="paye" element={<Paye />} />
        <Route path="utilisateurs" element={<Utilisateurs />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
