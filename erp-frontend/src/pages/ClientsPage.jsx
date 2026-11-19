import { useEffect, useState, useCallback } from "react";
import api from "../utils/api";
import ClientForm from "../components/ClientForm";
import { Plus, Edit2, Trash2, Users, Loader2, CheckCircle, XCircle, Search, Phone, Mail, MapPin, ChevronLeft, ChevronRight, Hash, FileText, CreditCard, History, X, List, Send } from "lucide-react";

const styles = {
  container: { padding: '16px', width: '100%' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' },
  title: { fontSize: '20px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' },
  btnPrimary: { padding: '10px 16px', fontSize: '14px', fontWeight: '600', color: 'white', background: '#16a34a', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  btnSecondary: { padding: '10px 16px', fontSize: '14px', fontWeight: '600', color: '#475569', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  btnSuccess: { padding: '10px 16px', fontSize: '14px', fontWeight: '600', color: 'white', background: '#16a34a', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  headerActions: { display: 'flex', gap: '8px' },
  searchBar: { display: 'flex', gap: '12px', marginBottom: '12px' },
  searchInput: { flex: 1, padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' },
  card: { background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' },
  tableContainer: { width: '100%', overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' },
  th: { padding: '8px 10px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', background: '#f8fafc', textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: '1px solid #e2e8f0' },
  td: { padding: '8px 10px', fontSize: '12px', color: '#334155', borderBottom: '1px solid #f1f5f9', verticalAlign: 'top', background: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  badge: { padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' },
  badgeActive: { background: '#f0fdf4', color: '#16a34a' },
  badgeInactive: { background: '#fef2f2', color: '#dc2626' },
  actionBtn: { padding: '5px', border: 'none', borderRadius: '6px', cursor: 'pointer', background: '#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center' },
  pagination: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid #f1f5f9', background: 'white', flexWrap: 'wrap', gap: '12px' },
  paginationBtn: { padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '600' },
  paginationInfo: { fontSize: '12px', color: '#64748b' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: 'white', padding: '20px', borderRadius: '12px', width: '750px', maxHeight: '85vh', overflowY: 'auto' },
  logItem: { borderLeft: '3px solid #16a34a', padding: '12px', marginBottom: '10px', background: '#f8fafc', borderRadius: '6px' },
  actionBadge: { padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', color: 'white' }
};

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [userRole, setUserRole] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [sendingEmailId, setSendingEmailId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [sendingBulk, setSendingBulk] = useState(false);

  const [showHistory, setShowHistory] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);

  const fetchClients = useCallback(() => {
    setLoading(true);
    api.get(`/clients/?ordering=-id&page=${page}&page_size=${pageSize}&search=${search}`)
  .then(res => {
        const results = res.data.results || [];
        setClients(results.reverse());
        setTotal(res.data.count || 0);
      })
  .catch(() => { setClients([]); setTotal(0); })
  .finally(() => { setLoading(false) });
  }, [page, pageSize, search]);

  const fetchHistory = async (clientId = null, hPage = 1) => {
    try {
      setSelectedClient(clientId? clients.find(c => c.id === clientId) : null);
      let url = clientId
      ? `/clients/${clientId}/audit/?page=${hPage}`
        : `/clients/audit-logs/?page=${hPage}`;
      const res = await api.get(url);
      setHistoryData(res.data.results || []);
      setHistoryTotal(res.data.count || 0);
      setHistoryPage(hPage);
      setShowHistory(true);
    } catch (error) {
      alert("Tsy manana droit hijery historique ianao")
    }
  };

  const getActionColor = (action) => {
    if (action.includes('CREATE')) return '#16a34a';
    if (action.includes('UPDATE')) return '#f59e0b';
    if (action.includes('DELETE')) return '#dc2626';
    if (action.includes('VIEW')) return '#0ea5e9';
    if (action.includes('EMAIL')) return '#6366f1';
    return '#64748b';
  }

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setUserRole(user.role || 'USER');
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const handleSearch = (e) => { setSearch(e.target.value); setPage(1); }
  const openModal = (client = null) => { setEditingClient(client); setShowModal(true); };
  const closeModal = () => { setEditingClient(null); setShowModal(false); };

  const handleSubmit = async (form) => {
    setSaving(true);
    try {
      let payload = {};
      if(['ADMIN', 'ACHETEUR'].includes(userRole)) { payload = {...form}; }
      else if(userRole === 'COMPTABLE') {
        payload = { nif: form.nif, stat: form.stat, delai_paiement: parseInt(form.delai_paiement) || 30, plafond_credit: parseFloat(form.plafond_credit) || 0, note: form.note, is_active: form.is_active }
      }
      else if(userRole === 'COMMERCIAL') {
        payload = { contact_nom: form.contact_nom, telephone: form.telephone, email: form.email, adresse: form.adresse, ville: form.ville, note: form.note, delai_paiement: parseInt(form.delai_paiement) || 30 }
      }

      if (form.id) {
        await api.put(`/clients/${form.id}/`, payload);
      }
      else {
        await api.post("/clients/", form);
        const newTotal = total + 1;
        const newTotalPages = Math.ceil(newTotal / pageSize);
        setPage(newTotalPages);
      }
      closeModal();
      fetchClients();
    } catch (error) { alert(Object.values(error.response?.data || {}).flat().join("\n")); }
    finally { setSaving(false); }
  };

  // ENVOI 1 EMAIL - VRAI INBOX
  const handleSendEmail = async (clientId, email) => {
    if (!email) return alert("Ce client n'a pas d'email");
    if (!window.confirm(`Envoyer email à ${email}?`)) return;
    setSendingEmailId(clientId);
    try {
      const res = await api.post(`/clients/${clientId}/send-email/`, {
        sujet: 'Information VOLA ALOA',
        message: `Bonjour,\n\nCeci est un message de VOLA ALOA ERP.\n\nCordialement,\nVOLA ALOA`
      });
      alert(`✅ Email envoyé à ${res.data.email_envoye_a} dans son inbox Gmail!`);
    } catch(e) {
      alert(`❌ Erreur: ${e.response?.data?.error || e.message}`);
    } finally {
      setSendingEmailId(null);
    }
  }

  // ENVOI PLUSIEURS EMAILS DIFFERENTS
  const handleSendBulkEmail = async () => {
    if (selectedIds.length === 0) return alert("Sélectionne au moins 1 client");
    const sujet = window.prompt("Sujet email:", "Information VOLA ALOA");
    if (!sujet) return;
    const message = window.prompt("Message:", "Bonjour,\n\nMessage de VOLA ALOA\n\nCordialement");
    if (message === null) return;

    setSendingBulk(true);
    try {
      const res = await api.post(`/clients/send-bulk-email/`, {
        client_ids: selectedIds,
        sujet,
        message
      });
      alert(`✅ ${res.data.message}\nEnvoyés: ${res.data.envoyes.join(', ')}`);
      setSelectedIds([]);
    } catch(e) {
      alert(`❌ ${e.response?.data?.error || e.message}`);
    } finally {
      setSendingBulk(false);
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer ce client?")) return;
    await api.delete(`/clients/${id}/`); fetchClients();
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id)? prev.filter(x=>x!==id) : [...prev, id]);
  }

  const canEdit = ['ADMIN', 'ACHETEUR', 'COMPTABLE', 'COMMERCIAL'].includes(userRole);
  const canCreate = ['ADMIN', 'ACHETEUR', 'COMMERCIAL'].includes(userRole);
  const canDelete = userRole === 'ADMIN';
  const canViewHistory = userRole === 'ADMIN';
  const showComptaCols = ['ADMIN', 'ACHETEUR', 'COMPTABLE'].includes(userRole);

  const totalPages = Math.ceil(total / pageSize);
  const startItem = total === 0? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);
  const historyTotalPages = Math.ceil(historyTotal / 10);

  if (loading && clients.length === 0) return <div style={{display:'flex', justifyContent:'center', alignItems:'center', height:'70vh'}}><Loader2 className="animate-spin" size={32} color="#16a34a"/></div>

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}><Users size={20} /> Liste des clients </h1>
        <div style={styles.headerActions}>
          {selectedIds.length > 0 && (
            <button onClick={handleSendBulkEmail} disabled={sendingBulk} style={styles.btnSuccess}>
              {sendingBulk? <Loader2 size={14} className="animate-spin"/> : <Send size={14}/>}
              Envoyer à {selectedIds.length} emails
            </button>
          )}
          {canViewHistory && <button onClick={() => fetchHistory()} style={styles.btnSecondary}><List size={14}/> Journal d'audit</button>}
          {canCreate && <button onClick={() => openModal()} style={styles.btnPrimary}><Plus size={14}/> Nouveau</button>}
        </div>
      </div>

      <div style={styles.searchBar}>
        <div style={{position: 'relative', flex: 1}}>
          <Search size={14} style={{position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8'}}/>
          <input type="text" placeholder="Recher: Code, Raison Sociale, NIF, Tel..." value={search} onChange={handleSearch} style={{...styles.searchInput, paddingLeft: '32px'}}/>
        </div>
      </div>

      <div style={styles.card}>
        {loading && clients.length > 0 && <div style={{padding: '10px', textAlign: 'center', fontSize: '12px', color: '#64748b'}}>Chargement...</div>}

        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <colgroup>
              <col style={{width: '3%'}} /> <col style={{width: '7%'}} /> <col style={{width: '14%'}} /> <col style={{width: '10%'}} />
              <col style={{width: '13%'}} /> <col style={{width: '8%'}} /> {showComptaCols && <col style={{width: '9%'}} />}
              <col style={{width: '9%'}} /> <col style={{width: '5%'}} /> <col style={{width: '10%'}} />
              <col style={{width: '5%'}} /> {canEdit && <col style={{width: '12%'}} />}
            </colgroup>
            <thead><tr>
              <th style={styles.th}><input type="checkbox" onChange={(e)=> setSelectedIds(e.target.checked? clients.filter(c=>c.email).map(c=>c.id) : [])} checked={selectedIds.length>0 && selectedIds.length===clients.filter(c=>c.email).length} /></th>
              <th style={styles.th}>Code</th> <th style={styles.th}>Raison Sociale</th> <th style={styles.th}>Contact</th>
              <th style={styles.th}>Tél / Email</th> <th style={styles.th}><MapPin size={11}/> Ville</th>
              {showComptaCols && <th style={styles.th}><Hash size={11}/> NIF/STAT</th>}
              <th style={styles.th}><CreditCard size={11}/> Plafond</th> <th style={styles.th}>Délai</th>
              <th style={styles.th}><FileText size={11}/> Note</th> <th style={{...styles.th, textAlign: 'center'}}>Statut</th>
              {canEdit && <th style={{...styles.th, textAlign: 'center'}}>Act.</th>}
            </tr></thead>
            <tbody>
              {clients.length === 0 &&!loading? (
                <tr><td colSpan={showComptaCols? "12" : "11"} style={{padding: '30px', textAlign: 'center', color: '#64748b'}}>Aucun client</td></tr>
              ) : clients.map(c => (
                <tr key={c.id}>
                  <td style={styles.td}><input type="checkbox" checked={selectedIds.includes(c.id)} onChange={()=>toggleSelect(c.id)} disabled={!c.email} /></td>
                  <td style={styles.td}><b>{c.code}</b></td> <td style={styles.td} title={c.raison_sociale}>{c.raison_sociale}</td>
                  <td style={styles.td} title={c.contact_nom}>{c.contact_nom || '-'}</td>
                  <td style={styles.td}> <div style={{fontSize: '11px'}}><Phone size={10}/> {c.telephone || '-'}</div> <div style={{fontSize: '11px'}}><Mail size={10}/> {c.email || '-'}</div> </td>
                  <td style={styles.td} title={c.ville}>{c.ville || '-'}</td>
                  {showComptaCols && ( <td style={styles.td}> <div>NIF: {c.nif || '-'}</div> <div>STAT: {c.stat || '-'}</div> </td> )}
                  <td style={styles.td}>{parseFloat(c.plafond_credit || 0).toLocaleString()} Ar</td>
                  <td style={styles.td}>{c.delai_paiement}J</td>
                  <td style={styles.td} title={c.note}> {c.note? (c.note.length > 25? c.note.substring(0,25) + '...' : c.note) : '-'} </td>
                  <td style={{...styles.td, textAlign: 'center'}}>
                    <span style={{...styles.badge,...(c.is_active? styles.badgeActive : styles.badgeInactive)}}>
                      {c.is_active? <CheckCircle size={10}/> : <XCircle size={10}/>} {c.is_active? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  {canEdit && (
                    <td style={{...styles.td, textAlign: 'center', display: 'flex', gap: '4px', justifyContent: 'center'}}>
                      <button onClick={() => handleSendEmail(c.id, c.email)} disabled={sendingEmailId===c.id ||!c.email} style={{...styles.actionBtn, background: c.email? '#f0fdf4' : '#f1f5f9', opacity:!c.email?0.4:1}} title={c.email?`Envoyer à ${c.email}`:'Pas d\'email'}>
                        {sendingEmailId===c.id? <Loader2 size={12} className="animate-spin"/> : <Mail size={12} color={c.email? "#16a34a" : "#94a3b8"}/>}
                      </button>
                      <button onClick={() => openModal(c)} style={styles.actionBtn}><Edit2 size={12}/></button>
                      {canDelete && <button onClick={() => handleDelete(c.id)} style={{...styles.actionBtn, background: '#fef2f2'}}><Trash2 size={12} color="#dc2626"/></button>}
                      {canViewHistory && <button onClick={() => fetchHistory(c.id)} style={{...styles.actionBtn, background: '#ede9fe'}}><History size={12} color="#6d28d9"/></button>}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={styles.pagination}>
          <div style={styles.paginationInfo}>{startItem}-{endItem} / {total} {selectedIds.length>0 && `• ${selectedIds.length} sélectionnés`}</div>
          <div style={{display: 'flex', gap: '6px'}}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{...styles.paginationBtn, opacity: page === 1? 0.5 : 1}}><ChevronLeft size={14}/> Prec</button>
            <span style={{padding: '6px 10px', fontSize: '12px', fontWeight: '600'}}>{page}/{totalPages || 1}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0} style={{...styles.paginationBtn, opacity: page === totalPages? 0.5 : 1}}>Suiv <ChevronRight size={14}/></button>
          </div>
        </div>
      </div>

      <ClientForm show={showModal} onClose={closeModal} onSubmit={handleSubmit} client={editingClient} saving={saving} userRole={userRole} />

      {showHistory && (
        <div style={styles.modalOverlay} onClick={() => setShowHistory(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems: 'center'}}>
              <h3 style={{fontSize: '16px', fontWeight: '700'}}>Journal d'audit: {selectedClient? selectedClient.raison_sociale : 'Tous les Clients'}</h3>
              <button onClick={() => setShowHistory(false)} style={{border: 'none', background: 'none', cursor: 'pointer'}}> <X size={20} /> </button>
            </div>
            {historyData.length === 0? <p style={{textAlign: 'center', color: '#64748b'}}>Aucun historique</p> :
              historyData.map(log => (
                <div key={log.id} style={styles.logItem}>
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '6px'}}>
                    <span style={{...styles.actionBadge, background: getActionColor(log.action)}}>{log.action}</span>
                    <small style={{color: '#64748b'}}>{new Date(log.timestamp).toLocaleString('fr-FR')}</small>
                  </div>
                  <p style={{margin: '0 0 6px 0', fontSize: '12px'}}><b>User:</b> {log.user_username} - <b>Role:</b> {log.user_role}</p>
                  {log.target_name && <p style={{margin: '0 0 6px 0', fontSize: '12px'}}><b>Client:</b> {log.target_name}</p>}
                  {log.details?.changes && Object.keys(log.details.changes).length > 0 && (
                    <div style={{fontSize: '12px', background: 'white', padding: '8px', borderRadius: '4px'}}>
                      <b>Modifications:</b>
                      <ul style={{margin: '4px 0 0 20px', padding: 0}}>
                        {Object.entries(log.details.changes).map(([field, val]) => (
                          <li key={field}>{field}: <s style={{color: '#dc2626'}}>{val.old}</s> → <b style={{color: '#16a34a'}}>{val.new}</b></li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {log.details?.to && <p style={{fontSize:'12px'}}><b>Email à:</b> {log.details.to}</p>}
                </div>
              ))
            }
            {historyTotalPages > 1 && (
              <div style={{display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '15px'}}>
                <button onClick={() => fetchHistory(selectedClient?.id, historyPage - 1)} disabled={historyPage === 1} style={{...styles.paginationBtn, opacity: historyPage === 1? 0.5 : 1}}><ChevronLeft size={14}/></button>
                <span style={{padding: '6px 10px', fontSize: '12px'}}>{historyPage}/{historyTotalPages}</span>
                <button onClick={() => fetchHistory(selectedClient?.id, historyPage + 1)} disabled={historyPage === historyTotalPages} style={{...styles.paginationBtn, opacity: historyPage === historyTotalPages? 0.5 : 1}}><ChevronRight size={14}/></button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}