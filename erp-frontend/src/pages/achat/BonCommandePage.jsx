import { useEffect, useState, useRef, useMemo } from "react";
import api from "../../utils/api";
import { Loader2, Plus, Package, CheckCircle, XCircle, Clock, X, Save, ChevronLeft, ChevronRight, Trash2, Info, Search, ChevronDown, Download, Truck, Camera, RefreshCw, Filter } from "lucide-react";
import { toast, Toaster } from "sonner";

const getUserRole = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return (user.role || 'ACHETEUR').toUpperCase();
  } catch { return 'ACHETEUR' }
}

const STATUS_MAPPING = {
  BROUILLON: "Brouillon", EN_ATTENTE: "En attente", PRET: "Prêt",
  EN_COURS_LIVRAISON: "En cours", PARTIELLEMENT_RECUE: "Reçu partiel",
  RECUE: "Livré", ANNULER: "Annulé",
}

const STATUS_COLORS = {
  BROUILLON: { bg: '#fef3c7', text: '#92400e', icon: Clock },
  EN_ATTENTE: { bg: '#dbeafe', text: '#1e40af', icon: CheckCircle },
  PRET: { bg: '#fef9c3', text: '#854d0e', icon: Package },
  EN_COURS_LIVRAISON: { bg: '#cffafe', text: '#155e75', icon: Truck },
  PARTIELLEMENT_RECUE: { bg: '#dbeafe', text: '#1e40af', icon: Package },
  RECUE: { bg: '#d1fae5', text: '#065f46', icon: CheckCircle },
  ANNULER: { bg: '#fee2e2', text: '#991b1b', icon: XCircle },
};

const fetchAllPages = async (url) => {
  let allResults = []; let nextUrl = url; let page = 1;
  while(nextUrl){
    const res = await api.get(`${nextUrl}${nextUrl.includes('?')? '&' : '?'}page=${page}&page_size=1000`);
    allResults = [...allResults,...(res.data.results || [])]; nextUrl = res.data.next; page++;
    if(page > 20) break;
  }
  return allResults;
}

export default function BonCommandePage() {
  const userRole = getUserRole();
  const [data, setData] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(null);
  const [page, setPage] = useState(1); const [pageSize] = useState(5);
  const [showModal, setShowModal] = useState(false); const [saving, setSaving] = useState(false);
  const [loadingInit, setLoadingInit] = useState(true); const [loadingDpLignes, setLoadingDpLignes] = useState(false);
  const [initError, setInitError] = useState(''); const [debugInfo, setDebugInfo] = useState('');
  const [searchDP, setSearchDP] = useState(''); const [showDpDropdown, setShowDpDropdown] = useState(false);
  const [search, setSearch] = useState(''); const [filterStatut, setFilterStatut] = useState('ALL');
  const dpDropdownRef = useRef(null);
  const [showLivModal, setShowLivModal] = useState(false); const [livModalType, setLivModalType] = useState('');
  const [bcLiv, setBcLiv] = useState(null); const [chauffeurs, setChauffeurs] = useState([]);
  const [formAssign, setFormAssign] = useState({ chauffeur: '', adresse_livraison: '', date_depart: '' });
  const [lignesReception, setLignesReception] = useState([]);
  const [dpList, setDpList] = useState([]); const [dpListFiltered, setDpListFiltered] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]); const [produits, setProduits] = useState([]);
  const [form, setForm] = useState({ demande_prix: '', fournisseur: '', date_achat: new Date().toISOString().split('T')[0], note: '', lignes: [] });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dpDropdownRef.current &&!dpDropdownRef.current.contains(event.target)) { setShowDpDropdown(false); }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchData = async () => {
    setLoading(true); setError(null);
    try { const allData = await fetchAllPages('/achat/'); setData(allData); }
    catch(err) { setError("Erreur: Vérifie que Django tourne"); console.error(err) } finally { setLoading(false); }
  }
  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if(searchDP === ''){ setDpListFiltered(dpList); }
    else { const filtered = dpList.filter(dp => dp.numero?.toLowerCase().includes(searchDP.toLowerCase()) || dp.objet?.toLowerCase().includes(searchDP.toLowerCase())); setDpListFiltered(filtered); }
  }, [searchDP, dpList]);

  const loadInitData = async () => {
    setLoadingInit(true); setDebugInfo('');
    try{
      const results=await Promise.allSettled([
        fetchAllPages('/demandes-prix/'),
        fetchAllPages('/achat/'),
        api.get('/fournisseurs/?page_size=200').catch(()=>api.get('/fournisseur/?page_size=200')),
        api.get('/produits/?page_size=200'),
        api.get('/chauffeurs/?actif=true')
      ]);
      const allDP=results[0].status==='fulfilled'?results[0].value:[];
      const allBC=results[1].status==='fulfilled'?results[1].value:[];
      const resF=results[2].status==='fulfilled'?results[2].value:{data:{results:[]}};
      const resP=results[3].status==='fulfilled'?results[3].value:{data:{results:[]}};
      const resChauff=results[4].status==='fulfilled'?results[4].value:{data:[]};
      const ids=allBC.filter(bc=>bc.statut!=='ANNULER').map(bc=>{
        const v=bc.demande_prix||bc.demande_prix_id||bc.demande_prix_detail?.id||bc.demande_prix_detail||bc.dp||0;
        return Number(typeof v==='object'?v.id||0:v);
      }).filter(id=>id>0);
      const dpAvecBCActif=new Set(ids);
      const dpsLibres=allDP.filter(dp=>!dpAvecBCActif.has(Number(dp.id))&&dp.statut==='VALIDEE');
      setDpList(dpsLibres); setDpListFiltered(dpsLibres);
      setFournisseurs(resF.data.results||resF.data||[]);
      setProduits(resP.data.results||resP.data||[]);
      const ch=resChauff.data.results||resChauff.data||[];
      setChauffeurs(ch.map(c=>({...c,nom:c.nom||`${c.first_name||''} ${c.last_name||''}`.trim()||c.username})));
    }catch(err){}
    finally{setLoadingInit(false);}
  }
  useEffect(() => { loadInitData(); }, []);

  const filteredData = useMemo(() => {
    return data.filter(bc =>
      bc.numero?.toLowerCase().includes(search.toLowerCase()) ||
      bc.fournisseur_detail?.raison_sociale?.toLowerCase().includes(search.toLowerCase())
    ).filter(bc => filterStatut === 'ALL' || bc.statut === filterStatut);
  }, [data, search, filterStatut]);

  const totalFiltered = filteredData.length;
  const totalPages = Math.ceil(totalFiltered / pageSize);
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, page, pageSize]);
  useEffect(() => { setPage(1) }, [search, filterStatut]);

  const handleDpSelect = async (dp) => { setForm(prev => ({...prev, demande_prix: dp.id})); setShowDpDropdown(false); setSearchDP(''); await handleDpChange(dp.id); }
  const handleDpChange = async (dp_id) => {
    const dp = dpList.find(d => d.id == dp_id); if(!dp){ setForm(prev => ({...prev, demande_prix: '', fournisseur: '', lignes: [] })); return;}
    setLoadingDpLignes(true); setForm(prev => ({...prev, demande_prix: dp_id, fournisseur: '', lignes: [] }))
    try {
      const resLignes = await api.get(`/lignes-demande-prix/?demande_prix=${dp_id}&page_size=200&_=${Date.now()}`);
      let lignes = resLignes.data.results || resLignes.data || []; lignes = lignes.filter(l => Number(l.demande_prix) === Number(dp_id));
      const fournisseursLignes = [...new Set(lignes.map(l => l.fournisseur).filter(Boolean))];
      let fournisseur_id = fournisseursLignes.length === 1? fournisseursLignes[0] : '';
      setForm(prev => ({...prev, fournisseur: fournisseur_id, lignes: lignes.length > 0? lignes.map(l => ({ temp_id: `${dp_id}-${l.id || `new`}-${Date.now()}-${Math.random()}`, produit: l.produit? Number(l.produit) : '', quantite: Number(l.quantite) || 1, prix_achat_unitaire: Number(l.prix_propose || 0) })) : [] }));
      if(lignes.length === 0){toast.warning("Cette DP n'a aucune ligne.");}
    } catch(err) {console.error();}
    finally {setLoadingDpLignes(false);}
  }
  const handleLigneChange = (temp_id, field, value) => { setForm(prev => ({...prev, lignes: prev.lignes.map(l => l.temp_id === temp_id? {...l, [field]: ['quantite','prix_achat_unitaire','produit'].includes(field)? Number(value) : value} : l) })); }
  const handleAddLigne = () => { setForm(prev => ({...prev, lignes: [...prev.lignes, { temp_id: `new-${Date.now()}-${Math.random()}`, produit: '', quantite: 1, prix_achat_unitaire: 0 }] })) }
  const handleRemoveLigne = (temp_id) => { setForm(prev => ({...prev, lignes: prev.lignes.filter((l) => l.temp_id!== temp_id)})) }

  // ✅ CORRIGÉ : UN SEUL POST, PAS 3
  const handleCreate = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!form.demande_prix) return toast.error("Veuillez choisir une DP");
    if (!form.fournisseur) return toast.error("Veuillez choisir un Fournisseur");
    const lignesValides = form.lignes.filter(l => l.produit && l.quantite > 0);
    if (lignesValides.length === 0) return toast.error("Ajoutez au moins 1 ligne produit");
    const dpIdUtilise = Number(form.demande_prix);
    setSaving(true);
    try {
      const res = await api.post('/achat/', {
        demande_prix: dpIdUtilise,
        fournisseur: Number(form.fournisseur),
        date_achat: form.date_achat,
        note: form.note,
        lignes: lignesValides.map(l => ({ produit: Number(l.produit), quantite: Number(l.quantite), prix_achat_unitaire: Number(l.prix_achat_unitaire) }))
      });
      toast.success("Bon de Commande créé");
      setDpList(prev => prev.filter(d => Number(d.id) !== dpIdUtilise));
      setDpListFiltered(prev => prev.filter(d => Number(d.id) !== dpIdUtilise));
      setData(prev => [...prev, res.data]);
      setPage(Math.ceil((data.length + 1) / pageSize));
      setShowModal(false);
      setForm({ demande_prix: '', fournisseur: '', date_achat: new Date().toISOString().split('T')[0], note: '', lignes: [] });
      setSearchDP('');
      await loadInitData();
    } catch(err) { toast.error("Erreur: " + JSON.stringify(err.response?.data)) } finally { setSaving(false); }
  }

  const handleExportPDF = async (id, numero) => { try { const res = await api.get(`/achat/${id}/pdf/`, { responseType: 'blob' }); const url = window.URL.createObjectURL(new Blob([res.data])); const link = document.createElement('a'); link.href = url; link.setAttribute('download', `BC-${numero}.pdf`); document.body.appendChild(link); link.click(); link.remove(); toast.success("PDF téléchargé"); } catch(err) { toast.error("Erreur export PDF"); } }
  const openAssignModal = (bc) => { setBcLiv(bc); setFormAssign({ chauffeur: bc.chauffeur || '', adresse_livraison: bc.adresse_livraison || '', date_depart: bc.date_depart? bc.date_depart.split('T')[0] : '' }); setLivModalType('assign'); setShowLivModal(true); }
  const handleAssigner = async (e) => {
    e.preventDefault(); setSaving(true);
    try { const res = await api.post(`/achat/${bcLiv.id}/assigner/`, { chauffeur: formAssign.chauffeur? Number(formAssign.chauffeur) : null, adresse_livraison: formAssign.adresse_livraison || '', date_depart: formAssign.date_depart || null }); toast.success("Chauffeur assigné avec succès"); setData(prev => prev.map(bc => bc.id === bcLiv.id? res.data : bc)); setShowLivModal(false); } catch(err) { toast.error("Erreur assignation: " + JSON.stringify(err.response?.data)) } finally { setSaving(false); }
  }
  const openTerminerModal = async (bc) => { setBcLiv(bc); setLoading(true); try { const res = await api.get(`/achat/${bc.id}/`); setLignesReception(res.data.lignes.map(l => ({...l, quantite_recue: 0}))); setLivModalType('terminer'); setShowLivModal(true); } catch(err) { toast.error("Erreur chargement lignes") } finally { setLoading(false); } }
  const handleQtyChange = (ligne_id, value) => { setLignesReception(prev => prev.map(l => l.id === ligne_id? {...l, quantite_recue: value} : l)); }
  const handleTerminer = async (e) => {
    e.preventDefault();
    const lignesAvecQte = lignesReception.filter(l => Number(l.quantite_recue) > 0);
    if(lignesAvecQte.length === 0){ return toast.warning("Tsy maintsy misy zavatra voaray fara-fahakeliny 1"); }
    setSaving(true);
    try { const res = await api.post(`/receptions/`, { achat: bcLiv.id, date_reception: new Date().toISOString().split('T')[0], lignes: lignesAvecQte.map(l=>({ produit: l.produit, quantite_commandee: Number(l.quantite), quantite_recue: Number(l.quantite_recue), quantite_refusee: 0, motif_refus: '' })) }); toast.success("Réception validée avec succès"); setData(prev => prev.map(bc => bc.id === bcLiv.id? res.data.achat : bc)); setShowLivModal(false); } catch(err) { toast.error("Erreur reception: " + JSON.stringify(err.response?.data)) } finally { setSaving(false); }
  }
  const handleMettrePret = async (id) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir passer au statut: Prêt?`)) return;
    try { setSaving(true); const res = await api.patch(`/achat/${id}/mettre-pret/`); setData(prev => prev.map(bc => bc.id === id? res.data : bc)); toast.success(`Statut mis à jour: Prêt`); } catch(err) { toast.error(`❌ ${err.response?.data?.error}`); } finally { setSaving(false); }
  }
  const handleStatutMagasinier = async (id, action) => {
    const label = action === 'recu-partiel' ? 'Reçu partiel' : 'Livré';
    if (!window.confirm(`Êtes-vous sûr de vouloir passer au statut: ${label}?`)) return;
    try { setSaving(true); const res = await api.patch(`/achat/${id}/${action}/`); setData(prev => prev.map(bc => bc.id === id? res.data : bc)); toast.success(`Statut mis à jour: ${label}`); } catch(err) { toast.error(`❌ ${err.response?.data?.error}`); } finally { setSaving(false); }
  }
  const handleChangeStatut = async (id, actionStatut) => {
    if (!window.confirm(`Êtes-vous sûr ?`)) return;
    try { setSaving(true); let res; if (actionStatut === 'VALIDER') { res = await api.patch(`/achat/${id}/valider/`); } else if (actionStatut === 'ANNULER') { res = await api.patch(`/achat/${id}/annuler/`); } setData(prev => prev.map(bc => bc.id === id ? res.data : bc)); toast.success(`Statut mis à jour`); } catch(err) { toast.error(`❌ ${err.response?.data?.error || "Non autorisé"}`); } finally { setSaving(false); }
  }

  const isAdmin = userRole === 'ADMIN';
  const isMagasinier = userRole === 'MAGASINIER';
  const getActionsForStatut = (bc) => {
    const actions = []; const s = bc.statut;
    if (s === 'BROUILLON' && isAdmin) actions.push({ label: 'Valider', next: 'VALIDER', color: '#16a34a' });
    if (s === 'BROUILLON' && (isAdmin || userRole === 'ACHETEUR')) actions.push({ label: 'Annuler', next: 'ANNULER', color: '#ef4444' });
     if (s === 'EN_ATTENTE' && isMagasinier) actions.push({ label: 'Prêt', fn: () => handleMettrePret(bc.id), color: '#eab308' });
    if (s === 'PRET' && isMagasinier) actions.push({ label: 'Expédier', fn: () => openAssignModal(bc), color: '#0ea5e9' });
    if (s === 'EN_COURS_LIVRAISON' && isMagasinier) { actions.push({ label: 'Terminer', fn: () => openTerminerModal(bc), color: '#16a34a' }); actions.push({ label: 'Reçu partiel', fn: () => handleStatutMagasinier(bc.id, 'recu-partiel'), color: '#2563eb' }); }
    if (s === 'PARTIELLEMENT_RECUE' && isMagasinier) actions.push({ label: 'Livré', fn: () => handleStatutMagasinier(bc.id, 'livre'), color: '#16a34a' });
    return actions;
  }

  const handlePageChange = (newPage) => { if (newPage >= 1 && newPage <= totalPages) { setPage(newPage); window.scrollTo({ top: 0, behavior: 'smooth' }); } }
  const selectedDpObj = dpList.find(d => d.id == form.demande_prix);
  const stats = { total: data.length, enCours: data.filter(d => ['EN_ATTENTE','PRET','EN_COURS_LIVRAISON'].includes(d.statut)).length, livre: data.filter(d => d.statut === 'RECUE').length, totalHT: data.reduce((sum, d) => sum + Number(d.total_ht || 0), 0) }
  const styles = {
    container: {padding: '0'}, header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }, title: { fontSize: 24, fontWeight: 700, color: '#1e293b' },
    btnPrimary: { background: '#16a34a', color: 'white', border: 'none', padding: '10px 16px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }, statCard: { background: 'white', padding: 20, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #f1f5f9' }, statLabel: { fontSize: 13, color: '#64748b', margin: 0 }, statValue: { fontSize: 24, fontWeight: 700, color: '#1e293b', margin: '4px 0 0 0' },
    card: { background: 'white', borderRadius: 12, padding: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', overflow: 'hidden' }, toolbar: { padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
    searchBox: {display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', flex: 1, minWidth: 250}, filterBox: {display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px'},
    table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 }, th: { textAlign: 'left', padding: '14px 16px', background: '#f8fafc', color: '#475569', fontWeight: 600, borderBottom: '1px solid #e2e8f0', fontSize: 12, textTransform: 'uppercase' }, td: { padding: '14px 16px', borderBottom: '1px solid #f1f5f9', color: '#334155' }, tr: { transition: 'background 0.2s' },
    badge: (status) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: STATUS_COLORS[status]?.bg || '#f1f5f9', color: STATUS_COLORS[status]?.text || '#475569' }),
    pagination: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderTop: '1px solid #e2e8f0' }, btnPage: (disabled) => ({ padding: '8px 12px', border: '1px solid #cbd5e1', background: disabled? '#f1f5f9' : 'white', borderRadius: 6, cursor: disabled? 'not-allowed' : 'pointer', opacity: disabled? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }),
    btnIcon: { border: 'none', background: '#eff6ff', color: '#2563eb', padding: 8, borderRadius: 6, cursor: 'pointer' }, modal: { position: 'fixed', top:0, left:0, right:0, bottom:0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }, modalContent: { background: 'white', borderRadius: 16, padding: 24, width: '90%', maxWidth: 900, maxHeight:'90vh', overflowY:'auto' },
    input: { padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, width:'100%', fontSize: 14 }, label: {fontSize:12, fontWeight:600, marginTop:12, display:'block', marginBottom:6, color: '#475569'},
    alertInfo: {display:'flex', gap:8, padding:12, background:'#eff6ff', color:'#1e40af', borderRadius:8, marginBottom:12, alignItems:'center'}, debug: {fontSize:11, color:'#64748b', marginBottom:8},
    dropdown: {position:'relative'}, dropdownBtn: {display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%', padding:'10px 12px', border:'1px solid #cbd5e1', borderRadius:8, background:'white', cursor:'pointer'},
    dropdownList: {position:'absolute', top:'100%', left:0, right:0, background:'white', border:'1px solid #cbd5e1', borderRadius:8, marginTop:4, maxHeight:300, overflowY:'auto', zIndex:1001, boxShadow:'0 4px 6px rgba(0,0,0,0.1)'},
    dropdownItem: {padding:'10px 12px', cursor:'pointer', borderBottom:'1px solid #f1f5f9'}, dropdownSearch: {padding:'8px', borderBottom:'1px solid #e2e8f0', position:'sticky', top:0, background:'white'}
  }
  if (loading) return <div style={{textAlign: ' center', padding: 40}}><Loader2 className="animate-spin" size={24}/></div>;
  if (error) return <div style={{padding:20, background:'#fef2f2', color:'#991b1b', borderRadius:8}}>{error}</div>;
  return (
    <div style={styles.container}>
      <Toaster richColors position="top-right"/>
      <div style={styles.header}><h2 style={styles.title}>Bon de Commande & Livraison - {userRole}</h2>{userRole === 'ACHETEUR' && (<button style={styles.btnPrimary} onClick={()=>setShowModal(true)}><Plus size={16}/> Nouveau BC</button>)}</div>
      <div style={styles.statsGrid}>
        <div style={styles.statCard}><p style={styles.statLabel}>Total BC</p><p style={styles.statValue}>{stats.total}</p></div>
        <div style={styles.statCard}><p style={styles.statLabel}>En Cours</p><p style={styles.statValue}>{stats.enCours}</p></div>
        <div style={styles.statCard}><p style={styles.statLabel}>Livrées</p><p style={styles.statValue}>{stats.livre}</p></div>
        <div style={styles.statCard}><p style={styles.statLabel}>Total HT</p><p style={styles.statValue}>{stats.totalHT.toLocaleString('fr-FR')} Ar</p></div>
      </div>
      <div style={styles.card}>
        <div style={styles.toolbar}><div style={styles.searchBox}><Search size={16} color="#64748b"/><input style={{border:'none', outline:'none', flex:1}} placeholder="Recher N° BC, Fournisseur..." value={search} onChange={e => setSearch(e.target.value)}/></div><div style={styles.filterBox}><Filter size={16} color="#64748b"/><select style={{border:'none', outline:'none'}} value={filterStatut} onChange={e => setFilterStatut(e.target.value)}><option value="ALL">Tous Statuts</option>{Object.keys(STATUS_MAPPING).map(s => <option key={s} value={s}>{STATUS_MAPPING[s]}</option>)}</select></div></div>
        <table style={styles.table}><thead><tr><th style={styles.th}>N° BC</th><th style={styles.th}>Fournisseur</th><th style={styles.th}>Chauffeur</th><th style={styles.th}>Date</th><th style={{...styles.th, textAlign: 'right'}}>Total HT</th><th style={styles.th}>Statut</th><th style={{...styles.th, textAlign: 'center'}}>Actions</th></tr></thead>
          <tbody>{paginatedData.length === 0? (<tr><td colSpan="7" style={{textAlign: 'center', padding: 40, color: '#94a3b8'}}>Aucun Bon de Commande</td></tr>) : paginatedData.map(bc => { const StatusIcon = STATUS_COLORS[bc.statut]?.icon || Clock; const actions = getActionsForStatut(bc); return (<tr key={bc.id} style={styles.tr}><td style={{...styles.td, fontWeight: 600}}>{bc.numero}</td><td style={styles.td}>{bc.fournisseur_detail?.raison_sociale || bc.fournisseur_nom || 'N/A'}</td><td style={styles.td}>{bc.chauffeur_detail?.nom || bc.chauffeur_nom || '-'}</td><td style={styles.td}>{new Date(bc.date_achat).toLocaleDateString('fr-FR')}</td><td style={{...styles.td, textAlign: 'right', fontWeight: 600}}>{Number(bc.total_ht || 0).toLocaleString('fr-FR')} Ar</td><td style={styles.td}><span style={styles.badge(bc.statut)}><StatusIcon size={14}/> {STATUS_MAPPING[bc.statut] || bc.statut}</span></td><td style={{...styles.td, textAlign: 'center'}}><div style={{display:'flex', gap:6, justifyContent:'center', flexWrap:'wrap'}}><button style={styles.btnIcon} title="Télécharger PDF" onClick={()=>handleExportPDF(bc.id, bc.numero)}><Download size={16}/></button>{actions.map(action => (<button key={action.label} onClick={() => action.fn? action.fn() : handleChangeStatut(bc.id, action.next)} disabled={saving} style={{ padding:'6px 10px', fontSize:11, border:'none', borderRadius:6, background:action.color, color:'white', cursor:'pointer', fontWeight:600, opacity: saving? 0.6 : 1 }}>{action.label}</button>))}</div></td></tr>)})}</tbody></table>
        {totalFiltered > pageSize && (<div style={styles.pagination}><span style={{fontSize: 13, color: '#64748b'}}>Affichage de {(page-1)*pageSize+1} à {Math.min(page*pageSize, totalFiltered)} sur {totalFiltered} résultats</span><div style={{display: 'flex', gap: 8}}><button style={styles.btnPage(page === 1)} disabled={page === 1} onClick={() => handlePageChange(page - 1)}><ChevronLeft size={16}/> Précédent</button><span>Page {page} / {totalPages}</span><button style={styles.btnPage(page === totalPages)} disabled={page === totalPages} onClick={() => handlePageChange(page + 1)}>Suivant <ChevronRight size={16}/></button></div></div>)}
      </div>
      {showModal && (<div style={styles.modal}><div style={styles.modalContent}><div style={{display:'flex', justifyContent:'space-between', marginBottom: 16}}><h3>Créer un Bon de Commande</h3><div style={{display:'flex', gap:8}}><button onClick={loadInitData} style={{...styles.btnPrimary, background:'#f1f5f9', color:'#475569'}}><RefreshCw size={14}/> Recharger</button><button onClick={()=>setShowModal(false)} style={{border:'none', background:'none', cursor:'pointer'}}><X/></button></div></div><div style={styles.debug}>{debugInfo}</div>{initError && <div style={styles.alertInfo}><Info size={16}/>{initError}</div>}<form onSubmit={handleCreate}><label style={styles.label}>Demande Prix disponible - {dpList.length} DP</label><div style={styles.dropdown} ref={dpDropdownRef}><button type="button" style={styles.dropdownBtn} onClick={()=>setShowDpDropdown(!showDpDropdown)} disabled={loadingInit}><span>{selectedDpObj? `${selectedDpObj.numero} - ${selectedDpObj.objet}` : '-- Choisir DP --'}</span><ChevronDown size={16}/></button>{showDpDropdown && (<div style={styles.dropdownList}><div style={styles.dropdownSearch}><div style={{position:'relative'}}><Search size={14} style={{position:'absolute', left:8, top:10, color:'#64748b'}}/><input style={{...styles.input, paddingLeft:28}} placeholder="Recher DP..." value={searchDP} onChange={e=>setSearchDP(e.target.value)} onClick={e=>e.stopPropagation()}/></div></div>{dpListFiltered.length === 0 && <div style={{padding:12, color:'#64748b'}}>Aucune DP trouvée</div>}{dpListFiltered.map(dp => (<div key={dp.id} style={styles.dropdownItem} onClick={()=>handleDpSelect(dp)}><div style={{fontWeight:600}}>{dp.numero}</div><div style={{fontSize:12, color:'#64748b'}}>{dp.objet} [{dp.statut}]</div></div>))}</div>)}</div><label style={styles.label}>Fournisseur</label><select style={styles.input} value={form.fournisseur} onChange={e=>setForm(prev=>({...prev, fournisseur: e.target.value}))} required disabled={loadingInit || loadingDpLignes}><option value="">-- Choisir --</option>{fournisseurs.map(f => <option key={f.id} value={f.id}>{f.raison_sociale || f.nom}</option>)}</select><label style={styles.label}>Date d'achat</label><input style={styles.input} type="date" value={form.date_achat} onChange={e=>setForm(prev=>({...prev, date_achat: e.target.value}))} required /><div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:16, marginBottom:8}}><h4>Lignes</h4><button type="button" onClick={handleAddLigne} style={{...styles.btnPrimary, padding:'6px 10px', fontSize:12}}><Plus size={14}/> Ajouter</button></div>{loadingDpLignes && <div style={{textAlign:'center', padding:10}}><Loader2 size={16} className="animate-spin"/> Chargement lignes...</div>}{form.lignes.map((ligne) => (<div key={ligne.temp_id} style={{display:'grid', gridTemplateColumns:'2fr 100px 120px 40px', gap:8, marginBottom:8, alignItems:'center'}}><select style={styles.input} value={ligne.produit || ''} onChange={e=>handleLigneChange(ligne.temp_id,'produit',e.target.value)} required><option value="">-- Produit --</option>{produits.map(p => <option key={p.id} value={p.id}>{p.designation}</option>)}</select><input style={styles.input} type="number" min="1" value={ligne.quantite || 1} onChange={e=>handleLigneChange(ligne.temp_id,'quantite',e.target.value)} placeholder="Qté"/><input style={styles.input} type="number" step="0.01" min="0" value={ligne.prix_achat_unitaire || 0} onChange={e=>handleLigneChange(ligne.temp_id,'prix_achat_unitaire',e.target.value)} placeholder="PU"/><button type="button" onClick={()=>handleRemoveLigne(ligne.temp_id)} style={{background:'#fee2e2', color:'#991b1b', border:'none', padding:8, borderRadius:6, cursor:'pointer'}}><Trash2 size={14}/></button></div>))}<button type="submit" disabled={saving || loadingDpLignes || dpList.length === 0} style={{...styles.btnPrimary, marginTop: 20, width:'100%', justifyContent:'center'}}>{saving? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} Valider BC</button></form></div></div>)}
      {showLivModal && livModalType === 'assign' && (<div style={styles.modal}><div style={styles.modalContent}><div style={{display:'flex', justifyContent:'space-between', marginBottom: 16}}><h3>Assigner Chauffeur: {bcLiv?.numero}</h3><button onClick={()=>setShowLivModal(false)} style={{border:'none', background:'none', cursor:'pointer'}}><X/></button></div><form onSubmit={handleAssigner}><label style={styles.label}>Chauffeur *</label><select style={styles.input} value={formAssign.chauffeur} onChange={e=>setFormAssign({...formAssign, chauffeur: e.target.value})} required><option value="">-- Choisir un chauffeur actif --</option>{chauffeurs.length === 0 && <option disabled>Aucun chauffeur actif</option>}{chauffeurs.map(c => <option key={c.id} value={c.id}>{c.nom} - {c.numero_permis}</option>)}</select><label style={styles.label}>Date Départ Prévue</label><input style={styles.input} type="date" value={formAssign.date_depart} onChange={e=>setFormAssign({...formAssign, date_depart: e.target.value})}/><label style={styles.label}>Adresse Livraison</label><input style={styles.input} value={formAssign.adresse_livraison} onChange={e=>setFormAssign({...formAssign, adresse_livraison: e.target.value})} placeholder="Adresse complète de livraison"/><button type="submit" disabled={saving} style={{...styles.btnPrimary, marginTop: 20, width:'100%', justifyContent:'center'}}>{saving? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} Confirmer Expédition</button></form></div></div>)}
      {showLivModal && livModalType === 'terminer' && (<div style={styles.modal}><div style={styles.modalContent}><div style={{display:'flex', justifyContent:'space-between', marginBottom: 16}}><h3>Terminer Réception: {bcLiv?.numero}</h3><button onClick={()=>setShowLivModal(false)} style={{border:'none', background:'none', cursor:'pointer'}}><X/></button></div><p style={{color:'#64748b', marginBottom:16, fontSize:14}}>Saisissez la quantité réellement reçue pour chaque produit. Laissez à 0 si non reçu.</p>{loading ? <div style={{textAlign:'center', padding:20}}><Loader2 className="animate-spin"/></div> : (<div style={{maxHeight: 400, overflowY: 'auto', marginBottom: 16}}><table style={{width:'100%'}}><thead><tr><th style={styles.th}>Produit</th><th style={{...styles.th, textAlign:'right'}}>Qté Commandée</th><th style={{...styles.th, width: 140}}>Qté Reçue</th></tr></thead><tbody>{lignesReception.map(l => (<tr key={l.id}><td style={styles.td}>{l.produit_detail?.designation || 'Produit N/A'}</td><td style={{...styles.td, textAlign:'right', fontWeight:600}}>{Number(l.quantite).toFixed(2)}</td><td style={styles.td}><input type="number" style={styles.input} value={l.quantite_recue} onChange={e=>handleQtyChange(l.id, e.target.value)} min="0" max={l.quantite} step="0.01"/></td></tr>))}</tbody></table></div>)}<div style={{display:'flex', gap:12}}><button onClick={()=>setShowLivModal(false)} style={{...styles.btnPrimary, background:'#f1f5f9', color:'#475569', flex:1}}>Annuler</button><button onClick={handleTerminer} disabled={saving} style={{...styles.btnPrimary, flex:2, justifyContent:'center'}}>{saving? <Loader2 className="animate-spin" size={16}/> : <Camera size={16}/>} Valider Réception</button></div></div></div>)}
    </div>
  );
}