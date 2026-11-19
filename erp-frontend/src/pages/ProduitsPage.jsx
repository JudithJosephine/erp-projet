import { useEffect, useState, useCallback } from "react";
import api from "../utils/api";
import ProduitForm from "../components/ProduitForm";
import { Plus, Edit2, Trash2, Package, Loader2, ChevronLeft, ChevronRight, CheckCircle, XCircle, Search, X, RotateCw, List, FolderPlus } from "lucide-react";

const styles = {
  container: { padding: '24px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  title: { fontSize: '24px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' },
  btnPrimary: { padding: '10px 16px', fontSize: '14px', fontWeight: '600', color: 'white', background: '#16a34a', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  btnTopGhost: { padding: '10px 16px', fontSize: '14px', fontWeight: '600', color: '#475569', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  headerActions: { display: 'flex', gap: '8px' },
  searchBar: { display: 'flex', gap: '12px', marginBottom: '16px' },
  searchInput: { flex: 1, padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' },
  tableWrapper: { width: '100%', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', background: '#f8fafc', textTransform: 'uppercase' },
  td: { padding: '12px 16px', fontSize: '14px', color: '#334155', borderTop: '1px solid #f1f5f9' },
  badge: { padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' },
  badgeActive: { background: '#f0fdf4', color: '#16a34a' },
  badgeInactive: { background: '#fef2f2', color: '#dc2626' },
  actionBtn: { padding: '6px', border: 'none', borderRadius: '6px', cursor: 'pointer', background: 'transparent' },
  pagination: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: '1px solid #f1f5f9', background: 'white' },
  paginationBtn: { padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: '600' },
  paginationInfo: { fontSize: '13px', color: '#64748b' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: 'white', padding: '20px', borderRadius: '12px', width: '750px', maxHeight: '85vh', overflowY: 'auto' },
  logItem: { borderLeft: '3px solid #16a34a', padding: '12px', marginBottom: '10px', background: '#f8fafc', borderRadius: '6px' },
  actionBadge: { padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', color: 'white' }
};

const formatAr = (val) => {
  const num = parseFloat(val) || 0;
  return num.toLocaleString('fr-MG') + ' Ar';
}

export default function ProduitsPage() {
  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingProduit, setEditingProduit] = useState(null);
  const [userRole, setUserRole] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(5);
  const [total, setTotal] = useState(0);
  const [showAudit, setShowAudit] = useState(false);
  const [auditData, setAuditData] = useState([]);
  const [selectedProduit, setSelectedProduit] = useState(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [showCatModal, setShowCatModal] = useState(false);
  const [newCat, setNewCat] = useState({nom: '', description: ''});

  const fetchProduits = useCallback(() => {
    setLoading(true);
    api.get(`/produits/?ordering=-id&page=${page}&page_size=${pageSize}&search=${search}`) // Ampiana ordering=-id
 .then(res => { 
      const results = res.data.results || [];
      setProduits(results.reverse()); // <-- IZAO: Avadika mba ho any farany ny vaovao
      setTotal(res.data.count || 0); 
    })
 .catch(() => { setProduits([]); setTotal(0); })
 .finally(() => { setLoading(false) });
  }, [page, pageSize, search]);

  const fetchAudit = async (produitId = null, aPage = 1) => {
    try {
      setSelectedProduit(produitId? produits.find(p => p.id === produitId) : null);
      let url = `/produits/audit-global/?page=${aPage}`;
      if(produitId) url = `/produits/${produitId}/audit/?page=${aPage}`;
      const res = await api.get(url);
      setAuditData(res.data.results || []);
      setHistoryTotal(res.data.count || 0);
      setHistoryPage(aPage);
      setShowAudit(true);
    } catch (error) { alert("Tsy manana droit hijery journal d'audit ianao") }
  };

  const handleCreateCategorie = async (e) => {
    e.preventDefault();
    try {
      await api.post('/categories/', newCat);
      alert("Catégorie créée avec succès");
      setShowCatModal(false);
      setNewCat({nom: '', description: ''});
      window.location.reload();
    } catch (error) { alert(Object.values(error.response?.data || {}).flat().join("\n") || "Erreur"); }
  }

  const getActionColor = (action) => {
    if (action === 'CREATE') return '#16a34a';
    if (action === 'UPDATE') return '#f59e0b';
    if (action === 'DELETE') return '#dc2626';
    return '#64748b';
  }

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setUserRole(user.role || 'USER');
  }, []);

  useEffect(() => { fetchProduits(); }, [fetchProduits]);

  const handleSearch = (e) => { setSearch(e.target.value); setPage(1); }
  const openModal = (produit = null) => { setEditingProduit(produit); setShowModal(true); };
  const closeModal = () => { setEditingProduit(null); setShowModal(false); };

  const canEditAll = userRole === 'ADMIN';
  const canEditSome = userRole === 'MAGASINIER';
  const canCreate = userRole === 'ADMIN';
  const canViewAudit = userRole === 'ADMIN';
  const showActions = canEditAll || canEditSome;
  const role = userRole;

  const handleSubmit = async (form) => {
    setSaving(true);
    try {
      let payload = {
        code: form.code, designation: form.designation, description: form.description,
        prix_achat: parseFloat(form.prix_achat) || 0, prix_vente: parseFloat(form.prix_vente) || 0,
        categorie: form.categorie || null, is_active: form.is_active
      };
      if (canEditSome &&!canEditAll) {
        payload = { prix_vente: parseFloat(form.prix_vente) || 0, description: form.description, categorie: form.categorie || null, is_active: form.is_active }
      }
      if (form.id) { 
        await api.put(`/produits/${form.id}/`, payload); 
      }
      else { 
        await api.post("/produits/", payload);
        // AMPIANA ITY: Mandeha any amin'ny page farany rehefa mamorona
        const newTotal = total + 1;
        const newTotalPages = Math.ceil(newTotal / pageSize);
        setPage(newTotalPages);
      }
      closeModal(); 
      fetchProduits(); // Hi-load ny page farany
    } catch (error) { alert(Object.values(error.response?.data || {}).flat().join("\n")); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer ce produit?")) return;
    await api.delete(`/produits/${id}/`); fetchProduits();
  };

  const totalPages = Math.ceil(total / pageSize);
  const startItem = total === 0? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  if (loading && produits.length === 0) return <div style={{display:'flex', justifyContent:'center', alignItems:'center', height:'70vh'}}><Loader2 className="animate-spin" size={32} color="#16a34a"/></div>

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}><Package size={24} /> Liste des produits</h1>
        <div style={styles.headerActions}>
          {canViewAudit && <button onClick={() => fetchAudit()} style={styles.btnTopGhost}><List size={14}/> Journal d'audit</button>}
          {(canCreate || role === 'ACHETEUR') && <button onClick={() => setShowCatModal(true)} style={styles.btnTopGhost}><FolderPlus size={14}/> Nouvelle Catégorie</button>}
          {canCreate && <button onClick={() => openModal()} style={styles.btnPrimary}><Plus size={16}/> Nouveau Produit</button>}
        </div>
      </div>
      <div style={styles.searchBar}>
        <div style={{position: 'relative', flex: 1}}>
          <Search size={16} style={{position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8'}}/>
          <input type="text" placeholder="Recher par code, désignation..." value={search} onChange={handleSearch} style={{...styles.searchInput, paddingLeft: '36px'}}/>
        </div>
      </div>
      <div style={styles.tableWrapper}>
        {loading && produits.length > 0 && <div style={{padding: '10px', textAlign: 'center', fontSize: '12px', color: '#64748b'}}>Chargement...</div>}
        <table style={styles.table}>
          <thead><tr>
            <th style={{...styles.th, width: '120px'}}>Code</th>
            <th style={styles.th}>Désignation</th>
            <th style={{...styles.th, width: '130px', textAlign: 'right'}}>Prix Achat</th>
            <th style={{...styles.th, width: '130px', textAlign: 'right'}}>Prix Vente</th>
            <th style={{...styles.th, width: '150px'}}>Catégorie</th>
            <th style={{...styles.th, width: '110px', textAlign: 'center'}}>Statut</th>
            {showActions && <th style={{...styles.th, width: '130px', textAlign: 'center'}}>ACT.</th>}
          </tr></thead>
          <tbody>
            {produits.length === 0 &&!loading? (
              <tr><td colSpan={showActions? "7" : "6"} style={{padding: '40px', textAlign: 'center', color: '#64748b'}}>Tsy misy produit</td></tr>
            ) : produits.map(p => (
                <tr key={p.id}>
                  <td style={styles.td}><b>{p.code}</b></td>
                  <td style={styles.td}><div style={{fontWeight: 600}}>{p.designation}</div></td>
                  <td style={{...styles.td, textAlign: 'right'}}><b>{formatAr(p.prix_achat)}</b></td>
                  <td style={{...styles.td, textAlign: 'right'}}><b style={{color: '#16a34a'}}>{formatAr(p.prix_vente)}</b></td>
                  <td style={styles.td}>{p.categorie_nom || '-'}</td>
                  <td style={{...styles.td, textAlign: 'center'}}><span style={{...styles.badge,...(p.is_active? styles.badgeActive : styles.badgeInactive)}}>{p.is_active? <CheckCircle size={12}/> : <XCircle size={12}/>} {p.is_active? 'Actif' : 'Inactif'}</span></td>
                  {showActions && (
                    <td style={{...styles.td, textAlign: 'center'}}>
                      <div style={{display: 'flex', gap: '4px', justifyContent: 'center'}}>
                        <button onClick={() => openModal(p)} title="Modifier" style={{...styles.actionBtn, color: '#475569'}}><Edit2 size={16}/></button>
                        {canEditAll && <button onClick={() => handleDelete(p.id)} title="Supprimer" style={{...styles.actionBtn, color: '#dc2626'}}><Trash2 size={16}/></button>}
                        {canViewAudit && <button onClick={() => fetchAudit(p.id)} title="Journal d'audit produit" style={{...styles.actionBtn, color: '#7c3aed'}}><RotateCw size={16}/></button>}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
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
      <ProduitForm show={showModal} onClose={closeModal} onSubmit={handleSubmit} produit={editingProduit} saving={saving} canEditAll={canEditAll} canEditSome={canEditSome} />
      {showAudit && ( <div style={styles.modalOverlay} onClick={() => setShowAudit(false)}> <div style={styles.modal} onClick={(e) => e.stopPropagation()}> <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems: 'center'}}> <h3 style={{fontSize: '16px', fontWeight: '700'}}>Journal d'audit: {selectedProduit? selectedProduit.designation : 'Tous les Produits'}</h3> <button onClick={() => setShowAudit(false)} style={{border: 'none', background: 'none', cursor: 'pointer'}}> <X size={20} /> </button> </div> {auditData.length === 0? <p style={{textAlign: 'center', color: '#64748b'}}>Aucun audit</p> : auditData.map(log => ( <div key={log.id} style={styles.logItem}> <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '6px'}}> <span style={{...styles.actionBadge, background: getActionColor(log.action)}}>{log.action}</span> <small style={{color: '#64748b'}}>{new Date(log.timestamp).toLocaleString('fr-FR')}</small> </div> <p style={{margin: '0 0 6px 0', fontSize: '12px'}}><b>User:</b> {log.user_username} - <b>Role:</b> {log.user_role}</p> <p style={{margin: '0 0 6px 0', fontSize: '12px'}}><b>Produit:</b> {log.target_name}</p> </div> ))} </div> </div> )}
      {showCatModal && ( <div style={styles.modalOverlay} onClick={() => setShowCatModal(false)}> <div style={{...styles.modal, width: '400px'}} onClick={(e) => e.stopPropagation()}> <h3 style={{marginBottom: '15px'}}>Nouvelle Catégorie</h3> <form onSubmit={handleCreateCategorie}> <label style={{fontSize: '13px', fontWeight: '600'}}>Nom *</label> <input type="text" value={newCat.nom} onChange={(e) => setNewCat({...newCat, nom: e.target.value})} style={styles.searchInput} required /> <label style={{marginTop: '10px', fontSize: '13px', fontWeight: '600'}}>Description</label> <textarea value={newCat.description} onChange={(e) => setNewCat({...newCat, description: e.target.value})} style={{...styles.searchInput, minHeight: '80px'}} /> <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '15px'}}> <button type="button" onClick={() => setShowCatModal(false)} style={styles.btnTopGhost}>Annuler</button> <button type="submit" style={styles.btnPrimary}>Enregistrer</button> </div> </form> </div> </div> )}
    </div>
  );
}