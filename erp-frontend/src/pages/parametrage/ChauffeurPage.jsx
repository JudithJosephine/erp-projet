import { useEffect, useState, useRef } from "react";
import api from "../../utils/api";
import { Loader2, Plus, X, Save, Trash2, Edit, User, Search, Check, Ban, Upload, Users, ShieldCheck, ChevronLeft, ChevronRight, Phone, IdCard, FileText, Calendar, List, MapPin, Navigation, MessageSquare, Signature } from "lucide-react";
import { toast, Toaster } from "sonner";

export default function ChauffeurPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedChauffeur, setSelectedChauffeur] = useState(null);
  const [chauffeurBLs, setChauffeurBLs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const fileInputRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [form, setForm] = useState({
    nom: '', prenom: '', telephone: '', cin: '', numero_permis: '', actif: true, photo: null
  });
  const [preview, setPreview] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/chauffeurs/?page_size=1000');
      const allData = res.data.results || res.data || [];
      setData(allData.sort((a, b) => a.id - b.id));
    } catch(err) {
      toast.error("Erreur: " + err.message)
    } finally { setLoading(false); }
  }

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { return () => { if (preview && preview.startsWith('blob:')) URL.revokeObjectURL(preview); }; }, [preview]);
  useEffect(() => { setCurrentPage(1) }, [search]);

  const openDetailModal = async (chauffeur) => {
    setSelectedChauffeur(chauffeur);
    setShowDetailModal(true);
    try {
      // 🔥 BON LIVRAISON - tsy Bon Commande! Eto no misy GPS + Signature
      const res = await api.get(`/bon-livraison/?chauffeur=${chauffeur.id}&page_size=20`);
      setChauffeurBLs(res.data.results || res.data || []);
    } catch { setChauffeurBLs([]) }
  }

  const resetForm = () => {
    setForm({ nom: '', prenom: '', telephone: '', cin: '', numero_permis: '', actif: true, photo: null });
    setPreview(null);
    if(fileInputRef.current) fileInputRef.current.value = '';
  }

  const openCreateModal = () => { setEditing(null); resetForm(); setShowModal(true); }
  const openEditModal = (item) => {
    setEditing(item);
    setForm({
      nom: item.nom || '', prenom: item.prenom || '', telephone: item.telephone || '',
      cin: item.cin || '', numero_permis: item.numero_permis || '', actif: item.actif, photo: null
    });
    setPreview(item.photo);
    setShowModal(true);
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if(file){
      if (preview && preview.startsWith('blob:')) URL.revokeObjectURL(preview);
      setForm({...form, photo: file});
      setPreview(URL.createObjectURL(file));
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if(saving) return;
    if(!form.nom ||!form.numero_permis) return toast.error("Nom et N° Permis obligatoires");
    setSaving(true);
    const formData = new FormData();
    Object.keys(form).forEach(key => { if(form[key]!== null && form[key]!== '') formData.append(key, form[key]); });
    try {
      if(editing) {
        await api.patch(`/chauffeurs/${editing.id}/`, formData, { headers: {'Content-Type': 'multipart/form-data'} });
        toast.success("Chauffeur modifié");
      } else {
        await api.post('/chauffeurs/', formData, { headers: {'Content-Type': 'multipart/form-data'} });
        toast.success("Chauffeur créé");
      }
      setShowModal(false);
      await fetchData();
    } catch(err) { toast.error("Erreur: " + JSON.stringify(err.response?.data)) } finally { setSaving(false); }
  }

  const handleDelete = async (id) => {
    if (!window.confirm("Désactiver ce chauffeur?")) return;
    try {
      await api.patch(`/chauffeurs/${id}/`, {actif: false});
      toast.success("Chauffeur désactivé");
      fetchData();
    } catch(err) { toast.error("Erreur: " + JSON.stringify(err.response?.data)) }
  }

  const filteredData = data.filter(item =>
    `${item.nom} ${item.prenom}`.toLowerCase().includes(search.toLowerCase()) ||
    item.cin?.toLowerCase().includes(search.toLowerCase()) ||
    item.numero_permis?.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);
  useEffect(() => { if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages); }, [currentPage, totalPages]);
  const stats = { total: data.length, actifs: data.filter(d => d.actif).length, enCours: chauffeurBLs.filter(b=>b.statut_livraison==='EN_COURS').length }

  const styles = {
    container: {padding: '0'}, header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 },
    title: { fontSize: 24, fontWeight: 700, color: '#1e293b' }, btnPrimary: { background: '#2563eb', color: 'white', border: 'none', padding: '10px 16px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }, statCard: { background: 'white', padding: 20, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 16 },
    statIcon: { width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }, statLabel: { fontSize: 13, color: '#64748b', margin: 0 }, statValue: { fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 },
    card: { background: 'white', borderRadius: 12, padding: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }, toolbar: { padding: '16px 20px', borderBottom: '1px solid #f1f5f9' },
    searchBox: {display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', width: 300}, table: { width: '100%', borderCollapse: 'collapse' },
    th: { textAlign: 'left', padding: '14px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' },
    td: { padding: '14px 20px', borderBottom: '1px solid #f1f5f9', fontSize: 14, color: '#334155' }, tr: { transition: 'background 0.2s', cursor: 'pointer' },
    tablePhoto: {width: 42, height: 42, borderRadius:'50%', objectFit:'cover', background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center'},
    badgeActif: { display: 'inline-flex', alignItems: 'center', gap: 4, background: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
    badgeInactif: { display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fee2e2', color: '#991b1b', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
    actions: {display: 'flex', gap: 8, justifyContent: 'flex-end'}, btnIcon: { background: 'white', color: '#475569', border: '1px solid #e2e8f0', padding: '8px', borderRadius: 8, cursor: 'pointer', display:'flex' },
    pagination: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderTop: '1px solid #f1f5f9' }, paginationInfo: { fontSize: 14, color: '#334155' },
    paginationCenter: { display: 'flex', alignItems: 'center', gap: 16 }, pageIndicator: { fontSize: 14, fontWeight: 600, color: '#1e293b' },
    paginationBtn: { background: 'white', color: '#475569', border: '1px solid #e2e8f0', padding: '8px 14px', borderRadius: 8, cursor: 'pointer', display:'flex', alignItems:'center', gap: 6, fontWeight: 600, fontSize: 13 },
    paginationBtnDisabled: { opacity: 0.4, cursor: 'not-allowed', background: '#f8fafc' }, modal: { position: 'fixed', top:0, left:0, right:0, bottom:0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' },
    modalContent: { background: 'white', borderRadius: 16, padding: 24, width: '90%', maxWidth: 800, maxHeight: '90vh', overflowY: 'auto' }, input: { padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, width:'100%', fontSize: 14 },
    label: {fontSize:12, fontWeight:600, marginTop:12, display:'block', marginBottom:6, color: '#475569'}, photoUpload: {display:'flex', alignItems:'center', gap:16, marginBottom:16, padding:16, border:'1px dashed #cbd5e1', borderRadius:12},
    photoCircle: {width:80, height:80, borderRadius:'50%', background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', border:'2px solid #e2e8f0'},
    photoPreview: {width:'100%', height:'100%', objectFit:'cover'}, btnUpload: {background:'#f1f5f9', padding:'8px 14px', borderRadius:8, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontWeight:600},
    emptyState: {textAlign: 'center', padding: 40, color: '#64748b'}, detailHeader: {display:'flex', gap:20, alignItems:'center', marginBottom:24, paddingBottom:20, borderBottom:'1px solid #f1f5f9'},
    detailPhoto: {width:120, height:120, borderRadius:'50%', objectFit:'cover', border:'3px solid #eff6ff'}, detailInfoGrid: {display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:24},
    detailItem: {display:'flex', gap:10, alignItems:'center', padding:12, background:'#f8fafc', borderRadius:8}, sectionTitle: {fontSize:16, fontWeight:700, marginBottom:12, display:'flex', alignItems:'center', gap:8},
  }

  if (loading) return <div style={{textAlign: 'center', padding: 40}}><Loader2 className="animate-spin" size={24}/></div>;

  return (
    <div style={styles.container}>
      <Toaster richColors position="top-right"/>
      <div style={styles.header}><h2 style={styles.title}>🚛 Gestion des Chauffeurs - PRO</h2><button style={styles.btnPrimary} onClick={openCreateModal}><Plus size={16}/> Nouveau Chauffeur</button></div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}><div style={{...styles.statIcon, background: '#eff6ff'}}><Users size={24} color="#2563eb"/></div><div><p style={styles.statLabel}>Total Chauffeurs</p><p style={styles.statValue}>{stats.total}</p></div></div>
        <div style={styles.statCard}><div style={{...styles.statIcon, background: '#f0fdf4'}}><ShieldCheck size={24} color="#16a34a"/></div><div><p style={styles.statLabel}>Actifs</p><p style={styles.statValue}>{stats.actifs}</p></div></div>
        <div style={styles.statCard}><div style={{...styles.statIcon, background: '#fef3c7'}}><Navigation size={24} color="#d97706"/></div><div><p style={styles.statLabel}>En Livraison</p><p style={styles.statValue}>{stats.enCours}</p></div></div>
      </div>

      <div style={styles.card}>
        <div style={styles.toolbar}><div style={styles.searchBox}><Search size={16} color="#64748b"/><input style={{border:'none', outline:'none', flex:1}} placeholder="Recher nom, CIN, Permis..." value={search} onChange={e => setSearch(e.target.value)}/></div></div>
        <table style={styles.table}>
          <thead><tr><th style={styles.th}>Photo</th><th style={styles.th}>Nom Complet</th><th style={styles.th}>CIN</th><th style={styles.th}>Téléphone</th><th style={styles.th}>N° Permis</th><th style={styles.th}>Statut</th><th style={{...styles.th, textAlign: 'right'}}>Actions</th></tr></thead>
          <tbody>
            {paginatedData.length === 0? (<tr><td colSpan="7" style={styles.emptyState}><User size={32} style={{margin: '0 auto 8px', opacity: 0.5}}/><p>Aucun chauffeur trouvé</p></td></tr>) : (
              paginatedData.map((item) => (
                <tr key={item.id} style={styles.tr} onClick={() => openDetailModal(item)} onMouseOver={e => e.currentTarget.style.background='#f8fafc'} onMouseOut={e => e.currentTarget.style.background='white'}>
                  <td style={styles.td}>{item.photo? <img src={item.photo} style={styles.tablePhoto} alt={item.nom}/> : <div style={styles.tablePhoto}><User size={20} color="#94a3b8"/></div>}</td>
                  <td style={{...styles.td, fontWeight: 600}}>{item.nom} {item.prenom}</td><td style={styles.td}>{item.cin || '-'}</td><td style={styles.td}>{item.telephone || '-'}</td>
                  <td style={styles.td}>{item.numero_permis}</td>
                  <td style={styles.td}>{item.actif? <span style={styles.badgeActif}><Check size={12}/> Actif</span> : <span style={styles.badgeInactif}><Ban size={12}/> Inactif</span>}</td>
                  <td style={styles.td}>
                    <div style={styles.actions} onClick={(e) => e.stopPropagation()}>
                      <button onClick={()=>openEditModal(item)} style={styles.btnIcon} title="Modifier"><Edit size={16}/></button>
                      {item.actif && <button onClick={()=>handleDelete(item.id)} style={{...styles.btnIcon, color: '#dc2626'}} title="Désactiver"><Trash2 size={16}/></button>}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {filteredData.length > 0 && (
          <div style={styles.pagination}>
            <div style={styles.paginationInfo}>Affichage de {startIndex + 1} à {Math.min(startIndex + itemsPerPage, filteredData.length)} sur {filteredData.length}</div>
            <div style={styles.paginationCenter}><button style={{...styles.paginationBtn,...(currentPage === 1 && styles.paginationBtnDisabled)}} onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}><ChevronLeft size={14}/> Précédent</button><span style={styles.pageIndicator}>Page {currentPage} / {totalPages || 1}</span><button style={{...styles.paginationBtn,...(currentPage === totalPages && styles.paginationBtnDisabled)}} onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages || totalPages === 0}>Suivant <ChevronRight size={14}/></button></div>
          </div>
        )}
      </div>

      {/* MODAL CREATE / EDIT */}
      {showModal && (
        <div style={styles.modal}><div style={styles.modalContent}>
          <div style={{display:'flex', justifyContent:'space-between', marginBottom: 20}}><h3 style={{fontSize:18, fontWeight:700}}>{editing? 'Modifier Chauffeur' : 'Nouveau Chauffeur'}</h3><button onClick={()=>setShowModal(false)} style={{border:'none', background:'none', cursor:'pointer'}}><X/></button></div>
          <form onSubmit={handleSubmit}>
            <div style={styles.photoUpload}><div style={styles.photoCircle}>{preview? <img src={preview} style={styles.photoPreview} alt="preview"/> : <User size={32} color="#94a3b8"/>}</div><div><label style={styles.btnUpload}><Upload size={14}/> {preview? 'Changer la photo' : 'Ajouter une photo'}<input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} style={{display:'none'}}/></label></div></div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}><div><label style={styles.label}>Nom *</label><input style={styles.input} value={form.nom} onChange={e=>setForm({...form, nom: e.target.value})} required /></div><div><label style={styles.label}>Prénom</label><input style={styles.input} value={form.prenom} onChange={e=>setForm({...form, prenom: e.target.value})} /></div></div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}><div><label style={styles.label}>CIN</label><input style={styles.input} value={form.cin} onChange={e=>setForm({...form, cin: e.target.value})} /></div><div><label style={styles.label}>N° Permis *</label><input style={styles.input} value={form.numero_permis} onChange={e=>setForm({...form, numero_permis: e.target.value})} required /></div></div>
            <div><label style={styles.label}>Téléphone</label><input style={styles.input} value={form.telephone} onChange={e=>setForm({...form, telephone: e.target.value})} /></div>
            {editing && (<div><label style={styles.label}>Statut</label><select style={styles.input} value={form.actif? 'true' : 'false'} onChange={e=>setForm({...form, actif: e.target.value === 'true'})}><option value='true'>Actif</option><option value='false'>Inactif</option></select></div>)}
            <button type="submit" disabled={saving} style={{...styles.btnPrimary, marginTop: 24, width:'100%', justifyContent:'center'}}>{saving? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} Enregistrer</button>
          </form>
        </div></div>
      )}

      {/* MODAL DETAIL PRO - AVEC GPS + SIGNATURE */}
      {showDetailModal && selectedChauffeur && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom: 20}}>
              <h3 style={{fontSize:20, fontWeight:700}}>Fiche Chauffeur PRO</h3>
              <button onClick={()=>setShowDetailModal(false)} style={{border:'none', background:'none', cursor:'pointer'}}><X/></button>
            </div>

            <div style={styles.detailHeader}>
              {selectedChauffeur.photo? <img src={selectedChauffeur.photo} style={styles.detailPhoto} alt={selectedChauffeur.nom}/> : <div style={{...styles.detailPhoto, display:'flex', alignItems:'center', justifyContent:'center', background:'#f1f5f9'}}><User size={50} color="#94a3b8"/></div>}
              <div style={{flex:1}}>
                <h2 style={{fontSize:26, fontWeight:700, margin:0}}>{selectedChauffeur.nom} {selectedChauffeur.prenom}</h2>
                <p style={{margin: '4px 0 8px 0'}}>{selectedChauffeur.actif? <span style={styles.badgeActif}><Check size={12}/> Actif</span> : <span style={styles.badgeInactif}><Ban size={12}/> Inactif</span>}</p>
                <button onClick={()=>{setShowDetailModal(false); openEditModal(selectedChauffeur)}} style={{...styles.btnPrimary, padding:'8px 12px'}}><Edit size={14}/> Modifier</button>
              </div>
            </div>

            <h4 style={styles.sectionTitle}><IdCard size={16}/> Informations</h4>
            <div style={styles.detailInfoGrid}>
              <div style={styles.detailItem}><IdCard size={18} color="#2563eb"/><div><p style={{fontSize:12, color:'#64748b', margin:0}}>CIN</p><p style={{fontWeight:600, margin:0}}>{selectedChauffeur.cin || '-'}</p></div></div>
              <div style={styles.detailItem}><Phone size={18} color="#2563eb"/><div><p style={{fontSize:12, color:'#64748b', margin:0}}>Téléphone</p><p style={{fontWeight:600, margin:0}}>{selectedChauffeur.telephone || '-'}</p></div></div>
              <div style={styles.detailItem}><FileText size={18} color="#2563eb"/><div><p style={{fontSize:12, color:'#64748b', margin:0}}>N° Permis</p><p style={{fontWeight:600, margin:0}}>{selectedChauffeur.numero_permis}</p></div></div>
              <div style={styles.detailItem}><Calendar size={18} color="#2563eb"/><div><p style={{fontSize:12, color:'#64748b', margin:0}}>Créé le</p><p style={{fontWeight:600, margin:0}}>{selectedChauffeur.date_creation? new Date(selectedChauffeur.date_creation).toLocaleDateString('fr-FR') : '-'}</p></div></div>
            </div>

            {/* 🔥 NOUVEAU - LIVRAISONS + GPS + SIGNATURE */}
            <h4 style={styles.sectionTitle}><List size={16}/> Derniers BL + GPS LIVE + Signature</h4>
            {chauffeurBLs.length === 0? <p style={{color:'#64748b'}}>Aucun BL assigné</p> : (
              <div style={{display:'flex', flexDirection:'column', gap:12}}>
                {chauffeurBLs.map(bl => (
                  <div key={bl.id} style={{border:'1px solid #e2e8f0', borderRadius:12, padding:12, background: bl.statut_livraison==='EN_COURS'? '#eff6ff' : 'white'}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <b>{bl.numero}</b>
                      <span style={{...styles.badgeActif, background: bl.statut_livraison==='EN_COURS'? '#dbeafe' : bl.statut_livraison==='LIVREE'? '#dcfce7' : '#fef3c7', color: bl.statut_livraison==='EN_COURS'? '#1e40af' : '#166534'}}>{bl.statut_livraison}</span>
                    </div>
                    <p style={{fontSize:13, margin:'6px 0'}}>Client: {bl.client_nom} - {bl.adresse_livraison||'-'}</p>

                    {/* GPS MAP */}
                    {bl.latitude && bl.longitude && (
                      <div style={{marginTop:8}}>
                        <p style={{fontSize:12, fontWeight:600, display:'flex', alignItems:'center', gap:4}}><MapPin size={12}/> Position LIVE:</p>
                        <iframe width="100%" height="180" style={{borderRadius:8, border:'1px solid #e2e8f0', marginTop:4}} src={`https://maps.google.com/maps?q=${bl.latitude},${bl.longitude}&z=15&output=embed`}></iframe>
                        <a href={`https://www.google.com/maps?q=${bl.latitude},${bl.longitude}`} target="_blank" style={{fontSize:12, color:'#2563eb'}}>📍 Voir sur Google Maps</a>
                      </div>
                    )}

                    {/* SIGNATURE */}
                    {bl.signature_client && (
                      <div style={{marginTop:8, background:'#f8fafc', padding:8, borderRadius:8}}>
                        <p style={{fontSize:12, fontWeight:600, display:'flex', alignItems:'center', gap:4}}><Signature size={12}/> Signature de {bl.nom_recepteur||'Client'}:</p>
                        <img src={bl.signature_client} alt="signature" style={{maxWidth:'100%', maxHeight:120, border:'1px solid #e2e8f0', borderRadius:8, marginTop:4, background:'white'}}/>
                      </div>
                    )}

                    {/* SMS STATUS */}
                    <div style={{marginTop:8, fontSize:11, color:'#64748b', display:'flex', gap:12}}>
                      <span style={{display:'flex', alignItems:'center', gap:4}}><MessageSquare size={11}/> SMS: {bl.statut_livraison==='EN_COURS'? '✅ Envoyé "Votre livraison arrive"' : bl.statut_livraison==='LIVREE'? '✅ Livré' : '⏳ En attente'}</span>
                      {bl.date_livraison && <span><Calendar size={11}/> {new Date(bl.date_livraison).toLocaleDateString()}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button onClick={()=>setShowDetailModal(false)} style={{...styles.btnPrimary, background:'#f1f5f9', color:'#475569', width:'100%', justifyContent:'center', marginTop:20}}>Fermer</button>
          </div>
        </div>
      )}
    </div>
  );
}