import { useEffect, useState } from "react";
import api from "../utils/api";
import { Plus, Edit2, Trash2, X, Save, User, Loader2, Eye, EyeOff, KeyRound, Shield, ChevronLeft, ChevronRight } from "lucide-react";

const styles = {
  container: { padding: '24px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  title: { fontSize: '24px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' },
  btnPrimary: { padding: '10px 16px', fontSize: '14px', fontWeight: '600', color: 'white', background: '#16a34a', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  tableWrapper: { background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', background: '#f8fafc', textTransform: 'uppercase' },
  td: { padding: '12px 16px', fontSize: '14px', color: '#334155', borderTop: '1px solid #f1f5f9' },
  badge: { padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' },
  actionBtn: { padding: '6px', border: 'none', borderRadius: '6px', cursor: 'pointer', background: '#f1f5f9' },
  pagination: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: '1px solid #f1f5f9' },
  paginationBtn: { padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: '600' },
  paginationInfo: { fontSize: '13px', color: '#64748b' },

  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalCard: { width: '100%', maxWidth: '420px', background: 'white', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', overflow: 'hidden' },
  modalHeader: { padding: '20px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' },
  iconBox: { display: 'inline-flex', padding: '10px', background: '#4f46e5', borderRadius: '10px', marginBottom: '10px' },
  inputWrapper: { position: 'relative' },
  input: { width: '100%', padding: '10px 12px 10px 40px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
  select: { width: '100%', padding: '10px 12px 10px 40px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', appearance: 'none' },
  inputIcon: { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' },
  label: { display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px', textAlign: 'left' },
  btnSuccess: { padding: '10px 20px', fontSize: '14px', fontWeight: '600', color: 'white', background: '#16a34a', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  btnDanger: { padding: '10px 20px', fontSize: '14px', fontWeight: '600', color: 'white', background: '#dc2626', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  btnIcon: { position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }
}

const ROLES = [
  { value: "ADMIN", label: "Administrateur" },
  { value: "COMMERCIAL", label: "Commercial" },
  { value: "ACHETEUR", label: "Acheteur" },
  { value: "COMPTABLE", label: "Comptable" },
  { value: "MAGASINIER", label: "Magasinier" },
  { value: "USER", label: "Utilisateur" },
];

const ROLE_COLORS = {
  ADMIN: { bg: '#fef2f2', color: '#dc2626' },
  ACHETEUR: { bg: '#eff6ff', color: '#2563eb' },
  COMMERCIAL: { bg: '#f0fdf4', color: '#16a34a' },
  COMPTABLE: { bg: '#fffbeb', color: '#d97706' },
  MAGASINIER: { bg: '#f5f3ff', color: '#7c3aed' },
  USER: { bg: '#f1f5f9', color: '#475569' },
}

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // PAGINATION
  const [page, setPage] = useState(1);
  const [pageSize] = useState(5); // 5 par page mba ho mora test
  const [total, setTotal] = useState(0);

  const [form, setForm] = useState({ username: "", password: "", role: "MAGASINIER" });

  const fetchUsers = () => {
    setLoading(true);
    api.get(`/users/?page=${page}&page_size=${pageSize}`)
   .then(res => {
        setUsers(res.data.results || []); // Format DRF: {count, results}
        setTotal(res.data.count || 0);
      })
   .catch(() => { setUsers([]); setTotal(0); })
   .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, [page]); // recharge isaky ny miova page

  const openModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setForm({ username: user.username, password: '', role: user.role || "MAGASINIER" });
    } else {
      setEditingUser(null);
      setForm({ username: "", password: "", role: "MAGASINIER" });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setShowPassword(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { username: form.username, role: form.role };
      if (form.password) payload.password = form.password;

      if (editingUser) {
        await api.put(`/users/${editingUser.id}/`, payload);
      } else {
        await api.post("/users/", payload);
      }
      closeModal();
      fetchUsers();
    } catch (error) {
      const errors = error.response?.data;
      alert(typeof errors === 'object'? Object.values(errors).flat().join("\n") : "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cet utilisateur?")) return;
    await api.delete(`/users/${id}/`);
    // Raha farany amin'ny page no voafafa dia miverina 1 page
    if (users.length === 1 && page > 1) setPage(p => p - 1);
    else fetchUsers();
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startItem = total === 0? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  if (loading) return <div style={{display:'flex', justifyContent:'center', alignItems:'center', height:'70vh'}}><Loader2 className="animate-spin" size={32} color="#4f46e5"/></div>

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}><User size={24} /> Liste des Utilisateurs</h1>
        <button onClick={() => openModal()} style={styles.btnPrimary}><Plus size={16}/> Nouveau</button>
      </div>

      <div style={styles.tableWrapper}>
        <table style={{width: '100%', borderCollapse: 'collapse'}}>
          <thead>
            <tr>
              <th style={styles.th}>UTILISATEUR</th>
              <th style={styles.th}>RÔLE</th>
              <th style={styles.th}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0? (
              <tr><td colSpan={3} style={{textAlign: 'center', padding: '20px', color: '#64748b'}}>Aucun utilisateur</td></tr>
            ) : users.map(user => (
              <tr key={user.id}>
                <td style={styles.td}>{user.username}</td>
                <td style={styles.td}>
                  <span style={{...styles.badge, background: ROLE_COLORS[user.role]?.bg, color: ROLE_COLORS[user.role]?.color}}>
                    {ROLES.find(r => r.value === user.role)?.label || user.role}
                  </span>
                </td>
                <td style={styles.td}>
                  <button onClick={() => openModal(user)} style={{...styles.actionBtn, marginRight: 8}}><Edit2 size={14}/></button>
                  <button onClick={() => handleDelete(user.id)} style={{...styles.actionBtn, background: '#fef2f2'}}><Trash2 size={14} color="#dc2626"/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* PAGINATION */}
        {total > 0 && (
          <div style={styles.pagination}>
            <div style={styles.paginationInfo}>
              Affichage de {startItem} à {endItem} sur {total} utilisateurs
            </div>
            <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{...styles.paginationBtn, opacity: page === 1? 0.5 : 1, cursor: page === 1? 'not-allowed' : 'pointer'}}
              >
                <ChevronLeft size={14}/> Précédent
              </button>

              <span style={{fontSize: '13px', fontWeight: '600'}}>Page {page} / {totalPages}</span>

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{...styles.paginationBtn, opacity: page === totalPages? 0.5 : 1, cursor: page === totalPages? 'not-allowed' : 'pointer'}}
              >
                Suivant <ChevronRight size={14}/>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL */}
      {showModal && (
        <div style={styles.modalOverlay} onClick={closeModal}>
          <div style={styles.modalCard} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={styles.iconBox}><User size={22} color="white"/></div>
              <h2 style={{fontSize:'18px', fontWeight:'700', color:'#0f172a', margin:0}}>{editingUser? "Modifier" : "Nouvel utilisateur"}</h2>
            </div>

            <form onSubmit={handleSubmit} style={{padding:'20px'}}>
              <div style={{display:'flex', flexDirection:'column', gap:'16px'}}>
                <div>
                  <label style={styles.label}>Nom d'utilisateur *</label>
                  <div style={styles.inputWrapper}>
                    <User size={16} style={styles.inputIcon}/>
                    <input type="text" placeholder="admin1" value={form.username} onChange={e => setForm({...form, username: e.target.value})} style={styles.input} required/>
                  </div>
                </div>

                <div>
                  <label style={styles.label}>Rôle *</label>
                  <div style={styles.inputWrapper}>
                    <Shield size={16} style={styles.inputIcon}/>
                    <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} style={styles.select} required>
                      {ROLES.map(role => (
                        <option key={role.value} value={role.value}>{role.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={styles.label}>Mot de passe {editingUser? '(optionnel)' : '*'}</label>
                  <div style={styles.inputWrapper}>
                  <KeyRound size={16} style={styles.inputIcon}/>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder={editingUser? "Nouveau mdp" : "8 caractères min"} 
                    value={form.password} 
                    onChange={e => setForm({...form, password: e.target.value})} 
                    style={styles.input} 
                    required={!editingUser} 
                    minLength={8}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={styles.btnIcon}>
                    {showPassword ? <Eye size={16}/> : <EyeOff size={16}/>}  {/* NODINAVINA ITO */}
                  </button>
                </div>
                </div>

                <div style={{display:'flex', justifyContent:'space-between', gap:'10px', paddingTop:'16px', borderTop:'1px solid #f1f5f9'}}>
                  <button type="button" onClick={closeModal} style={styles.btnDanger}><X size={16}/> Annuler</button>
                  <button type="submit" disabled={saving} style={{...styles.btnSuccess, opacity: saving? 0.6 : 1}}>
                    {saving? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} Enregistrer
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}