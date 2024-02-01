import {
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import React, {useContext, useState} from 'react';
import {MyContext} from '../../App';
import QB from 'quickblox-react-native-sdk';

const Login = () => {
  const {setUserData, setUserPassword} = useContext(MyContext);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const login = () => {
    const loginParams = {
      login: username,
      password: password,
    };
    QB.auth
      .login(loginParams)
      .then(info => {
        setUserData(info);
        setUserPassword(password);
        // const session = {
        //   applicationId: 102505,
        //   token: info?.session?.token,
        //   userId: info?.user?.id,
        // };
        // QB.auth
        //   .setSession(session)
        //   .then(result => {})
        //   .catch(error => {});
      })
      .catch(error => {
        console.log('error', error);
      });
  };

  return (
    <SafeAreaView>
      <View style={{paddingHorizontal: 20}}>
        <View>
          <Text>Username</Text>
          <TextInput
            value={username}
            onChangeText={value => setUsername(value)}
            style={styles.input}
            placeholder={'Username'}
          />
        </View>
        <View style={{marginTop: 20}}>
          <Text>Password</Text>
          <TextInput
            value={password}
            onChangeText={value => setPassword(value)}
            style={styles.input}
            placeholder={'password'}
          />
        </View>
        <TouchableOpacity style={styles.buttonLogin} onPress={login}>
          <Text style={styles.loginText}>Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default Login;

const styles = StyleSheet.create({
  input: {
    height: 40,
    width: '100%',
    backgroundColor: '#f0eded',
    borderWidth: 1,
    borderColor: '#d9d7d7',
    borderRadius: 10,
    marginTop: 10,
    paddingHorizontal: 8,
  },
  buttonLogin: {
    backgroundColor: 'black',
    width: '100%',
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  loginText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
