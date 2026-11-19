import { useEffect, useState } from "react";
import api from "../../utils/api";
import { Plus, Trash2, Eye, Loader2, ChevronLeft, ChevronRight, X, Save, Send, CheckCircle, XCircle } from "lucide-react";

const styles = {
  card: { background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', background: '#f8fafc', textTransform: 'uppercase' },
  td: { padding: '12px 16px', fontSize: '14px', color: '#334155', borderTop: '1px solid #f1f5f9' },
  pagination: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: '1px solid #f1f5f9' },
  paginationBtn: { padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: '600' },
  badge: { padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' },
  btnPrimary: { padding: '10px 16px', fontSize: '14px', fontWeight: '600', color: 'white', background: '#16a34a', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  btnAction: { padding: '6px 10px', fontSize: '12px', fontWeight: '600', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalCard: { width: '100%', maxWidth: '700px', background: 'white', borderRadius: '12px', maxHeight: '90vh', overflowY: 'auto' },
  input: { width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px' }
}

const STATUT_COLORS = {
  BROUILLON: {bg:'#f1f5f9',color:'#475569'},
  SOUMIS:{bg:'#eff6ff',color:'#2563eb'},
  APPROUVER:{bg:'#f0fdf4',color:'#16a34a'},
  REJETER:{bg:'#fef2f2',color:'#dc2626'},
  COMMANDER:{bg:'#fffbeb',color:'#d97706'}
}

export default function DemandeAchatPage() {
  const [demandes, setDemandes] = useState([]);
  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(5);
  const [total, setTotal] = useState(0);
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ note: "", lignes: [{ produit: '', quantite: '', justification: '' }] });

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
    fetchData();
  }, [page]);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      api.get(`/demandes-achat/?ordering=id&page=${page}&page_size=${pageSize}`), 
      api.get(`/produits/?page_size=100`)
    ]).then(([resDA, resP]) => {
      setDemandes(resDA.data.results || []);
      setTotal(resDA.data.count || 0);
      setProduits(resP.data.results || resP.data);
    }).catch(err => console.error(err))
  .finally(() => setLoading(false));
  };

  const handleAddLigne = () => setForm({...form, lignes: [...form.lignes, { produit: '', quantite: 1, justification: '' }]});
  const handleLigneChange = (index, field, value) => {
    const newLignes = [...form.lignes]; newLignes[index][field] = value; setForm({...form, lignes: newLignes});
  }
  const handleRemoveLigne = (index) => setForm({...form, lignes: form.lignes.filter((_, i) => i!== index)});

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const lignes = form.lignes.filter(l => l.produit && l.quantite > 0);
    if(lignes.length === 0) { alert("Ampio ligne 1 farafahakeliny"); setSaving(false); return; }

    try {
      const res = await api.post("/demandes-achat/", {...form, lignes: lignes.map(l => ({...l, quantite: Number(l.quantite)})) });
      const nouvelleDA = res.data;

      alert("Demande d'Achat créée");
      setShowModal(false);
      setForm({ note: "", lignes: [{ produit: '', quantite: '', justification: '' }] });

      const newTotal = total + 1;
      const newTotalPages = Math.ceil(newTotal / pageSize);

      if(page === newTotalPages){
        setDemandes(prev => [...prev, nouvelleDA]); 
        setTotal(newTotal);
      }
      setPage(newTotalPages); 

    } catch (error) {
      alert("Erreur: " + JSON.stringify(error.response?.data))
    }
    finally { setSaving(false); }
  };

  const handleChangeStatut = async (id, nouveauStatut) => {
    if (!window.confirm(`Confirmer: ${nouveauStatut}?`)) return;
    try {
      await api.patch(`/demandes-achat/${id}/`, { statut: nouveauStatut });
      fetchData();
    } catch (error) { alert("Erreur: " + error.response?.data?.statut?.[0]) }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cette DA?")) return;
    try {
      await api.delete(`/demandes-achat/${id}/`);
      const newTotal = total - 1;
      const newTotalPages = Math.max(1, Math.ceil(newTotal / pageSize));
      if (demandes.length === 1 && page > 1) {
        setPage(p => p - 1);
      } else {
        fetchData();
      }
    } catch(err) { alert("Erreur suppression") }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startItem = total === 0? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  if (loading) return <div style={{display:'flex', justifyContent:'center', padding:40}}><Loader2 className="animate-spin" size={32}/></div>;

  return (
    <div>
      <div style={{display:'flex', justifyContent:'space-between', marginBottom:16}}>
        <h2 style={{fontSize: '22px', fontWeight: '700'}}>Demandes d'Achat</h2>
        {user?.role == 'ACHETEUR' && (
          <button onClick={() => setShowModal(true)} style={styles.btnPrimary}><Plus size={16}/> Nouvelle DA</button>
        )}
      </div>

      <div style={styles.card}>
        <table style={{width:'100%', borderCollapse: 'collapse'}}>
          <thead>
            <tr>
              <th style={styles.th}>N°</th>
              <th style={styles.th}>DEMANDE PAR</th>
              <th style={styles.th}>NOTE</th>
              <th style={styles.th}>DATE</th>
              <th style={styles.th}>STATUT</th>
              <th style={styles.th}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {demandes.map(d => (
              <tr key={d.id}>
                <td style={styles.td}>{d.numero}</td>
                <td style={styles.td}>{d.demande_par_detail || d.demande_par}</td>
                <td style={styles.td}>{d.note}</td>
                <td style={styles.td}>{new Date(d.date_demande).toLocaleDateString('fr-FR')}</td>
                <td style={styles.td}><span style={{...styles.badge,...STATUT_COLORS[d.statut]}}>{d.statut}</span></td>
                <td style={styles.td}>
                  <div style={{display:'flex', gap:6, alignItems:'center'}}>
                    <Eye size={16} style={{cursor: 'pointer'}}/>
                    {d.statut === 'BROUILLON' && (
                      <button onClick={()=>handleChangeStatut(d.id, 'SOUMIS')} style={{...styles.btnAction, background:'#0ea5e9', color:'white'}}>
                        <Send size={14}/> Soumettre
                      </button>
                    )}
                    {d.statut === 'SOUMIS' && user?.role === 'ADMIN' && (
                      <>
                        <button onClick={()=>handleChangeStatut(d.id, 'APPROUVER')} style={{...styles.btnAction, background:'#16a34a', color:'white'}}>
                          <CheckCircle size={14}/> Approuver
                        </button>
                        <button onClick={()=>handleChangeStatut(d.id, 'REJETER')} style={{...styles.btnAction, background:'#ef4444', color:'white'}}>
                          <XCircle size={14}/> Rejeter
                        </button>
                      </>
                    )}
                    {d.statut === 'BROUILLON' && (
                      <Trash2 size={16} color="#dc2626" style={{cursor: 'pointer'}} onClick={()=>handleDelete(d.id)}/>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {total > 0 &&
          <div style={styles.pagination}>
            <span style={{fontSize: '13px'}}>Affichage de {startItem} à {endItem} sur {total}</span>
            <div style={{display:'flex', gap:8}}>
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} style={{...styles.paginationBtn, opacity:page===1?0.5:1}}>
                <ChevronLeft size={14}/>Précédent
              </button>
              <span style={{fontSize: '13px', fontWeight: '600'}}>Page {page} / {totalPages}</span>
              <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} style={{...styles.paginationBtn, opacity:page===totalPages?0.5:1}}>
                Suivant<ChevronRight size={14}/>
              </button>
            </div>
          </div>
        }
      </div>

      {/* MODAL CREATION */}
      {showModal &&
        <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div style={styles.modalCard} onClick={e => e.stopPropagation()}>
            <div style={{padding: 20, borderBottom: '1px solid #f1f5f9', display:'flex', justifyContent:'space-between'}}>
              <h2>Nouvelle Demande d'Achat</h2>
              <X onClick={() => setShowModal(false)} style={{cursor:'pointer'}}/>
            </div>
            <form onSubmit={handleSubmit} style={{padding: 20}}>
              <label style={{fontSize:12, fontWeight:600}}>Note</label>
              <textarea value={form.note} onChange={e => setForm({...form, note: e.target.value})} placeholder="Ex: Achat fourniture bureau" style={{...styles.input, marginBottom: 16, minHeight:80}} required/>

              <h3 style={{fontSize: 14, fontWeight: 600, marginBottom: 8}}>Lignes Produits</h3>
              {form.lignes.map((ligne, index) => (
                <div key={index} style={{display: 'flex', gap: 8, marginBottom: 8, alignItems:'flex-start'}}>
                  <div style={{flex:2}}>
                    <select value={ligne.produit} onChange={e => handleLigneChange(index, 'produit', e.target.value)} style={styles.input} required>
                      <option value="">-- Choisir produit --</option>
                      {produits.map(p => <option key={p.id} value={p.id}>{p.code} - {p.designation}</option>)}
                    </select>
                  </div>
                  <input type="number" min="1" value={ligne.quantite} onChange={e => handleLigneChange(index, 'quantite', e.target.value)} style={{width: 80,...styles.input}}/>
                  <input type="text" placeholder="Justification" value={ligne.justification} onChange={e => handleLigneChange(index, 'justification', e.target.value)} style={{flex:1,...styles.input}}/>
                  <button type="button" onClick={() => handleRemoveLigne(index)} style={{padding:8, border:'none', background:'transparent'}}><Trash2 size={14} color="#dc2626"/></button>
                </div>
              ))}
              <button type="button" onClick={handleAddLigne} style={{...styles.btnAction, background:'#f1f5f9', marginBottom: 16}}><Plus size={14}/> Ajouter ligne</button>

              <div style={{display: 'flex', justifyContent: 'flex-end', gap: 10}}>
                <button type="button" onClick={() => setShowModal(false)} style={{...styles.btnAction, background:'#e2e8f0'}}>Annuler</button>
                <button type="submit" disabled={saving} style={styles.btnPrimary}>
                  {saving? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  )
}