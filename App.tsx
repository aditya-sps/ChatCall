import React, {createContext, useEffect, useState} from 'react';
import {StyleSheet} from 'react-native';
import Navigation from './src/navigation';
import QB from 'quickblox-react-native-sdk';

const appSettings = {
  appId: '102505',
  authKey: 'ak_an5d2tqDTGZSDWj',
  authSecret: 'as_7C3tM3PAc-V-XtU',
  accountKey: 'ack_2GFY9WZKdP1c7AQKe8tQ',
};

export const MyContext = createContext({});

function App(): React.JSX.Element {
  const [userData, setUserData] = useState({});
  const [setupQB, setSetupQB] = useState(false);
  const [userPassword, setUserPassword] = useState('');

  useEffect(() => {
    quickbloxSetup();
  }, []);

  const quickbloxSetup = () => {
    QB.settings
      .init(appSettings)
      .then(() => {
        console.log('Initialized');
        setSetupQB(true);
      })
      .catch(error => {
        console.log('error', error);
      });
  };

  return (
    <MyContext.Provider
      value={{userData, setUserData, setupQB, userPassword, setUserPassword}}>
      <Navigation />
    </MyContext.Provider>
  );
}

const styles = StyleSheet.create({});

export default App;
