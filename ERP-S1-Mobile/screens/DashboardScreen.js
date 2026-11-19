import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import api from '../config/api';

export default function DashboardScreen(){
  const [data, setData] = useState(null);
  useEffect(()=>{
    // Alaina @ backend anao: /api/dashboard/ raha efa nanaovanao, sinon calcul eo
    api.get('produits/').then(r=>{
      setData({ventes:23400, achats:13609.38, marge:8400, stock:93500});
    });
  },[]);

  if(!data) return <ActivityIndicator style={{flex:1}} />;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ERP S1 - Tableau de Bord</Text>
        <Text style={styles.headerSub}>Connecté : ADMIN</Text>
      </View>

      <View style={styles.grid}>
        <View style={styles.card}><Text>Ventes Mois</Text><Text style={styles.violet}>{data.ventes} Ar</Text></View>
        <View style={styles.card}><Text>Achats Mois</Text><Text style={styles.orange}>{data.achats} Ar</Text></View>
        <View style={styles.card}><Text>Marge Brute</Text><Text style={styles.blue}>{data.marge} Ar</Text></View>
        <View style={styles.card}><Text>Valeur Stock</Text><Text style={styles.purple}>{data.stock} Ar</Text></View>
      </View>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  container:{flex:1, backgroundColor:'#F3F4F6'},
  header:{backgroundColor:'#7C3AED', padding:20, borderBottomLeftRadius:20, borderBottomRightRadius:20},
  headerTitle:{color:'white', fontSize:20, fontWeight:'bold'},
  headerSub:{color:'#DDD6FE'},
  grid:{flexDirection:'row', flexWrap:'wrap', padding:10, justifyContent:'space-between'},
  card:{width:'48%', backgroundColor:'white', padding:15, borderRadius:12, marginBottom:10, elevation:2},
  violet:{fontSize:18, fontWeight:'bold', color:'#7C3AED', marginTop:5},
  orange:{fontSize:18, fontWeight:'bold', color:'#F59E0B', marginTop:5},
  blue:{fontSize:18, fontWeight:'bold', color:'#2563EB', marginTop:5},
  purple:{fontSize:18, fontWeight:'bold', color:'#6D28D9', marginTop:5},
});