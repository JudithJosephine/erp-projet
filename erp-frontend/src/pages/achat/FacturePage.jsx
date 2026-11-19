import { useEffect, useState, useRef } from "react";
import api from "../../utils/api";
import { Loader2, ChevronLeft, ChevronRight, Plus, X, Save, FileText, Search, ChevronDown, AlertCircle, Info, Download } from "lucide-react";
import { toast, Toaster } from "sonner";

const styles = {
  container: {padding: '0'},
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 700, color: '#1e293b' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 },
  statCard: { background: 'white', padding: 20, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #f1f5f9' },
  statLabel: { fontSize: 13, color: '#64748b', margin: 0 },
  statValue: { fontSize: 24, fontWeight: 700, color: '#1e293b', margin: '4px 0 0 0' },
  card: { background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow:'hidden' },
  toolbar: { padding: '16px 20px', borderBottom: '1px solid #f1f5f9' },
  searchBox: {display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', width: 320},
  th:{padding:'12px 16px', textAlign:'left', fontSize:12, background:'#f8fafc', fontWeight:600, textTransform:'uppercase', color:'#475569'},
  td:{padding:'12px 16px', borderTop:'1px solid #f1f5f9', fontSize:14, color:'#334155'},
  tr: { transition: 'background 0.2s' },
  pagination:{display:'flex', justifyContent:'space-between', padding:16, alignItems:'center'},
  paginationBtn: { padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: '600' },
  btnPrimary: { padding: '10px 16px', background: '#16a34a', color: 'white', border: 'none', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight:600 },
  btnPrimaryDisabled: { padding: '10px 16px', background: '#9ca3af', color: 'white', border: 'none', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6, cursor: 'not-allowed', fontWeight:600 },
  btnSecondary: { padding: '6px 10px', background: '#eff6ff', color: '#2563eb', border: '1px solid #dbeafe', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontWeight:600, fontSize:12 },
  modal: { position: 'fixed', top:0, left:0, right:0, bottom:0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' },
  modalContent: { background: 'white', borderRadius: 12, padding: 24, width: '90%', maxWidth: 600 },
  input: { padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6, width:'100%' },
  label: {fontSize:12, fontWeight:600, marginTop:12, display:'block', marginBottom:4},
  badgeRed: { padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background:'#fef2f2', color:'#dc2626' },
  badgeGreen: { padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background:'#f0fdf4', color:'#16a34a' },
  dropdown: {position:'relative'},
  dropdownBtn: {display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%', padding:'8px 10px', border:'1px solid #cbd5e1', borderRadius:6, background:'white', cursor:'pointer'},
  dropdownList: {position:'absolute', top:'100%', left:0, right:0, background:'white', border:'1px solid #cbd5e1', borderRadius:6, marginTop:4, maxHeight:300, overflowY:'auto', zIndex:1001, boxShadow:'0 4px 6px rgba(0,0,0,0.1)'},
  dropdownItem: {padding:'10px 12px', cursor:'pointer', borderBottom:'1px solid #f1f5f9'},
  dropdownSearch: {padding:'8px', borderBottom:'1px solid #e2e8f0', position:'sticky', top:0, background:'white'},
  alert: {display:'flex', gap:8, padding:12, background:'#fef2f2', color:'#991b1b', borderRadius:8, marginBottom:12, alignItems:'center'},
  info: {display:'flex', gap:8, padding:12, background:'#eff6ff', color:'#1e40af', borderRadius:8, marginBottom:12, alignItems:'center'}
}

const fetchAllPages = async (url) => {
  let allResults = [];
  let page = 1;
  while(true){
    const res = await api.get(`${url}${url.includes('?')? '&' : '?'}page=${page}&page_size=1000`);
    allResults = [...allResults,...(res.data.results || [])];
    if(!res.data.next) break;
    page++;
    if(page > 50) break;
  }
  return allResults;
}

export default function FacturePage() {
  const [data, setData] = useState([]);
  const [allFacturesForStats, setAllFacturesForStats] = useState([]);
  const [bcList, setBcList] = useState([]);
  const [bcListFiltered, setBcListFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingBC, setLoadingBC] = useState(true);
  const [loadingPDF, setLoadingPDF] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(5);
  const [total, setTotal] = useState(0);
  const [form, setForm] = useState({ achat: '', numero_facture: '', date_facture: new Date().toISOString().split('T')[0], date_echeance: '', montant_ttc: 0 });
  const [search, setSearch] = useState('');
  const [searchBC, setSearchBC] = useState('');
  const [showBcDropdown, setShowBcDropdown] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const bcDropdownRef = useRef(null);

  const handleSearch = (value) => {
    setSearch(value);
    setPage(1);
  }
  const getUserRole = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.role || 'COMPTABLE';
  } catch { return 'COMPTABLE' }
}
const userRole = getUserRole();
const canComptable = userRole === 'COMPTABLE';

  const handleDownloadPDF = async (factureId, numero) => {
    setLoadingPDF(factureId);
    try {
      const response = await api.get(`/factures/${factureId}/pdf/`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${numero}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("PDF téléchargé");
    } catch(err) {
      console.error(err);
      toast.error("Erreur lors du téléchargement PDF");
    } finally {
      setLoadingPDF(null);
    }
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (bcDropdownRef.current &&!bcDropdownRef.current.contains(event.target)) {
        setShowBcDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchData = () => {
    setLoading(true);
    api.get(`/factures/?page=${page}&page_size=${pageSize}&search=${search}`)
    .then(res => {
      setData((res.data.results || []));
      setTotal(res.data.count || 0);
    })
    .catch(err => console.error(err))
    .finally(() => setLoading(false));
  };

  const fetchAllForStats = async () => {
    const all = await fetchAllPages(`/factures/?search=${search}`);
    setAllFacturesForStats(all); 
  }

  useEffect(() => { 
    fetchData(); 
    fetchAllForStats();
  }, [page, search]);

  useEffect(() => {
    if(searchBC === ''){ setBcListFiltered(bcList); }
    else {
      const filtered = bcList.filter(bc =>
        bc.numero?.toLowerCase().includes(searchBC.toLowerCase()) ||
        bc.fournisseur_detail?.raison_sociale?.toLowerCase().includes(searchBC.toLowerCase())
      );
      setBcListFiltered(filtered);
    }
  }, [searchBC, bcList]);

  useEffect(() => {
    const loadData = async () => {
      setLoadingBC(true);
      try {
        const allBC = await fetchAllPages('/achat/?statut=RECUE');
        const allFactures = await fetchAllPages('/factures/');
        const achatsAvecFacture = new Set(allFactures.map(f => f.achat));
        const bcDisponibles = allBC.filter(bc =>!achatsAvecFacture.has(bc.id));
        setBcList(bcDisponibles);
        setBcListFiltered(bcDisponibles);
      } catch(err) { console.error("Erreur chargement:", err) }
      finally { setLoadingBC(false); }
    }
    loadData();
  }, []);

  const handleBcSelect = (bc) => {
    setForm({...form, achat: bc.id, montant_ttc: bc.total_ttc || bc.total_ht || 0 });
    setShowBcDropdown(false);
    setSearchBC('');
    setErrorMsg('');
  }

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    if(!form.achat) { setSaving(false); return setErrorMsg("Veuillez choisir un Bon de Commande"); }
    if(!form.numero_facture) { setSaving(false); return setErrorMsg("Veuillez saisir le N° Facture"); }
    if(!form.date_facture) { setSaving(false); return setErrorMsg("Veuillez saisir la Date Facture"); }
    if(!form.date_echeance) { setSaving(false); return setErrorMsg("Veuillez saisir la Date d'échéance"); }
    const payload = {
      achat: Number(form.achat),
      numero_facture: form.numero_facture.trim(),
      date_facture: form.date_facture,
      date_echeance: form.date_echeance,
      montant_ttc: Number(form.montant_ttc)
    }
    try {
      await api.post('/factures/', payload);
      toast.success("Facture créée avec succès");
      setShowModal(false);
      setForm({ achat: '', numero_facture: '', date_facture: new Date().toISOString().split('T')[0], date_echeance: '', montant_ttc: 0 });
      const newTotal = total + 1;
      const lastPage = Math.ceil(newTotal / pageSize);
      setPage(lastPage); 
      fetchData();
      fetchAllForStats();
      const allBC = await fetchAllPages('/achat/?statut=RECUE');
      const allFactures = await fetchAllPages('/factures/');
      const achatsAvecFacture = new Set(allFactures.map(f => f.achat));
      const bcDisponibles = allBC.filter(bc =>!achatsAvecFacture.has(bc.id));
      setBcList(bcDisponibles);
      setBcListFiltered(bcDisponibles);
    } catch(err) {
      console.error("ERREUR DJANGO:", err.response?.data);
      const data = err.response?.data || {};
      const msg = data.achat?.[0] || data.numero_facture?.[0] || data.date_facture?.[0] || data.date_echeance?.[0] || data.detail || "Erreur lors de la création";
      if(msg.toLowerCase().includes("already exists") || msg.toLowerCase().includes("existe déjà")) setErrorMsg("Ce Bon de Commande a déjà une facture. Veuillez en choisir un autre.");
      else setErrorMsg(msg)
    } finally { setSaving(false); }
  }

  const stats = {
    total: total,
    aPayer: allFacturesForStats.filter(d => Number(d.reste_a_payer || 0) > 0).length, 
    totalTTC: allFacturesForStats.reduce((sum, d) => sum + Number(d.montant_ttc || 0), 0)
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startItem = total === 0? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);
  const selectedBcObj = bcList.find(b => b.id == form.achat);

  if (loading && page === 1) return <div style={{textAlign:'center', padding:40}}><Loader2 className="animate-spin"/></div>;

  return (
    <div style={styles.container}>
      <Toaster richColors position="top-right"/>
      <div style={styles.header}>
        <h2 style={styles.title}>Factures Fournisseurs</h2>
        {canComptable && (
          <button style={bcList.length === 0? styles.btnPrimaryDisabled : styles.btnPrimary} onClick={()=>setShowModal(true)} disabled={bcList.length === 0}>
            <Plus size={16}/> Nouvelle Facture
          </button>
        )}
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}><p style={styles.statLabel}>Total Factures</p><p style={styles.statValue}>{stats.total}</p></div>
        <div style={styles.statCard}><p style={styles.statLabel}>A Payer</p><p style={styles.statValue}>{stats.aPayer}</p></div>
        <div style={styles.statCard}><p style={styles.statLabel}>Total TTC</p><p style={styles.statValue}>{stats.totalTTC.toLocaleString('fr-FR')} Ar</p></div>
      </div>

      <div style={styles.card}>
        <div style={styles.toolbar}>
          <div style={styles.searchBox}><Search size={16} color="#64748b"/><input style={{border:'none', outline:'none', flex:1}} placeholder="Recher N° Facture, Fournisseur..." value={search} onChange={e => handleSearch(e.target.value)}/></div>
        </div>

        <table style={{width:'100%', borderCollapse:'collapse'}}>
          <thead><tr>
            <th style={styles.th}>N° FACTURE</th>
            <th style={styles.th}>BC LIÉ</th>
            <th style={styles.th}>FOURNISSEUR</th>
            <th style={{...styles.th, textAlign:'right'}}>MONTANT TTC</th>
            <th style={{...styles.th, textAlign:'right'}}>RESTE A PAYER</th>
            <th style={styles.th}>ECHEANCE</th>
            <th style={styles.th}>ACTIONS</th>
          </tr></thead>
          <tbody>
            {loading?
              <tr><td colSpan="7" style={{...styles.td, textAlign:'center', padding:30}}><Loader2 className="animate-spin"/></td></tr>
            : data.length === 0?
              <tr><td colSpan="7" style={{...styles.td, textAlign:'center'}}>Aucune facture</td></tr>
              :
              data.map(d=>(
                <tr key={d.id} style={styles.tr} onMouseOver={e => e.currentTarget.style.background='#f8fafc'} onMouseOut={e => e.currentTarget.style.background='white'}>
                  <td style={styles.td}><div style={{display:'flex', alignItems:'center', gap:4, fontWeight:600}}><FileText size={14}/>{d.numero_facture}</div></td>
                  <td style={styles.td}>{d.achat_numero || d.achat}</td>
                  <td style={styles.td}>{d.fournisseur_nom || '-'}</td>
                  <td style={{...styles.td, textAlign:'right', fontWeight:600}}>{Number(d.montant_ttc || 0).toLocaleString('fr-FR')} Ar</td>
                  <td style={{...styles.td, textAlign:'right'}}>
                    <span style={Number(d.reste_a_payer || 0) > 0? styles.badgeRed : styles.badgeGreen}>
                      {Number(d.reste_a_payer || 0).toLocaleString('fr-FR')} Ar
                    </span>
                  </td>
                  <td style={styles.td}>{d.date_echeance? new Date(d.date_echeance).toLocaleDateString('fr-FR') : '-'}</td>
                  <td style={styles.td}>
                    <button style={styles.btnSecondary} onClick={() => handleDownloadPDF(d.id, d.numero_facture)} disabled={loadingPDF === d.id}>
                      {loadingPDF === d.id ? <Loader2 size={14} className="animate-spin"/> : <Download size={14}/>} PDF
                    </button>
                </td>
                </tr>
              ))
            }
          </tbody>
        </table>

        {total > 0 && <div style={styles.pagination}>
          <span style={{fontSize: '13px'}}>Affichage de {startItem} à {endItem} sur {total}</span>
          <div style={{display:'flex', gap:8, alignItems:'center'}}>
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1 || loading} style={{...styles.paginationBtn, opacity:page===1?0.5:1}}><ChevronLeft size={14}/>Précédent</button>
            <span style={{fontSize: '13px', fontWeight: '600'}}>Page {page} / {totalPages}</span>
            <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages || loading} style={{...styles.paginationBtn, opacity:page===totalPages?0.5:1}}>Suivant<ChevronRight size={14}/></button>
          </div>
        </div>}
      </div>

      {showModal && canComptable && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom: 16}}>
              <h3>Nouvelle Facture Fournisseur</h3>
              <button onClick={()=>setShowModal(false)} style={{border:'none', background:'none', cursor:'pointer'}}><X/></button>
            </div>
            <form onSubmit={handleCreate}>
              {errorMsg && <div style={styles.alert}><AlertCircle size={16}/>{errorMsg}</div>}
              {bcList.length === 0 &&!loadingBC && <div style={styles.info}><Info size={16}/>Tous les BC RECUE ont déjà une facture.</div>}
              <label style={styles.label}>Bon de Commande RECUE - {bcList.length} disponibles</label>
              <div style={styles.dropdown} ref={bcDropdownRef}>
                <button type="button" style={styles.dropdownBtn} onClick={()=>setShowBcDropdown(!showBcDropdown)} disabled={loadingBC || bcList.length === 0}>
                  <span>{selectedBcObj? `${selectedBcObj.numero} - ${selectedBcObj.fournisseur_detail?.raison_sociale}` : '-- Choisir BC --'}</span>
                  <ChevronDown size={16}/>
                </button>
                {showBcDropdown && (
                  <div style={styles.dropdownList}>
                    <div style={styles.dropdownSearch}>
                      <div style={{position:'relative'}}>
                        <Search size={14} style={{position:'absolute', left:8, top:10, color:'#64748b'}}/>
                        <input style={{...styles.input, paddingLeft:28}} placeholder="Recher BC N° ou Fournisseur..." value={searchBC} onChange={e=>setSearchBC(e.target.value)} onClick={e=>e.stopPropagation()}/>
                      </div>
                    </div>
                    {loadingBC && <div style={{padding:12}}>Chargement...</div>}
                    {bcListFiltered.length === 0 &&!loadingBC && <div style={{padding:12, color:'#64748b'}}>Aucun BC disponible</div>}
                    {bcListFiltered.map(bc => (
                      <div key={bc.id} style={styles.dropdownItem} onClick={()=>handleBcSelect(bc)} onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'} onMouseLeave={e=>e.currentTarget.style.background='white'}>
                        <div style={{fontWeight:600}}>{bc.numero}</div>
                        <div style={{fontSize:12, color:'#64748b'}}>{bc.fournisseur_detail?.raison_sociale || 'Sans Fournisseur'} - {Number(bc.total_ht || 0).toLocaleString('fr-FR')} Ar</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <label style={styles.label}>N° Facture Fournisseur</label>
              <input style={styles.input} value={form.numero_facture} onChange={e=>setForm({...form, numero_facture: e.target.value})} required placeholder="Ex: F2026-001"/>
              <label style={styles.label}>Date Facture</label>
              <input style={styles.input} type="date" value={form.date_facture} onChange={e=>setForm({...form, date_facture: e.target.value})} required/>
              <label style={styles.label}>Montant TTC</label>
              <input style={styles.input} type="number" step="0.01" value={form.montant_ttc} onChange={e=>setForm({...form, montant_ttc: e.target.value})} required/>
              <label style={styles.label}>Date Echéance</label>
              <input style={styles.input} type="date" value={form.date_echeance} onChange={e=>setForm({...form, date_echeance: e.target.value})} required/>
              <button type="submit" disabled={saving || loadingBC || bcList.length === 0} style={{...(saving || loadingBC || bcList.length === 0? styles.btnPrimaryDisabled : styles.btnPrimary), marginTop: 20, width:'100%', justifyContent:'center'}}>
                {saving? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} Enregistrer Facture
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}