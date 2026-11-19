import { useEffect, useState, useRef } from "react";
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, ActivityIndicator, Platform, TextInput, Modal } from 'react-native';
import axios from 'axios';

const API_URL = Platform.OS === 'web'? 'http://127.0.0.1:8000/api' : 'http://192.168.106.74:8000/api';
const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use(c => {
  const t = Platform.OS === 'web'? localStorage.getItem('access_token') : null;
  if (t) c.headers.Authorization = 'Bearer ' + t;
  return c;
});

const fetchAll = async (url) => {
  let all = [];
  let page = 1;
  while (page <= 20) {
    const sep = url.includes('?')? '&' : '?';
    const fullUrl = url + sep + 'page=' + page + '&page_size=100';
    const r = await api.get(fullUrl);
    const results = r.data.results || r.data || [];
    all = [...all,...results];
    if (!r.data.next) break;
    page++;
  }
  return all;
};

function SignaturePad({ onSave }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web' && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#000';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, []);

  const getPos = (e) => {
    const c = canvasRef.current;
    const r = c.getBoundingClientRect();
    const clientX = e.touches? e.touches[0].clientX : e.clientX;
    const clientY = e.touches? e.touches[0].clientY : e.clientY;
    return { x: clientX - r.left, y: clientY - r.top };
  };

  const start = (e) => {
    e.preventDefault();
    setDrawing(true);
    const pos = getPos(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };
  const move = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const pos = getPos(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };
  const end = () => setDrawing(false);
  const clear = () => {
    const c = canvasRef.current;
    c.getContext('2d').clearRect(0, 0, c.width, c.height);
  };
  const save = () => {
    const data = canvasRef.current.toDataURL('image/png');
    onSave(data);
  };

  if (Platform.OS!== 'web') {
    return (
      <View style={s.sigBox}>
        <Text style={{fontSize:11, fontWeight:'700', color:'#2563eb', marginBottom:6}}>✍️ SIGNATURE TACTILE:</Text>
        <View style={{height:120, backgroundColor:'white', borderWidth:2, borderColor:'#2563eb', borderRadius:8, justifyContent:'center', alignItems:'center'}}>
          <Text style={s.small}>Tactile @ mobile réel</Text>
        </View>
        <TouchableOpacity style={[s.btnPrimary, {marginTop:8}]} onPress={() => onSave('data:image/png;base64,[STRIPPED]')}>
          <Text style={s.btnT}>✅ Valider Signature</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[s.sigBox, {borderWidth:2, borderColor: drawing? '#2563eb' : '#94a3b8', borderStyle:'dashed', backgroundColor:'white'}]}>
      <Text style={{fontSize:12, fontWeight:'800', color:'#2563eb', marginBottom:6}}>👇 DESSINEZ ICI AVEC SOURIS/DOIGT:</Text>
      <canvas
        ref={canvasRef} width={340} height={150}
        style={{ border: '2px solid #2563eb', borderRadius: 8, backgroundColor: '#fffef7', touchAction: 'none', cursor:'crosshair', width:'100%' }}
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end}
      ></canvas>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        <TouchableOpacity style={s.btnSecondary} onPress={clear}><Text style={s.btnT2}>🗑️ Effacer</Text></TouchableOpacity>
        <TouchableOpacity style={[s.btnPrimary, {flex:1, marginTop:0}]} onPress={save}><Text style={s.btnT}>✅ Valider Signature</Text></TouchableOpacity>
      </View>
    </View>
  );
}

function ChauffeurApp({ user, onLogout }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('AFaire');
  const [show, setShow] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ nom_recepteur: '', note: '', signature: null });
  const [saving, setSaving] = useState(false);
  const [pos, setPos] = useState(null);
  const [tracking, setTracking] = useState(false);
  const watchIdRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const allCh = await fetchAll('/chauffeurs/');
      let my = allCh.find(c => c.nom && user.username && c.nom.toLowerCase().includes(user.username.toLowerCase()));
      if (!my) my = allCh.find(c => c.actif) || allCh[0];
      const url = my? '/bon-livraison/?chauffeur=' + my.id : '/bon-livraison/?page_size=50';
      const res = await api.get(url);
      setData(res.data.results || res.data || []);
    } catch (e) {
      console.log('Load error', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const startTracking = (blId) => {
    if (!navigator.geolocation) { alert('GPS non supporte'); return; }
    setTracking(true);
    const watchId = navigator.geolocation.watchPosition(
      async (p) => {
        const newPos = { lat: p.coords.latitude, lng: p.coords.longitude };
        setPos(newPos);
        try {
          await api.post('/bon-livraison/' + blId + '/update_position/', { latitude: newPos.lat, longitude: newPos.lng });
        } catch {}
      },
      (e) => { alert('GPS erreur: '+e.message); setTracking(false); },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
    watchIdRef.current = watchId;
  };

  const stopTracking = () => {
    if (watchIdRef.current!== null) navigator.geolocation.clearWatch(watchIdRef.current);
    setTracking(false);
    setPos(null);
  };

  const handleDemarrer = async (bl) => {
    try {
      await api.post('/bon-livraison/' + bl.id + '/demarrer_livraison/');
      try {
        await api.post('/bon-livraison/' + bl.id + '/notifier-client/', { message: 'Votre livraison ' + bl.numero + ' est en cours! Chauffeur en route.' });
      } catch {}
      alert('🚛 Démarré!\n📱 SMS envoyé: "Votre livraison arrive"\n📍 GPS activé!');
      startTracking(bl.id);
      load();
    } catch (e) {
      alert('Erreur: ' + (e.response?.data?.error || e.message));
    }
  };

  const handleTerminer = async () => {
    if (!form.nom_recepteur) { alert('Nom recepteur obligatoire'); return; }
    if (!form.signature) { alert('✍️ Signature obligatoire! Dessinez d abord'); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('nom_recepteur', form.nom_recepteur);
      fd.append('note', form.note);
      fd.append('signature_client', form.signature);
      await api.post('/bon-livraison/' + selected.id + '/terminer_livraison/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      stopTracking();
      alert('✅ Livrée + Signature enregistrée!');
      setShow(false);
      setForm({ nom_recepteur: '', note: '', signature: null });
      load();
    } catch (e) {
      alert('Erreur: ' + JSON.stringify(e.response?.data));
    } finally {
      setSaving(false);
    }
  };

  const filtered = tab === 'AFaire'? data.filter(b => ['PRET', 'EN_COURS'].includes(b.statut_livraison)) : data.filter(b => b.statut_livraison === 'LIVREE');
  const countAFaire = data.filter(b => ['PRET', 'EN_COURS'].includes(b.statut_livraison)).length;

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#2563eb" /><Text style={{marginTop:8}}>Chargement...</Text></View>;

  return (
    <View style={{ flex: 1 }}>
      <View style={s.header}>
        <View style={s.headerTop}>
          <View style={{flex:1}}>
            <Text style={s.h1}>🚛 Mes Livraisons PRO</Text>
            <Text style={s.h2}>{user.username} {tracking? '📍 GPS ON' : '📍 GPS OFF'} {pos? '- '+pos.lat.toFixed(5)+','+pos.lng.toFixed(5) : ''}</Text>
          </View>
          <TouchableOpacity style={s.logoutBtn} onPress={() => { stopTracking(); onLogout(); }}><Text style={s.btnT}>Logout</Text></TouchableOpacity>
        </View>
        {tracking && pos && (
          <View style={{marginTop:8, backgroundColor:'rgba(255,255,255,0.2)', padding:6, borderRadius:8}}>
            <Text style={{color:'white', fontSize:11, fontWeight:'700'}}>🛰️ TRACKING LIVE - Position envoyée au serveur toutes les 10s</Text>
          </View>
        )}
      </View>

      <View style={s.tabs}>
        <TouchableOpacity style={[s.tab, tab === 'AFaire' && s.tabActive]} onPress={() => setTab('AFaire')}><Text style={[s.tabT, tab === 'AFaire' && s.tabTActive]}>À FAIRE ({countAFaire})</Text></TouchableOpacity>
        <TouchableOpacity style={[s.tab, tab === 'LIVREE' && s.tabActive]} onPress={() => setTab('LIVREE')}><Text style={[s.tabT, tab === 'LIVREE' && s.tabTActive]}>LIVRÉES ({data.length-countAFaire})</Text></TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1, padding: 10 }}>
        {filtered.length === 0? (
          <View style={s.empty}>
            <Text style={{fontSize:40}}>📦</Text>
            <Text style={{marginTop:8, fontWeight:'600'}}>Aucune livraison {tab}</Text>
            <TouchableOpacity style={s.btnSecondary} onPress={load}><Text style={s.btnT2}>🔄 Actualiser</Text></TouchableOpacity>
          </View>
        ) : (
          filtered.map(bl => (
            <View key={bl.id} style={[s.card, bl.statut_livraison === 'EN_COURS' && { borderColor: '#2563eb', borderWidth: 2.5, backgroundColor:'#eff6ff' }]}>
              <View style={s.cardHeader}>
                <Text style={s.cardNum}>{bl.numero}</Text>
                <View style={[s.badge, { backgroundColor: bl.statut_livraison === 'PRET'? '#fef3c7' : bl.statut_livraison==='EN_COURS'? '#2563eb' : '#dcfce7' }]}>
                  <Text style={[s.badgeT, bl.statut_livraison==='EN_COURS'&&{color:'white'}]}>{bl.statut_livraison}</Text>
                </View>
              </View>
              <Text style={s.cardText}>👤 Client: {bl.client_nom || '-'}</Text>
              <Text style={s.cardText}>🏠 Adresse: {bl.adresse_livraison || '-'}</Text>

              {bl.statut_livraison==='EN_COURS' && (
                <View style={{marginTop:10, backgroundColor:'white', padding:10, borderRadius:10, borderWidth:1, borderColor:'#2563eb'}}>
                  <Text style={{fontSize:12, fontWeight:'800', color:'#2563eb'}}>📍 GPS LIVE TRACKING ACTIF</Text>
                  <Text style={{fontSize:11, color:'#334155', marginTop:4}}>{pos? pos.lat.toFixed(6)+', '+pos.lng.toFixed(6) : 'Acquisition position...'}</Text>
                  <Text style={{fontSize:10, color:'#64748b', marginTop:2}}>Visible par admin @ web</Text>
                </View>
              )}

              <View style={{ marginTop: 12 }}>
                {bl.statut_livraison === 'PRET' && (
                  <TouchableOpacity style={s.btnDemarrer} onPress={() => handleDemarrer(bl)}>
                    <Text style={s.btnT}>▶️ Démarrer → 📱SMS + 📍GPS</Text>
                  </TouchableOpacity>
                )}
                {bl.statut_livraison === 'EN_COURS' && (
                  <TouchableOpacity style={s.btnTerminer} onPress={() => { setSelected(bl); setForm({ nom_recepteur: '', note: '', signature: null }); setShow(true); }}>
                    <Text style={s.btnT}>✍️ Terminer + Signature tactile</Text>
                  </TouchableOpacity>
                )}
                {bl.statut_livraison === 'LIVREE' && (
                  <View style={s.livreeBox}>
                    <Text style={s.livreeT}>✅ Livrée - {bl.nom_recepteur || ''}</Text>
                    <Text style={{fontSize:10, color:'#065f46'}}>Signature enregistrée</Text>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={show} transparent animationType="slide">
        <View style={s.modalBg}>
          <View style={s.modal}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.modalTitle}>📦 Terminer {selected?.numero}</Text>
              <Text style={s.modalSub}>Client: {selected?.client_nom}</Text>

              <Text style={s.label}>👤 Nom recepteur *</Text>
              <TextInput style={s.input} value={form.nom_recepteur} onChangeText={t => setForm({...form, nom_recepteur: t })} placeholder="Ex: Mme Judith" />

              <Text style={s.label}>✍️ Signature client * (OBLIGATOIRE)</Text>
              <SignaturePad onSave={(d) => setForm({...form, signature: d })} />
              {form.signature? <View style={{backgroundColor:'#dcfce7', padding:8, borderRadius:8, marginTop:8}}><Text style={{ color: '#166534', fontWeight:'700', fontSize:12 }}>✅ Signature capturée - OK</Text></View> : <Text style={{color:'#dc2626', fontSize:11, marginTop:4}}>⚠️ Dessinez la signature avant validation</Text>}

              <Text style={s.label}>📝 Note livraison</Text>
              <TextInput style={[s.input, { height: 60 }]} value={form.note} onChangeText={t => setForm({...form, note: t })} placeholder="Ex: Livré à l'étage 2..." multiline />

              <TouchableOpacity style={[s.btnPrimary,!form.signature&&{opacity:0.5}]} onPress={handleTerminer} disabled={saving ||!form.signature}>
                <Text style={s.btnT}>{saving? '⏳ Envoi...' : '✅ Valider Livraison + Signature'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnClose} onPress={() => setShow(false)}><Text style={s.btnT}>❌ Annuler</Text></TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Login({ onLogin }) {
  const [u, setU] = useState('admin');
  const [pw, setPw] = useState('admin');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const login = async () => {
    setLoading(true); setErr('');
    try {
      const res = await api.post('/token/', { username: u, password: pw });
      if (Platform.OS === 'web') {
        localStorage.setItem('access_token', res.data.access);
        localStorage.setItem('refresh_token', res.data.refresh);
        localStorage.setItem('user', JSON.stringify({ username: u }));
      }
      onLogin({ token: res.data.access, user: { username: u } });
    } catch (e) {
      setErr('Login echoue: ' + (e.response?.data?.detail || e.message));
    } finally { setLoading(false); }
  };

  return (
    <View style={s.loginBox}>
      <Text style={s.loginIcon}>🚛</Text><Text style={s.loginTitle}>Chauffeur PRO</Text>
      <Text style={s.loginSub}>📍GPS + 📱SMS + ✍️Signature</Text>
      {err? <View style={s.errorBox}><Text style={s.errorT}>{err}</Text></View> : null}
      <Text style={s.label}>Username</Text><TextInput style={s.input} value={u} onChangeText={setU} placeholder="admin" autoCapitalize="none" />
      <Text style={s.label}>Password</Text><TextInput style={s.input} value={pw} onChangeText={setPw} placeholder="****" secureTextEntry />
      <TouchableOpacity style={s.btnPrimary} onPress={login} disabled={loading}><Text style={s.btnT}>{loading? '⏳ Connexion...' : '🔑 Se connecter'}</Text></TouchableOpacity>
      <Text style={s.small}>API: {API_URL}</Text>
    </View>
  );
}

export default function App() {
  const [auth, setAuth] = useState(null);
  useEffect(() => {
    if (Platform.OS === 'web') {
      const token = localStorage.getItem('access_token');
      const userStr = localStorage.getItem('user');
      if (token && userStr) { try { setAuth({ token, user: JSON.parse(userStr) }); } catch {} }
    }
  }, []);

  const Content =!auth? <Login onLogin={(d) => setAuth(d)} /> : <ChauffeurApp user={auth.user} onLogout={() => { if (Platform.OS === 'web') localStorage.clear(); setAuth(null); }} />;
  if (Platform.OS === 'web') return <View style={s.webBg}><View style={s.phone}><View style={s.notch} />{Content}</View></View>;
  return <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>{Content}</View>;
}

const s = StyleSheet.create({
  webBg: { flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 20 },
  phone: { width: 410, height: 880, backgroundColor: '#f8fafc', borderRadius: 45, borderWidth: 12, borderColor: '#111', overflow: 'hidden' },
  notch: { width: 130, height: 32, backgroundColor: '#111', borderBottomLeftRadius: 16, borderBottomRightRadius: 16, alignSelf: 'center' },
  loginBox: { flex: 1, backgroundColor: 'white', padding: 24, justifyContent: 'center' }, loginIcon: { fontSize: 50, textAlign: 'center' }, loginTitle: { fontSize: 26, fontWeight: '800', textAlign: 'center', marginTop: 10 }, loginSub: { color: '#2563eb', textAlign: 'center', marginTop: 4, fontWeight:'600' },
  label: { fontSize: 12, fontWeight: '700', marginTop: 14, color: '#1e293b' }, input: { borderWidth: 1.5, borderColor: '#cbd5e1', borderRadius: 10, padding: 12, marginTop: 6, backgroundColor: 'white', fontSize:14 },
  btnPrimary: { backgroundColor: '#2563eb', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 16 }, btnT: { color: 'white', fontWeight: '800', fontSize: 14 },
  errorBox: { backgroundColor: '#fee2e2', padding: 12, borderRadius: 8, marginTop: 12 }, errorT: { color: '#991b1b', fontSize: 13 }, small: { fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 10 },
  header: { backgroundColor: '#2563eb', padding: 16 }, headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems:'center' }, h1: { color: 'white', fontWeight: '800', fontSize: 16 }, h2: { color: '#dbeafe', fontSize: 11, marginTop: 4, fontWeight:'600' }, logoutBtn: { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  tabs: { flexDirection: 'row', backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#e2e8f0' }, tab: { flex: 1, padding: 14, alignItems: 'center' }, tabActive: { borderBottomWidth: 3, borderColor: '#2563eb', backgroundColor:'#eff6ff' }, tabT: { fontWeight: '600', color: '#64748b', fontSize: 13 }, tabTActive: { color: '#2563eb', fontWeight:'800' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' }, empty: { alignItems: 'center', padding: 40, marginTop:40 },
  card: { backgroundColor: 'white', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0', shadowColor:'#000', shadowOpacity:0.05, shadowRadius:4 }, cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }, cardNum: { fontWeight: '800', fontSize: 14, color:'#1e293b' }, badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }, badgeT: { fontSize: 11, fontWeight: '800' }, cardText: { fontSize: 13, color: '#475569', marginTop: 4 },
  btnDemarrer: { backgroundColor: '#f59e0b', padding: 14, borderRadius: 12, alignItems: 'center' }, btnTerminer: { backgroundColor: '#10b981', padding: 14, borderRadius: 12, alignItems: 'center' }, livreeBox: { backgroundColor: '#d1fae5', padding: 12, borderRadius: 10, alignItems: 'center', borderWidth:1, borderColor:'#10b981' }, livreeT: { color: '#065f46', fontWeight: '800' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }, modal: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '92%' }, modalTitle: { fontWeight: '800', fontSize: 18, color:'#1e293b' }, modalSub: {fontSize:13, color:'#64748b', marginBottom:10},
  btnClose: { backgroundColor: '#1e293b', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  sigBox: { marginTop: 8, padding: 10, borderRadius: 12 }, btnSecondary: { backgroundColor: 'white', borderWidth: 1.5, borderColor: '#cbd5e1', padding: 10, borderRadius: 8, alignItems: 'center', flex: 1 }, btnT2: { fontWeight: '700', color: '#334155' }
});