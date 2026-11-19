import { useEffect, useState } from "react";
import api from "../../utils/api";
import { Loader2, Plus, Package, CheckCircle, Clock, X, Save, ChevronLeft, ChevronRight, Trash2, Edit, Ban, Check } from "lucide-react";
import { toast, Toaster } from "sonner";
const STATUS_MAPPING = {
EN_ATTENTE: "En attente",
VALIDEE: "Confirmée",
LIVREE_PARTIEL: "Livrée partiel",
LIVREE: "Livrée",
ANNULEE: "Annulée",
}
const STATUS_COLORS = {
EN_ATTENTE: { bg: '#fef3c7', text: '#92400e', icon: Clock },
VALIDEE: { bg: '#dbeafe', text: '#1e40af', icon: Package },
LIVREE_PARTIEL: { bg: '#cffafe', text: '#155e75', icon: Package },
LIVREE: { bg: '#d1fae5', text: '#065f46', icon: CheckCircle },
ANNULEE: { bg: '#fee2e2', text: '#991b1b', icon: X },
};
export default function CommandeClientPage() {
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);
const [page, setPage] = useState(1);
const [pageSize] = useState(5);
const [total, setTotal] = useState(0);
const [showModal, setShowModal] = useState(false);
const [saving, setSaving] = useState(false);
const [userRole, setUserRole] = useState('');
const [editingCmd, setEditingCmd] = useState(null);
const [clients, setClients] = useState([]);
const [produits, setProduits] = useState([]);
const [devis, setDevis] = useState([]);
const [form, setForm] = useState({
devis: '', client: '', date_commande: new Date().toISOString().split('T')[0],
lignes: [{ temp_id: `new-${Date.now()}`, produit: '', quantite: 1, prix_unitaire_ht: 0, remise: 0, tva: 20 }]
});
const totalPages = Math.ceil(total / pageSize);
const canCreate = userRole === 'COMMERCIAL';
const canCommercialActions = userRole === 'COMMERCIAL';
const canAdminActions = userRole === 'ADMIN';
useEffect(() => {
const user = JSON.parse(localStorage.getItem('user'));
setUserRole(user?.role || '');
}, []);
const fetchAll = async (url) => {
let results = []; let nextUrl = `${url}${url.includes('?')? '&' : '?'}page_size=999`;
while(nextUrl) { const res = await api.get(nextUrl); results = results.concat(res.data.results || []); nextUrl = res.data.next; }
return results;
}
const fetchData = async () => {
setLoading(true);
try {
const [resCmd, resCli, resProd, resDevisBrut] = await Promise.all([
api.get(`/commande-client/?page=${page}&page_size=${pageSize}`),
fetchAll('/clients'), 
fetchAll('/produits'), 
fetchAll('/devis-client'),
]);
const devisDisponibles = resDevisBrut.filter(d => d.statut === 'ACCEPTE' && !d.a_commande);
const sortedData = (resCmd.data.results || []).sort((a,b) => a.id - b.id);
setData(sortedData);
setTotal(resCmd.data.count || 0);
setClients(resCli || []); 
setProduits(resProd || []); 
setDevis(devisDisponibles || []);
} catch(err) { console.error(err); toast.error("Erreur chargement"); } finally { setLoading(false); }
}
useEffect(() => { fetchData(); }, [page, pageSize]);
const openCreateModal = () => { setEditingCmd(null); setForm({ devis: '', client: '', date_commande: new Date().toISOString().split('T')[0], lignes: [{ temp_id: `new-${Date.now()}`, produit: '', quantite: 1, prix_unitaire_ht: 0, remise: 0, tva: 20 }] }); setShowModal(true); }
const openEditModal = (cmd) => {
if(cmd.statut!== 'EN_ATTENTE') return toast.error("On ne peut modifier qu'une commande EN_ATTENTE");
if(!canCommercialActions) return toast.error("Action réservée au commercial");
setEditingCmd(cmd);
setForm({
devis: cmd.devis || '',
client: cmd.client,
date_commande: cmd.date_commande,
lignes: cmd.lignes.map(l => ({...l, temp_id: l.id || `new-${l.produit}-${Date.now()}` }))
});
setShowModal(true);
}
const handleDevisChange = (devisId) => { const selectedDevis = devis.find(d => d.id == devisId); setForm(prev => ({...prev, devis: devisId, client: selectedDevis? selectedDevis.client : '', lignes: selectedDevis && selectedDevis.lignes? selectedDevis.lignes.map(l => ({temp_id: `copy-${l.id}-${Date.now()}`, produit: l.produit, quantite: l.quantite, prix_unitaire_ht: l.prix_unitaire_ht, remise: l.remise, tva: l.tva })) : prev.lignes })); }
const handleLigneChange = (temp_id, field, value) => { setForm(prev => ({...prev, lignes: prev.lignes.map(l => l.temp_id === temp_id? {...l, [field]: ['quantite','prix_unitaire_ht','remise','tva','produit'].includes(field)? Number(value) : value} : l) })); }
const handleAddLigne = () => { setForm(prev => ({...prev, lignes: [...prev.lignes, { temp_id: `new-${Date.now()}`, produit: '', quantite: 1, prix_unitaire_ht: 0, remise: 0, tva: 20 }] })) }
const handleRemoveLigne = (temp_id) => { setForm(prev => ({...prev, lignes: prev.lignes.filter((l) => l.temp_id!== temp_id)})) }
const handleSubmit = async (e) => {
e.preventDefault(); if(saving) return; if(!form.client) return toast.error("Veuillez choisir un Client");
const lignesValides = form.lignes.filter(l => l.produit && l.quantite > 0); if(lignesValides.length === 0) return toast.error("Ajoutez au moins 1 ligne produit");
setSaving(true);
try {
const payload = { devis: form.devis || null, client: Number(form.client), date_commande: form.date_commande, lignes: lignesValides.map(l => ({ produit: Number(l.produit), quantite: Number(l.quantite), prix_unitaire_ht: Number(l.prix_unitaire_ht), remise: Number(l.remise), tva: Number(l.tva) })) };
if(editingCmd) {
await api.patch(`/commande-client/${editingCmd.id}/`, payload);
toast.success("Commande modifiée");
setData(prev => prev.map(cmd => cmd.id === editingCmd.id? {...cmd,...payload} : cmd).sort((a,b) => a.id - b.id));
}
else {
const res = await api.post('/commande-client/', payload);
toast.success("Commande créée");
setData(prev => [...prev, res.data].sort((a,b) => a.id - b.id));
setTotal(prev => prev + 1);
}
setShowModal(false); setEditingCmd(null);
} catch(err) { toast.error("Erreur: " + JSON.stringify(err.response?.data)) } finally { setSaving(false); }
}
const handleDelete = async (id) => {
if (!window.confirm("Supprimer cette commande?")) return;
try {
await api.delete(`/commande-client/${id}/`);
toast.success("Supprimé");
setData(prev => prev.filter(cmd => cmd.id!== id));
setTotal(prev => prev - 1);
} catch(err) { toast.error("Erreur") }
}
const handleChangeStatut = async (id, statut) => {
if (!window.confirm(`Passer la commande en statut: ${STATUS_MAPPING[statut]}?`)) return;
try {
await api.patch(`/commande-client/${id}/`, { statut });
setData(prev => prev.map(cmd => cmd.id === id? {...cmd, statut: statut} : cmd).sort((a,b) => a.id - b.id));
toast.success("Statut mis à jour");
} catch(err) { toast.error("Erreur") }
}
const handlePageChange = (newPage) => { if (newPage >= 1 && newPage <= totalPages) { setPage(newPage); } }
const styles = {
header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
title: { fontSize: 22, fontWeight: 700, color: '#1e293b' },
btnPrimary: { background: '#2563eb', color: 'white', border: 'none', padding: '10px 16px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 },
btnSuccess: { background: '#16a34a', color: 'white', border: 'none', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 },
btnWarning: { background: '#f59e0b', color: 'white', border: 'none', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 },
btnDanger: { background: '#ef4444', color: 'white', border: 'none', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 },
btnIcon: (disabled) => ({ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', padding: '6px', borderRadius: 6, cursor: disabled? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', width: 32, height: 32, opacity: disabled? 0.3 : 1, flexShrink: 0 }),
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
label: {fontSize:12, fontWeight:600, marginTop:12, display:'block', marginBottom:4},
}
if (loading) return <div style={{textAlign: 'center', padding: 40}}><Loader2 className="animate-spin" size={24}/></div>;
return (
<div>
<Toaster position="top-right" richColors />
<div style={styles.header}>
<h2 style={styles.title}>Commandes Clients</h2>
{canCreate && <button style={styles.btnPrimary} onClick={openCreateModal}><Plus size={16}/> Nouvelle Commande</button>}
</div>
<div style={styles.card}>
<table style={styles.table}>
<colgroup>
<col style={{width: '12%'}}/>
<col style={{width: '25%'}}/>
<col style={{width: '12%'}}/>
<col style={{width: '15%'}}/>
<col style={{width: '16%'}}/>
<col style={{width: '20%'}}/>
</colgroup>
<thead><tr><th style={styles.th}>N° BC</th><th style={styles.th}>Client</th><th style={styles.th}>Date</th><th style={{...styles.th, textAlign: 'right'}}>Total TTC</th><th style={styles.th}>Statut</th><th style={{...styles.th, textAlign: 'center'}}>Actions</th></tr></thead>
<tbody>{data.length === 0? (<tr><td colSpan="6" style={{textAlign: 'center', padding: 40, color: '#94a3b8'}}>Aucune Commande</td></tr>) : data.map(cmd => {
const StatusIcon = STATUS_COLORS[cmd.statut]?.icon || Clock;
const isCommercialEditable = cmd.statut === 'EN_ATTENTE' && canCommercialActions;
const isAdminValidatable = cmd.statut === 'EN_ATTENTE' && canAdminActions;
return (
<tr key={cmd.id}>
<td style={{...styles.td, fontWeight: 600}}>{cmd.numero}</td>
<td style={styles.td}>{cmd.client_nom || 'N/A'}</td>
<td style={styles.td}>{new Date(cmd.date_commande).toLocaleDateString('fr-FR')}</td>
<td style={{...styles.td, textAlign: 'right', fontWeight: 600}}>{Number(cmd.total_ttc || 0).toLocaleString('fr-FR')} Ar</td>
<td style={styles.td}><span style={styles.badge(cmd.statut)}><StatusIcon size={14}/> {STATUS_MAPPING[cmd.statut] || cmd.statut}</span></td>
<td style={{...styles.td, textAlign: 'center'}}>
<div style={{display:'flex', gap:6, justifyContent:'center'}}>
{isCommercialEditable && (<><button onClick={()=>openEditModal(cmd)} style={styles.btnIcon(false)} title="Modifier"><Edit size={16}/></button><button onClick={()=>handleDelete(cmd.id)} style={styles.btnIcon(false)} title="Supprimer"><Trash2 size={16}/></button></>)}
{isAdminValidatable && (<><button onClick={()=>handleChangeStatut(cmd.id, 'VALIDEE')} style={{...styles.btnIcon(false), background:'#d1fae5', color:'#065f46'}} title="Confirmer"><Check size={16}/></button><button onClick={()=>handleChangeStatut(cmd.id, 'ANNULEE')} style={{...styles.btnIcon(false), background:'#fee2e2', color:'#991b1b'}} title="Annuler"><Ban size={16}/></button></>)}
</div>
</td>
</tr>)
})}</tbody>
</table>
{total > pageSize && (<div style={styles.pagination}><span style={{fontSize: 13, color: '#64748b'}}>Page {page} / {totalPages} - {total} résultats</span><div style={{display: 'flex', gap: 8}}><button style={styles.btnPage(page === 1)} disabled={page === 1} onClick={() => handlePageChange(page - 1)}><ChevronLeft size={16}/> Précédent</button><button style={styles.btnPage(page === totalPages)} disabled={page === totalPages} onClick={() => handlePageChange(page + 1)}>Suivant <ChevronRight size={16}/></button></div></div>)}
</div>
{showModal && (
<div style={styles.modal}><div style={styles.modalContent}>
<div style={{display:'flex', justifyContent:'space-between', marginBottom: 16}}><h3 style={{fontSize:18, fontWeight:700}}>{editingCmd? 'Modifier Commande' : 'Nouvelle Commande Client'}</h3><button onClick={()=>setShowModal(false)} style={{border:'none', background:'none', cursor:'pointer'}}><X/></button></div>
<form onSubmit={handleSubmit}>
<label style={styles.label}>Devis d'origine</label>
<select style={styles.input} value={form.devis} onChange={e=>handleDevisChange(e.target.value)} disabled={!!editingCmd}><option value="">-- Aucun --</option>{devis.map(d => <option key={d.id} value={d.id}>{d.numero} - {d.client_nom}</option>)}</select>
<label style={styles.label}>Client *</label>
<select style={styles.input} value={form.client} onChange={e=>setForm(prev=>({...prev, client: e.target.value}))} required><option value="">-- Choisir --</option>{clients.map(c => <option key={c.id} value={c.id}>{c.raison_sociale}</option>)}</select>
<label style={styles.label}>Date commande</label>
<input style={styles.input} type="date" value={form.date_commande} onChange={e=>setForm(prev=>({...prev, date_commande: e.target.value}))} required />
<div style={{display:'flex', justifyContent:'space-between', alignItems: 'center', marginTop:16, marginBottom:8}}><h4>Lignes</h4><button type="button" onClick={handleAddLigne} style={{...styles.btnPrimary, padding:'6px 10px', fontSize:12}}><Plus size={14}/> Ajouter</button></div>
{form.lignes.map((ligne) => (<div key={ligne.temp_id} style={{display:'flex', gap:8, marginBottom:8, alignItems:'center'}}><select style={{...styles.input, flex:2}} value={ligne.produit || ''} onChange={e=>handleLigneChange(ligne.temp_id,'produit',e.target.value)} required><option value="">-- Produit --</option>{produits.map(p => <option key={p.id} value={p.id}>{p.designation}</option>)}</select><input style={{...styles.input, width:80}} type="number" min="1" value={ligne.quantite || 1} onChange={e=>handleLigneChange(ligne.temp_id,'quantite',e.target.value)} placeholder="Qté"/><input style={{...styles.input, width:120}} type="number" step="0.01" min="0" value={ligne.prix_unitaire_ht || 0} onChange={e=>handleLigneChange(ligne.temp_id,'prix_unitaire_ht',e.target.value)} placeholder="PU HT"/>{form.lignes.length > 1 && <button type="button" onClick={()=>handleRemoveLigne(ligne.temp_id)} style={styles.btnIcon(false)}><Trash2 size={14}/></button>}</div>))}
<button type="submit" disabled={saving} style={{...styles.btnPrimary, marginTop: 20, width:'100%'}}>{saving? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} {editingCmd? 'Enregistrer Modifs' : 'Valider Commande'}</button>
</form>
</div></div>
)}
</div>
);
}