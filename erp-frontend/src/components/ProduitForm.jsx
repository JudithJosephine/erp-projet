import { useState, useEffect } from 'react';
import { X, Save, Package, FileText, DollarSign, Layers, Hash, ToggleLeft, ToggleRight, Loader2, Lock } from 'lucide-react';
import api from "../utils/api";

const styles = {
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' },
  modalCard: { width: '100%', maxWidth: '550px', background: 'white', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden' },
  modalHeader: { padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: '18px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '6px' },
  formBody: { padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' },
  label: { display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' },
  inputWrapper: { position: 'relative' },
  input: { width: '100%', padding: '10px 12px 10px 40px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', transition: 'all 0.2s' },
  inputDisabled: { background: '#e2e8f0', color: '#94a3b8', cursor: 'not-allowed', borderColor: '#e2e8f0' },
  select: { width: '100%', padding: '10px 12px 10px 40px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', appearance: 'none' },
  textarea: { width: '100%', padding: '10px 12px 10px 40px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', minHeight: '80px', resize: 'vertical' },
  inputIcon: { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' },
  inputIconTop: { position: 'absolute', left: '12px', top: '12px', color: '#64748b', pointerEvents: 'none' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  switch: { display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' },
  btnRow: { display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '16px 24px', borderTop: '1px solid #f1f5f9', background: '#f8fafc' },
  btnCancel: { padding: '10px 20px', fontSize: '14px', fontWeight: '600', color: '#475569', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer' },
  btnSave: { padding: '10px 20px', fontSize: '14px', fontWeight: '600', color: 'white', background: '#16a34a', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  infoMsg: { fontSize: '12px', color: '#2563eb', background: '#eff6ff', padding: '10px 24px', borderBottom: '1px solid #dbeafe', display: 'flex', alignItems: 'center', gap: '6px' }
}

export default function ProduitForm({ show, onClose, onSubmit, produit, saving, canEditAll, canEditSome }) {
  const [form, setForm] = useState({
    code: '', designation: '', description: '', prix_achat: '', prix_vente: '',
    categorie: '', is_active: true
  });
  const [categories, setCategories] = useState([]);
  const [loadingCat, setLoadingCat] = useState(true);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const role = user.role;

  const isReadOnly =!canEditAll &&!canEditSome;
  const isPartialEdit = canEditSome &&!canEditAll; // MAGASINIER

  const champsAutorisesMagasinier = ["prix_vente", "description", "categorie", "is_active"];
  const champsAutorisesAcheteur = ["code", "designation", "prix_achat", "description", "categorie"];

  const isDisabled = (field) => {
    if (isReadOnly) return true;
    if (role === 'MAGASINIER') return!champsAutorisesMagasinier.includes(field);
    if (role === 'ACHETEUR') return!champsAutorisesAcheteur.includes(field);
    return false;
  }

  useEffect(() => {
    if(show){
      setLoadingCat(true);
      api.get('/categories/?page_size=1000')
      .then(res => setCategories(res.data.results || []))
      .catch(() => setCategories([]))
      .finally(() => setLoadingCat(false))
    }
  }, [show]);

  useEffect(() => {
    if (produit) {
      setForm({
        id: produit.id,
        code: produit.code || '',
        designation: produit.designation || '',
        description: produit.description || '',
        prix_achat: produit.prix_achat || '',
        prix_vente: produit.prix_vente || '',
        categorie: produit.categorie || '', // <-- ITO NO ZAVA-DEHIBE: ID avy @ backend
        is_active: produit.is_active
      });
    } else {
      setForm({ code: '', designation: '', description: '', prix_achat: '', prix_vente: '', categorie: '', is_active: true });
    }
  }, [produit, show]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({...prev, [name]: type === 'checkbox'? checked : value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    let payload = {
      code: form.code,
      designation: form.designation,
      description: form.description,
      prix_achat: parseFloat(form.prix_achat) || 0,
      prix_vente: parseFloat(form.prix_vente) || 0,
      categorie: form.categorie? parseInt(form.categorie) : null, // <-- parseInt ho an'ny rehetra
      is_active: form.is_active
    };

    if (role === 'MAGASINIER') {
      payload = {
        prix_vente: parseFloat(form.prix_vente) || 0,
        description: form.description,
        categorie: form.categorie? parseInt(form.categorie) : null,
        is_active: form.is_active
      };
    }
    if (role === 'ACHETEUR') {
      payload = {
        code: form.code,
        designation: form.designation,
        prix_achat: parseFloat(form.prix_achat) || 0,
        description: form.description,
        categorie: form.categorie? parseInt(form.categorie) : null
      };
    }

    if(produit) payload.id = produit.id;
    onSubmit(payload);
  };

  if (!show) return null;

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalCard} onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div style={styles.modalHeader}>
            <h2 style={styles.modalTitle}><Package size={20} /> {produit? "Modifier Produit" : "Nouveau Produit"}</h2>
            <button type="button" onClick={onClose} style={styles.closeBtn}><X size={20} /></button>
          </div>

          {isPartialEdit &&
            <div style={styles.infoMsg}><Lock size={14}/> Accès limité: Vous pouvez modifier Prix Vente, Description, Catégorie, Statut</div>
          }
          {role === 'ACHETEUR' &&!produit &&
            <div style={styles.infoMsg}><Lock size={14}/> Accès limité: Vous pouvez créer avec Code, Désignation, Prix Achat, Description, Catégorie</div>
          }

          <div style={styles.formBody}>
            <div style={styles.grid2}>
              <div>
                <label style={styles.label}>Code *</label>
                <div style={styles.inputWrapper}>
                  <Hash size={16} style={styles.inputIcon} />
                  <input type="text" name="code" value={form.code} onChange={handleChange} style={{...styles.input,...(isDisabled('code')? styles.inputDisabled : {})}} required={!isDisabled('code')} disabled={isDisabled('code')} />
                </div>
              </div>
              <div>
                <label style={styles.label}>Catégorie</label>
                <div style={styles.inputWrapper}>
                  <Layers size={16} style={styles.inputIcon} />
                  {loadingCat? <Loader2 size={16} className="animate-spin" style={styles.inputIcon}/> : null}
                  <select name="categorie" value={form.categorie} onChange={handleChange} style={{...styles.select,...(isDisabled('categorie')? styles.inputDisabled : {})}} disabled={isDisabled('categorie')}>
                    <option value="">-- Choisir --</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label style={styles.label}>Désignation *</label>
              <div style={styles.inputWrapper}>
                <Package size={16} style={styles.inputIcon} />
                <input type="text" name="designation" value={form.designation} onChange={handleChange} style={{...styles.input,...(isDisabled('designation')? styles.inputDisabled : {})}} required={!isDisabled('designation')} disabled={isDisabled('designation')} />
              </div>
            </div>

            <div>
              <label style={styles.label}>Description</label>
              <div style={styles.inputWrapper}>
                <FileText size={16} style={styles.inputIconTop} />
                <textarea name="description" value={form.description} onChange={handleChange} style={{...styles.textarea,...(isDisabled('description')? styles.inputDisabled : {})}} disabled={isDisabled('description')} />
              </div>
            </div>

            <div style={styles.grid2}>
              <div>
                <label style={styles.label}>Prix Achat (Ar)</label>
                <div style={styles.inputWrapper}>
                  <DollarSign size={16} style={styles.inputIcon} />
                  <input type="number" step="0.01" name="prix_achat" value={form.prix_achat} onChange={handleChange} style={{...styles.input,...(isDisabled('prix_achat')? styles.inputDisabled : {})}} disabled={isDisabled('prix_achat')} />
                </div>
              </div>
              <div>
                <label style={styles.label}>Prix Vente (Ar) *</label>
                <div style={styles.inputWrapper}>
                  <DollarSign size={16} style={styles.inputIcon} />
                  <input type="number" step="0.01" name="prix_vente" value={form.prix_vente} onChange={handleChange} style={{...styles.input,...(isDisabled('prix_vente')? styles.inputDisabled : {})}} required={!isDisabled('prix_vente')} disabled={isDisabled('prix_vente')} />
                </div>
              </div>
            </div>

            <div>
              {(canEditAll || canEditSome) &&
                <label style={{...styles.switch, opacity: isDisabled('is_active')? 0.5 : 1}} onClick={() =>!isDisabled('is_active') && handleChange({ target: { name: 'is_active', type: 'checkbox', checked:!form.is_active } })}>
                  {form.is_active? <ToggleRight size={24} color="#16a34a" /> : <ToggleLeft size={24} color="#94a3b8" />}
                  <span>Statut: {form.is_active? 'Actif' : 'Inactif'}</span>
                </label>
              }
            </div>
          </div>

          {!isReadOnly &&
            <div style={styles.btnRow}>
              <button type="button" onClick={onClose} style={styles.btnCancel}>Annuler</button>
              <button type="submit" disabled={saving} style={{...styles.btnSave, opacity: saving? 0.6 : 1 }}>
                {saving? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Enregistrer
              </button>
            </div>
          }
        </form>
      </div>
    </div>
  );
}