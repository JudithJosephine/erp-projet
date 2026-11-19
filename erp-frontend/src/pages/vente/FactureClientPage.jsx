import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";
import { Loader2, Eye, Receipt, ChevronLeft, ChevronRight, Search, FileText, Download, Plus, X, AlertCircle, ChevronDown, Mail } from "lucide-react";
import { toast, Toaster } from "sonner";
const STATUS_MAPPING = {
BROUILLON: "Brouillon", VALIDEE: "Validée", PAYEE: "Payée",
IMPAYEE: "Impayée", PARTIEL: "Partielle", ANNULEE: "Annulée"
}
const styles = {
container: { padding: '0' },
header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
title: { fontSize: 24, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 10 },
statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 },
statCard: { background: 'white', padding: 20, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #f1f5f9' },
statLabel: { fontSize: 13, color: '#64748b', margin: 0 },
statValue: { fontSize: 24, fontWeight: 700, color: '#1e293b', margin: '4px 0 0 0' },
card: { background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' },
toolbar: { padding: '16px 20px', borderBottom: '1px solid #f1f5f9' },
searchBox: { display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', width: 320 },
th: { padding: '12px 16px', textAlign: 'left', fontSize: 12, background: '#f8fafc', fontWeight: 600, textTransform: 'uppercase', color: '#475569', borderBottom: '1px solid #e2e8f0' },
td: { padding: '12px 16px', borderBottom: '1px solid #f1f5f9', fontSize: 14, color: '#334155' },
tr: { transition: 'background 0.2s' },
pagination: { display: 'flex', justifyContent: 'space-between', padding: 16, alignItems: 'center', background: '#f8fafc' },
paginationBtn: { padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: '600' },
btnIconPrimary: { background: '#e0f2fe', color: '#0284c7', border: '1px solid #bae6fd', padding: '6px', borderRadius: 6, cursor: 'pointer', display: 'flex' },
btnIconMail: { background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a', padding: '6px', borderRadius: 6, cursor: 'pointer', display: 'flex' },
btnSecondary: { padding: '6px 10px', background: '#eff6ff', color: '#2563eb', border: '1px solid #dbeafe', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontWeight: 600, fontSize: 12 },
btnPrimary: { padding: '10px 16px', background: '#16a34a', color: 'white', border: 'none', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight:600 },
btnPrimaryDisabled: { padding: '10px 16px', background: '#9ca3af', color: 'white', border: 'none', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6, cursor: 'not-allowed', fontWeight:600 },
badgeRed: { padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background: '#fef2f2', color: '#dc2626' },
badgeGreen: { padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background: '#f0fdf4', color: '#16a34a' },
modal: { position: 'fixed', top:0, left:0, right:0, bottom:0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' },
modalContent: { background: 'white', borderRadius: 12, padding: 24, width: '90%', maxWidth: 700 },
input: { padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6, width:'100%' },
label: {fontSize:12, fontWeight:600, marginTop:12, display:'block', marginBottom:4},
dropdown: {position:'relative'},
dropdownBtn: {display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%', padding:'8px 10px', border:'1px solid #cbd5e1', borderRadius:6, background:'white', cursor:'pointer'},
dropdownList: {position:'absolute', top:'100%', left:0, right:0, background:'white', border:'1px solid #cbd5e1', borderRadius:6, marginTop:4, maxHeight:300, overflowY:'auto', zIndex:1001, boxShadow:'0 4px 6px rgba(0,0,0,0.1)'},
dropdownItem: {padding:'10px 12px', cursor:'pointer', borderBottom:'1px solid #f1f5f9'},
dropdownSearch: {padding:'8px', borderBottom:'1px solid #e2e8f0', position:'sticky', top:0, background:'white'},
alert: {display:'flex', gap:8, padding:12, background:'#fef2f2', color:'#991b1b', borderRadius:8, marginBottom:12, alignItems:'center'},
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
export default function FactureClientPage() {
const navigate = useNavigate();
const [data, setData] = useState([]);
const [allFacturesForStats, setAllFacturesForStats] = useState([]);
const [blList, setBlList] = useState([]);
const [blListFiltered, setBlListFiltered] = useState([]);
const [loading, setLoading] = useState(true);
const [loadingBL, setLoadingBL] = useState(true);
const [loadingPDF, setLoadingPDF] = useState(null);
const [loadingEmail, setLoadingEmail] = useState(null);
const [saving, setSaving] = useState(false);
const [showModal, setShowModal] = useState(false);
const [selectedBL, setSelectedBL] = useState('');
const [page, setPage] = useState(1);
const [pageSize] = useState(5);
const [total, setTotal] = useState(0);
const [search, setSearch] = useState('');
const [searchBL, setSearchBL] = useState('');
const [showBlDropdown, setShowBlDropdown] = useState(false);
const [errorMsg, setErrorMsg] = useState('');
const [userRole, setUserRole] = useState('');
const blDropdownRef = useRef(null);
const totalPages = Math.ceil(total / pageSize);
const canComptable = userRole === 'COMPTABLE';
const formatAr = (val) => (parseFloat(val) || 0).toLocaleString('fr-FR')
const formatDate = (dateStr) => dateStr? new Date(dateStr).toLocaleDateString('fr-FR') : '-'
const selectedBlObj = blList.find(b => b.id == selectedBL);
useEffect(() => {
const user = JSON.parse(localStorage.getItem('user'));
setUserRole(user?.role || '');
}, []);
useEffect(() => {
const handleClickOutside = (event) => {
if (blDropdownRef.current &&!blDropdownRef.current.contains(event.target)) {
setShowBlDropdown(false);
}
};
document.addEventListener("mousedown", handleClickOutside);
return () => document.removeEventListener("mousedown", handleClickOutside);
}, []);
const fetchFactures = useCallback(async () => {
setLoading(true);
try {
const resFact = await api.get(`/facture-client/?page=${page}&page_size=${pageSize}&search=${search}`);
const factures = (resFact.data.results || []).map(f => ({
...f,
reste_a_payer: (parseFloat(f.total_ttc) || 0) - (parseFloat(f.montant_paye) || 0)
}))
setData(factures);
setTotal(resFact.data.count || 0);
} catch (err) {
console.error("ERREUR FACTURES:", err.response?.data);
toast.error(err.response?.data?.detail || "Erreur chargement factures")
} finally {
setLoading(false);
}
}, [page, pageSize, search]);
const fetchAllForStats = useCallback(async () => {
try {
const all = await fetchAllPages(`/facture-client/?search=${search}`);
setAllFacturesForStats(all);
} catch (err) { console.error(err) }
}, [search]);
const loadBLDisponibles = useCallback(async () => {
setLoadingBL(true);
try {
const allBL = await fetchAllPages('/bon-livraison/?statut_livraison=LIVREE&statut=VALIDEE');
const allFactures = await fetchAllPages('/facture-client/');
const blAvecFacture = new Set(allFactures.map(f => f.bl));
const blDisponibles = allBL.filter(bl =>!blAvecFacture.has(bl.id));
setBlList(blDisponibles);
setBlListFiltered(blDisponibles);
} catch(err) { console.error("Erreur chargement BL:", err) }
finally { setLoadingBL(false); }
}, []);
useEffect(() => { fetchFactures(); fetchAllForStats(); }, [fetchFactures, fetchAllForStats]);
useEffect(() => { loadBLDisponibles(); }, [loadBLDisponibles]);
useEffect(() => {
if(searchBL === ''){ setBlListFiltered(blList); }
else {
const filtered = blList.filter(bl =>
bl.numero?.toLowerCase().includes(searchBL.toLowerCase()) ||
bl.client_nom?.toLowerCase().includes(searchBL.toLowerCase())
);
setBlListFiltered(filtered);
}
}, [searchBL, blList]);
const handlePageChange = (newPage) => {
if (newPage >= 1 && newPage <= totalPages) {
setPage(newPage);
}
}
const handleCreateFacture = async (e) => {
e.preventDefault();
setSaving(true);
setErrorMsg('');
if(!selectedBL) { setSaving(false); return setErrorMsg("Veuillez choisir un Bon de Livraison"); }
try {
await api.post('/facture-client/', { bon_livraison: selectedBL });
toast.success("Facture créée avec succès");
setShowModal(false);
setSelectedBL('');
const newTotal = total + 1;
const lastPage = Math.ceil(newTotal / pageSize);
setPage(lastPage);
fetchFactures();
fetchAllForStats();
loadBLDisponibles();
} catch(err) {
console.error(err);
const msg = err.response?.data?.error || err.response?.data?.bon_livraison?.[0] || "Erreur lors de la création";
setErrorMsg(msg);
} finally { setSaving(false); }
}
const handleImprimer = async (factureId, numero) => {
setLoadingPDF(factureId);
try {
const response = await api.get(`/facture-client/${factureId}/pdf/`, { responseType: 'blob' });
const blob = new Blob([response.data], { type: 'application/pdf' });
const url = window.URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = `Facture_${numero}.pdf`;
document.body.appendChild(link);
link.click();
document.body.removeChild(link);
window.URL.revokeObjectURL(url);
toast.success("PDF téléchargé");
} catch (error) {
console.error("Erreur PDF Facture", error);
toast.error("Erreur lors du téléchargement");
} finally {
setLoadingPDF(null);
}
}
const handleSendEmail = async (factureId, clientNom) => {
if(!confirm(`Envoyer la facture par email au client ${clientNom}?`)) 
return;
setLoadingEmail(factureId);
try {
const res = await api.post(`/facture-client/${factureId}/send-email/`);
toast.success(res.data.message || "Email envoyé avec succès");
} catch (err) {
console.error(err);
const msg = err.response?.data?.error || "Erreur envoi email";
toast.error(msg);
} finally {
setLoadingEmail(null);
}
}
const stats = {
total: total,
aPayer: allFacturesForStats.filter(d => (parseFloat(d.total_ttc) || 0) - (parseFloat(d.montant_paye) || 0) > 0).length,
totalTTC: allFacturesForStats.reduce((sum, d) => sum + parseFloat(d.total_ttc || 0), 0)
}
const startItem = total === 0? 0 : (page - 1) * pageSize + 1;
const endItem = Math.min(page * pageSize, total);
if (loading && page === 1) return <div style={{ textAlign: 'center', padding: 40 }}><Loader2 className="animate-spin" size={24} /></div>;
return (
<div style={styles.container}>
<Toaster position="top-right" richColors />
<div style={styles.header}>
<h2 style={styles.title}><Receipt size={24} /> Factures Clients</h2>
{canComptable && (
<button 
style={blList.length === 0? styles.btnPrimaryDisabled : styles.btnPrimary} 
onClick={()=>setShowModal(true)} 
disabled={blList.length === 0}
title={blList.length === 0 ? "Aucun BL VALIDEE et LIVREE disponible" : ""}
>
<Plus size={16}/> Nouvelle Facture
</button>
)}
</div>
<div style={styles.statsGrid}>
<div style={styles.statCard}><p style={styles.statLabel}>Total Factures</p><p style={styles.statValue}>{stats.total}</p></div>
<div style={styles.statCard}><p style={styles.statLabel}>A Payer</p><p style={styles.statValue}>{stats.aPayer}</p></div>
<div style={styles.statCard}><p style={styles.statLabel}>Total TTC</p><p style={styles.statValue}>{formatAr(stats.totalTTC)} Ar</p></div>
</div>
<div style={styles.card}>
<div style={styles.toolbar}>
<div style={styles.searchBox}>
<Search size={16} color="#64748b" />
<input
style={{ border: 'none', outline: 'none', flex: 1 }}
placeholder="Recher N° Facture, Client..."
value={search}
onChange={e => { setSearch(e.target.value); setPage(1); }}
/>
</div>
</div>
<table style={{ width: '100%', borderCollapse: 'collapse' }}>
<thead>
<tr>
<th style={styles.th}>N° FACTURE</th>
<th style={styles.th}>N° BL</th>
<th style={styles.th}>CLIENT</th>
<th style={styles.th}>DATE FACTURE</th>
<th style={styles.th}>ECHEANCE</th>
<th style={{...styles.th, textAlign: 'right' }}>MONTANT TTC</th>
<th style={{...styles.th, textAlign: 'right' }}>RESTE A PAYER</th>
<th style={{...styles.th, textAlign: 'center' }}>ACTIONS</th>
</tr>
</thead>
<tbody>
{loading? (
<tr><td colSpan="8" style={{...styles.td, textAlign: 'center', padding: 30 }}><Loader2 className="animate-spin" /></td></tr>
) : data.length === 0? (
<tr><td colSpan="8" style={{...styles.td, textAlign: 'center' }}>Aucune Facture</td></tr>
) : data.map(f => (
<tr key={f.id} style={styles.tr} onMouseOver={e => e.currentTarget.style.background = '#f8fafc'} onMouseOut={e => e.currentTarget.style.background = 'white'}>
<td style={{...styles.td, fontWeight: 600 }}>
<div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><FileText size={14} />{f.numero}</div>
</td>
<td style={styles.td}>{f.bl_numero || '-'}</td>
<td style={styles.td}>{f.client_nom || 'N/A'}</td>
<td style={styles.td}>{formatDate(f.date_facture)}</td>
<td style={styles.td}>{formatDate(f.date_echeance)}</td>
<td style={{...styles.td, textAlign: 'right', fontWeight: 600 }}>{formatAr(f.total_ttc)} Ar</td>
<td style={{...styles.td, textAlign: 'right' }}>
<span style={(f.reste_a_payer || 0) > 0? styles.badgeRed : styles.badgeGreen}>
{formatAr(f.reste_a_payer)} Ar
</span>
</td>
<td style={{...styles.td, textAlign: 'center' }}>
<div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
<button onClick={() => navigate(`/factures/${f.id}`)} style={styles.btnIconPrimary} title="Voir"><Eye size={16} /></button>
{canComptable && (
<>
<button
onClick={() => handleImprimer(f.id, f.numero)}
style={{...styles.btnSecondary, opacity: loadingPDF === f.id? 0.5 : 1 }}
title="Télécharger PDF"
disabled={loadingPDF === f.id}
>
{loadingPDF === f.id? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
PDF
</button>
<button
onClick={() => handleSendEmail(f.id, f.client_nom)}
style={{...styles.btnIconMail, opacity: loadingEmail === f.id? 0.5 : 1 }}
title="Envoyer par Email"
disabled={loadingEmail === f.id}
>
{loadingEmail === f.id? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
</button>
</>
)}
</div>
</td>
</tr>
))}
</tbody>
</table>
{total > 0 && (
<div style={styles.pagination}>
<span style={{ fontSize: '13px', color: '#64748b' }}>Affichage de {startItem} à {endItem} sur {total}</span>
<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
<button onClick={() => handlePageChange(page - 1)} disabled={page === 1 || loading} style={{...styles.paginationBtn, opacity: page === 1? 0.5 : 1 }}><ChevronLeft size={14} />Précédent</button>
<span style={{ fontSize: '13px', fontWeight: '600' }}>Page {page} / {totalPages}</span>
<button onClick={() => handlePageChange(page + 1)} disabled={page === totalPages || loading} style={{...styles.paginationBtn, opacity: page === totalPages? 0.5 : 1 }}>Suivant<ChevronRight size={14} /></button>
</div>
</div>
)}
</div>
{showModal && canComptable && (
<div style={styles.modal}>
<div style={styles.modalContent}>
<div style={{display:'flex', justifyContent:'space-between', marginBottom: 16}}>
<h3>Nouvelle Facture Client</h3>
<button onClick={()=>setShowModal(false)} style={{border:'none', background:'none', cursor:'pointer'}}><X/></button>
</div>
<form onSubmit={handleCreateFacture}>
{errorMsg && <div style={styles.alert}><AlertCircle size={16}/>{errorMsg}</div>}
<label style={styles.label}>Bon de Livraison VALIDEE et LIVREE - {blList.length} disponibles</label>
<div style={styles.dropdown} ref={blDropdownRef}>
<button type="button" style={styles.dropdownBtn} onClick={()=>setShowBlDropdown(!showBlDropdown)} disabled={loadingBL || blList.length === 0}>
<span>{selectedBlObj? `${selectedBlObj.numero} - ${selectedBlObj.client_nom}` : '-- Choisir BL --'}</span>
<ChevronDown size={16}/>
</button>
{showBlDropdown && (
<div style={styles.dropdownList}>
<div style={styles.dropdownSearch}>
<div style={{position:'relative'}}>
<Search size={14} style={{position:'absolute', left:8, top:10, color:'#64748b'}}/>
<input style={{...styles.input, paddingLeft:28}} placeholder="Recher BL N° ou Client..." value={searchBL} onChange={e=>setSearchBL(e.target.value)} onClick={e=>e.stopPropagation()}/>
</div>
</div>
{loadingBL && <div style={{padding:12}}>Chargement...</div>}
{blListFiltered.length === 0 &&!loadingBL && <div style={{padding:12, color:'#64748b'}}>Aucun BL disponible</div>}
{blListFiltered.map(bl => (
<div key={bl.id} style={styles.dropdownItem} onClick={()=>{setSelectedBL(bl.id); setShowBlDropdown(false); setErrorMsg('');}} onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'} onMouseLeave={e=>e.currentTarget.style.background='white'}>
<div style={{fontWeight:600}}>{bl.numero}</div>
<div style={{fontSize:12, color:'#64748b'}}>{bl.client_nom} - {formatDate(bl.date_livraison)}</div>
</div>
))}
</div>
)}
</div>
<button type="submit" disabled={saving || loadingBL || blList.length === 0} style={{...(saving || loadingBL || blList.length === 0? styles.btnPrimaryDisabled : styles.btnPrimary), marginTop: 20, width:'100%', justifyContent:'center'}}>
{saving? <Loader2 className="animate-spin" size={16}/> : <Plus size={16}/>} Générer Facture
</button>
</form>
</div>
</div>
)}
</div>
);
}