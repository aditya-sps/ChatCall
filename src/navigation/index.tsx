import {Platform, StyleSheet, Text, View} from 'react-native';
import React, {useContext, useEffect} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import Home from '../screens/Home';
import ChatScreen from '../screens/ChatScreen';
import QB from 'quickblox-react-native-sdk';
import {MyContext} from '../../App';
import Login from '../screens/Login';

const Navigation = () => {
  const Stack = createStackNavigator();
  const {userData} = useContext(MyContext);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        {Object.keys(userData)?.length > 0 ? (
          <Stack.Group>
            <Stack.Screen name="Home" component={Home} />
            <Stack.Screen name="ChatScreen" component={ChatScreen} />
          </Stack.Group>
        ) : (
          <Stack.Screen name="Login" component={Login} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default Navigation;

const styles = StyleSheet.create({});
