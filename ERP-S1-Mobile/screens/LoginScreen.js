import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import api from '../config/api';
import { useState } from 'react';

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin_2026_123');
  const [error, setError] = useState('');

  const login = async () => {
    try {
      // Raha JWT: await api.post('token/', {username, password})
      // Raha session simple backend anao:
      const res = await api.get(`produits/?search=`);
      if(res) navigation.replace('Dashboard');
    } catch(e) {
      setError('Login échoué. Vérifie username/password');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>ERP S1</Text>
      <Text style={styles.title}>Connexion</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      
      <TextInput style={styles.input} placeholder="Nom d'utilisateur" value={username} onChangeText={setUsername} />
      <TextInput style={styles.input} placeholder="Mot de passe" secureTextEntry value={password} onChangeText={setPassword} />
      
      <TouchableOpacity style={styles.btn} onPress={login}>
        <Text style={styles.btnText}>Se connecter</Text>
      </TouchableOpacity>
    </View>
  );
}
const styles = StyleSheet.create({
  container:{flex:1, justifyContent:'center', padding:20, backgroundColor:'#fff'},
  logo:{fontSize:32, fontWeight:'bold', color:'#7C3AED', textAlign:'center', marginBottom:20},
  title:{fontSize:22, textAlign:'center', marginBottom:20},
  error:{backgroundColor:'#FEE2E2', color:'#DC2626', padding:10, borderRadius:8, marginBottom:10},
  input:{borderWidth:1, borderColor:'#ddd', padding:12, borderRadius:10, marginBottom:12},
  btn:{backgroundColor:'#DC2626', padding:15, borderRadius:10, alignItems:'center'},
  btnText:{color:'white', fontWeight:'bold'}
});