import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import {
  LayoutDashboard, FileText, ShoppingCart, Package,
  TrendingDown, BookOpen, Users, UserCog, Archive,
  Link, Wallet, LogOut, Menu, X, Bell, ChevronDown
} from 'lucide-react'
import toast from 'react-hot-toast'

const NAV = [
  { to:'/',                icon:LayoutDashboard, label:'Tableau de bord',   roles:['PDG','COMPTABLE','CAISSIERE','GESTIONNAIRE'] },
  { to:'/bons-commande',  icon:FileText,         label:'Bons de commande',  roles:['PDG','CAISSIERE','GESTIONNAIRE'] },
  { to:'/ventes',         icon:ShoppingCart,     label:'Ventes',            roles:['PDG','COMPTABLE','CAISSIERE','GESTIONNAIRE'] },
  { to:'/stock',          icon:Package,          label:'Stock',             roles:['PDG','GESTIONNAIRE','COMPTABLE'] },
  { to:'/fiches-techniques',icon:Link,           label:'Fiches techniques', roles:['PDG','GESTIONNAIRE','COMPTABLE'] },
  { to:'/charges',        icon:TrendingDown,     label:'Charges',           roles:['PDG','COMPTABLE'] },
  { to:'/catalogue',      icon:BookOpen,         label:'Catalogue',         roles:['PDG','GESTIONNAIRE','CAISSIERE'] },
  { to:'/clients',        icon:Users,            label:'Clients',           roles:['PDG','CAISSIERE','GESTIONNAIRE'] },
  { to:'/archives',       icon:Archive,          label:'Archives',          roles:['PDG','COMPTABLE','CAISSIERE','GESTIONNAIRE'] },
  { to:'/paye',           icon:Wallet,           label:'Paie personnel',    roles:['PDG','COMPTABLE'] },
  { to:'/utilisateurs',   icon:UserCog,          label:'Utilisateurs',      roles:['PDG'] },
]

const RBADGE = {
  PDG:          'bg-red-100 text-red-800',
  CAISSIERE:    'bg-emerald-100 text-emerald-800',
  COMPTABLE:    'bg-blue-100 text-blue-800',
  GESTIONNAIRE: 'bg-purple-100 text-purple-800'
}

export default function Layout() {
  const { user, logout, can } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    toast.success('Deconnecte')
    navigate('/login')
  }

  const visible = NAV.filter(item => item.roles.some(r => can(r)))

  const SideContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-bjc-800">
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow">
          <img src="/logo.png" alt="BJC"
            className="h-8 w-auto object-contain"
            onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='block' }} />
          <span style={{display:'none'}} className="text-bjc-600 font-black text-sm">BJC</span>
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-tight">IMPRIMERIE BJC</p>
          <p className="text-bjc-300 text-xs">ERP v2.1</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {visible.map(({ to, icon:Icon, label }) => (
          <NavLink key={to} to={to} end={to==='/'} onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-white/20 text-white shadow-sm'
                  : 'text-bjc-100 hover:bg-white/10 hover:text-white'
              }`}>
            <Icon size={15} className="flex-shrink-0" />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="px-2 py-3 border-t border-bjc-800">
        <div className="flex items-center gap-2.5 px-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-bjc-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user?.nom?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">{user?.nom}</p>
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${RBADGE[user?.role]}`}>
              {user?.role}
            </span>
          </div>
        </div>
        <button onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 text-bjc-100 hover:text-white hover:bg-white/10 rounded-lg text-sm transition-colors">
          <LogOut size={14} /> Deconnexion
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col bg-bjc-700 w-56 flex-shrink-0">
        <SideContent />
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-bjc-700 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-bjc-800">
              <span className="text-white font-semibold text-sm">Menu</span>
              <button onClick={() => setOpen(false)} className="text-white"><X size={18} /></button>
            </div>
            <SideContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header mobile */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-bjc-700 text-white flex-shrink-0">
          <button onClick={() => setOpen(true)}><Menu size={20} /></button>
          <span className="font-bold text-sm">IMPRIMERIE BJC</span>
          <Bell size={16} className="opacity-70" />
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
