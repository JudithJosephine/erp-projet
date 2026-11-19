import { useEffect, useState, useRef } from "react";
import api from "../../utils/api";
import { Loader2, ChevronLeft, ChevronRight, Plus, Edit, Save, X, Trash2, CheckCircle, Info, Mail } from "lucide-react";
import { toast, Toaster } from "sonner";

const STATUT_MAPPING = {
  BROUILLON: "Brouillon",
  EN_COURS: "En cours",
  VALIDEE: "Validée",
  COMMANDER: "À commander"
}

const STATUT_COLORS = {
  BROUILLON: { bg: '#f1f5f9', text: '#475569' },
  EN_COURS: { bg: '#fef3c7', text: '#92400e' },
  VALIDEE: { bg: '#dcfce7', text: '#166534' },
  COMMANDER: { bg: '#dbeafe', text: '#1e40af' },
}

const styles = {
  card: { background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow:'hidden' },
  th:{padding:'12px 16px', textAlign:'left', fontSize:12, background:'#f8fafc', fontWeight:600, color:'#475569', borderBottom:'1px solid #e2e8f0'},
  td:{padding:'12px 16px', borderTop:'1px solid #f1f5f9', fontSize:14},
  pagination:{display:'flex', justifyContent:'space-between', padding:16, alignItems:'center', borderTop:'1px solid #e2e8f0', marginTop:10},
  btnPrimary: { padding: '10px 16px', background: '#16a34a', color: 'white', border: 'none', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight:600 },
  btnSecondary: { padding: '8px 12px', background: '#0ea5e9', color: 'white', border: 'none', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize:12 },
  btnSuccess: { padding: '8px 12px', background: '#16a34a', color: 'white', border: 'none', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize:12 },
  btnDanger: { padding: '6px 8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' },
  btnMail: { padding: '6px 8px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', display:'flex', alignItems:'center' },
  modal: { position: 'fixed', top:0, left:0, right:0, bottom:0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding:20 },
  modalContent: { background: 'white', borderRadius: 12, padding: 24, width: '95%', maxWidth: 1200, maxHeight:'90vh', overflowY:'auto' },
  input: { padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6, width:'100%', fontSize:14 },
  badge: (status) => ({ padding:'4px 10px', borderRadius:20, fontSize:12, fontWeight:600, background: STATUT_COLORS[status]?.bg || '#f1f5f9', color: STATUT_COLORS[status]?.text || '#475569' }),
  alertInfo: {display:'flex', gap:8, padding:12, background:'#eff6ff', color:'#1e40af', borderRadius:8, marginBottom:12, alignItems:'center', fontSize:13}
}

export default function DemandePrixPage() {
  const [data, setData] = useState([]);
  const [daList, setDaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingLignes, setLoadingLignes] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(5);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDP, setSelectedDP] = useState(null);
  const [lignes, setLignes] = useState([]);
  const [produits, setProduits] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [initError, setInitError] = useState('');
  const [saving, setSaving] = useState(false);
  const [sendingMail, setSendingMail] = useState(null);
  const newIdCounter = useRef(0);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const role = user.role || 'COMMERCIAL';
  const canCreate = ['ACHETEUR'].includes(role);
  const canEditLigne = ['ADMIN', 'ACHETEUR'].includes(role);

  const fetchData = () => {
    setLoading(true);
    api.get(`/demandes-prix/?page=${page}&page_size=${pageSize}`)
   .then(res => {
        const sorted = (res.data.results || []).sort((a,b) => a.id - b.id);
        setData(sorted);
        setTotal(res.data.count || 0);
      })
   .catch(err => console.error(err)).finally(() => setLoading(false));
  };
  useEffect(() => { fetchData(); }, [page]);
  useEffect(() => { loadInitData(); }, []);

  const loadInitData = () => {
    setLoadingInit(true);
    setInitError('');
    Promise.all([
      api.get(`/demandes-prix/?page_size=1000`),
      api.get(`/demandes-achat/?statut=APPROUVER&page_size=1000`),
      api.get('/produits/?page_size=200'),
      api.get('/fournisseurs/?page_size=200').catch(() => api.get('/fournisseur/?page_size=200'))
    ]).then(([resDP, resDA, resP, resF]) => {
      const allDP = resDP.data.results || [];
      const allDA = resDA.data.results || [];
      const daAvecDP = new Set(
        allDP.map(dp => {
          if(typeof dp.demande_achat === 'object') return Number(dp.demande_achat.id);
          return Number(dp.demande_achat);
        }).filter(Boolean)
      );
      const daLibres = allDA.filter(da =>!daAvecDP.has(Number(da.id || da.pk)));
      setDaList(daLibres);
      setProduits(resP.data.results || resP.data || []);
      setFournisseurs(resF.data.results || resF.data || []);
      if(daLibres.length === 0 && allDA.length > 0) {
        setInitError(`Toutes les ${allDA.length} DA APPROUVER ont déjà une DP`);
      }
    }).catch(() => {
      setInitError("Erreur chargement DA/Produits/Fournisseurs")
    }).finally(() => setLoadingInit(false));
  }

  const handleCreateDP = async (da_id) => {
    if(saving) return;
    setSaving(true);
    try {
      const res = await api.post('/demandes-prix-create/', { demande_achat: Number(da_id) });
      const dp_id = res.data.id;
      let lignesDA = [];
      try {
        const resLignesDA = await api.get(`/lignes-demande-achat/?demande=${da_id}&page_size=200`);
        lignesDA = resLignesDA.data.results || resLignesDA.data || [];
      } catch(e) {}
      if(lignesDA.length > 0){
        for(const ligne of lignesDA){
          try{
            await api.post('/lignes-demande-prix/', {
              demande_prix: dp_id, produit: Number(ligne.produit), fournisseur: null, prix_propose: null, delai_livraison_jours: null
            })
          }catch(e){}
        }
      }
      toast.success("Demande Prix créée");
      setShowCreateModal(false);
      fetchData();
      loadInitData();
    } catch(err) {
      const dataErr = err.response?.data || {};
      const msg = dataErr.demande_achat?.[0] || dataErr.detail || "Erreur création";
      toast.error("Erreur: " + msg)
    } finally { setSaving(false); }
  }

  const handleValiderDP = async (dp) => {
    if(!window.confirm(`Valider la DP ${dp.numero}?`)) return;
    try {
      await api.patch(`/demandes-prix/${dp.id}/`, { statut: 'VALIDEE' });
      toast.success("DP Validée");
      setData(prev => prev.map(d => d.id === dp.id? {...d, statut: 'VALIDEE'} : d));
    } catch(err) {
      toast.error("Erreur validation");
    }
  }

  const handleSendEmailFournisseur = async (ligne) => {
    const f = fournisseurs.find(x => x.id === ligne.fournisseur);
    if (!f) return toast.error("Choisissez un fournisseur");
    if (!f.email) return toast.error("Fournisseur sans email");
    if (!window.confirm(`Envoyer demande de prix à ${f.raison_sociale || f.nom} (${f.email})?`)) return;
    setSendingMail(ligne.temp_id);
    try {
      const res = await api.post(`/demandes-prix/${selectedDP.id}/envoyer-email/`, {
        fournisseur_id: f.id
      });
      toast.success(res.data.message || `Email envoyé à ${f.raison_sociale}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur envoi email");
    } finally {
      setSendingMail(null);
    }
  }

  const openModal = async (dp) => {
    setShowModal(false); setSelectedDP(null); setLignes([]); newIdCounter.current = 0;
    await new Promise(r => setTimeout(r, 10));
    setLoadingLignes(true); setSelectedDP(dp); setShowModal(true);
    try {
      const resLignes = await api.get(`/lignes-demande-prix/?demande_prix=${dp.id}&page_size=200`);
      let lignesData = resLignes.data.results || resLignes.data || [];
      if (lignesData.length === 0) {
        lignesData = [{ id: null, demande_prix: dp.id, produit: null, fournisseur: null, prix_propose: null, delai_livraison_jours: null }]
      }
      setLignes(lignesData.map((l) => ({
     ...l,
        temp_id: `dp${dp.id}-ligne${l.id || 'new'}-${newIdCounter.current++}`,
        produit: l.produit? Number(l.produit) : null,
        fournisseur: l.fournisseur? Number(l.fournisseur) : null,
        prix_propose: l.prix_propose!== null? Number(l.prix_propose) : '',
        delai_livraison_jours: l.delai_livraison_jours!== null? Number(l.delai_livraison_jours) : ''
      })))
    } catch(err) { toast.error("Erreur chargement lignes"); }
    finally { setLoadingLignes(false); }
  }

  const handleUpdateLigne = (temp_id, field, value) => {
    const val = ['produit', 'fournisseur'].includes(field)? (value === ''? null : Number(value)) : (value === ''? '' : Number(value));
    setLignes(prev => prev.map(l => l.temp_id === temp_id? {...l, [field]: val} : l));
  }
  const handleAddLigne = () => {
    if(produits.length === 0) return toast.error("Aucun produit");
    const newLigne = { id: null, temp_id: `dp${selectedDP.id}-ligne-new-${newIdCounter.current++}`, demande_prix: selectedDP.id, produit: null, fournisseur: null, prix_propose: '', delai_livraison_jours: '' };
    setLignes(prev => [...prev, newLigne]);
  }
  const handleDeleteLigne = async (temp_id) => {
    const ligne = lignes.find(l => l.temp_id === temp_id);
    if(ligne.id &&!window.confirm("Supprimer cette ligne?")) return;
    if(ligne.id){ await api.delete(`/lignes-demande-prix/${ligne.id}/`); }
    setLignes(prev => prev.filter(l => l.temp_id!== temp_id));
    toast.success("Ligne supprimée");
  }
  const handleSaveLignes = async () => {
    const lignesValides = lignes.filter(l => l.produit);
    if(lignesValides.length === 0) return toast.error("Veuillez choisir un produit pour au moins 1 ligne");
    setSaving(true);
    try {
      for(const ligne of lignesValides) {
        const payload = {
          demande_prix: Number(selectedDP.id), produit: Number(ligne.produit),
          fournisseur: ligne.fournisseur? Number(ligne.fournisseur) : null,
          prix_propose: ligne.prix_propose === ''? null : Number(ligne.prix_propose),
          delai_livraison_jours: ligne.delai_livraison_jours === ''? null : Number(ligne.delai_livraison_jours)
        }
        if(ligne.id){ await api.patch(`/lignes-demande-prix/${ligne.id}/`, payload); }
        else { await api.post(`/lignes-demande-prix/`, payload); }
      }
      toast.success("Modifications enregistrées");
      handleCloseModal();
      fetchData();
    } catch(err) { toast.error("Erreur sauvegarde") }
    finally { setSaving(false); }
  }
  const handleCloseModal = () => { setShowModal(false); setSelectedDP(null); setLignes([]); }
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (loading) return <div style={{textAlign:'center', padding:40}}><Loader2 className="animate-spin"/></div>;

  return (
  <div style={{padding:24}}>
    <Toaster position="top-right" richColors />
    <div style={{display:'flex', justifyContent:'space-between', marginBottom: 16}}>
      <h2 style={{fontSize: '22px', fontWeight: '700'}}>Demandes de Prix</h2>
      {canCreate && <button style={styles.btnPrimary} onClick={()=>setShowCreateModal(true)}><Plus size={16}/> Nouvelle DP</button>}
    </div>

    <div style={styles.card}>
      <table style={{width:'100%', borderCollapse:'collapse', tableLayout:'fixed'}}>
        <thead><tr>
          <th style={styles.th}>N° DP</th><th style={styles.th}>DA LIÉE</th><th style={styles.th}>OBJET</th><th style={styles.th}>STATUT</th><th style={styles.th}>ACTION</th>
        </tr></thead>
        <tbody>{data.map(d=><tr key={d.id}>
          <td style={styles.td}>{d.numero}</td>
          <td style={styles.td}>{d.demande_achat?.numero || d.demande_achat_numero || '-'}</td>
          <td style={styles.td}>{d.objet}</td>
          <td style={styles.td}><span style={styles.badge(d.statut)}>{STATUT_MAPPING[d.statut] || d.statut}</span></td>
          <td style={styles.td}>
            <div style={{display:'flex', gap:6}}>
              {user?.role !== 'ADMIN' && (
              <button onClick={()=>openModal(d)} style={styles.btnSecondary}><Edit size={14}/> Gérer Lignes</button>
              )}
              {d.statut === 'EN_COURS' && ['ADMIN'].includes(role) && (
                <button onClick={()=>handleValiderDP(d)} style={styles.btnSuccess}><CheckCircle size={14}/> Valider</button>
              )}
            </div>
          </td>
        </tr>)}</tbody>
      </table>
      <div style={styles.pagination}>
        <span style={{fontSize:13, color:'#64748b'}}>Affichage de {(page-1)*pageSize+1} à {Math.min(page*pageSize, total)} sur {total}</span>
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          <button style={{...styles.btnPrimary, opacity:page===1?0.5:1}} onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}><ChevronLeft size={16}/>Précédent</button>
          <span style={{fontSize:13, fontWeight:600}}>Page {page} / {totalPages}</span>
          <button style={{...styles.btnPrimary, opacity:page===totalPages?0.5:1}} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}>Suivant<ChevronRight size={16}/></button>
        </div>
      </div>
    </div>

    {showCreateModal && (
      <div style={styles.modal}><div style={styles.modalContent}>
        <div style={{display:'flex', justifyContent:'space-between', marginBottom:16, alignItems:'center'}}><h3 style={{margin:0}}>Créer une Demande Prix depuis DA</h3><button onClick={()=>setShowCreateModal(false)} style={{border:'none', background:'#f1f5f9', padding:6, borderRadius:6, cursor:'pointer'}}><X size={16}/></button></div>
        {initError && <div style={styles.alertInfo}><Info size={16}/>{initError}</div>}
        {loadingInit && <div style={{textAlign:'center', padding:20}}><Loader2 className="animate-spin"/> Chargement...</div>}
        {daList.length === 0 &&!loadingInit? <p style={{color:'#64748b'}}>Aucune DA APPROUVER disponible sans DP</p> :
          daList.map(da => {
            const daId = Number(da.id || da.pk);
            return (
              <div key={daId} style={{display:'flex', justifyContent:'space-between', padding:12, border:'1px solid #e2e8f0', borderRadius:8, marginBottom:8, alignItems:'center'}}>
                <span style={{fontSize:14}}><b>{da.numero}</b> - {da.note || da.objet || ''}</span>
                <button style={styles.btnPrimary} onClick={() => handleCreateDP(daId)} disabled={saving}>
                  {saving? <Loader2 size={14} className="animate-spin"/> : null} Sélectionner
                </button>
              </div>
            )
          })
        }
      </div></div>
    )}

    {showModal && selectedDP && (
      <div style={styles.modal} key={`modal-dp-${selectedDP.id}`}>
        <div style={styles.modalContent}>
        <div style={{display:'flex', justifyContent:'space-between', marginBottom:16, alignItems:'center'}}><h3 style={{margin:0}}>Gérer: {selectedDP.numero}</h3><button onClick={handleCloseModal} style={{border:'none', background:'#f1f5f9', padding:6, borderRadius:6, cursor:'pointer'}}><X size={16}/></button></div>
        {canEditLigne && <button style={{...styles.btnPrimary, marginBottom:16}} onClick={handleAddLigne}><Plus size={14}/> Ajouter Ligne</button>}
        {loadingLignes && <div style={{textAlign:'center', padding:20}}><Loader2 className="animate-spin" size={20}/> Chargement...</div>}

        <table style={{width:'100%', borderCollapse:'collapse'}}>
          <thead><tr>
            <th style={{...styles.th, width: '100px'}}>CODE</th>
            <th style={styles.th}>Produit</th>
            <th style={{...styles.th, width:'360px'}}>Fournisseur - Email - Tél - Délai</th>
            <th style={styles.th}>Prix Proposé</th>
            <th style={styles.th}>Délai Jours</th>
            {canEditLigne && <th style={{...styles.th, width:'90px'}}>Action</th>}
          </tr></thead>
          <tbody>
            {lignes.map((ligne) => (
              <tr key={ligne.temp_id}>
                <td style={styles.td}>
                  <span style={{fontWeight:700, color:'#0ea5e9', fontSize:13}}>
                    {produits.find(p=>p.id===ligne.produit)?.code || '-'}
                  </span>
                </td>
                <td style={styles.td}>
                  <select style={styles.input} value={ligne.produit?? ''} onChange={e => handleUpdateLigne(ligne.temp_id, 'produit', e.target.value)} disabled={!canEditLigne}>
                    <option value="">-- Choisir Produit --</option>
                    {produits.map(p => <option key={p.id} value={p.id}>[{p.code}] {p.designation}</option>)}
                  </select>
                </td>
                <td style={styles.td}>
                  <select style={styles.input} value={ligne.fournisseur?? ''} onChange={e => handleUpdateLigne(ligne.temp_id, 'fournisseur', e.target.value)} disabled={loadingInit ||!canEditLigne}>
                    <option value="">-- Choisir Fournisseur --</option>
                    {fournisseurs.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.raison_sociale || f.nom || 'Sans nom'} {f.email? `- ${f.email}` : ''} {f.telephone || f.tel || f.phone? `- ${f.telephone || f.tel || f.phone}` : ''} {ligne.delai_livraison_jours!=='' && ligne.delai_livraison_jours!==null? `- ⏱️ ${ligne.delai_livraison_jours}j` : ''}
                      </option>
                    ))}
                  </select>
                  {ligne.fournisseur && (()=> {
                    const f = fournisseurs.find(x=>x.id===ligne.fournisseur);
                    return f? <div style={{fontSize:11, color:'#64748b', marginTop:4, background:'#f8fafc', padding:4, borderRadius:4}}>{f.email?`📧 ${f.email} `:''} {f.telephone||f.tel?`📞 ${f.telephone||f.tel}`:''} {ligne.delai_livraison_jours!=='' && ligne.delai_livraison_jours!==null? `⏱️ ${ligne.delai_livraison_jours}j` : ''}</div> : null;
                  })()}
                </td>
                <td style={styles.td}>
                  <input style={styles.input} type="number" step="0.01" min="0" value={ligne.prix_propose?? ''} onChange={e => handleUpdateLigne(ligne.temp_id, 'prix_propose', e.target.value)} readOnly={!canEditLigne} placeholder="0.00" />
                </td>
                <td style={styles.td}><input style={styles.input} type="number" min="0" value={ligne.delai_livraison_jours?? ''} onChange={e => handleUpdateLigne(ligne.temp_id, 'delai_livraison_jours', e.target.value)} readOnly={!canEditLigne} placeholder="Jours" /></td>
                {canEditLigne && (
                  <td style={styles.td}>
                    <div style={{display:'flex', gap:6}}>
                      <button
                        style={{...styles.btnMail, opacity:!ligne.fournisseur?0.4:1}}
                        onClick={()=>handleSendEmailFournisseur(ligne)}
                        disabled={!ligne.fournisseur || sendingMail===ligne.temp_id}
                        title="Envoyer email"
                      >
                        {sendingMail===ligne.temp_id? <Loader2 size={14} className="animate-spin"/> : <Mail size={14}/>}
                      </button>
                      <button style={styles.btnDanger} onClick={()=>handleDeleteLigne(ligne.temp_id)} title="Supprimer"><Trash2 size={14}/></button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {canEditLigne && <button onClick={handleSaveLignes} disabled={saving} style={{...styles.btnPrimary, marginTop: 16}}>
          {saving? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} Enregistrer
        </button>}
      </div></div>
    )}
  </div>)
}