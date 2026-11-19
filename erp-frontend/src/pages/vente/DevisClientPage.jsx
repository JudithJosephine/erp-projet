import { useEffect, useState } from "react";
import api from "../../utils/api";
import { Loader2, Plus, FileText, CheckCircle, Clock, X, Save, ChevronLeft, ChevronRight, Trash2, Send, Ban, Edit } from "lucide-react";
import { toast, Toaster } from "sonner";
const STATUS_MAPPING = { BROUILLON: "Brouillon", ENVOYE: "Envoyé", ACCEPTE: "Accepté", REFUSE: "Refusé", EXPIRE: "Expiré" }
const STATUS_COLORS = { BROUILLON: { bg: '#f1f5f9', text: '#475569', icon: FileText }, ENVOYE: { bg: '#dbeafe', text: '#1e40af', icon: Send }, ACCEPTE: { bg: '#d1fae5', text: '#065f46', icon: CheckCircle }, REFUSE: { bg: '#fee2e2', text: '#991b1b', icon: Ban }, EXPIRE: { bg: '#fef3c7', text: '#92400e', icon: Clock } };
export default function DevisClientPage() {
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);
const [loadingIA, setLoadingIA] = useState(null);
const [page, setPage] = useState(1);
const [pageSize] = useState(5);
const [total, setTotal] = useState(0);
const [showModal, setShowModal] = useState(false);
const [saving, setSaving] = useState(false);
const [userRole, setUserRole] = useState('');
const [editingDevis, setEditingDevis] = useState(null);
const [infoIA, setInfoIA] = useState({});
const [clients, setClients] = useState([]);
const [produits, setProduits] = useState([]);
const [form, setForm] = useState({ client: '', date_devis: new Date().toISOString().split('T')[0], date_validite: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0], lignes: [{ temp_id: `new-${Date.now()}`, produit: '', quantite: 1, prix_unitaire_ht: 0, remise: 0, tva: 20 }] });
const totalPages = Math.ceil(total / pageSize);
const canCreate = userRole === 'COMMERCIAL';
const canCommercialActions = userRole === 'COMMERCIAL';
const canAdminActions = userRole === 'ADMIN';
useEffect(() => {
const user = JSON.parse(localStorage.getItem('user'));
setUserRole(user?.role || '');
}, []);
const fetchData = async () => {
setLoading(true);
try {
const [resDevis, resCli, resProd] = await Promise.all([
api.get(`/devis-client/?page=${page}&page_size=${pageSize}`),
api.get('/clients/?page_size=200'),
api.get('/produits/?page_size=200'),
]);
const sortedData = (resDevis.data.results || []).sort((a,b) => a.id - b.id);
setData(sortedData);
setTotal(resDevis.data.count || 0);
setClients(resCli.data.results || []);
setProduits(resProd.data.results || []);
} catch(err) { console.error(err); toast.error("Erreur chargement"); } finally { setLoading(false); }
}
useEffect(() => { fetchData(); }, [page, pageSize]);
const handleLigneChange = (temp_id, field, value) => {
setForm(prev => ({...prev, lignes: prev.lignes.map(l => l.temp_id === temp_id? {...l, [field]: ['quantite','prix_unitaire_ht','remise','tva','produit'].includes(field)? Number(value) : value} : l) }));
if(['produit', 'quantite', 'remise', 'tva'].includes(field)) {
setInfoIA(prev => ({...prev, [temp_id]: null}))
}
}
const handleAddLigne = () => { setForm(prev => ({...prev, lignes: [...prev.lignes, { temp_id: `new-${Date.now()}`, produit: '', quantite: 1, prix_unitaire_ht: 0, remise: 0, tva: 20 }] })) }
const handleRemoveLigne = (temp_id) => {
setForm(prev => ({...prev, lignes: prev.lignes.filter((l) => l.temp_id!== temp_id)}))
setInfoIA(prev => { const newInfo = {...prev}; delete newInfo[temp_id]; return newInfo; })
}
const handleSuggérerPrixVente = async (temp_id, produit_id) => {
if(!produit_id) return toast.error("Veuillez choisir un produit");
setLoadingIA(temp_id);
try {
const res = await api.get(`/ia/suggestion-prix-vente/${produit_id}/`);
handleLigneChange(temp_id, 'prix_unitaire_ht', res.data.prix_conseille);
setInfoIA(prev => ({...prev, [temp_id]: {moyen: res.data.prix_moyen, nb: res.data.nb_ventes}}))
toast.success(`Prix suggéré: ${res.data.prix_conseille} Ar`);
} catch(err) {
toast.error("Erreur suggestion prix");
console.error(err)
} finally { setLoadingIA(null); }
}
const openCreateModal = () => {
setEditingDevis(null);
setInfoIA({});
setForm({ client: '', date_devis: new Date().toISOString().split('T')[0], date_validite: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0], lignes: [{ temp_id: `new-${Date.now()}`, produit: '', quantite: 1, prix_unitaire_ht: 0, remise: 0, tva: 20 }] });
setShowModal(true);
}
const openEditModal = (devis) => {
if(devis.statut!== 'BROUILLON') return toast.error("On ne peut modifier qu'un devis BROUILLON");
setEditingDevis(devis);
setInfoIA({});
setForm({
client: devis.client,
date_devis: devis.date_devis,
date_validite: devis.date_validite,
lignes: devis.lignes.map(l => ({...l, temp_id: l.id || `new-${l.produit}-${Date.now()}` }))
});
setShowModal(true);
}
const handleSubmit = async (e) => {
e.preventDefault();
if(saving) return;
if(!form.client) return toast.error("Veuillez choisir un Client");
const lignesValides = form.lignes.filter(l => l.produit && l.quantite > 0);
if(lignesValides.length === 0) return toast.error("Ajoutez au moins 1 ligne produit");
setSaving(true);
try {
const payload = { client: Number(form.client), date_devis: form.date_devis, date_validite: form.date_validite, lignes: lignesValides.map(l => ({ produit: Number(l.produit), quantite: Number(l.quantite), prix_unitaire_ht: Number(l.prix_unitaire_ht), remise: Number(l.remise), tva: Number(l.tva) })) };
if(editingDevis) {
const res = await api.patch(`/devis-client/${editingDevis.id}/`, payload);
toast.success("Devis modifié avec succès");
setData(prev => prev.map(d => d.id === editingDevis.id? {...d,...res.data} : d).sort((a,b) => a.id - b.id));
} else {
const res = await api.post('/devis-client/', payload);
toast.success("Devis créé avec succès");
setData(prev => [...prev, res.data].sort((a,b) => a.id - b.id));
setTotal(prev => prev + 1);
}
setShowModal(false); setEditingDevis(null); setInfoIA({});
} catch(err) { toast.error("Erreur: " + JSON.stringify(err.response?.data)) } finally { setSaving(false); }
}
const handleDelete = async (id) => {
if (!window.confirm("Supprimer ce devis? Action irréversible.")) return;
try {
await api.delete(`/devis-client/${id}/`);
toast.success("Supprimé");
setData(prev => prev.filter(d => d.id!== id));
setTotal(prev => prev - 1);
} catch(err) { toast.error("Erreur") }
}
const handleChangeStatut = async (id, statut) => {
if (!window.confirm(`Passer le devis en statut: ${STATUS_MAPPING[statut]}?`)) return;
try {
await api.patch(`/devis-client/${id}/`, { statut });
setData(prev => prev.map(d => d.id === id? {...d, statut: statut} : d).sort((a,b) => a.id - b.id));
toast.success("Statut mis à jour");
} catch(err) { toast.error("Erreur") }
}
const handlePageChange = (newPage) => { if (newPage >= 1 && newPage <= totalPages) { setPage(newPage); } }
const styles = {
header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
title: { fontSize: 22, fontWeight: 700, color: '#1e293b' },
btnPrimary: { background: '#2563eb', color: 'white', border: 'none', padding: '10px 16px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 },
btnSuggérer: { background: '#2563eb', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' },
btnSuccess: { background: '#16a34a', color: 'white', border: 'none', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 },
btnWarning: { background: '#f59e0b', color: 'white', border: 'none', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 },
btnDanger: { background: '#ef4444', color: 'white', border: 'none', padding: '6px', borderRadius: 6, cursor: 'pointer' },
btnIcon: (disabled) => ({ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', padding: '6px', borderRadius: 6, cursor: disabled? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', width: 32, height: 32, opacity: disabled? 0.3 : 1 }),
card: { background: 'white', borderRadius: 12, padding: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' },
table: { width: '100%', borderCollapse: 'collapse', fontSize: 14, tableLayout: 'fixed' },
th: { textAlign: 'left', padding: '12px 16px', background: '#f8fafc', color: '#475569', fontWeight: 600, borderBottom: '1px solid #e2e8f0' },
td: { padding: '12px 16px', borderBottom: '1px solid #f1f5f9', color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
badge: (status) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: STATUS_COLORS[status]?.bg || '#f1f5f9', color: STATUS_COLORS[status]?.text || '#475569' }),
pagination: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderTop: '1px solid #e2e8f0' },
btnPage: (disabled) => ({ padding: '8px 12px', border: '1px solid #cbd5e1', background: disabled? '#f1f5f9' : 'white', borderRadius: 6, cursor: disabled? 'not-allowed' : 'pointer', opacity: disabled? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }),
modal: { position: 'fixed', top:0, left:0, right:0, bottom:0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
modalContent: { background: 'white', borderRadius: 12, padding: 24, width: '90%', maxWidth: 900, maxHeight:'90vh', overflowY:'auto' },
input: { padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6, width:'100%' },
inputReadOnly: { padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6, width:'100%', background: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' },
label: {fontSize:12, fontWeight:600, marginTop:12, display:'block', marginBottom:4},
infoIA: {fontSize:10, color:'#64748b', marginTop:4}
}
if (loading) return <div style={{textAlign: 'center', padding: 40}}><Loader2 className="animate-spin" size={24}/></div>;
return (
<div>
<Toaster position="top-right" richColors />
<div style={styles.header}>
<h2 style={styles.title}>Devis Clients</h2>
{canCreate && <button style={styles.btnPrimary} onClick={openCreateModal}><Plus size={16}/> Nouveau Devis</button>}
</div>
<div style={styles.card}>
<table style={styles.table}>
<colgroup><col style={{width: '12%'}}/><col style={{width: '25%'}}/><col style={{width: '12%'}}/><col style={{width: '15%'}}/><col style={{width: '16%'}}/><col style={{width: '20%'}}/></colgroup>
<thead><tr><th style={styles.th}>N° Devis</th><th style={styles.th}>Client</th><th style={styles.th}>Date</th><th style={{...styles.th, textAlign: 'right'}}>Total TTC</th><th style={styles.th}>Statut</th><th style={{...styles.th, textAlign: 'center'}}>Actions</th></tr></thead>
<tbody>{data.length === 0? (<tr><td colSpan="6" style={{textAlign: 'center', padding: 40, color: '#94a3b8'}}>Aucun Devis</td></tr>) : data.map(d => {
const StatusIcon = STATUS_COLORS[d.statut]?.icon || FileText;
const isBrouillonCommercial = d.statut === 'BROUILLON' && canCommercialActions;
const isEnvoyeAdmin = d.statut === 'ENVOYE' && canAdminActions;
return (
<tr key={d.id}>
<td style={{...styles.td, fontWeight: 600}}>{d.numero}</td>
<td style={styles.td}>{d.client_nom || 'N/A'}</td>
<td style={styles.td}>{new Date(d.date_devis).toLocaleDateString('fr-FR')}</td>
<td style={{...styles.td, textAlign: 'right', fontWeight: 600}}>{Number(d.total_ttc || 0).toLocaleString('fr-FR')} Ar</td>
<td style={styles.td}><span style={styles.badge(d.statut)}><StatusIcon size={14}/> {STATUS_MAPPING[d.statut]}</span></td>
<td style={{...styles.td, textAlign: 'center'}}>
<div style={{display:'flex', gap:6, justifyContent:'center', flexWrap:'wrap'}}>
{isBrouillonCommercial && (<><button onClick={()=>openEditModal(d)} style={styles.btnWarning}><Edit size={12}/> Modifier</button><button onClick={()=>handleDelete(d.id)} style={styles.btnDanger}><Trash2 size={12}/></button><button onClick={()=>handleChangeStatut(d.id, 'ENVOYE')} style={{...styles.btnPrimary, padding:'4px 8px', fontSize:12}}><Send size={12}/> Envoyer</button></>)}
{isEnvoyeAdmin && (<><button onClick={()=>handleChangeStatut(d.id, 'ACCEPTE')} style={{...styles.btnSuccess, padding:'4px 8px', fontSize:12}}><CheckCircle size={12}/> Accepter</button><button onClick={()=>handleChangeStatut(d.id, 'REFUSE')} style={{...styles.btnDanger, padding:'4px 8px', fontSize:12}}><Ban size={12}/> Annuler</button></>)}
</div>
</td>
</tr>)
})}</tbody>
</table>
{total > pageSize && (<div style={styles.pagination}><span style={{fontSize: 13, color: '#64748b'}}>Page {page} / {totalPages} - {total} résultats</span><div style={{display: 'flex', gap: 8}}><button style={styles.btnPage(page === 1)} disabled={page === 1} onClick={() => handlePageChange(page - 1)}><ChevronLeft size={16}/> Précédent</button><button style={styles.btnPage(page === totalPages)} disabled={page === totalPages} onClick={() => handlePageChange(page + 1)}>Suivant <ChevronRight size={16}/></button></div></div>)}
</div>
{showModal && (
<div style={styles.modal}><div style={styles.modalContent}>
<div style={{display:'flex', justifyContent:'space-between', marginBottom: 16}}><h3 style={{fontSize:18, fontWeight:700}}>{editingDevis? 'Modifier Devis' : 'Nouveau Devis'}</h3><button onClick={()=>setShowModal(false)} style={{border:'none', background:'none', cursor:'pointer'}}><X/></button></div>
<form onSubmit={handleSubmit}>
<label style={styles.label}>Client *</label>
<select style={styles.input} value={form.client} onChange={e=>setForm(prev=>({...prev, client: e.target.value}))} required><option value="">-- Choisir --</option>{clients.map(c => <option key={c.id} value={c.id}>{c.contact_nom}</option>)}</select>
<div style={{display:'flex', gap:12}}>
<div style={{flex:1}}><label style={styles.label}>Date Devis</label><input style={styles.input} type="date" value={form.date_devis} onChange={e=>setForm(prev=>({...prev, date_devis: e.target.value}))} required /></div>
<div style={{flex:1}}><label style={styles.label}>Date Validité</label><input style={styles.input} type="date" value={form.date_validite} onChange={e=>setForm(prev=>({...prev, date_validite: e.target.value}))} required /></div>
</div>
<div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:16, marginBottom:8}}><h4>Lignes</h4><button type="button" onClick={handleAddLigne} style={{...styles.btnPrimary, padding:'6px 10px', fontSize:12}}><Plus size={14}/> Ajouter</button></div>
{form.lignes.map((ligne) => (
<div key={ligne.temp_id} style={{display:'flex', flexDirection:'column', gap:4, marginBottom:12, padding:12, border:'1px dashed #e2e8f0', borderRadius:8}}>
<div style={{display:'flex', gap:8, alignItems:'center'}}>
<select style={{...styles.input, flex:2}} value={ligne.produit || ''} onChange={e=>handleLigneChange(ligne.temp_id,'produit',e.target.value)} required><option value="">-- Produit --</option>{produits.map(p => <option key={p.id} value={p.id}>{p.designation}</option>)}</select>
<input style={{...styles.input, width:80}} type="number" min="1" value={ligne.quantite || 1} onChange={e=>handleLigneChange(ligne.temp_id,'quantite',e.target.value)} placeholder="Qté"/>
<div style={{display:'flex', flexDirection:'column', width:180}}>
<div style={{display:'flex', gap:4}}>
<input style={styles.inputReadOnly} type="number" step="0.01" min="0" value={ligne.prix_unitaire_ht || 0} readOnly placeholder="PU HT"/>
<button type="button" onClick={() => handleSuggérerPrixVente(ligne.temp_id, ligne.produit)} style={styles.btnSuggérer} disabled={!ligne.produit || loadingIA === ligne.temp_id}>
{loadingIA === ligne.temp_id? 'Chargement...' : 'Suggérer'} 
</button>
</div>
{infoIA[ligne.temp_id] && (
<span style={styles.infoIA}>Prix moyen historique: {infoIA[ligne.temp_id].moyen} Ar - Basé sur {infoIA[ligne.temp_id].nb} ventes</span>
)}
</div>
{form.lignes.length > 1 && <button type="button" onClick={()=>handleRemoveLigne(ligne.temp_id)} style={styles.btnDanger}><Trash2 size={14}/></button>}
</div>
</div>
))}
<button type="submit" disabled={saving} style={{...styles.btnPrimary, marginTop: 20, width:'100%'}}>{saving? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} {editingDevis? 'Enregistrer Modifs' : 'Enregistrer Devis'}</button>
</form>
</div></div>
)}
</div>
);
}