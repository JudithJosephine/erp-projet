import { useEffect, useState } from "react";
import { X, Save, Loader2, Users } from "lucide-react";

const styles = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' },
  modal: { background: 'white', borderRadius: '12px', width: '100%', maxWidth: '700px', maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }, // Nihena ny width
  header: { padding: '12px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: '15px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#64748b' },
  body: { padding: '16px', overflowY: 'auto', flex: 1 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }, // 2 colonnes ihany
  formGroup: { display: 'flex', flexDirection: 'column', gap: '3px' },
  label: { fontSize: '11px', fontWeight: '600', color: '#475569' },
  input: { padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', outline: 'none' }, // Nihena ny padding
  inputDisabled: { background: '#f1f5f9', color: '#94a3b8', cursor: 'not-allowed' },
  textarea: { padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', outline: 'none', resize: 'vertical', minHeight: '50px' },
  footer: { padding: '10px 16px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '8px', background: '#f8fafc' },
  btnSecondary: { padding: '6px 12px', fontSize: '12px', fontWeight: '600', color: '#475569', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  btnPrimary: { padding: '6px 12px', fontSize: '12px', fontWeight: '600', color: 'white', background: '#16a34a', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  fullWidth: { gridColumn: '1 / -1' } // Mba hanenjana ny champ ho 2 colonnes
}

export default function ClientForm({ show, onClose, onSubmit, client, saving, userRole }) {
  const [form, setForm] = useState({});

  const canEditAll = ['ADMIN', 'ACHETEUR'].includes(userRole);
  const isComptable = userRole === 'COMPTABLE';
  const isCommercial = userRole === 'COMMERCIAL';
  const isMagasinier = userRole === 'MAGASINIER';

  useEffect(() => {
    if (client) setForm(client);
    else setForm({ delai_paiement: 30, plafond_credit: 0, is_active: true });
  }, [client, show]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({...prev, [name]: type === 'checkbox'? checked : value }));
  };

  const isFieldDisabled = (field) => {
    if (isMagasinier) return true;
    if (field === 'code' && client) return true;
    if (!canEditAll && ['code', 'raison_sociale'].includes(field)) return true;
    if (isCommercial) return!['contact_nom', 'telephone', 'email', 'adresse', 'ville', 'note', 'delai_paiement'].includes(field);
    if (isComptable) return!['nif', 'stat', 'delai_paiement', 'plafond_credit', 'is_active', 'note'].includes(field);
    return false;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({...form, id: client?.id });
  };

  if (!show) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}><Users size={15} /> {client? 'Modifier Client' : 'Nouveau Client'}</h2>
          <button onClick={onClose} style={styles.closeBtn}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={styles.body}>
            <div style={styles.grid}>

              {/* LIGNE 1 */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Code *</label>
                <input type="text" name="code" value={form.code || ''} onChange={handleChange} style={{...styles.input,...(isFieldDisabled('code')? styles.inputDisabled : {})}} disabled={isFieldDisabled('code')} required />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Raison Sociale *</label>
                <input type="text" name="raison_sociale" value={form.raison_sociale || ''} onChange={handleChange} style={{...styles.input,...(isFieldDisabled('raison_sociale')? styles.inputDisabled : {})}} disabled={isFieldDisabled('raison_sociale')} required />
              </div>

              {/* LIGNE 2 */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Contact</label>
                <input type="text" name="contact_nom" value={form.contact_nom || ''} onChange={handleChange} style={{...styles.input,...(isFieldDisabled('contact_nom')? styles.inputDisabled : {})}} disabled={isFieldDisabled('contact_nom')} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Téléphone</label>
                <input type="text" name="telephone" value={form.telephone || ''} onChange={handleChange} style={{...styles.input,...(isFieldDisabled('telephone')? styles.inputDisabled : {})}} disabled={isFieldDisabled('telephone')} />
              </div>

              {/* LIGNE 3 */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Email</label>
                <input type="email" name="email" value={form.email || ''} onChange={handleChange} style={{...styles.input,...(isFieldDisabled('email')? styles.inputDisabled : {})}} disabled={isFieldDisabled('email')} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Ville</label>
                <input type="text" name="ville" value={form.ville || ''} onChange={handleChange} style={{...styles.input,...(isFieldDisabled('ville')? styles.inputDisabled : {})}} disabled={isFieldDisabled('ville')} />
              </div>

              {/* LIGNE 4 - FULL WIDTH */}
              <div style={{...styles.formGroup,...styles.fullWidth}}>
                <label style={styles.label}>Adresse</label>
                <textarea name="adresse" value={form.adresse || ''} onChange={handleChange} style={{...styles.textarea,...(isFieldDisabled('adresse')? styles.inputDisabled : {})}} disabled={isFieldDisabled('adresse')} rows={2} />
              </div>

              {/* LIGNE 5 */}
              <div style={styles.formGroup}>
                <label style={styles.label}>NIF</label>
                <input type="text" name="nif" value={form.nif || ''} onChange={handleChange} style={{...styles.input,...(isFieldDisabled('nif')? styles.inputDisabled : {})}} disabled={isFieldDisabled('nif')} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>STAT</label>
                <input type="text" name="stat" value={form.stat || ''} onChange={handleChange} style={{...styles.input,...(isFieldDisabled('stat')? styles.inputDisabled : {})}} disabled={isFieldDisabled('stat')} />
              </div>

              {/* LIGNE 6 */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Délai Paiement</label>
                <input type="number" name="delai_paiement" value={form.delai_paiement || ''} onChange={handleChange} style={{...styles.input,...(isFieldDisabled('delai_paiement')? styles.inputDisabled : {})}} disabled={isFieldDisabled('delai_paiement')} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Plafond Crédit</label>
                <input type="number" step="0.01" name="plafond_credit" value={form.plafond_credit || ''} onChange={handleChange} style={{...styles.input,...(isFieldDisabled('plafond_credit')? styles.inputDisabled : {})}} disabled={isFieldDisabled('plafond_credit')} />
              </div>

              {/* LIGNE 7 - FULL WIDTH */}
              <div style={{...styles.formGroup,...styles.fullWidth}}>
                <label style={styles.label}>Note</label>
                <textarea name="note" value={form.note || ''} onChange={handleChange} style={{...styles.textarea,...(isFieldDisabled('note')? styles.inputDisabled : {})}} disabled={isFieldDisabled('note')} rows={2} />
              </div>

              {/* LIGNE 8 */}
              {(canEditAll || isComptable) && (
                <div style={{...styles.formGroup, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '6px'}}>
                  <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} id="is_active" />
                  <label htmlFor="is_active" style={styles.label}>Client Actif</label>
                </div>
              )}

            </div>
          </div>

          <div style={styles.footer}>
            <button type="button" onClick={onClose} style={styles.btnSecondary} disabled={saving}><X size={12} /> Annuler</button>
            {!isMagasinier && (
              <button type="submit" style={styles.btnPrimary} disabled={saving}>
                {saving? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                Enregistrer
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}