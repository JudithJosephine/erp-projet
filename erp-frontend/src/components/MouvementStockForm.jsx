import { useState, useEffect } from 'react';
import { X, Save, Package, FileText, Hash, Loader2, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

const styles = {
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' },
  modalCard: { width: '100%', maxWidth: '450px', background: 'white', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden' },
  modalHeader: { padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: '18px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '6px' },
  formBody: { padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' },
  label: { display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' },
  inputWrapper: { position: 'relative' },
  input: { width: '100%', padding: '10px 12px 10px 40px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
  select: { width: '100%', padding: '10px 12px 10px 40px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', appearance: 'none' },
  inputIcon: { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' },
  btnRow: { display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '16px 24px', borderTop: '1px solid #f1f5f9', background: '#f8fafc' },
  btnCancel: { padding: '10px 20px', fontSize: '14px', fontWeight: '600', color: '#475569', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer' },
  btnSave: { padding: '10px 20px', fontSize: '14px', fontWeight: '600', color: 'white', background: '#16a34a', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  btnSaveSortie: { background: '#ef4444' }
}

export default function MouvementStockForm({ show, onClose, onSubmit, produits, type, saving }) {
  const [form, setForm] = useState({
    produit: '', quantite: '', motif: '', reference: ''
  });

  const isEntree = type === 'ENTREE_MANUELLE';

  useEffect(() => {
    if(show){
      setForm({ produit: '', quantite: '', motif: '', reference: '' });
    }
  }, [show, type]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      produit: parseInt(form.produit),
      quantite: parseFloat(form.quantite),
      motif: form.motif,
      reference: form.reference
    });
  };

  if (!show) return null;

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalCard} onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div style={styles.modalHeader}>
            <h2 style={{...styles.modalTitle, color: isEntree? '#16a34a' : '#ef4444'}}>
              {isEntree? <ArrowDownCircle size={20} /> : <ArrowUpCircle size={20} />}
              {isEntree? "Entrée de Stock" : "Sortie de Stock"}
            </h2>
            <button type="button" onClick={onClose} style={styles.closeBtn}><X size={20} /></button>
          </div>

          <div style={styles.formBody}>
            <div>
              <label style={styles.label}>Produit *</label>
              <div style={styles.inputWrapper}>
                <Package size={16} style={styles.inputIcon} />
                <select name="produit" value={form.produit} onChange={handleChange} style={styles.select} required>
                  <option value="">-- Choisir un produit --</option>
                  {produits.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.code} - {p.designation} | Stock: {parseFloat(p.stock || 0).toFixed(2)} {/* <-- OVANA: p.stock fa tsy p.quantite */}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label style={styles.label}>Quantité *</label>
              <div style={styles.inputWrapper}>
                <Hash size={16} style={styles.inputIcon} />
                <input type="number" name="quantite" value={form.quantite} onChange={handleChange} style={styles.input} min="0.01" step="0.01" required />
              </div>
            </div>

            <div>
              <label style={styles.label}>Motif</label>
              <div style={styles.inputWrapper}>
                <FileText size={16} style={styles.inputIcon} />
                <input type="text" name="motif" value={form.motif} onChange={handleChange} style={styles.input} placeholder={isEntree? "Ex: Réception BC001" : "Ex: Vente Client"} />
              </div>
            </div>

            <div>
              <label style={styles.label}>Référence</label>
              <div style={styles.inputWrapper}>
                <Hash size={16} style={styles.inputIcon} />
                <input type="text" name="reference" value={form.reference} onChange={handleChange} style={styles.input} placeholder="N° BC, N° Facture..." />
              </div>
            </div>
          </div>

          <div style={styles.btnRow}>
            <button type="button" onClick={onClose} style={styles.btnCancel}>Annuler</button>
            <button type="submit" disabled={saving} style={{...styles.btnSave,...(!isEntree? styles.btnSaveSortie : {}), opacity: saving? 0.6 : 1 }}>
              {saving? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {isEntree? "Valider Entrée" : "Valider Sortie"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}