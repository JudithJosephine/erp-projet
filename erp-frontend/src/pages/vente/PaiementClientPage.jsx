import { useEffect, useState, useCallback } from "react";
import api from "../../utils/api";
import { Loader2, CreditCard, X, Save, ChevronLeft, ChevronRight, Receipt, Download, FileText, AlertCircle } from "lucide-react";
import { toast, Toaster } from "sonner";
import paiementImg from "../../assets/paiement.png";
const MODES = { ESPECE: 'Espèce', VIREMENT: 'Virement', CHEQUE: 'Chèque', MOBILE_MONEY: 'Mobile Money' }
const PAGE_SIZE = 5;
export default function PaiementClientPage() {
const [paiements, setPaiements] = useState([]);
const [facturesImpayees, setFacturesImpayees] = useState([]);
const [loading, setLoading] = useState(true);
const [loadingFactures, setLoadingFactures] = useState(true);
const [loadingPDF, setLoadingPDF] = useState(null);
const [showModal, setShowModal] = useState(false);
const [saving, setSaving] = useState(false);
const [userRole, setUserRole] = useState('');
const [form, setForm] = useState({
facture: '', date_paiement: new Date().toISOString().split('T')[0],
mode_paiement: 'ESPECE', montant: '', reference: ''
});
const [currentPage, setCurrentPage] = useState(1);
const [totalCount, setTotalCount] = useState(0);
const totalPages = Math.ceil(totalCount / PAGE_SIZE);
const canComptable = userRole === 'COMPTABLE';
const formatAr = (val) => (parseFloat(val) || 0).toLocaleString('fr-FR')
const formatDate = (dateStr) => dateStr? new Date(dateStr).toLocaleDateString('fr-FR') : 'N/A'
const downloadBlob = (blob, filename) => {
const url = window.URL.createObjectURL(blob);
const link = document.createElement('a'); link.href = url; link.download = filename;
document.body.appendChild(link); link.click(); document.body.removeChild(link);
window.URL.revokeObjectURL(url);
}
useEffect(() => {
const user = JSON.parse(localStorage.getItem('user'));
setUserRole(user?.role || '');
}, []);
const fetchPaiements = useCallback(async (page) => {
setLoading(true);
try { const res = await api.get(`/paiement-client/?page=${page}&page_size=${PAGE_SIZE}`); 
setPaiements(res.data.results || []); 
setTotalCount(res.data.count || 0); }
catch(err) { toast.error("Erreur chargement paiements"); } finally { setLoading(false); }
}, []);
const fetchFacturesImpayees = useCallback(async () => {
setLoadingFactures(true);
try { const res = await api.get(`/facture-client/impayees/`); setFacturesImpayees(res.data.results || res.data); }
catch(err) { toast.error("Erreur chargement factures impayées"); } finally { setLoadingFactures(false); }
}, []);
useEffect(() => { fetchPaiements(currentPage); }, [fetchPaiements, currentPage]);
useEffect(() => { fetchFacturesImpayees(); }, [fetchFacturesImpayees]);
const openModal = (factureId = '', montant = '') => {
if(!canComptable) return toast.error("Action réservée au comptable");
setForm(prev => ({...prev, facture: factureId, montant: montant})); setShowModal(true);
}
const handleCreate = async (e) => {
e.preventDefault();
if(!form.facture) return toast.error("Veuillez choisir une facture");
if(parseFloat(form.montant) <= 0) return toast.error("Le montant doit être > 0");
setSaving(true);
try {
await api.post('/paiement-client/', {...form, montant: parseFloat(form.montant) });
toast.success("Paiement enregistré"); setShowModal(false);
setForm(prev => ({...prev, facture: '', montant: '', reference: ''}));
fetchPaiements(currentPage); fetchFacturesImpayees();
} catch(err) { toast.error("Erreur: " + (err.response?.data?.detail || "Erreur")) } finally { setSaving(false); }
}
const handlePageChange = (newPage) => { if (newPage >= 1 && newPage <= totalPages) setCurrentPage(newPage); }
const handleDownloadRecu = async (paiementId, numero) => {
setLoadingPDF(`P${paiementId}`);
try { const response = await api.get(`/paiement-client/${paiementId}/pdf/`, { responseType: 'blob' }); downloadBlob(new Blob([response.data], 
{ type: 'application/pdf' }), `Recu_${numero}.pdf`); toast.success("Reçu téléchargé"); }
catch { toast.error("Erreur PDF"); } finally { setLoadingPDF(null); }
}
const styles = {
header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
title: { fontSize: 22, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 10 },
btnSecondary: { background: '#2563eb', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 },
btnSecondaryGreen: { background: '#eff6ff', color: '#2563eb', border: '1px solid #dbeafe', borderRadius: 6, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600 },
badgeRed: { padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background:'#fef2f2', color:'#dc2626' },
badgeOrange: { padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background:'#fff7ed', color:'#ea580c' },
card: { background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', marginBottom: 20 },
cardTitle: { fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 16 },
table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
th: { textAlign: 'left', padding: '12px 16px', background: '#f8fafc', color: '#475569', fontWeight: 600, borderBottom: '1px solid #e2e8f0', textTransform:'uppercase', fontSize:12 },
td: { padding: '12px 16px', borderBottom: '1px solid #f1f5f9', color: '#334155' },
pagination: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTop: '1px solid #e2e8f0', marginTop: 16 },
btnPage: (disabled) => ({ padding: '8px 12px', border: '1px solid #cbd5e1', background: disabled? '#f1f5f9' : 'white', borderRadius: 6, cursor: disabled? 'not-allowed' : 'pointer', opacity: disabled? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500, fontSize:13 }),
modal: { position: 'fixed', top:0, left:0, right:0, bottom:0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
modalContent: { background: 'white', borderRadius: 16, padding: 0, width: '90%', maxWidth: 950, overflow: 'hidden', display: 'flex' },
input: { padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, width:'100%', fontSize:14 },
label: {fontSize:12, fontWeight:600, marginTop:14, display:'block', marginBottom:6, color:'#334155'},
}
if (loading && currentPage === 1) return <div style={{textAlign: 'center', padding: 40}}><Loader2 className="animate-spin" size={24}/></div>;
return (
<div>
<Toaster position="top-right" richColors />
<div style={styles.header}><h2 style={styles.title}><CreditCard size={22}/> Paiements Clients</h2></div>
<div style={styles.card}>
<h3 style={styles.cardTitle}>Factures en attente de paiement</h3>
<table style={styles.table}>
<thead><tr><th style={styles.th}>N° FACTURE</th><th style={styles.th}>BC LIÉ</th><th style={styles.th}>CLIENT</th><th style={{...styles.th, textAlign: 'right'}}>MONTANT TTC</th><th style={{...styles.th, textAlign: 'right'}}>RESTE A PAYER</th><th style={styles.th}>STATUT</th><th style={styles.th}>ACTION</th></tr></thead>
<tbody>
{loadingFactures? (<tr><td colSpan="7" style={{textAlign: 'center', padding: 20}}><Loader2 size={16} className="animate-spin"/></td></tr>) : facturesImpayees.length === 0? (<tr><td colSpan="7" style={{...styles.td, textAlign:'center', color:'#64748b'}}><AlertCircle size={14} style={{display:'inline', marginRight:4}}/>Aucune facture à payer</td></tr>) : facturesImpayees.map(f => (
<tr key={f.id}><td style={{...styles.td, fontWeight: 600}}><div style={{display:'flex', alignItems:'center', gap:4}}><FileText size={14}/>{f.numero}</div></td><td style={styles.td}>{f.bl_numero || '-'}</td><td style={styles.td}>{f.client_nom || 'N/A'}</td><td style={{...styles.td, textAlign: 'right', fontWeight: 600}}>{formatAr(f.total_ttc)} Ar</td><td style={{...styles.td, textAlign: 'right', color: '#dc2626', fontWeight: 700}}>{formatAr(f.reste_a_payer)} Ar</td><td style={styles.td}><span style={f.statut === 'PARTIEL'? styles.badgeOrange : styles.badgeRed}>{f.statut}</span></td><td style={styles.td}>{canComptable && <button style={styles.btnSecondary} onClick={() => openModal(f.id, f.reste_a_payer)}><CreditCard size={14}/> Payer</button>}</td></tr>
))}
</tbody>
</table>
</div>
<div style={styles.card}>
<h3 style={styles.cardTitle}>Historique des paiements</h3>
<table style={styles.table}>
<thead><tr><th style={styles.th}>N° PAIEMENT</th><th style={styles.th}>DATE</th><th style={styles.th}>FACTURE</th><th style={styles.th}>BC LIÉ</th><th style={styles.th}>CLIENT</th><th style={{...styles.th, textAlign: 'right'}}>MONTANT</th><th style={styles.th}>MODE</th><th style={styles.th}>ACTIONS</th></tr></thead>
<tbody>
{paiements.length === 0? (<tr><td colSpan="8" style={{textAlign: 'center', padding: 40}}>Aucun paiement</td></tr>) : paiements.map(p => (
<tr key={p.id}><td style={{...styles.td, fontWeight: 600}}>{p.numero || `P${p.id}`}</td><td style={styles.td}>{formatDate(p.date_paiement)}</td><td style={styles.td}>{p.facture_numero || 'N/A'}</td><td style={styles.td}>{p.bl_numero || '-'}</td><td style={styles.td}>{p.client_nom || 'N/A'}</td><td style={{...styles.td, textAlign: 'right', fontWeight: 600, color: '#16a34a'}}>{formatAr(p.montant)} Ar</td><td style={styles.td}>{MODES[p.mode_paiement] || p.mode_paiement}</td><td style={styles.td}>{canComptable && <button style={styles.btnSecondaryGreen} onClick={() => handleDownloadRecu(p.id, p.numero)} disabled={loadingPDF === `P${p.id}`}>{loadingPDF === `P${p.id}`? <Loader2 size={14} className="animate-spin"/> : <Download size={14}/>} PDF</button>}</td></tr>
))}
</tbody>
</table>
{totalCount > PAGE_SIZE && (<div style={styles.pagination}><span style={{fontSize:13, color:'#64748b'}}>Page {currentPage} / {totalPages} - {totalCount} résultats</span><div style={{display:'flex', gap:8}}><button style={styles.btnPage(currentPage===1)} disabled={currentPage===1} onClick={()=>handlePageChange(currentPage-1)}><ChevronLeft size={14}/> Précédent</button><button style={styles.btnPage(currentPage===totalPages)} disabled={currentPage===totalPages} onClick={()=>handlePageChange(currentPage+1)}>Suivant <ChevronRight size={14}/></button></div></div>)}
</div>
{showModal && canComptable && (
<div style={styles.modal}>
<div style={styles.modalContent}>
<div style={{flex: 1.2, padding: 28}}>
<div style={{display:'flex', justifyContent:'space-between', marginBottom: 20, alignItems:'center'}}>
<h3 style={{fontSize: 18, fontWeight: 700, display:'flex', alignItems:'center', gap:8}}><Receipt size={18}/> Enregistrer un Paiement</h3>
<button onClick={()=>setShowModal(false)} style={{border:'none', background:'#f1f5f9', cursor:'pointer', borderRadius:'50%', padding:6}}><X size={16}/></button>
</div>
<form onSubmit={handleCreate}>
<label style={styles.label}>Facture *</label>
<select style={styles.input} value={form.facture} onChange={e=>setForm(prev=>({...prev, facture: e.target.value}))} required><option value="">-- Choisir Facture --</option>{facturesImpayees.map(f => <option key={f.id} value={f.id}>{f.numero} - {f.client_nom} - Reste: {formatAr(f.reste_a_payer)} Ar</option>)}</select>
<div style={{display:'flex', gap:12}}><div style={{flex:1}}><label style={styles.label}>Date Paiement</label><input style={styles.input} type="date" value={form.date_paiement} onChange={e=>setForm(prev=>({...prev, date_paiement: e.target.value}))} required /></div><div style={{flex:1}}><label style={styles.label}>Mode Paiement</label><select style={styles.input} value={form.mode_paiement} onChange={e=>setForm(prev=>({...prev, mode_paiement: e.target.value}))}>{Object.entries(MODES).map(([key, val]) => <option key={key} value={key}>{val}</option>)}</select></div></div>
<label style={styles.label}>Montant *</label><input style={styles.input} type="number" step="0.01" value={form.montant} onChange={e=>setForm(prev=>({...prev, montant: e.target.value}))} required />
<label style={styles.label}>Référence</label><input style={styles.input} type="text" value={form.reference} onChange={e=>setForm(prev=>({...prev, reference: e.target.value}))} />
<button type="submit" disabled={saving} style={{background: '#1b53b6', color: 'white', border: 'none', padding: '12px 16px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600, marginTop: 24, width:'100%', justifyContent: 'center', fontSize:14}}>{saving? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} Enregistrer Paiement</button>
</form>
</div>
<div style={{flex: 0.8, background: 'linear-gradient(135deg,#fffbeb,#fef3c7)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24}}>
<img src={paiementImg} alt="Paiement" style={{width:'100%', maxWidth:340, objectFit:'contain', marginBottom:20, borderRadius:12, filter:'drop-shadow(0 12px 24px rgba(0,0,0,0.12))'}} />
<div style={{textAlign:'center'}}><h4 style={{fontWeight:700, fontSize:16, color:'#92400e', marginBottom:8}}>Paiement Sécurisé</h4><p style={{fontSize:13, color:'#b45309', lineHeight:'18px'}}>Paiement en espèces, virement<br/>ou Mobile Money</p></div>
<div style={{marginTop:16, background:'white', borderRadius:10, padding:'12px 16px', width:'100%', boxShadow:'0 2px 8px rgba(0,0,0,0.06)'}}><div style={{display:'flex', justifyContent:'space-between', fontSize:12, color:'#64748b'}}><span>Montant à payer:</span><span style={{fontWeight:700, color:'#1e293b'}}>{form.montant? formatAr(form.montant) + ' Ar' : '-'}</span></div></div>
</div>
</div>
</div>
)}
</div>
);
}