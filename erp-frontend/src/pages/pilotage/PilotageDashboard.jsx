import { useEffect, useState } from 'react'
import api from "../../utils/api";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function PilotageDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [iaAlertes, setIaAlertes] = useState([])
  const [suggestions, setSuggestions] = useState({})
  const [loadingSugg, setLoadingSugg] = useState(null)
  const [openNotif, setOpenNotif] = useState(false) // <-- Ajouté

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get('/pilotage/dashboard/'),
      api.get('/ia/alerte-rupture/')
    ])
   .then(([resPilotage, resIA]) => {
      setData(resPilotage.data)
      setIaAlertes(resIA.data.data || [])
    })
   .catch(err => {
      console.error("Erreur Chargement:", err)
      setError("Impossible de charger les données")
    })
   .finally(() => setLoading(false))
  }, [])

  const getSuggestion = async (produit_id) => {
    setLoadingSugg(produit_id)
    try {
      const res = await api.get(`/ia/suggestion-fournisseur/${produit_id}/`)
      setSuggestions(prev => ({...prev, [produit_id]: res.data.suggestions}))
    } catch(err) {
      console.error(err)
      alert("Aucun historique d'achat pour ce produit")
    }
    setLoadingSugg(null)
  }

  if(loading) return <p style={{padding: 16, fontSize: 13}}>Chargement...</p>
  if(error) return <p style={{padding: 16, color: 'red', fontSize: 13}}>{error}</p>
  if(!data) return <p style={{padding: 16, fontSize: 13}}>Aucune donnée</p>

  const k = data.kpi || {}
  const format = n => new Intl.NumberFormat('fr-FR').format(n || 0) + ' Ar'
  const hasGraphData = data.graph?.some(d => d.ventes > 0 || d.achats > 0)
  const showVentesLine = k.ventes_mois!== undefined
  const showAchatsLine = k.achats_mois!== undefined
  const canSeeIA = ['ADMIN', 'ACHETEUR', 'MAGASINIER'].includes(data.role)
  const canSeePrix = ['ADMIN', 'ACHETEUR'].includes(data.role)

  return (
    <div style={{padding: '20px 24px', fontSize: 14}}> 
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
        <div>
          <h1 style={{margin: 0, fontSize: 26}}>Tableau de Bord</h1> 
          <p style={{color: '#6B7280', margin: '4px 0 0 0', fontSize: 13}}>Connecté: <strong>{data.role}</strong></p>
        </div>
      </div>

      {/* NOTIFICATIONS CLIQUABLE */}
      {canSeeIA && (
        <div style={{
          border: '1px solid #E9D5FF',
          background: '#FAF5FF',
          borderRadius: 8,
          marginBottom: 20,
          overflow: 'hidden'
        }}>
          {/* Header cliquable */}
          <div 
            onClick={() => setOpenNotif(!openNotif)}
            style={{
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center', 
              padding: '12px 14px',
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
              <span style={{fontSize: 18}}>🔔</span>
              <h3 style={{margin: 0, color: '#7C3AED', fontSize: 14, fontWeight: 600}}>
                Notifications
              </h3>
              {iaAlertes.length > 0 && (
                <span style={{
                  background: '#DC2626', 
                  color: 'white', 
                  fontSize: 10, 
                  padding: '2px 6px', 
                  borderRadius: 10,
                  fontWeight: 700
                }}>
                  {iaAlertes.length}
                </span>
              )}
            </div>
            <span style={{fontSize: 12, color: '#7C3AED'}}>
              {openNotif ? '▲' : '▼'}
            </span>
          </div>

          {/* Contenu - mivoaka raha cliquena */}
          {openNotif && (
            <div style={{padding: '0 14px 12px 14px', borderTop: '1px solid #E9D5FF', paddingTop: 12}}>
              {iaAlertes.length === 0 ? (
                <p style={{margin: 0, color: '#10B981', fontWeight: 500, fontSize: 12}}>✅ Aucune alerte</p>
              ) : (
                <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
                  {iaAlertes.map(p => (
                    <div key={p.produit_id} style={{padding: '8px', background: 'white', borderRadius: 6, border: '1px solid #F3F4F6'}}>
                      <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 12}}>
                        <span><strong>{p.produit}</strong> - {p.stock_actuel} pcs - Seuil: {p.seuil}</span>
                        <div style={{display: 'flex', gap: 6, alignItems: 'center'}}>
                          <span style={{color: p.alerte === 'CRITIQUE'? '#DC2626' : '#D97706', fontWeight: 600}}>{p.jours_restants}j</span>
                          {canSeePrix && (
                            <button 
                              onClick={() => getSuggestion(p.produit_id)} 
                              disabled={loadingSugg === p.produit_id} 
                              style={{fontSize: 10, padding: '2px 6px', background: '#8B5CF6', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer'}}
                            >
                              {loadingSugg === p.produit_id ? '...' : '💡'}
                            </button>
                          )}
                        </div>
                      </div>
                      {canSeePrix && suggestions[p.produit_id] && (
                        <p style={{margin: '4px 0 0 0', fontSize: 10}}>
                          <b>{suggestions[p.produit_id][0].fournisseur}</b>: {format(suggestions[p.produit_id][0].prix_moyen)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14}}>
        {k.ventes_mois!== undefined && <Card title="Ventes Mois" value={format(k.ventes_mois)} sub={`${k.ventes_nb || 0} fact`} color="#10B981"/>}
        {k.achats_mois!== undefined && <Card title="Achats Mois" value={format(k.achats_mois)} color="#F59E0B"/>}
        {k.marge!== undefined && <Card title="Marge Brute" value={format(k.marge)} color="#3B82F6"/>}
        {k.stock_value!== undefined && <Card title="Valeur Stock" value={format(k.stock_value)} sub={`${k.rupture || 0} rupture`} color="#8B5CF6"/>}
        {k.impayes_montant!== undefined && <Card title="Impayés" value={format(k.impayes_montant)} sub={`${k.impayes_nb || 0} fact`} color="#EF4444"/>}
        {k.dettes!== undefined && <Card title="Dettes FRS" value={format(k.dettes)} color="#EC4899"/>}
      </div>

      {hasGraphData && (
        <div style={{...cardStyle, marginTop: 20, height: 320, padding: 16}}> 
          <h3 style={{margin: '0 0 10px 0', fontSize: 16}}>Evolution 6 mois</h3> 
          <ResponsiveContainer width="100%" height="90%">
            <LineChart data={data.graph}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="mois" fontSize={12} /> 
              <YAxis tickFormatter={(v) => format(v)} fontSize={12} /> 
              <Tooltip formatter={(v) => format(v)} contentStyle={{fontSize: 13}} />
              <Legend wrapperStyle={{fontSize: 12}}/>
              {showVentesLine && <Line type="monotone" dataKey="ventes" stroke="#10B981" strokeWidth={3} name="Ventes" />} 
              {showAchatsLine && <Line type="monotone" dataKey="achats" stroke="#F59E0B" strokeWidth={3} name="Achats" />} 
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

const Card = ({title, value, sub, color}) => (
  <div style={{...cardStyle, padding: 16}}> 
    <p style={{margin: 0, color: '#6B7280', fontSize: 13, fontWeight: 500}}>{title}</p> 
    <h2 style={{color: color, margin: '6px 0', fontSize: 24}}>{value}</h2> 
    {sub && <small style={{color: '#9CA3AF', fontSize: 12}}>{sub}</small>} 
  </div>
)

const cardStyle = {
  border: '1px solid #E5E7EB',
  padding: 16,
  borderRadius: 10, 
  background: 'white',
  boxShadow: '0 2px 4px rgba(0,0,0,0.05)' 
}