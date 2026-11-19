import { useEffect, useState, useCallback } from "react";
import api from "../utils/api";
import MouvementStockForm from "../components/MouvementStockForm";
import { Package, Loader2, AlertTriangle, ChevronLeft, ChevronRight, Search, X, ArrowDownCircle, ArrowUpCircle, History } from "lucide-react";

const styles = {
  container: { padding: '24px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  title: { fontSize: '24px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' },
  btnInfo: { padding: '10px 16px', fontSize: '14px', fontWeight: '600', color: 'white', background: '#0ea5e9', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  btnSecondary: { padding: '10px 16px', fontSize: '14px', fontWeight: '600', color: 'white', background: '#ef4444', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  btnTopGhost: { padding: '10px 16px', fontSize: '14px', fontWeight: '600', color: '#475569', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  headerActions: { display: 'flex', gap: '8px' },
  searchBar: { display: 'flex', gap: '12px', marginBottom: '16px' },
  searchInput: { flex: 1, padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' },
  tableWrapper: { width: '100%', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', background: '#f8fafc', textTransform: 'uppercase' },
  td: { padding: '12px 16px', fontSize: '14px', color: '#334155', borderTop: '1px solid #f1f5f9' },
  badge: { padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' },
  badgeAlert: { background: '#fef2f2', color: '#dc2626' },
  badgeOk: { background: '#f0fdf4', color: '#16a34a' },
  actionBtn: { padding: '6px', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', background: 'white' },
  pagination: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: '1px solid #f1f5f9', background: 'white' },
  paginationBtn: { padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: '600' },
  paginationInfo: { fontSize: '13px', color: '#64748b' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: 'white', padding: '20px', borderRadius: '12px', width: '750px', maxHeight: '85vh', overflowY: 'auto' },
  logItem: { borderLeft: '3px solid #0ea5e9', padding: '12px', marginBottom: '10px', background: '#f8fafc', borderRadius: '6px' },
  actionBadge: { padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', color: 'white' }
};

export default function StockPage() {
  const [stocks, setStocks] = useState([]);
  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMouvementModal, setShowMouvementModal] = useState(false);
  const [mouvementType, setMouvementType] = useState('ENTREE_MANUELLE');
  const [saving, setSaving] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [showStockHistory, setShowStockHistory] = useState(false);
  const [stockHistoryData, setStockHistoryData] = useState([]);
  const [selectedProduit, setSelectedProduit] = useState(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);

  const fetchStocks = useCallback(() => {
    setLoading(true);
    api.get(`/stocks/?page=${page}&page_size=${pageSize}&search=${search}`)
  .then(res => { setStocks(res.data.results || []); setTotal(res.data.count || 0); })
  .catch(() => { setStocks([]); setTotal(0); })
  .finally(() => { setLoading(false) });
  }, [page, pageSize, search]);

  const fetchProduitsForSelect = () => {
    api.get(`/produits/?page_size=1000&is_active=true`).then(res => setProduits(res.data.results || []));
  }

  const fetchStockHistory = async (produitId = null, hPage = 1) => {
    try {
      setSelectedProduit(produitId? stocks.find(s => s.produit === produitId)?.produit_detail : null);
      let url = `/mouvements-stock/?page=${hPage}`;
      if(produitId) url += `&produit=${produitId}`;
      const res = await api.get(url);
      setStockHistoryData(res.data.results || []);
      setHistoryTotal(res.data.count || 0);
      setHistoryPage(hPage);
      setShowStockHistory(true);
    } catch (error) { alert("Tsy manana droit hijery historique stock ianao") }
  };

  const openMouvementModal = (type) => { setMouvementType(type); setShowMouvementModal(true); }
  const getActionColor = (action) => { if (action.includes('ENTREE')) return '#16a34a'; if (action.includes('SORTIE')) return '#ef4444'; return '#64748b'; }

  useEffect(() => { const user = JSON.parse(localStorage.getItem('user') || '{}'); setUserRole(user.role || 'USER'); }, []);
  useEffect(() => { fetchStocks(); fetchProduitsForSelect(); }, [fetchStocks]);

  const handleSearch = (e) => { setSearch(e.target.value); setPage(1); }
  const canManageStock = userRole === 'ADMIN' || userRole === 'MAGASINIER';
  const canViewStockHistory = userRole === 'ADMIN' || userRole === 'MAGASINIER';

  const handleMouvementSubmit = async (data) => {
    setSaving(true);
    try {
      await api.post('/mouvements-stock/', {
        produit: data.produit, quantite: Number(data.quantite), type: mouvementType, motif: data.motif || "", reference: data.reference || ""
      });
      alert(`${mouvementType.includes('ENTREE')? 'Entrée' : 'Sortie'} de stock enregistrée`);
      setShowMouvementModal(false); fetchStocks();
    } catch (error) { alert(Object.values(error.response?.data || {}).flat().join("\n")); }
    finally { setSaving(false); }
  }

  const totalPages = Math.ceil(total / pageSize);
  const startItem = total === 0? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);
  if (loading) return <div style={{display:'flex', justifyContent:'center', alignItems:'center', height:'70vh'}}><Loader2 className="animate-spin" size={32} color="#0ea5e9"/></div>

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}><Package size={24} /> Gestion de Stock</h1>
        <div style={styles.headerActions}>
          {canManageStock && <button onClick={() => openMouvementModal('SORTIE_MANUELLE')} style={styles.btnSecondary}><ArrowUpCircle size={14}/> Sortie Stock</button>}
          {canManageStock && <button onClick={() => openMouvementModal('ENTREE_MANUELLE')} style={styles.btnInfo}><ArrowDownCircle size={14}/> Entrée Stock</button>}
          {canViewStockHistory && <button onClick={() => fetchStockHistory()} style={styles.btnTopGhost}><History size={14}/> Historique</button>}
        </div>
      </div>
      <div style={styles.searchBar}>
        <div style={{position: 'relative', flex: 1}}>
          <Search size={16} style={{position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8'}}/>
          <input type="text" placeholder="Recher par code, désignation..." value={search} onChange={handleSearch} style={{...styles.searchInput, paddingLeft: '36px'}}/>
        </div>
      </div>
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead><tr>
            <th style={{...styles.th, width: '120px'}}>CODE</th>
            <th style={styles.th}>DÉSIGNATION</th>
            <th style={{...styles.th, width: '120px', textAlign: 'right'}}>STOCK ACTUEL</th>
            <th style={{...styles.th, width: '120px', textAlign: 'center'}}>SEUIL ALERTE</th>
            <th style={{...styles.th, width: '120px', textAlign: 'center'}}>STATUT</th>
            <th style={{...styles.th, width: '80px', textAlign: 'center'}}>HISTO</th>
          </tr></thead>
          <tbody>
            {stocks.length === 0? (
              <tr><td colSpan="6" style={{padding: '40px', textAlign: 'center', color: '#64748b'}}>Aucun Stock</td></tr>
            ) : stocks.map(s => {
              const p = s.produit_detail;
              return (
                <tr key={s.id} style={s.en_alerte? {background: '#fff7ed'} : {}}>
                  <td style={styles.td}><b>{p.code}</b></td>
                  <td style={styles.td}><div style={{fontWeight: 600}}>{p.designation}</div></td>
                  <td style={{...styles.td, textAlign: 'right'}}><b>{parseFloat(s.quantite).toFixed(2)}</b></td>
                  <td style={{...styles.td, textAlign: 'center'}}>{parseFloat(s.seuil_alerte).toFixed(2)}</td>
                  <td style={{...styles.td, textAlign: 'center'}}>
                    <span style={{...styles.badge,...(s.en_alerte? styles.badgeAlert : styles.badgeOk)}}>
                      <AlertTriangle size={12}/> {s.en_alerte? 'Alerte' : 'OK'}
                    </span>
                  </td>
                  <td style={{...styles.td, textAlign: 'center'}}>
                    <button onClick={() => fetchStockHistory(p.id)} style={styles.actionBtn}><History size={16}/></button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div style={styles.pagination}>
          <div style={styles.paginationInfo}>Affichage de {startItem} à {endItem} sur {total} produits</div>
          <div style={{display: 'flex', gap: '8px'}}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{...styles.paginationBtn, opacity: page === 1? 0.5 : 1}}><ChevronLeft size={14}/> Précédent</button>
            <span style={{padding: '8px 12px', fontSize: '13px', fontWeight: '600'}}>Page {page} / {totalPages || 1}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0} style={{...styles.paginationBtn, opacity: page === totalPages? 0.5 : 1}}>Suivant <ChevronRight size={14}/></button>
          </div>
        </div>
      </div>
      <MouvementStockForm show={showMouvementModal} onClose={() => setShowMouvementModal(false)} onSubmit={handleMouvementSubmit} produits={produits} type={mouvementType} saving={saving} />
      {showStockHistory && (
        <div style={styles.modalOverlay} onClick={() => setShowStockHistory(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems: 'center'}}>
              <h3 style={{fontSize: '16px', fontWeight: '700'}}>Historique: {selectedProduit? selectedProduit.designation : 'Tous les Produits'}</h3>
              <button onClick={() => setShowStockHistory(false)} style={{border: 'none', background: 'none', cursor: 'pointer'}}> <X size={20} /> </button>
            </div>
            {stockHistoryData.length === 0? <p style={{textAlign: 'center', color: '#64748b'}}>Aucun mouvement</p> :
              stockHistoryData.map(log => (
                <div key={log.id} style={styles.logItem}>
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '6px'}}>
                    <span style={{...styles.actionBadge, background: getActionColor(log.type)}}>{log.type}</span> 
                    <small style={{color: '#64748b'}}>{new Date(log.date_mouvement).toLocaleString('fr-FR')}</small>
                  </div>
                  <p style={{margin: '0 0 6px 0', fontSize: '12px'}}><b>Produit:</b> {log.produit_designation}</p>
                  <p style={{margin: '0 0 6px 0', fontSize: '12px'}}><b>User:</b> {log.fait_par_username} | <b>Qté:</b> {log.quantite}</p>
                  {log.motif && <p style={{margin: 0, fontSize: '12px'}}><b>Motif:</b> {log.motif}</p>}
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}