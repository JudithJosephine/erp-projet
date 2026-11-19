import { useEffect, useState, useCallback } from "react";
import api from "../../utils/api";
import { Loader2, Plus, FileText, CheckCircle, Clock, X, Save, ChevronLeft, ChevronRight, Trash2, Edit, Check, Truck, User, Camera, Play } from "lucide-react";

const STATUS_MAPPING = { BROUILLON: "Brouillon", VALIDEE: "Validée", ANNULEE: "Annulée" }
const STATUS_LIVRAISON_MAPPING = { PRET: "Prêt", EN_COURS: "En cours", LIVREE: "Livrée", ECHEC: "Echec", FACTUREE: "Facturée" }
const STATUS_COLORS = {
BROUILLON: { bg: '#fef3c7', text: '#92400e', icon: Clock },
VALIDEE: { bg: '#c7fef1', text: '#0e7490', icon: CheckCircle },
ANNULEE: { bg: '#fee2e2', text: '#991b1b', icon: X },
PRET: { bg: '#fef9c3', text: '#854d0e', icon: Clock },
EN_COURS: { bg: '#c7fef1', text: '#0e7490', icon: Truck },
LIVREE: { bg: '#d1fae5', text: '#065f46', icon: CheckCircle },
FACTUREE: { bg: '#dbeafe', text: '#1e40af', icon: FileText },
ECHEC: { bg: '#fee2e2', text: '#991b1b', icon: X },
};

export default function BonLivraisonPage() {
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);
const [page, setPage] = useState(1);
const [pageSize] = useState(5);
const [total, setTotal] = useState(0);
const [showModal, setShowModal] = useState(false);
const [modalType, setModalType] = useState('');
const [saving, setSaving] = useState(false);
const [userRole, setUserRole] = useState('');
const [editingBL, setEditingBL] = useState(null);
const [commandes, setCommandes] = useState([]);
const [produits, setProduits] = useState([]);
const [chauffeurs, setChauffeurs] = useState([]);
const [filters, setFilters] = useState({ statut_livraison: '', chauffeur: '' });
const [form, setForm] = useState({ commande: '', date_livraison: new Date().toISOString().split('T')[0], lignes: [{ temp_id: `new-${Date.now()}`, produit: '', quantite_livree: 1 }] });
const [formAssign, setFormAssign] = useState({ chauffeur: '', adresse: '', vehicule: '' });
const [formTerminer, setFormTerminer] = useState({ nom_recepteur: '', note: '', preuve_photo: null });
const totalPages = Math.ceil(total / pageSize);

// ✅ MAGASINIER IHANY - TSY MISY canGenerateFacture INTSONY
const canCreate = userRole === 'MAGASINIER';
const canEdit = userRole === 'MAGASINIER';
const canValidate = userRole === 'MAGASINIER';
const canAssign = userRole === 'MAGASINIER';
const canDeliver = userRole === 'MAGASINIER';
const canDelete = userRole === 'MAGASINIER';

useEffect(() => { const user = JSON.parse(localStorage.getItem('user')); setUserRole(user?.role || ''); }, []);
const fetchAll = async (url) => {
let results = []; let nextUrl = `${url}${url.includes('?')? '&' : '?'}page_size=999`;
while(nextUrl) { const res = await api.get(nextUrl); results = results.concat(res.data.results || res.data || []); nextUrl = res.data.next; }
return results;
}
const fetchData = useCallback(async () => {
setLoading(true);
try {
const params = new URLSearchParams({ page, page_size: pageSize });
if(filters.statut_livraison) params.append('statut_livraison', filters.statut_livraison);
if(filters.chauffeur) params.append('chauffeur', filters.chauffeur);
const [resBL, resCmdDispo, resProd, resChauff] = await Promise.all([
api.get(`/bon-livraison/?${params.toString()}`),
api.get('/bon-livraison/commandes_disponibles/'),
fetchAll('/produits'),
api.get('/chauffeurs/?actif=true')
]);
setData(resBL.data.results || []);
setTotal(resBL.data.count || 0);
setCommandes(resCmdDispo.data || []);
setProduits(resProd || []);
setChauffeurs(resChauff.data.results || resChauff.data || []);
} catch(err) { alert("Erreur de chargement: " + (err.response?.data?.detail || err.message)) }
finally { setLoading(false); }
}, [page, pageSize, filters]);
useEffect(() => { fetchData(); }, [fetchData]);
const resetFilters = () => { setFilters({ statut_livraison: '', chauffeur: '' }); setPage(1); }
const openCreateModal = () => { if(commandes.length === 0) return alert("Aucune Commande Confirmée disponible."); setEditingBL(null); setModalType('create'); setForm({ commande: '', date_livraison: new Date().toISOString().split('T')[0], lignes: [{ temp_id: `new-${Date.now()}`, produit: '', quantite_livree: 1 }] }); setShowModal(true); }
const openEditModal = (bl) => { if(!['BROUILLON'].includes(bl.statut)) return alert("On ne peut modifier qu'un BL en BROUILLON"); setEditingBL(bl); setModalType('create'); setForm({ commande: bl.commande, date_livraison: bl.date_livraison, lignes: bl.lignes.map(l => ({...l, temp_id: l.id || `new-${l.produit}` })) }); setShowModal(true); }
const openAssignModal = (bl) => { setEditingBL(bl); setFormAssign({ chauffeur: bl.chauffeur || '', adresse: bl.adresse_livraison || '', vehicule: bl.vehicule || '' }); setModalType('assign'); setShowModal(true); }
const openTerminerModal = (bl) => { setEditingBL(bl); setFormTerminer({ nom_recepteur: '', note: '', preuve_photo: null }); setModalType('terminer'); setShowModal(true); }
const handleCommandeChange = (cmdId) => { if(!cmdId) return; api.get(`/commande-client/${cmdId}/`).then(res => { const lignesAvecReste = res.data.lignes.map(l => { const reste = l.quantite - (l.quantite_livree || 0); return { temp_id: `copy-${l.id}-${Date.now()}`, produit: l.produit, quantite_livree: reste > 0? reste : 1 } }).filter(l => l.quantite_livree > 0); setForm(prev => ({...prev, commande: cmdId, lignes: lignesAvecReste.length > 0? lignesAvecReste : prev.lignes })); setFormAssign(prev => ({...prev, adresse: res.data.client_adresse || ''})) }).catch(err => alert("Erreur chargement lignes")) }
const handleLigneChange = (temp_id, field, value) => { setForm(prev => ({...prev, lignes: prev.lignes.map(l => l.temp_id === temp_id? {...l, [field]: field === 'quantite_livree'? Number(value) : value} : l) })); }
const handleAddLigne = () => { setForm(prev => ({...prev, lignes: [...prev.lignes, { temp_id: `new-${Date.now()}`, produit: '', quantite_livree: 1 }] })) }
const handleRemoveLigne = (temp_id) => { setForm(prev => ({...prev, lignes: prev.lignes.filter((l) => l.temp_id!== temp_id)})) }
const handleSubmit = async (e) => {
e.preventDefault(); if(saving) return; if(!form.commande) return alert("Veuillez choisir une Commande");
const lignesValides = form.lignes.filter(l => l.produit && l.quantite_livree > 0); if(lignesValides.length === 0) return alert("Ajoutez au moins 1 ligne produit");
setSaving(true);
try {
const payload = { commande: Number(form.commande), date_livraison: form.date_livraison, lignes: lignesValides.map(l => ({ produit: Number(l.produit), quantite_livree: Number(l.quantite_livree) })) };
if(editingBL) { await api.patch(`/bon-livraison/${editingBL.id}/`, payload); alert("BL modifié avec succès"); }
else { await api.post('/bon-livraison/', payload); alert("BL créé avec succès"); }
setShowModal(false); setEditingBL(null); fetchData();
} catch(err) { alert("Erreur: " + JSON.stringify(err.response?.data)) } finally { setSaving(false); }
}
const handleAssigner = async (e) => { e.preventDefault(); setSaving(true); try { await api.post(`/bon-livraison/${editingBL.id}/assigner/`, formAssign); alert("Chauffeur assigné avec succès"); setShowModal(false); fetchData(); } catch(err) { alert("Erreur assignation") } finally { setSaving(false); } }
const handleDemarrer = async (bl_id) => { if(!window.confirm("Démarrer cette livraison?")) return; try{ await api.post(`/bon-livraison/${bl_id}/demarrer_livraison/`); alert("Livraison démarrée"); fetchData(); } catch(err){ alert("Erreur: " + (err.response?.data?.error || "Erreur")) } }
const handleTerminer = async (e) => { e.preventDefault(); setSaving(true); const dataForm = new FormData(); dataForm.append('nom_recepteur', formTerminer.nom_recepteur); dataForm.append('note', formTerminer.note); if(formTerminer.preuve_photo) dataForm.append('preuve_photo', formTerminer.preuve_photo); try { await api.post(`/bon-livraison/${editingBL.id}/terminer_livraison/`, dataForm, { headers: {'Content-Type': 'multipart/form-data'}}); alert("Livraison terminée avec succès"); setShowModal(false); fetchData(); } catch(err) { alert("Erreur") } finally { setSaving(false); } }
const handleValider = async (bl_id) => { if(!window.confirm("Valider ce BL et déstocker?")) return; try { await api.patch(`/bon-livraison/${bl_id}/`, { statut: 'VALIDEE' }); alert("BL Validé avec succès. Statut: Prêt"); fetchData(); } catch(err) { alert("Erreur: " + (err.response?.data?.error || "Erreur")) } }
const handleDelete = async (id) => { if (!window.confirm("Supprimer ce Bon de Livraison?")) return; try { await api.delete(`/bon-livraison/${id}/`); alert("BL supprimé"); fetchData(); } catch(err) { alert("Erreur") } }
const handlePageChange = (newPage) => { if (newPage >= 1 && newPage <= totalPages) { setPage(newPage); } }
const styles = { header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }, title: { fontSize: 22, fontWeight: 700, color: '#1e293b' }, btnPrimary: { background: '#2563eb', color: 'white', border: 'none', padding: '10px 16px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }, btnSuccess: { background: '#16a34a', color: 'white', border: 'none', padding: '6px 10px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }, btnIcon: { background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', padding: '6px', borderRadius: 6, cursor: 'pointer', display:'flex' }, btnIconPrimary: { background: '#e0f2fe', color: '#0284c7', border: '1px solid #bae6fd', padding: '6px', borderRadius: 6, cursor: 'pointer', display:'flex' }, card: { background: 'white', borderRadius: 12, padding: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }, table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 }, th: { textAlign: 'left', padding: '12px 16px', background: '#f8fafc', color: '#475569', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }, td: { padding: '12px 16px', borderBottom: '1px solid #f1f5f9', color: '#334155' }, badge: (status) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: STATUS_COLORS[status]?.bg || '#f1f5f9', color: STATUS_COLORS[status]?.text || '#475569' }), pagination: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderTop: '1px solid #e2e8f0' }, btnPage: (disabled) => ({ padding: '8px 12px', border: '1px solid #cbd5e1', background: disabled? '#f1f5f9' : 'white', borderRadius: 6, cursor: disabled? 'not-allowed' : 'pointer', opacity: disabled? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }), modal: { position: 'fixed', top:0, left:0, right:0, bottom:0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }, modalContent: { background: 'white', borderRadius: 12, padding: 24, width: '90%', maxWidth: 900, maxHeight:'90vh', overflowY:'auto' }, input: { padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6, width:'100%' }, label: {fontSize:12, fontWeight:600, marginTop:12, display:'block', marginBottom:4} }
if (loading) return <div style={{textAlign: 'center', padding: 40}}><Loader2 className="animate-spin" size={24}/></div>;
return (
<div>
<div style={styles.header}><h2 style={styles.title}>Bons de Livraison & Suivi</h2>{canCreate && <button style={styles.btnPrimary} onClick={openCreateModal}><Plus size={16}/> Nouveau BL</button>}</div>
<div style={{...styles.card, padding: 16, marginBottom: 16}}><div style={{display: 'flex', gap: 16, alignItems: 'flex-end'}}><div style={{flex: 1}}><label style={styles.label}>Filtrer par Statut Livraison</label><select style={styles.input} value={filters.statut_livraison} onChange={e => {setFilters({...filters, statut_livraison: e.target.value}); setPage(1)}}><option value="">Tous</option>{Object.entries(STATUS_LIVRAISON_MAPPING).map(([key, val]) => (<option key={key} value={key}>{val}</option>))}</select></div><div style={{flex: 1}}><label style={styles.label}>Filtrer par Chauffeur</label><select style={styles.input} value={filters.chauffeur} onChange={e => {setFilters({...filters, chauffeur: e.target.value}); setPage(1)}}><option value="">Tous les chauffeurs</option>{chauffeurs.map(c => (<option key={c.id} value={c.id}>{c.nom} {c.prenom || ''} - {c.numero_permis || 'N/A'}</option>))}</select></div>{(filters.statut_livraison || filters.chauffeur) && <button style={{...styles.btnIcon, padding: '10px 16px'}} onClick={resetFilters}><X size={16}/> Réinitialiser</button>}</div></div>
<div style={styles.card}>
<table style={styles.table}><thead><tr><th style={styles.th}>N° BL</th><th style={styles.th}>Commande</th><th style={styles.th}>Client</th><th style={styles.th}>Chauffeur</th><th style={styles.th}>Statut BL</th><th style={styles.th}>Statut Livraison</th><th style={{...styles.th, textAlign: 'center'}}>Actions</th></tr></thead>
<tbody>{data.length === 0? (<tr><td colSpan="7" style={{textAlign: 'center', padding: 40, color: '#94a3b8'}}>Aucun BL</td></tr>) : data.map(bl => {
const StatusIcon = STATUS_COLORS[bl.statut]?.icon || Clock; const LivIcon = STATUS_COLORS[bl.statut_livraison]?.icon || Clock;
return (<tr key={bl.id}><td style={{...styles.td, fontWeight: 600}}>{bl.numero}</td><td style={styles.td}>{bl.commande_numero}</td><td style={styles.td}>{bl.client_nom}</td><td style={styles.td}>{bl.chauffeur_nom || '-'}</td><td style={styles.td}><span style={styles.badge(bl.statut)}><StatusIcon size={14}/> {STATUS_MAPPING[bl.statut]}</span></td><td style={styles.td}><span style={styles.badge(bl.statut_livraison)}><LivIcon size={14}/> {STATUS_LIVRAISON_MAPPING[bl.statut_livraison]}</span></td>
<td style={{...styles.td, textAlign: 'center'}}><div style={{display:'flex', gap:6, justifyContent:'center', flexWrap:'wrap'}}>
{canEdit && ['BROUILLON'].includes(bl.statut) && (<><button onClick={()=>openEditModal(bl)} style={styles.btnIcon}><Edit size={16}/></button></>)}
{canValidate && ['BROUILLON'].includes(bl.statut) && (<button onClick={()=>handleValider(bl.id)} style={styles.btnIcon}><Check size={16}/></button>)}
{canAssign && bl.statut === 'VALIDEE' && bl.statut_livraison === 'PRET' && <button onClick={()=>openAssignModal(bl)} style={styles.btnSuccess}><User size={14}/> Assigner</button>}
{canDeliver && bl.statut_livraison === 'PRET' && bl.chauffeur && <button onClick={()=>handleDemarrer(bl.id)} style={styles.btnSuccess}><Play size={14}/> Démarrer</button>}
{canDeliver && bl.statut_livraison === 'EN_COURS' && <button onClick={()=>openTerminerModal(bl)} style={styles.btnSuccess}><Check size={14}/> Terminer</button>}
{canDelete && ['BROUILLON'].includes(bl.statut) && <button onClick={()=>handleDelete(bl.id)} style={styles.btnIcon}><Trash2 size={16}/></button>}
</div></td></tr>)})}</tbody>
</table>
{total > pageSize && (<div style={styles.pagination}><span style={{fontSize: 13, color: '#64748b'}}>Page {page} / {totalPages} - {total} résultats</span><div style={{display: 'flex', gap: 8}}><button style={styles.btnPage(page === 1)} disabled={page === 1} onClick={() => handlePageChange(page - 1)}><ChevronLeft size={16}/> Précédent</button><button style={styles.btnPage(page === totalPages)} disabled={page === totalPages} onClick={() => handlePageChange(page + 1)}>Suivant <ChevronRight size={16}/></button></div></div>)}
</div>
{showModal && modalType === 'create' && (<div style={styles.modal}><div style={styles.modalContent}><div style={{display:'flex', justifyContent:'space-between', marginBottom: 16}}><h3>{editingBL? 'Modifier BL' : 'Nouveau Bon de Livraison'}</h3><button onClick={()=>setShowModal(false)} style={{border:'none', background:'none'}}><X/></button></div><form onSubmit={handleSubmit}><label style={styles.label}>Commande Source *</label><select style={styles.input} value={form.commande} onChange={e=>handleCommandeChange(e.target.value)} disabled={!!editingBL} required><option value="">-- Choisir --</option>{commandes.map(c => <option key={c.id} value={c.id}>{c.numero} - {c.client_nom}</option>)}</select><label style={styles.label}>Date livraison</label><input style={styles.input} type="date" value={form.date_livraison} onChange={e=>setForm(prev=>({...prev, date_livraison: e.target.value}))} required /><div style={{display:'flex', justifyContent:'space-between', alignItems: 'center', marginTop:16, marginBottom:8}}><h4>Lignes</h4><button type="button" onClick={handleAddLigne} style={{...styles.btnPrimary, padding:'6px 10px', fontSize:12}}><Plus size={14}/> Ajouter</button></div>{form.lignes.map((ligne) => (<div key={ligne.temp_id} style={{display:'flex', gap:8, marginBottom:8}}><select style={{...styles.input, flex:2}} value={ligne.produit || ''} onChange={e=>handleLigneChange(ligne.temp_id,'produit',e.target.value)} required><option value="">-- Produit --</option>{produits.map(p => <option key={p.id} value={p.id}>{p.designation}</option>)}</select><input style={{...styles.input, width:120}} type="number" min="1" value={ligne.quantite_livree || 1} onChange={e=>handleLigneChange(ligne.temp_id,'quantite_livree',e.target.value)}/>{form.lignes.length > 1 && <button type="button" onClick={()=>handleRemoveLigne(ligne.temp_id)} style={styles.btnIcon}><Trash2 size={14}/></button>}</div>))}<button type="submit" disabled={saving} style={{...styles.btnPrimary, marginTop: 20, width:'100%'}}>{saving? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} {editingBL? 'Enregistrer Modifs' : 'Valider BL'}</button></form></div></div>)}
{showModal && modalType === 'assign' && (<div style={styles.modal}><div style={styles.modalContent}><div style={{display:'flex', justifyContent:'space-between', marginBottom: 16}}><h3>Assigner Chauffeur à {editingBL?.numero}</h3><button onClick={()=>setShowModal(false)} style={{border:'none', background:'none'}}><X/></button></div><form onSubmit={handleAssigner}><label style={styles.label}>Chauffeur *</label><select style={styles.input} value={formAssign.chauffeur} onChange={e=>setFormAssign({...formAssign, chauffeur: e.target.value})} required><option value="">-- Choisir un chauffeur actif --</option>{chauffeurs.map(c => <option key={c.id} value={c.id}>{c.nom} {c.prenom || ''} - {c.numero_permis || 'N/A'}</option>)}</select><label style={styles.label}>N° Véhicule</label><input style={styles.input} value={formAssign.vehicule} onChange={e=>setFormAssign({...formAssign, vehicule: e.target.value})}/><label style={styles.label}>Adresse Livraison</label><input style={styles.input} value={formAssign.adresse} onChange={e=>setFormAssign({...formAssign, adresse: e.target.value})}/><button type="submit" disabled={saving} style={{...styles.btnPrimary, marginTop: 20, width:'100%'}}>{saving? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} Valider</button></form></div></div>)}
{showModal && modalType === 'terminer' && (<div style={styles.modal}><div style={styles.modalContent}><div style={{display:'flex', justifyContent:'space-between', marginBottom: 16}}><h3>Terminer Livraison {editingBL?.numero}</h3><button onClick={()=>setShowModal(false)} style={{border:'none', background:'none'}}><X/></button></div><form onSubmit={handleTerminer}><label style={styles.label}>Nom du recepteur *</label><input style={styles.input} value={formTerminer.nom_recepteur} onChange={e=>setFormTerminer({...formTerminer, nom_recepteur: e.target.value})} required/><label style={styles.label}>Note</label><textarea style={{...styles.input, minHeight: 80}} value={formTerminer.note} onChange={e=>setFormTerminer({...formTerminer, note: e.target.value})}/><label style={styles.label}>Preuve Photo</label><input type="file" accept="image/*" onChange={e=>setFormTerminer({...formTerminer, preuve_photo: e.target.files[0]})}/><button type="submit" disabled={saving} style={{...styles.btnSuccess, marginTop: 20, width:'100%'}}>{saving? <Loader2 className="animate-spin" size={16}/> : <Camera size={16}/>} Valider</button></form></div></div>)}
</div>
);
}