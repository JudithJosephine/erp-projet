import { useEffect, useState } from "react";
import api from "../../utils/api";
import { Loader2, Banknote, X, Save, AlertCircle, FileText, Download, ChevronLeft, ChevronRight, Receipt } from "lucide-react";
import { toast, Toaster } from "sonner";

const styles = {
  card: { background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow:'hidden', padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 20 },
  th:{padding:'12px 16px', textAlign:'left', fontSize:12, background:'#f8fafc', fontWeight:600, textTransform:'uppercase', color:'#475569', borderBottom:'1px solid #e2e8f0'},
  td:{padding:'12px 16px', borderTop:'1px solid #f1f5f9', fontSize:14, color:'#334155'},
  btnPrimary: { padding: '12px 16px', background: 'linear-gradient(90deg, #2563eb 0%, #4f46e5 100%)', color: 'white', border: 'none', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent:'center', gap: 6, cursor: 'pointer', fontWeight:700, width:'100%', fontSize:14 },
  btnSecondary: { padding: '6px 10px', background: '#eff6ff', color: '#2563eb', border: '1px solid #dbeafe', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontWeight:600, fontSize:12 },
  btnPay: { padding:'6px 14px', background:'#2563eb', color:'white', border:'none', borderRadius:6, cursor:'pointer', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:4 },
  modal: { position: 'fixed', top:0, left:0, right:0, bottom:0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding:20 },
  modalContent: { background: 'white', borderRadius: 16, width: '100%', maxWidth: 1000, overflow:'hidden', display:'flex', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' },
  input: { padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, width:'100%', fontSize:14, outline:'none' },
  label: {fontSize:12, fontWeight:600, marginTop:14, display:'block', marginBottom:6, color:'#334155'},
  badgeRed: { padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background:'#fef2f2', color:'#dc2626' },
  badgeOrange: { padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background:'#fff7ed', color:'#ea580c' },
  paginationBtn: { padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: '600' },
}

const formatAr = (val) => (parseFloat(val) || 0).toLocaleString('fr-FR')

const fetchAllPages = async (url) => {
  let allResults = [];
  let page = 1;
  while(true){
    const res = await api.get(`${url}${url.includes('?')? '&' : '?'}page=${page}&page_size=1000`);
    allResults = [...allResults,...(res.data.results || res.data)];
    if(!res.data.next) break;
    page++;
    if(page > 50) break;
  }
  return allResults;
}

export default function PaiementFournisseurPage() {
  const [factures, setFactures] = useState([]);
  const [paiements, setPaiements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPDF, setLoadingPDF] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ facture: '', montant: '', mode_paiement: 'ESPECE' });
  const [page, setPage] = useState(1);
  const [pageSize] = useState(5);

  const getUserRole = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user.role || 'COMPTABLE';
    } catch { return 'COMPTABLE' }
  }
  const userRole = getUserRole();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resFact, allPaie] = await Promise.all([
        api.get(`/factures/impayees/`),
        fetchAllPages(`/paiements/`)
      ]);
      setFactures(resFact.data.results || resFact.data || []);
      setPaiements(allPaie);
    } catch(err) {
      toast.error("Erreur chargement données")
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleDownloadPDF = async (paiementId, numero) => {
    setLoadingPDF(paiementId);
    try {
      const response = await api.get(`/paiements/${paiementId}/pdf/`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Recu_${numero}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Reçu téléchargé");
    } catch(err) {
      toast.error("Erreur PDF");
    } finally {
      setLoadingPDF(null);
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault();
    if(!form.facture) return toast.error("Choisir une facture");
    if(!form.montant || parseFloat(form.montant) <= 0) return toast.error("Montant invalide");
    const selected = factures.find(f => f.id == form.facture);
    if(!selected) return toast.error("Facture introuvable");
    if(parseFloat(form.montant) > parseFloat(selected.reste_a_payer)) return toast.error("Montant supérieur au solde");
    setSaving(true);
    try {
      await api.post('/paiements/', {
        facture: Number(form.facture),
        montant: Number(form.montant),
        mode_paiement: form.mode_paiement,
        date_paiement: new Date().toISOString().split('T')[0]
      });
      toast.success("Paiement enregistré");
      setShowModal(false);
      setForm({ facture: '', montant: '', mode_paiement: 'ESPECE' });
      await fetchData();
      const newTotal = paiements.length + 1;
      const lastPage = Math.ceil(newTotal / pageSize);
      setPage(lastPage);
    } catch(err) {
      toast.error(err.response?.data?.detail || "Erreur paiement");
    } finally { setSaving(false); }
  }

  const selectedFacture = factures.find(f => f.id == form.facture);
  const totalPaiements = paiements.length;
  const totalPages = Math.max(1, Math.ceil(totalPaiements / pageSize));
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paiementsPaginated = paiements.slice(startIndex, endIndex);
  const startItem = totalPaiements === 0? 0 : startIndex + 1;
  const endItem = Math.min(endIndex, totalPaiements);

  if (loading) return <div style={{textAlign:'center', padding:40}}><Loader2 className="animate-spin" size={24}/></div>;

  return (
    <div>
      <Toaster position="top-right" richColors />
      <div style={{display:'flex', justifyContent:'space-between', marginBottom:20}}>
        <h2 style={{fontSize: 22, fontWeight: 700, display:'flex', alignItems:'center', gap:10, color:'#1e293b'}}>
          <Banknote size={24} color="#2563eb"/> Paiements Fournisseurs - {userRole}
        </h2>
      </div>

      <div style={styles.card}>
        <h3 style={{marginBottom: 16, fontSize: 16, fontWeight: 700, color:'#1e293b'}}>Factures en attente de paiement</h3>
        <table style={{width:'100%', borderCollapse:'collapse'}}>
          <thead>
            <tr>
              <th style={styles.th}>N° FACTURE</th>
              <th style={styles.th}>BC LIÉ</th>
              <th style={styles.th}>FOURNISSEUR</th>
              <th style={{...styles.th, textAlign:'right'}}>MONTANT TTC</th>
              <th style={{...styles.th, textAlign:'right'}}>RESTE A PAYER</th>
              <th style={styles.th}>STATUT</th>
              <th style={styles.th}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {factures.length === 0? (
              <tr><td colSpan="7" style={{...styles.td, textAlign:'center', color:'#64748b'}}><AlertCircle size={14} style={{display:'inline', marginRight:4}}/>Aucune facture à payer</td></tr>
            ) : (
              factures.map(f=>(
                <tr key={f.id}>
                  <td style={{...styles.td, fontWeight:600}}><div style={{display:'flex', alignItems:'center', gap:4}}><FileText size={14}/>{f.numero_facture}</div></td>
                  <td style={styles.td}>{f.achat_numero || '-'}</td>
                  <td style={styles.td}>{f.fournisseur_nom}</td>
                  <td style={{...styles.td, textAlign:'right', fontWeight:600}}>{formatAr(f.montant_ttc)} Ar</td>
                  <td style={{...styles.td, textAlign:'right', fontWeight:700, color:'#dc2626'}}>{formatAr(f.reste_a_payer)} Ar</td>
                  <td style={styles.td}><span style={f.statut === 'PARTIEL'? styles.badgeOrange : styles.badgeRed}>{f.statut}</span></td>
                  <td style={styles.td}>
                    {userRole === 'COMPTABLE' && (
                      <button onClick={() => {setForm({facture: f.id, montant: f.reste_a_payer, mode_paiement:'ESPECE'}); setShowModal(true)}} style={styles.btnPay}>
                        <Banknote size={14}/> Payer
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={styles.card}>
        <h3 style={{marginBottom: 16, fontSize: 16, fontWeight: 700, color:'#1e293b'}}>Historique des paiements</h3>
        <table style={{width:'100%', borderCollapse:'collapse'}}>
          <thead>
            <tr>
              <th style={styles.th}>N° PAIEMENT</th>
              <th style={styles.th}>DATE</th>
              <th style={styles.th}>FACTURE</th>
              <th style={styles.th}>FOURNISSEUR</th>
              <th style={{...styles.th, textAlign:'right'}}>MONTANT</th>
              <th style={styles.th}>MODE</th>
              <th style={styles.th}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {totalPaiements === 0 && (<tr><td colSpan="7" style={{...styles.td, textAlign:'center', color:'#64748b'}}>Aucun paiement</td></tr>)}
            {paiementsPaginated.map(p=>(
              <tr key={p.id}>
                <td style={{...styles.td, fontWeight:600}}>{p.numero}</td>
                <td style={styles.td}>{new Date(p.date_paiement).toLocaleDateString('fr-FR')}</td>
                <td style={styles.td}>{p.facture_numero}</td>
                <td style={styles.td}>{p.fournisseur_nom}</td>
                <td style={{...styles.td, textAlign:'right', fontWeight:700, color:'#16a34a'}}>{formatAr(p.montant)} Ar</td>
                <td style={styles.td}>{p.mode_paiement}</td>
                <td style={styles.td}><button style={styles.btnSecondary} onClick={() => handleDownloadPDF(p.id, p.numero)} disabled={loadingPDF === p.id}>{loadingPDF === p.id? <Loader2 size={14} className="animate-spin"/> : <Download size={14}/>} PDF</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPaiements > 0 && (
          <div style={{display:'flex', justifyContent:'space-between', padding:'16px 0 0 0', borderTop:'1px solid #e2e8f0', marginTop:16, alignItems:'center'}}>
            <span style={{fontSize: '13px', color:'#64748b'}}>Affichage de {startItem} à {endItem} sur {totalPaiements}</span>
            <div style={{display:'flex', gap:8, alignItems:'center'}}>
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} style={{...styles.paginationBtn, opacity:page===1?0.5:1}}> <ChevronLeft size={14}/>Précédent</button>
              <span style={{fontSize: '13px', fontWeight: '600'}}>Page {page} / {totalPages}</span>
              <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} style={{...styles.paginationBtn, opacity:page===totalPages?0.5:1}}>Suivant<ChevronRight size={14}/></button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div style={styles.modal} onClick={()=>setShowModal(false)}>
          <div style={styles.modalContent} onClick={e=>e.stopPropagation()}>
            <div style={{flex:'1.4', padding:32}}>
              <div style={{display:'flex', justifyContent:'space-between', marginBottom: 20, alignItems:'center'}}>
                <h3 style={{fontSize: 18, fontWeight: 700, margin:0, display:'flex', alignItems:'center', gap:8}}><Receipt size={18}/> Nouveau Paiement Fournisseur</h3>
                <button onClick={()=>setShowModal(false)} style={{background:'#f1f5f9', border:'none', cursor:'pointer', borderRadius:'50%', padding:6}}><X size={16}/></button>
              </div>
              <form onSubmit={handleCreate}>
                <label style={styles.label}>Facture *</label>
                <select style={styles.input} value={form.facture} onChange={e=>setForm({...form, facture: e.target.value, montant: factures.find(f=>f.id==e.target.value)?.reste_a_payer || ''})} required>
                  <option value="">-- Choisir Facture --</option>
                  {factures.map(f => <option key={f.id} value={f.id}>{f.numero_facture} - {f.fournisseur_nom} - Reste: {formatAr(f.reste_a_payer)} Ar</option>)}
                </select>
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
                  <div>
                    <label style={styles.label}>Montant à payer *</label>
                    <input style={{...styles.input, fontWeight:700, fontSize:16}} type="number" step="0.01" max={selectedFacture?.reste_a_payer} value={form.montant} onChange={e=>setForm({...form, montant: e.target.value})} placeholder="0 Ar" required />
                  </div>
                  <div>
                    <label style={styles.label}>Mode de paiement *</label>
                    <select style={styles.input} value={form.mode_paiement} onChange={e=>setForm({...form, mode_paiement: e.target.value})}>
                      <option value="ESPECE">Espèces</option>
                      <option value="MOBILE_MONEY">Mvola / Orange Money</option>
                      <option value="VIREMENT">Virement Bancaire</option>
                      <option value="CHEQUE">Chèque</option>
                    </select>
                  </div>
                </div>
                <div style={{marginTop:24, display:'flex', gap:12}}>
                  <button type="button" onClick={()=>setShowModal(false)} style={{padding:'12px', background:'white', border:'1px solid #cbd5e1', borderRadius:8, flex:1, fontWeight:600, cursor:'pointer'}}>Annuler</button>
                  <button type="submit" disabled={saving} style={{...styles.btnPrimary, flex:2}}>{saving? <Loader2 className="animate-spin" size={18}/> : <><Save size={18}/> Valider {form.montant? `${formatAr(form.montant)} Ar` : ''}</>}</button>
                </div>
              </form>
            </div>
            <div style={{width:'38%', background:'#f8fafc', padding:24, borderLeft:'1px solid #e2e8f0'}}>
              {selectedFacture ? (
                <>
                  <div style={{background:'white', borderRadius:10, padding:14, border:'1px solid #e2e8f0', marginBottom:12}}>
                    <p style={{fontSize:11, color:'#64748b', margin:'0 0 4px 0', fontWeight:600}}>FOURNISSEUR</p>
                    <p style={{fontSize:14, fontWeight:700, margin:0}}>{selectedFacture.fournisseur_nom}</p>
                  </div>
                  <div style={{background:'white', borderRadius:10, padding:14, border:'1px solid #e2e8f0'}}>
                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:8}}><span style={{fontSize:12, color:'#64748b'}}>Montant TTC:</span><span style={{fontSize:13, fontWeight:600}}>{formatAr(selectedFacture.montant_ttc)} Ar</span></div>
                    <div style={{background:'#fef2f2', borderRadius:8, padding:12, display:'flex', justifyContent:'space-between', alignItems:'center'}}><span style={{fontSize:13, fontWeight:700, color:'#991b1b'}}>RESTE:</span><span style={{fontSize:18, fontWeight:800, color:'#dc2626'}}>{formatAr(selectedFacture.reste_a_payer)} Ar</span></div>
                  </div>
                </>
              ) : (<p style={{fontSize:13, color:'#94a3b8', textAlign:'center', marginTop:60}}>Sélectionnez une facture</p>)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}