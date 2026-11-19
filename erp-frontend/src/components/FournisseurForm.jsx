import { useState, useEffect } from 'react';
import { X, Save, Building2, User, Phone, Mail, MapPin, FileText, Hash, DollarSign, Lock, Loader2, ToggleLeft, ToggleRight } from 'lucide-react'; // <-- Nampiana Toggle

const styles = {
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '16px' },
  modalCard: { width: '100%', maxWidth: '580px', background: 'white', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden' },
  modalHeader: { padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: '16px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '6px' },
  formBody: { padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '75vh', overflowY: 'auto' },
  label: { display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' },
  inputWrapper: { position: 'relative' },
  input: { width: '100%', padding: '8px 10px 8px 34px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' },
  inputDisabled: { background: '#e2e8f0', color: '#94a3b8', cursor: 'not-allowed' },
  textarea: { width: '100%', padding: '8px 10px 8px 34px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', minHeight: '60px', resize: 'vertical', boxSizing: 'border-box' },
  inputIcon: { position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' },
  inputIconTop: { position: 'absolute', left: '10px', top: '10px', color: '#64748b' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  sectionTitle: { fontSize: '13px', fontWeight: '700', color: '#2563eb', marginTop: '4px', marginBottom: '-4px' },
  btnRow: { display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '12px 20px', borderTop: '1px solid #f1f5f9', background: '#f8fafc' },
  btnCancel: { padding: '8px 16px', fontSize: '13px', fontWeight: '600', color: '#475569', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' },
  btnSave: { padding: '8px 16px', fontSize: '13px', fontWeight: '600', color: 'white', background: '#2563eb', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  infoMsg: { fontSize: '11px', color: '#2563eb', background: '#eff6ff', padding: '8px 20px', borderBottom: '1px solid #dbeafe', display: 'flex', alignItems: 'center', gap: '6px' },
  checkboxWrapper: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '6px 0' } // <-- VAOVAO
}

export default function FournisseurForm({ show, onClose, onSubmit, fournisseur, saving, userRole }) {
  const [form, setForm] = useState({});

  const canEditAll = ['ADMIN', 'ACHETEUR'].includes(userRole);
  const isComptable = userRole === 'COMPTABLE';
  const isCommercial = userRole === 'COMMERCIAL';
  const isReadOnly =!canEditAll &&!isComptable &&!isCommercial;

  const isDisabled = (field) => {
    if (isReadOnly) return true;
    if (isComptable) return!['nif', 'stat', 'delai_paiement', 'note', 'is_active'].includes(field); // <-- Nampiana is_active
    if (isCommercial) return!['contact_nom', 'telephone', 'email', 'adresse', 'ville', 'note', 'delai_paiement'].includes(field);
    return false;
  }

  useEffect(() => {
    if (fournisseur) { setForm({...fournisseur}); }
    else { setForm({ code: '', raison_sociale: '', contact_nom: '', email: '', telephone: '', adresse: '', ville: '', nif: '', stat: '', delai_paiement: 30, note: '', is_active: true }); }
  }, [fournisseur, show]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({...prev, [name]: type === 'checkbox'? checked : value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSubmit = fournisseur? { id: fournisseur.id,...form } : form;
    onSubmit(dataToSubmit);
  };

  if (!show) return null;

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalCard} onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div style={styles.modalHeader}>
            <h2 style={styles.modalTitle}><Building2 size={18} /> {fournisseur? "Modifier Fournisseur" : "Nouveau Fournisseur"}</h2>
            <button type="button" onClick={onClose} style={styles.closeBtn}><X size={18} /></button>
          </div>

          {isComptable && <div style={styles.infoMsg}><Lock size={12}/> Accès Comptable: NIF, STAT, Délai, Note, Statut</div>} {/* <-- Nampiana Statut */}
          {isCommercial && <div style={styles.infoMsg}><Lock size={12}/> Accès Commercial: Contact, Adresse, Note, Délai</div>}

          <div style={styles.formBody}>
            <div style={styles.sectionTitle}>1. Informations Générales</div>
            <div style={styles.grid2}>
              <div><label style={styles.label}>Code *</label><div style={styles.inputWrapper}><Hash size={14} style={styles.inputIcon} /><input name="code" value={form.code || ''} onChange={handleChange} disabled={isDisabled('code')} style={{...styles.input,...(isDisabled('code')? styles.inputDisabled : {})}} required/></div></div>
              <div><label style={styles.label}>Raison Sociale *</label><div style={styles.inputWrapper}><Building2 size={14} style={styles.inputIcon} /><input name="raison_sociale" value={form.raison_sociale || ''} onChange={handleChange} disabled={isDisabled('raison_sociale')} style={{...styles.input,...(isDisabled('raison_sociale')? styles.inputDisabled : {})}} required/></div></div>
            </div>

            <div style={styles.sectionTitle}>2. Contact</div>
            <div style={styles.grid2}>
              <div><label style={styles.label}>Nom Contact</label><div style={styles.inputWrapper}><User size={14} style={styles.inputIcon} /><input name="contact_nom" value={form.contact_nom || ''} onChange={handleChange} disabled={isDisabled('contact_nom')} style={{...styles.input,...(isDisabled('contact_nom')? styles.inputDisabled : {})}}/></div></div>
              <div><label style={styles.label}>Téléphone</label><div style={styles.inputWrapper}><Phone size={14} style={styles.inputIcon} /><input name="telephone" value={form.telephone || ''} onChange={handleChange} disabled={isDisabled('telephone')} style={{...styles.input,...(isDisabled('telephone')? styles.inputDisabled : {})}}/></div></div>
            </div>
            <div><label style={styles.label}>Email</label><div style={styles.inputWrapper}><Mail size={14} style={styles.inputIcon} /><input type="email" name="email" value={form.email || ''} onChange={handleChange} disabled={isDisabled('email')} style={{...styles.input,...(isDisabled('email')? styles.inputDisabled : {})}}/></div></div>
            <div><label style={styles.label}>Adresse</label><div style={styles.inputWrapper}><MapPin size={14} style={styles.inputIconTop} /><textarea name="adresse" value={form.adresse || ''} onChange={handleChange} disabled={isDisabled('adresse')} style={{...styles.textarea,...(isDisabled('adresse')? styles.inputDisabled : {})}}/></div></div>
            <div style={styles.grid2}>
              <div><label style={styles.label}>Ville</label><input name="ville" value={form.ville || ''} onChange={handleChange} disabled={isDisabled('ville')} style={{...styles.input,...(isDisabled('ville')? styles.inputDisabled : {})}}/></div>
              <div><label style={styles.label}>Délai Paiement (Jours)</label><div style={styles.inputWrapper}><DollarSign size={14} style={styles.inputIcon} /><input type="number" name="delai_paiement" value={form.delai_paiement || 30} onChange={handleChange} disabled={isDisabled('delai_paiement')} style={{...styles.input,...(isDisabled('delai_paiement')? styles.inputDisabled : {})}}/></div></div>
            </div>

            <div style={styles.sectionTitle}>3. Informations Comptables</div>
            <div style={styles.grid2}>
              <div><label style={styles.label}>NIF</label><input name="nif" value={form.nif || ''} onChange={handleChange} disabled={isDisabled('nif')} style={{...styles.input,...(isDisabled('nif')? styles.inputDisabled : {})}}/></div>
              <div><label style={styles.label}>STAT</label><input name="stat" value={form.stat || ''} onChange={handleChange} disabled={isDisabled('stat')} style={{...styles.input,...(isDisabled('stat')? styles.inputDisabled : {})}}/></div>
            </div>

            <div><label style={styles.label}>Note Interne</label><div style={styles.inputWrapper}><FileText size={14} style={styles.inputIconTop} /><textarea name="note" value={form.note || ''} onChange={handleChange} disabled={isDisabled('note')} style={{...styles.textarea,...(isDisabled('note')? styles.inputDisabled : {})}}/></div></div>

            {/* === VAOVAO: TOGGLE ACTIF/INACTIF === */}
            {(canEditAll || isComptable) && (
              <div>
                <label style={styles.label}>Statut</label>
                <div style={styles.checkboxWrapper} onClick={() =>!isDisabled('is_active') && handleChange({target: {name: 'is_active', type: 'checkbox', checked:!form.is_active}})}>
                  {form.is_active? <ToggleRight size={20} color="#16a34a"/> : <ToggleLeft size={20} color="#94a3b8"/>}
                  <span style={{fontSize: '13px', fontWeight: 600, color: form.is_active? '#16a34a' : '#dc2626'}}>
                    {form.is_active? 'Fournisseur Actif' : 'Fournisseur Inactif'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {!isReadOnly &&
            <div style={styles.btnRow}>
              <button type="button" onClick={onClose} style={styles.btnCancel}>Annuler</button>
              <button type="submit" disabled={saving} style={{...styles.btnSave, opacity: saving? 0.6 : 1, cursor: saving? 'not-allowed' : 'pointer' }}>
                {saving? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Enregistrer
              </button>
            </div>
          }
        </form>
      </div>
    </div>
  );
}