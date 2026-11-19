import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast, Toaster } from "sonner";
import { ClipboardList, Play, CheckCircle, XCircle, Loader2, Package, TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight } from "lucide-react";

const API_URL = "http://localhost:8000/api";
const LIGNES_PAR_PAGE = 4; 

axios.interceptors.request.use(config => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// STYLE NOHAVAIZINA
const styles = {
  container: { padding: '24px', minHeight: '100vh', background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  title: { fontSize: '28px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '12px' },
  titleIcon: { padding: '12px', background: 'linear-gradient(90deg, #2563eb 0%, #4f46e5 100%)', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' },
  card: { background: 'white', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', border: '1px solid #e2e8f0', overflow: 'hidden' },
  cardEmpty: { background: 'white', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '48px', textAlign: 'center', maxWidth: '600px', margin: '40px auto', border: '1px solid #e2e8f0' },
  emptyIcon: { width: '80px', height: '80px', background: '#dbeafe', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' },
  btnPrimary: { padding: '14px 28px', fontSize: '16px', fontWeight: '600', color: 'white', background: 'linear-gradient(90deg, #2563eb 0%, #4f46e5 100%)', border: 'none', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto', boxShadow: '0 4px 14px 0 rgb(37 99 235 / 39%)', transition: 'all 0.2s' },
  btnSuccess: { padding: '10px 16px', fontSize: '14px', fontWeight: '600', color: 'white', background: '#10b981', border: 'none', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', transition: 'all 0.2s' },
  btnGhost: { padding: '10px 16px', fontSize: '14px', fontWeight: '600', color: 'white', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', backdropFilter: 'blur(4px)', transition: 'all 0.2s' },
  btnPage: { padding: '8px 14px', fontSize: '14px', fontWeight: '600', color: '#334155', background: 'white', border: '1px solid #cbd5e1', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' },
  btnPageDisabled: { padding: '8px 14px', fontSize: '14px', fontWeight: '600', color: '#94a3b8', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'not-allowed', display: 'flex', alignItems: 'center', gap: '6px' },
  btnPageHover: { transform: 'translateY(-1px)', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }, // VAOVAO
  headerActions: { display: 'flex', gap: '10px' },
  headerGradient: { padding: '24px 32px', borderBottom: '1px solid #e2e8f0', background: 'linear-gradient(90deg, #2563eb 0%, #4f46e5 50%, #9333ea 100%)', color: 'white' },
  badge: { padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '700', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)' },
  tableWrapper: { width: '100%', overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#475569', background: '#f8fafc', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' },
  thCenter: { padding: '16px', textAlign: 'center', fontSize: '12px', fontWeight: '700', color: '#475569', background: '#f8fafc', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' },
  td: { padding: '16px', fontSize: '14px', color: '#334155', borderBottom: '1px solid #f1f5f9' },
  tdCenter: { padding: '16px', fontSize: '14px', color: '#334155', borderBottom: '1px solid #f1f5f9', textAlign: 'center' },
  input: { width: '112px', border: '2px solid #cbd5e1', borderRadius: '10px', padding: '8px 12px', textAlign: 'center', fontSize: '14px', fontWeight: '700', outline: 'none', transition: 'all 0.2s' },
  badgeTheorique: { padding: '6px 12px', background: '#dbeafe', color: '#1d4ed8', borderRadius: '8px', fontSize: '14px', fontWeight: '700' },
  badgeEcartUp: { padding: '6px 12px', background: '#d1fae5', color: '#059669', borderRadius: '8px', fontSize: '14px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' },
  badgeEcartDown: { padding: '6px 12px', background: '#fee2e2', color: '#dc2626', borderRadius: '8px', fontSize: '14px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' },
  badgeEcartZero: { padding: '6px 12px', background: '#f1f5f9', color: '#64748b', borderRadius: '8px', fontSize: '14px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' },
  footerNote: { padding: '16px 32px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }, // NOHAVAIZINA
  loader: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' },
  paginationText: { fontSize: '14px', color: '#64748b', fontWeight: '600' }
};

export default function InventairePage() {
  const [inventaire, setInventaire] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const user = JSON.parse(localStorage.getItem("user") || '{}');
  const canManage = ['ADMIN', 'MAGASINIER'].includes(user?.role);

  useEffect(() => { fetchInventaireEnCours(); }, []);

  const fetchInventaireEnCours = async () => {
    try {
      const res = await axios.get(`${API_URL}/inventaires/`);
      const data = res.data.results || res.data;
      const enCours = data.find(inv => inv.statut === "EN_COURS");
      if (enCours) {
        const lignesReversed = [...enCours.lignes].reverse();
        setInventaire({...enCours, lignes: lignesReversed });
        // Mandeha any page farany mivantana
        setPage(Math.ceil(lignesReversed.length / LIGNES_PAR_PAGE));
      }
    } catch (error) { toast.error("Erreur chargement inventaire"); }
  };

  const handleDemarrer = async () => {
    if(!canManage) return toast.error("Réservé à Admin et Magasinier");
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/inventaires/demarrer/`);
      const lignesReversed = [...res.data.lignes].reverse();
      setInventaire({...res.data, lignes: lignesReversed });
      setPage(1); // Page 1 satria vao 1 page
      toast.success("Nouvel inventaire démarré");
    } catch (error) { toast.error(error.response?.data?.error || "Erreur serveur"); }
    setLoading(false);
  };

  const handleAnnuler = async () => {
    if (!window.confirm("Annuler l'inventaire en cours?")) return;
    setLoading(true);
    try {
      await axios.post(`${API_URL}/inventaires/${inventaire.id}/annuler/`);
      toast.info("Inventaire annulé"); setInventaire(null); setPage(1);
    } catch (error) { toast.error("Erreur annulation"); }
    setLoading(false);
  }

  const handleUpdateLigne = async (produit_id, stock_reel, ligne_id) => {
    if (stock_reel === "" ||!canManage) return;
    try {
      const res = await axios.patch(`${API_URL}/inventaires/${inventaire.id}/update_ligne/`, { produit_id, stock_reel: parseFloat(stock_reel) });
      setInventaire(prev => {
        const newLignes = prev.lignes.map(l => l.id === ligne_id? res.data : l);
        return {...prev, lignes: newLignes }
      });
    } catch (error) { toast.error("Erreur mise à jour"); }
  };

  const handleValider = async () => {
    if(!canManage) return toast.error("Réservé à Admin et Magasinier");
    if (!window.confirm("Valider l'inventaire? Le stock sera corrigé automatiquement")) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/inventaires/${inventaire.id}/valider/`);
      toast.success(res.data.success); setInventaire(null); setPage(1);
    } catch (error) { toast.error(error.response?.data?.error || "Erreur validation"); }
    setLoading(false);
  };

  const handleInputChange = (ligne_id, value) => {
    setInventaire(prev => ({...prev, lignes: prev.lignes.map(l => l.id === ligne_id? {...l, stock_reel: value} : l) }));
  };

  const getEcartStyle = (ecart) => {
    const val = parseFloat(ecart);
    if (val > 0) return styles.badgeEcartUp;
    if (val < 0) return styles.badgeEcartDown;
    return styles.badgeEcartZero;
  }

  const getEcartIcon = (ecart) => {
    const val = parseFloat(ecart);
    if (val > 0) return <TrendingUp size={14}/>;
    if (val < 0) return <TrendingDown size={14}/>;
    return <Minus size={14}/>;
  }

  // LOGIQUE PAGINATION CORRECTE
  const lignes = inventaire?.lignes || [];
  const totalPages = Math.ceil(lignes.length / LIGNES_PAR_PAGE);
  const startIndex = (page - 1) * LIGNES_PAR_PAGE;
  const lignesAffichees = lignes.slice(startIndex, startIndex + LIGNES_PAR_PAGE);

  const handlePrev = () => { if(page > 1) setPage(page - 1); }
  const handleNext = () => { if(page < totalPages) setPage(page + 1); }

  if(loading &&!inventaire) return <div style={styles.loader}><Loader2 className="animate-spin" size={40} color="#2563eb"/></div>

  return (
    <div style={styles.container}>
      <Toaster position="top-right" richColors />
      <div style={styles.header}>
        <h1 style={styles.title}><div style={styles.titleIcon}><ClipboardList size={24} color="white"/></div> Gestion Inventaire</h1>
      </div>

      {!inventaire? (
        <div style={styles.cardEmpty}>
          <div style={styles.emptyIcon}><Package size={40} color="#2563eb"/></div>
          <h2 style={{fontSize: '24px', fontWeight: '700', color: '#0f172a', marginBottom: '12px'}}>Aucun inventaire en cours</h2>
          <p style={{marginBottom: '32px', color: '#64748b'}}>Démarrez un nouvel inventaire pour compter vos stocks</p>
          <button onClick={handleDemarrer} disabled={loading ||!canManage} style={{...styles.btnPrimary, opacity: loading ||!canManage? 0.5 : 1, cursor: loading ||!canManage? 'not-allowed' : 'pointer'}}>
            {loading? <Loader2 className="animate-spin" size={18}/> : <Play size={18}/>}
            {loading? "Démarrage..." : "Démarrer un Nouvel Inventaire"}
          </button>
          {!canManage && <p style={{fontSize: '13px', color: '#d97706', marginTop: '16px', fontWeight: '600'}}>Mode lecture seule</p>}
        </div>
      ) : (
        <div style={styles.card}>
          <div style={styles.headerGradient}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px'}}>
              <div>
                <h2 style={{fontSize: '22px', fontWeight: '700', marginBottom: '8px'}}>Inventaire #{inventaire.id}</h2>
                <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                  <span style={styles.badge}>{inventaire.statut}</span>
                  <span style={{fontSize: '14px', opacity: 0.9}}>Créé par: {inventaire.cree_par_nom}</span>
                </div>
              </div>
              {canManage && (
                <div style={styles.headerActions}>
                  <button onClick={handleAnnuler} disabled={loading} style={{...styles.btnGhost, opacity: loading? 0.5 : 1}}><XCircle size={16}/> Annuler</button>
                  <button onClick={handleValider} disabled={loading} style={{...styles.btnSuccess, opacity: loading? 0.5 : 1}}>{loading? <Loader2 className="animate-spin" size={16}/> : <CheckCircle size={16}/>} Valider</button>
                </div>
              )}
            </div>
          </div>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead><tr>
                <th style={styles.th}>Référence</th><th style={styles.th}>Désignation</th>
                <th style={styles.thCenter}>Stock Théorique</th><th style={styles.thCenter}>Stock Réel</th><th style={styles.thCenter}>Écart</th>
              </tr></thead>
              <tbody>
                {lignesAffichees.map((ligne, idx) => (
                  <tr key={ligne.id} style={{background: idx % 2 === 0? 'white' : '#f8fafc'}}>
                    <td style={styles.td}><b style={{fontFamily: 'monospace'}}>{ligne.produit_reference || 'N/A'}</b></td>
                    <td style={styles.td}>{ligne.produit_nom}</td>
                    <td style={styles.tdCenter}><span style={styles.badgeTheorique}>{parseFloat(ligne.stock_theorique).toFixed(2)}</span></td>
                    <td style={styles.tdCenter}>
                      <input 
                        type="number" 
                        step="0.01" 
                        disabled={!canManage} 
                        value={ligne.stock_reel === 0 || ligne.stock_reel === ''? '' : ligne.stock_reel}
                        onChange={(e) => handleInputChange(ligne.id, e.target.value)}
                        onBlur={(e) => { 
                          handleUpdateLigne(ligne.produit, e.target.value || 0, ligne.id)
                          e.target.style.borderColor = '#cbd5e1'
                        }}
                        placeholder="0"
                        style={{...styles.input, background:!canManage? '#f1f5f9' : 'white'}}
                        onFocus={e => e.target.style.borderColor = '#2563eb'}
                      />
                    </td>
                    <td style={styles.tdCenter}><span style={getEcartStyle(ligne.ecart)}>{getEcartIcon(ligne.ecart)} {parseFloat(ligne.ecart).toFixed(2)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* FOOTER MISY BOUTON PAGINATION NOHAVAIZINA */}
          <div style={styles.footerNote}>
            <span style={styles.paginationText}>
              Page {page} / {totalPages || 1} - {lignes.length} produits au total
            </span>
            <div style={{display: 'flex', gap: '8px'}}>
              <button 
                onClick={handlePrev} 
                disabled={page === 1} 
                style={page === 1? styles.btnPageDisabled : styles.btnPage}
                onMouseOver={e => page !== 1 && (e.currentTarget.style.transform = 'translateY(-1px)')}
                onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <ChevronLeft size={16}/> Précédent
              </button>
              <button 
                onClick={handleNext} 
                disabled={page === totalPages || totalPages === 0} 
                style={page === totalPages || totalPages === 0? styles.btnPageDisabled : styles.btnPage}
                onMouseOver={e => page !== totalPages && (e.currentTarget.style.transform = 'translateY(-1px)')}
                onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                Suivant <ChevronRight size={16}/>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}