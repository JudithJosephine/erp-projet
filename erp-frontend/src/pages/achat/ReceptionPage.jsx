import { useEffect, useState } from "react";
import api from "../../utils/api";
import { Truck, Loader2, Calendar, ChevronLeft, ChevronRight, X, Save } from "lucide-react";
import { toast, Toaster } from "sonner";

const getUserRole = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return (user.role || 'ACHETEUR').toUpperCase();
  } catch { return 'ACHETEUR' }
}

const STATUS_CONFIG = {
  BROUILLON: { label: 'Brouillon', bg: '#fef9c3', text: '#854d0e' },
  EN_ATTENTE: { label: 'En attente', bg: '#dcfce7', text: '#166534' },
  PRET: { label: 'Prêt', bg: '#fef9c3', text: '#854d0e' },
  EN_COURS_LIVRAISON: { label: 'En cours livraison', bg: '#cffafe', text: '#155e75' },
  PARTIELLEMENT_RECUE: { label: 'Reçu partiel', bg: '#dbeafe', text: '#1e40af' },
  RECUE: { label: 'Livré', bg: '#d1fae5', text: '#065f46' },
  ANNULER: { label: 'Annulé', bg: '#fee2e2', text: '#991b1b' },
}

const styles = {
  card: { background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' },
  th:{padding:'12px 16px', textAlign:'left', fontSize:12, background:'#f8fafc', fontWeight:600, textTransform:'uppercase', color:'#475569'},
  td:{padding:'12px 16px', borderTop:'1px solid #f1f5f9', fontSize:14, color:'#334155'},
  badge: (statut) => ({ display: 'inline-flex', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background: STATUS_CONFIG[statut]?.bg || '#f1f5f9', color: STATUS_CONFIG[statut]?.text || '#475569' }),
  btnPrimary: { padding: '8px 12px', background: '#16a34a', color: 'white', border: 'none', borderRadius: 8, display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontWeight:600 },
  btnDanger: { padding: '8px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, cursor:'pointer', display:'flex', alignItems:'center', gap:6 },
  modal: { position: 'fixed', top:0, left:0, right:0, bottom:0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { background: 'white', borderRadius: 12, padding: 24, width: '90%', maxWidth: 700, maxHeight: '90vh', overflowY: 'auto' },
  input: { padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6, width:'100%' },
}

export default function ReceptionPage() {
  const userRole = getUserRole();
  const isMagasinier = userRole === 'MAGASINIER';

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [bcSelectionne, setBcSelectionne] = useState(null);
  const [lignesReception, setLignesReception] = useState([]);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 5;
  const totalPages = Math.ceil(total / pageSize);

  const fetchData = async () => {
    setLoading(true);
    try {
      // ✅ ALAINA DAHOLO NY BC, TSY SIVANA AMIN'NY STATUT ANY AMIN'NY BACKEND
      const res = await api.get(`/achat/?page=${page}&page_size=${pageSize}`);
      const all = res.data.results || [];
      // ✅ ASEHO DAHOLO AFA-TSY BROUILLON SY ANNULER
      // EN_ATTENTE, PRET, EN_COURS, PARTIELLEMENT, RECUE = mivoaka aby
      const filtres = all.filter(bc => !['BROUILLON', 'ANNULER'].includes(bc.statut));
      setData(filtres);
      setTotal(res.data.count || filtres.length);
    }
    catch(err) { console.error(err); toast.error("Erreur chargement BC") }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchData(); }, [page]);

  const ouvrirModal = async (bc) => {
    if (!isMagasinier) return toast.error("Réservé au Magasinier");
    setBcSelectionne(bc); setLoading(true);
    try {
      const res = await api.get(`/achat/${bc.id}/`);
      const lignes = res.data.lignes || [];
      setLignesReception(lignes.map(l => ({
        ligne_id: l.id, produit_id: l.produit, produit: l.produit_detail?.designation,
        quantite_commandee: Number(l.quantite), quantite_recue: ""
      })));
      setShowModal(true);
    } catch(err) { toast.error("Erreur chargement lignes"); }
    finally { setLoading(false); }
  }

  const handleQtyChange = (ligne_id, value) => {
    setLignesReception(prev => prev.map(l => l.ligne_id === ligne_id? {...l, quantite_recue: value} : l));
  }

  const handleValiderReception = async () => {
    if (!isMagasinier) return toast.error("Réservé au Magasinier");
    if (!bcSelectionne) return;
    const lignesAvecQte = lignesReception.filter(l => Number(l.quantite_recue) > 0);
    if(lignesAvecQte.length === 0){ return toast.warning("Tsy maintsy misy zavatra voaray fara-fahakeliny 1"); }
    const lignesInvalides = lignesAvecQte.filter(l => Number(l.quantite_recue) > Number(l.quantite_commandee));
    if(lignesInvalides.length > 0){ return toast.error(`Qté trop grande pour: ${lignesInvalides.map(l => l.produit).join(', ')}`); }

    setSaving(true);
    try {
      const payload = {
        achat: bcSelectionne.id,
        date_reception: new Date().toISOString().split('T')[0],
        lignes: lignesAvecQte.map(l => ({
          produit: l.produit_id, quantite_commandee: Number(l.quantite_commandee),
          quantite_recue: Number(l.quantite_recue), quantite_refusee: 0, motif_refus: ''
        }))
      };
      await api.post('/receptions/', payload);
      toast.success("Réception validée avec succès");
      setShowModal(false); fetchData();
    } catch(err) { toast.error("Erreur: " + JSON.stringify(err.response?.data)); }
    finally { setSaving(false); }
  }

  const peutReceptionner = (statut) => {
    return ['PRET', 'EN_COURS_LIVRAISON', 'PARTIELLEMENT_RECUE'].includes(statut);
  }

  if(loading && data.length === 0) return <div style={{padding:40, textAlign:'center'}}><Loader2 className="animate-spin"/></div>

  return (
    <div>
      <Toaster richColors position="top-right"/>
      <h2 style={{fontSize:22, fontWeight:700, marginBottom:20}}>Réception Marchandise - {userRole}</h2>
      {!isMagasinier && (
        <div style={{padding:12, background:'#eff6ff', color:'#1e40af', borderRadius:8, marginBottom:16, fontSize:13}}>
          Mode lecture seule - Seul le MAGASINIER peut réceptionner. Vous pouvez consulter.
        </div>
      )}
      <div style={styles.card}>
        <table style={{width:'100%', borderCollapse:'collapse'}}>
          <thead><tr><th style={styles.th}>N° BC</th><th style={styles.th}>FOURNISSEUR</th><th style={styles.th}>DATE COMMANDE</th><th style={{...styles.th, textAlign:'right'}}>MONTANT</th><th style={styles.th}>STATUT</th><th style={{...styles.th, textAlign:'center'}}>ACTION</th></tr></thead>
          <tbody>
            {data.length === 0? (<tr><td colSpan="6" style={{textAlign:'center', padding:40, color:'#94a3b8'}}>Aucun Bon de Commande à réceptionner</td></tr>) :
            data.map(bc => (
              <tr key={bc.id}>
                <td style={{...styles.td, fontWeight:600}}>{bc.numero}</td>
                <td style={styles.td}>{bc.fournisseur_detail?.raison_sociale || 'N/A'}</td>
                <td style={styles.td}><Calendar size={14} style={{display:'inline', marginRight:4}}/>{new Date(bc.date_achat).toLocaleDateString('fr-FR')}</td>
                <td style={{...styles.td, textAlign:'right', fontWeight:600}}>{Number(bc.total_ht || 0).toLocaleString('fr-FR')} Ar</td>
                <td style={styles.td}><span style={styles.badge(bc.statut)}>{STATUS_CONFIG[bc.statut]?.label || bc.statut}</span></td>
                <td style={{...styles.td, textAlign:'center'}}>
                  {/* ✅ MAGASINIER IHANY NO MAHITA BOUTON */}
                  {isMagasinier && peutReceptionner(bc.statut) ? (
                    <button style={styles.btnPrimary} onClick={() => ouvrirModal(bc)}>
                      <Truck size={16}/>{['PARTIELLEMENT_RECUE'].includes(bc.statut)? 'Compléter' : 'Réceptionner'}
                    </button>
                  ) : (
                    <span style={{fontSize:12, color:'#94a3b8'}}>--</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {total > pageSize && (<div style={{display:'flex', justifyContent:'space-between', padding:16, borderTop:'1px solid #e2e8f0'}}><span style={{fontSize:13, color:'#64748b'}}>Page {page} / {totalPages} - {total} résultats</span><div style={{display:'flex', gap:8}}><button disabled={page===1} onClick={()=>setPage(p=>p-1)} style={{...styles.btnDanger, opacity: page===1? 0.5:1}}><ChevronLeft size={16}/> Précédent</button><button disabled={page===totalPages} onClick={()=>setPage(p=>p+1)} style={{...styles.btnPrimary, opacity: page===totalPages? 0.5:1}}>Suivant <ChevronRight size={16}/></button></div></div>)}
      </div>

      {showModal && isMagasinier && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:16}}>
              <h3>Réception: {bcSelectionne?.numero}</h3>
              <button onClick={()=>setShowModal(false)} style={{border:'none', background:'none', cursor:'pointer'}}><X/></button>
            </div>
            <p style={{color:'#64748b', marginBottom:16}}>Saisissez la quantité réellement reçue</p>
            <table style={{width:'100%'}}>
              <thead><tr><th style={styles.th}>PRODUIT</th><th style={styles.th}>QTÉ COMMANDÉE</th><th style={styles.th}>QTÉ À RÉCEPTIONNER</th></tr></thead>
              <tbody>
                {lignesReception.map(l => (
                  <tr key={l.ligne_id}>
                    <td style={styles.td}>{l.produit}</td>
                    <td style={styles.td}>{Number(l.quantite_commandee).toFixed(2)}</td>
                    <td style={styles.td}>
                      <input type="number" style={styles.input} value={l.quantite_recue} onChange={e => handleQtyChange(l.ligne_id, e.target.value)} min="0" max={l.quantite_commandee} step="0.01" placeholder="0.00"/>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={handleValiderReception} disabled={saving} style={{...styles.btnPrimary, width:'100%', marginTop:20, justifyContent:'center'}}>
              {saving? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} Valider la réception
            </button>
          </div>
        </div>
      )}
    </div>
  );
}