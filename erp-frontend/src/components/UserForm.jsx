import { useEffect, useState } from "react";
import api from "../utils/api";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Save, X, User, ArrowLeft, Loader2, Eye, EyeOff, KeyRound, Shield } from "lucide-react";

const styles = {
  container: { minHeight: 'calc(100vh - 100px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', background: '#f8fafc' },
  card: { width: '100%', maxWidth: '420px', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', overflow: 'hidden' },
  header: { padding: '20px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' },
  iconBox: { display: 'inline-flex', padding: '10px', background: '#4f46e5', borderRadius: '10px', marginBottom: '10px' },
  inputWrapper: { position: 'relative' },
  input: { width: '100%', padding: '10px 12px 10px 40px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
  select: { width: '100%', padding: '10px 12px 10px 40px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', appearance: 'none' },
  inputIcon: { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' },
  label: { display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px', textAlign: 'left' },
  btnSuccess: { padding: '10px 20px', fontSize: '14px', fontWeight: '600', color: 'white', background: '#16a34a', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  btnDanger: { padding: '10px 20px', fontSize: '14px', fontWeight: '600', color: 'white', background: '#dc2626', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' },
  btnIcon: { position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }
}

const ROLES = [
  { value: "ADMIN", label: "Administrateur" },
  { value: "COMMERCIAL", label: "Commercial" },
  { value: "ACHETEUR", label: "Acheteur" }, // << ZAVA-DEHIBE: MAJUSCULE
  { value: "COMPTABLE", label: "Comptable" },
  { value: "MAGASINIER", label: "Magasinier" },
  { value: "USER", label: "Utilisateur" },
];

export default function UserForm() {
  const [form, setForm] = useState({ username: "", password: "", role: "MAGASINIER" });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  useEffect(() => {
    if (isEdit) {
      setLoading(true);
      api.get(`/users/${id}/`).then(res => {
        setForm({ 
          username: res.data.username, 
          password: '', 
          role: res.data.role || "MAGASINIER" // Maka ny role efa misy
        });
      }).finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { 
        username: form.username,
        role: form.role // Alefa en MAJUSCULE
      };
      if (form.password) payload.password = form.password; // alefa raha misy ihany

      console.log("Payload envoyé:", payload); // << ESORINA rehefa vita test

      if (isEdit) await api.put(`/users/${id}/`, payload);
      else await api.post("/users/", payload);
      
      navigate("/users");
    } catch (error) {
      const errors = error.response?.data;
      alert(Object.values(errors).flat().join("\n"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{display:'flex', justifyContent:'center', alignItems:'center', height:'70vh'}}><Loader2 className="animate-spin" size={32} color="#4f46e5"/></div>

  return (
    <div style={styles.container}>
      <div style={{width:'100%', maxWidth:'420px'}}>
        <div style={{display:'flex', justifyContent: 'flex-start', marginBottom:'20px'}}>
          <Link to="/users" style={{display:'flex', alignItems:'center', gap:'6px', color:'#475569', fontWeight:'600', textDecoration:'none', fontSize:'14px'}}>
            <ArrowLeft size={16}/> Retour
          </Link>
        </div>

        <div style={styles.card}>
          <div style={styles.header}>
            <div style={styles.iconBox}><User size={22} color="white"/></div>
            <h2 style={{fontSize:'18px', fontWeight:'700', color:'#0f172a', margin:0}}>{isEdit? "Modifier" : "Nouvel utilisateur"}</h2>
          </div>

          <form onSubmit={handleSubmit} style={{padding:'20px'}}>
            <div style={{display:'flex', flexDirection:'column', gap:'16px'}}>
              
              <div>
                <label style={styles.label}>Nom d'utilisateur *</label>
                <div style={styles.inputWrapper}>
                  <User size={16} style={styles.inputIcon}/>
                  <input type="text" placeholder="acheteur1" value={form.username} onChange={e => setForm({...form, username: e.target.value})} style={styles.input} required/>
                </div>
              </div>

              <div>
                <label style={styles.label}>Mot de passe {isEdit ? '(optionnel)' : '*'}</label>
                <div style={styles.inputWrapper}>
                  <KeyRound size={16} style={styles.inputIcon}/>
                  <input type={showPassword? "text" : "password"} placeholder={isEdit ? "Nouveau mdp" : "acheteur1_2026_123"} value={form.password} onChange={e => setForm({...form, password: e.target.value})} style={styles.input} required={!isEdit} minLength={8}/>
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={styles.btnIcon}>
                    {showPassword? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
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


              <div style={{display:'flex', justifyContent:'space-between', gap:'10px', paddingTop:'16px', borderTop:'1px solid #f1f5f9'}}>
                <Link to="/users" style={styles.btnDanger}><X size={16}/> Annuler</Link>
                <button type="submit" disabled={saving} style={{...styles.btnSuccess, opacity: saving ? 0.6 : 1}}>
                  {saving? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} Enregistrer
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}