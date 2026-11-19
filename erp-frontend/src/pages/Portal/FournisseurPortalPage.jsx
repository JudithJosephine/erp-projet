import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../utils/api";
import { Loader2, Save, CheckCircle } from "lucide-react";

const styles = {
  page: { padding: 24, maxWidth: 1200, margin: "0 auto" },
  card: { background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: 24 },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 8 },
  subtitle: { color: "#64748b", marginBottom: 20 },
  table: { width: "100%", borderCollapse: "collapse", marginBottom: 20 },
  th: { padding: "12px", textAlign: "left", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontSize: 12, fontWeight: 600 },
  td: { padding: "12px", borderBottom: "1px solid #f1f5f9" },
  input: { padding: "8px", border: "1px solid #cbd5e1", borderRadius: 6, width: "100%" },
  btnPrimary: { padding: "10px 16px", background: "#16a34a", color: "white", border: "none", borderRadius: 8, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontWeight: 600 },
  alert: { padding: 12, background: "#dcfce7", color: "#166534", borderRadius: 8, marginBottom: 16 }
};

export default function FournisseurPortalPage() {
  const { id } = useParams();
  const [dp, setDp] = useState(null);
  const [lignes, setLignes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchDP = async () => {
      try {
        const res = await api.get(`/fournisseur/portail/demandes-prix/`);
        const found = res.data.results.find(d => d.id === Number(id));
        if (found) {
          setDp(found);
          setLignes(found.lignes || []);
        } else {
          alert("Demande de Prix introuvable ou tsy anao ity");
        }
      } catch (e) { console.error(e); alert("Erreur chargement"); }
      finally { setLoading(false); }
    };
    fetchDP();
  }, [id]);

  const handleUpdate = (ligneId, field, value) => {
    setLignes(prev => prev.map(l => l.id === ligneId? {...l, [field]: value === ""? "" : Number(value) } : l));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const ligne of lignes) {
        await api.patch(`/fournisseur/portail/lignes-demande-prix/${ligne.id}/`, {
          prix_propose: ligne.prix_propose === ""? null : ligne.prix_propose,
          delai_livraison_jours: ligne.delai_livraison_jours === ""? null : ligne.delai_livraison_jours
        });
      }
      setSaved(true);
      alert("Votre réponse a été enregistrée");
    } catch (e) { alert("Erreur lors de l'enregistrement"); }
    finally { setSaving(false); }
  };

  if (loading) return <div style={styles.page}><Loader2 className="animate-spin" /></div>;
  if (!dp) return <div style={styles.page}>DP introuvable</div>;

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>Répondre à la Demande de Prix</h2>
        <p style={styles.subtitle}><strong>{dp.numero}</strong> - {dp.objet}</p>

        {saved && <div style={styles.alert}><CheckCircle size={16} /> Réponse enregistrée</div>}

        <table style={styles.table}>
          <thead><tr><th style={styles.th}>Produit</th><th style={styles.th}>Votre Prix</th><th style={styles.th}>Délai Livraison Jours</th></tr></thead>
          <tbody>
            {lignes.map(l => (
              <tr key={l.id}>
                <td style={styles.td}>{l.produit_nom}</td>
                <td style={styles.td}><input style={styles.input} type="number" step="0.01" value={l.prix_propose?? ""} onChange={e => handleUpdate(l.id, 'prix_propose', e.target.value)} /></td>
                <td style={styles.td}><input style={styles.input} type="number" value={l.delai_livraison_jours?? ""} onChange={e => handleUpdate(l.id, 'delai_livraison_jours', e.target.value)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <button style={styles.btnPrimary} onClick={handleSave} disabled={saving}>
          {saving? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Enregistrer ma réponse
        </button>
      </div>
    </div>
  );
}