import { useEffect, useState } from "react";
import api from "../../utils/api";
import { Loader2, ChevronLeft, ChevronRight, Plus } from "lucide-react";
const styles = { card: { background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }, th:{padding:'12px 16px', textAlign:'left', fontSize:12, background:'#f8fafc'}, td:{padding:'12px 16px', borderTop:'1px solid #f1f5f9'}, pagination:{display:'flex', justifyContent:'space-between', padding:16} }

export default function RetourPage() {
  const [data, setData] = useState([]); const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1); const [pageSize] = useState(5); const [total, setTotal] = useState(0);

  useEffect(() => {
    setLoading(true);
    api.get(`/retours/?page=${page}&page_size=${pageSize}`)
.then(res => { setData(res.data.results || []); setTotal(res.data.count || 0); })
.finally(() => setLoading(false));
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (loading) return <Loader2 className="animate-spin"/>;

  return (<div>
    <div style={{display:'flex', justifyContent:'space-between', marginBottom:16}}><h2 style={{fontSize: '18px', fontWeight: '700'}}>Retour Fournisseur</h2><button style={{padding:'10px 16px', background:'#16a34a', color:'white', border:'none', borderRadius:8}}><Plus size={16}/> Nouveau Retour</button></div>
    <div style={styles.card}>
      <table style={{width:'100%'}}><thead><tr><th style={styles.th}>N° RT</th><th style={styles.th}>BC LIÉ</th><th style={styles.th}>DATE RETOUR</th><th style={styles.th}>MOTIF</th></tr></thead>
      <tbody>{data.map(d=><tr key={d.id}><td style={styles.td}>{d.numero}</td><td style={styles.td}>{d.achat}</td><td style={styles.td}>{new Date(d.date_retour).toLocaleDateString('fr-FR')}</td><td style={styles.td}>{d.motif}</td></tr>)}</tbody></table>
      <div style={styles.pagination}>
        <span>Affichage de {(page-1)*pageSize+1} à {Math.min(page*pageSize, total)} sur {total}</span>
        <div style={{display:'flex', gap:8}}><button onClick={()=>setPage(p=>p-1)} disabled={page===1}>Précédent</button><span>Page {page} / {totalPages}</span><button onClick={()=>setPage(p=>p+1)} disabled={page===totalPages}>Suivant</button></div>
      </div>
    </div>
  </div>)
}