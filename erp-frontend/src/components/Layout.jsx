import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { 
  Users, Package, Truck, UserRound, 
  LogOut, Menu, X, ShoppingCart, 
  Calculator, Warehouse, ClipboardList
} from 'lucide-react'

export default function Layout({ user, onLogout, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()

  const navItems = [
     { to: "/", label: "Tableau de Bord", icon: Calculator, roles: ['ADMIN', 'COMPTABLE', 'ACHETEUR', 'MAGASINIER', 'COMMERCIAL'] }, 
    { to: "/users", label: "Utilisateurs", icon: Users, roles: ['ADMIN'] }, 
    { to: "/produits", label: "Produits", icon: Package, roles: ['ADMIN', 'MAGASINIER', 'ACHETEUR', 'COMPTABLE', 'COMMERCIAL'] }, 
    { to: "/fournisseur", label: "Fournisseur", icon: Truck, roles: ['ADMIN', 'MAGASINIER', 'ACHETEUR', 'COMPTABLE', 'COMMERCIAL'] },
    { to: "/clients", label: "Clients", icon: UserRound, roles: ['ADMIN', 'ACHETEUR', 'COMPTABLE', 'COMMERCIAL'] },
    { to: "/vente", label: "Vente", icon: ShoppingCart, roles: ['ADMIN', 'MAGASINIER','COMPTABLE', 'COMMERCIAL'] },
    { to: "/chauffeurs", label: "Chauffeurs", icon: Truck, roles: ['ADMIN', 'MAGASINIER'] },
    { to: "/achat", label: "Achat", icon: ShoppingCart, roles: ['ADMIN', 'ACHETEUR', 'COMPTABLE', 'MAGASINIER'] },
    { to: "/stock", label: "Stock", icon: Warehouse, roles: ['ADMIN', 'MAGASINIER'] },
    { to: "/inventaire", label: "Inventaire", icon: ClipboardList, roles: ['ADMIN', 'MAGASINIER'] },
  ]

  const filteredNav = navItems.filter(item => item.roles.includes(user.role))

  const styles = {
    container: { display: 'flex', height: '100vh', backgroundColor: '#fef9c3', fontFamily: 'Inter, sans-serif', overflow: 'hidden' },
    sidebar: { 
      width: sidebarOpen ? '260px' : '0px', 
      backgroundColor: '#3e2723',
      color: '#d7ccc8', 
      display: 'flex', 
      flexDirection: 'column', 
      flexShrink: 0, 
      transition: 'width 0.3s', 
      borderRight: '1px solid #4e342e',
      overflow: 'hidden'
    },
    sidebarHeader: { padding: '14px 16px', borderBottom: '1px solid #4e342e', display: 'flex', alignItems: 'center', gap: '14px' },
    logoImg: { 
      height: '78px',  // NGEZAINA
      width: '78px',   // NGEZAINA
      objectFit: 'cover', // COVER MBA FENO TSARA
      objectPosition: 'center',
      background: 'white',
      borderRadius: '50%',
      border: '3.5px solid #fde68a',
      flexShrink: 0,
      padding: '0px', // NESORINA PADDING MBA NGEZA
      imageRendering: 'auto',
      boxShadow: '0 0 0 2px white inset'
    },
    logoText: { fontSize: '23px', fontWeight: '900', color: '#fef9c3', lineHeight: '1.1', letterSpacing: '0.8px' },
    role: { fontSize: '10px', color: '#bcaaa4', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '3px' },
    nav: { flex: 1, padding: '12px 8px', fontSize: '14px', overflowY: 'auto' },
    menuItem: (isActive) => ({ 
      display: 'flex', alignItems: 'center', gap: '10px', 
      padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', 
      color: isActive ? '#fef9c3' : '#d7ccc8', 
      backgroundColor: isActive ? '#5d4037' : 'transparent', 
      fontWeight: isActive ? '700' : '400', 
      transition: 'all 0.2s', marginBottom: '4px',
      borderLeft: isActive ? '3px solid #fde68a' : '3px solid transparent'
    }),
    sidebarFooter: { padding: '16px', borderTop: '1px solid #4e342e', background: '#2c1a16' },
    userName: { fontSize: '14px', fontWeight: '600', color: '#fef9c3' },
    userRole: { fontSize: '12px', color: '#bcaaa4', marginBottom: '12px', textTransform: 'uppercase' },
    logoutBtn: { 
      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', 
      gap: '8px', padding: '10px', fontSize: '14px', 
      background: '#6d4c41',
      color: 'white', borderRadius: '10px', border: '1px solid #8d6e63', 
      cursor: 'pointer', transition: 'all 0.2s', fontWeight: '600'
    },
    yellowBar: { height: '4px', background: 'linear-gradient(90deg, #fde68a, #facc15)' },
    mainContent: { flex: 1, display: 'flex', flexDirection: 'column' },
    navbar: { 
      height: '52px', background: 'white', 
      borderBottom: '2px solid #efebe9', 
      display: 'flex', justifyContent: 'space-between', 
      alignItems: 'center', padding: '0 24px', 
      fontSize: '13px', color: '#5d4037', flexShrink: 0 
    },
    main: { flex: 1, overflowY: 'auto', padding: '24px' },
    menuToggle: { background: '#efebe9', border: '1px solid #d7ccc8', cursor: 'pointer', color: '#5d4037', padding: '8px', borderRadius: '8px', display: 'flex' }
  }

  return (
    <div style={styles.container}>
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <img src="/leromba1.png" alt="Logo" style={styles.logoImg}/> 
          <div>
            <div style={styles.logoText}>LE ROMBA</div>
            <p style={styles.role}>{user.role}</p>
          </div>
        </div>
        
        <nav style={styles.nav}>
          {filteredNav.map(item => {
            const isActive = location.pathname === item.to
            return (
              <div 
                key={item.to}
                style={styles.menuItem(isActive)}
                onClick={() => navigate(item.to)}
                onMouseOver={(e) => !isActive && (e.currentTarget.style.backgroundColor = '#4e342e')}
                onMouseOut={(e) => !isActive && (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <item.icon size={18}/>
                {item.label}
              </div>
            )
          })}
        </nav>
        
        <div style={styles.sidebarFooter}>
          <p style={styles.userName}>{user.username}</p>
          <p style={styles.userRole}>{user.role}</p>
          <button 
            onClick={onLogout} 
            style={styles.logoutBtn}
            onMouseOver={(e) => e.currentTarget.style.background = '#4e342e'}
            onMouseOut={(e) => e.currentTarget.style.background = '#6d4c41'}
          >
            <LogOut size={16}/> Déconnexion
          </button>
        </div>
        <div style={styles.yellowBar}></div>
      </aside>

      <div style={styles.mainContent}>
        <header style={styles.navbar}>
          <button style={styles.menuToggle} onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X size={18}/> : <Menu size={18}/>}
          </button>
          <span style={{fontWeight: 600}}>Connecté: <span style={{color: '#3e2723'}}>{user.username}</span></span>
        </header>
        <main style={styles.main}>
          {children}
        </main>
      </div>
    </div>
  )
}