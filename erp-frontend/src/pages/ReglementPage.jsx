import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast, Toaster } from "sonner";
import { Banknote, Plus, CheckCircle, Users, Truck, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";

const API_URL = "http://localhost:8000/api";
axios.interceptors.request.use(config => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const styles = {
  container: { padding: '24px', background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  title: { fontSize: '28px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '12px' },
  card: { background: 'white', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '24px', marginBottom: '24px', border: '1px solid #e2e8f0' },
  btnPrimary: { padding: '10px 20px', background: 'linear-gradient(90deg, #2563eb 0%, #4f46e5 100%)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' },
  btnSecondary: { padding: '8px 16px', background: 'white', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' },
  btnDisabled: { padding: '8px 16px', background: '#f1f5f9', color: '#94a3b8', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'not-allowed', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' },
  input: { width: '100%', padding: '10px', border: '2px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#475569', background: '#f8fafc', textTransform: 'uppercase' },
  td: { padding: '12px', fontSize: '14px', borderBottom: '1px solid #f1f5f9' },
  badgePayee: { background: '#d1fae5', color: '#059669', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' },
  badgePartiel: { background: '#fef3c7', color: '#d97706', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' },
  badgeImpayee: { background: '#fee2e2', color: '#dc2626', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' },
  tabActive: { padding: '10px 20px', borderRadius: '10px', border: '2px solid #2563eb', background: '#dbeafe', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' },
  tab: { padding: '10px 20px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' },
  pagination: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }
};

const formatAr = (val) => (parseFloat(val) || 0).toLocaleString('fr-FR')

export default function ReglementPage() {
  const [factures, setFactures] = useState([]);
  const [selectedFacture, setSelectedFacture] = useState(null);
  const [montant, setMontant] = useState('');
  const [mode, setMode] = useState('ESPECES');
  const [tab, setTab] = useState('CLIENT');
  const [statutFilter, setStatutFilter] = useState('IMPAYEE');

  // PAGINATION: 5 lignes par page
  const [page, setPage] = useState(1);
  const [pageSize] = useState(5); // <-- OVAIKO HO 5
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const user = JSON.parse(localStorage.getItem("user") || '{}');
  const canSeeClient = ['ADMIN', 'MAGASINIER', 'COMMERCIAL', 'COMPTABLE'].includes(user.role);
  const canSeeFournisseur = ['ADMIN', 'MAGASINIER', 'ACHETEUR', 'COMPTABLE'].includes(user.role);

  useEffect(() => {
    setPage(1); // Rehefa ovaina ny tab na filter dia miverina pejy 1
  }, [tab, statutFilter]);

  useEffect(() => {
    if((tab === 'CLIENT' && canSeeClient) || (tab === 'FOURNISSEUR' && canSeeFournisseur)) {
      fetchFactures();
    } else {
      setFactures([])
    }
  }, [tab, statutFilter, page]);

  const fetchFactures = async () => {
    setLoading(true);
    let url = '';
    if(tab === 'CLIENT') {
      const baseUrl = `${API_URL}/facture-client/`;
      const params = new URLSearchParams({
        page: page,
        page_size: pageSize, // <-- 5
      });
      if (statutFilter!== 'ALL') params.append('statut', statutFilter);
      url = `${baseUrl}?${params.toString()}`;
    } else {
      // FOURNISSEUR
      const baseUrl = `${API_URL}/factures/`;
      const params = new URLSearchParams({
        page: page,
        page_size: pageSize, // <-- 5
      });
      if (statutFilter!== 'ALL') params.append('statut', statutFilter);
      url = `${baseUrl}?${params.toString()}`;
    }

    try {
      const res = await axios.get(url);
      const data = res.data.results || res.data;
      const count = res.data.count || data.length;

      const dataWithSolde = data.map(f => ({
      ...f,
        solde: tab === 'CLIENT'?
          parseFloat(f.total_ttc) - parseFloat(f.montant_paye) :
          parseFloat(f.montant_ttc) - parseFloat(f.montant_regle), // ho an'ny fournisseur
        tiers_nom: tab === 'CLIENT'? f.client?.nom : f.fournisseur_nom,
        date: tab === 'CLIENT'? f.date_facture : f.date_facture,
        montant_ttc: tab === 'CLIENT'? f.total_ttc : f.montant_ttc
      }));
      setFactures(dataWithSolde);
      setTotalCount(count);
      setTotalPages(Math.ceil(count / pageSize));
    } catch {
      toast.error("Erreur chargement factures")
    } finally {
      setLoading(false);
    }
  };

  const handlePayer = async () => {
    if (!selectedFacture ||!montant) return toast.error("Renseignez le montant");
    if (parseFloat(montant) > parseFloat(selectedFacture.solde)) return toast.error("Montant supérieur au solde");

    try {
      const endpoint = tab === 'CLIENT'? 'reglements-client' : 'reglements-fournisseur';
      const payload = {
        facture: selectedFacture.id,
        montant: parseFloat(montant),
        mode: mode,
        date_reglement: new Date().toISOString().split('T')[0]
      }

      await axios.post(`${API_URL}/${endpoint}/`, payload);
      toast.success("Règlement enregistré");
      setMontant(''); setSelectedFacture(null);
      fetchFactures();
    } catch (error) {
      toast.error(error.response?.data?.montant?.[0] || "Erreur lors du paiement");
    }
  };

  const getBadge = (statut) => {
    if (statut === 'PAYEE') return styles.badgePayee;
    if (statut === 'PARTIEL') return styles.badgePartiel;
    return styles.badgeImpayee;
  }

  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalCount);

  return (
    <div style={styles.container}>
      <Toaster position="top-right" richColors />
      <div style={styles.header}>
        <h1 style={styles.title}><Banknote size={28} color="#2563eb"/> Gestion Règlements</h1>
      </div>

      <div style={{display: 'flex', gap: '12px', marginBottom: '20px'}}>
        {canSeeClient && (
          <button onClick={() => setTab('CLIENT')} style={tab === 'CLIENT'? styles.tabActive : styles.tab}>
            <Users size={16}/> Règlement Client
          </button>
        )}
        {canSeeFournisseur && (
          <button onClick={() => setTab('FOURNISSEUR')} style={tab === 'FOURNISSEUR'? styles.tabActive : styles.tab}>
            <Truck size={16}/> Règlement Fournisseur
          </button>
        )}
      </div>

      <div style={styles.card}>
        <div style={{display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap'}}>
          {['IMPAYEE', 'PARTIEL', 'PAYEE', 'ALL'].map(s => (
            <button key={s} onClick={() => setStatutFilter(s)} style={{padding: '8px 16px', borderRadius: '8px', border: statutFilter===s? '2px solid #2563eb' : '1px solid #e2e8f0', background: statutFilter===s? '#dbeafe' : 'white', fontWeight: '600'}}>{s}</button>
          ))}
        </div>

        {loading? <p>Chargement...</p> : (
          <>
            <table style={styles.table}>
              <thead><tr><th style={styles.th}>N°</th><th style={styles.th}>{tab === 'CLIENT'? 'CLIENT' : 'FOURNISSEUR'}</th><th style={styles.th}>DATE</th><th style={styles.th}>MONTANT TTC</th><th style={styles.th}>SOLDE</th><th style={styles.th}>STATUT</th><th style={styles.th}>ACTION</th></tr></thead>
              <tbody>
                {factures.length === 0 && <tr><td colSpan="7" style={{textAlign: 'center', padding: '20px', color: '#64748b'}}><AlertCircle size={16} style={{display: 'inline', marginRight: '8px'}}/>Aucune facture</td></tr>}
                {factures.map(f => {
                  const solde = parseFloat(f.solde) || 0;
                  return(
                  <tr key={f.id}>
                    <td style={styles.td}><b>{f.numero || f.numero_facture || 'N/A'}</b></td>
                    <td style={styles.td}>{f.tiers_nom || 'N/A'}</td>
                    <td style={styles.td}>{f.date || 'N/A'}</td>
                    <td style={styles.td}>{formatAr(f.montant_ttc)} Ar</td>
                    <td style={{...styles.td, color: solde > 0? 'red' : 'green', fontWeight: '700'}}>{formatAr(solde)} Ar</td>
                    <td style={styles.td}><span style={getBadge(f.statut)}>{f.statut}</span></td>
                    <td style={styles.td}>{solde > 0 && <button onClick={() => setSelectedFacture(f)} style={styles.btnPrimary}><Plus size={14}/> Payer</button>}</td>
                  </tr>
                )})}
              </tbody>
            </table>

            {/* PAGINATION 5 LIGNES */}
            {totalPages > 1 && (
              <div style={styles.pagination}>
                <span style={{fontSize: '14px', color: '#64748b'}}>Affichage de {startItem} à {endItem} sur {totalCount}</span>
                <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    style={page === 1? styles.btnDisabled : styles.btnSecondary}
                  >
                    <ChevronLeft size={16}/> Précédent
                  </button>
                  <span style={{fontWeight: '600'}}>Page {page} / {totalPages}</span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    style={page === totalPages? styles.btnDisabled : styles.btnSecondary}
                  >
                    Suivant <ChevronRight size={16}/>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {selectedFacture && (
        <div style={styles.card}>
          <h3 style={{marginBottom: '16px'}}>Payer Facture: {selectedFacture.numero || selectedFacture.numero_facture} - Solde: {formatAr(selectedFacture.solde)} Ar</h3>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '12px'}}>
            <input type="number" placeholder="Montant" value={montant} onChange={e => setMontant(e.target.value)} style={styles.input} max={selectedFacture.solde}/>
            <select value={mode} onChange={e => setMode(e.target.value)} style={styles.input}>
              <option value="ESPECES">Espèces</option><option value="CHEQUE">Chèque</option><option value="VIREMENT">Virement</option><option value="MOBILE_MONEY">Mobile Money</option>
            </select>
            <button onClick={handlePayer} style={styles.btnPrimary}><CheckCircle size={16}/> Valider</button>
          </div>
          <button onClick={() => setSelectedFacture(null)} style={{marginTop: '12px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer'}}>Annuler</button>
        </div>
      )}
    </div>
  );
}