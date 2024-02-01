import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import React, {useContext, useEffect, useState} from 'react';
import QB from 'quickblox-react-native-sdk';
import {MyContext} from '../../App';
import {useFocusEffect, useNavigation} from '@react-navigation/native';

const Home = () => {
  const [dialogs, setDialogs] = useState([]);
  const navigation = useNavigation();
  const {setUserData, setUserPassword} = useContext(MyContext);

  useFocusEffect(
    React.useCallback(() => {
      const createDialogParam = {
        type: QB.chat.DIALOG_TYPE.CHAT,
        occupantsIds: [139420686],
      };

      // QB.chat
      //   .createDialog(createDialogParam)
      //   .then(function (dialog) {
      //     console.log('dialog', dialog);
      //     fetchList();
      //   })
      //   .catch(function (error) {
      //     // handle error
      //     console.log('error', error);
      //   });
      fetchList();
    }, []),
  );

  const fetchList = () => {
    const sort = {
      field: QB.chat.DIALOGS_SORT.FIELD.LAST_MESSAGE_DATE_SENT,
      ascending: true,
    };
    const getDialogsQuery = {
      sort: sort,
      limit: 10,
      skip: 0,
    };
    QB.chat
      .getDialogs(getDialogsQuery)
      .then(res => {
        setDialogs(res?.dialogs);
      })
      .catch(function (error) {
        // handle error
        console.log('error', error);
      });
  };

  const logout = () => {
    QB.auth
      .logout()
      .then(function () {
        setUserData({});
        setUserPassword('');
      })
      .catch(function (e) {
        // handle error
      });
  };

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: 'white'}}>
      <FlatList
        data={dialogs}
        contentContainerStyle={{paddingHorizontal: 18}}
        renderItem={({item, index}) => (
          <Pressable
            style={styles.dialogsContainer}
            onPress={() => navigation.navigate('ChatScreen', {data: item})}>
            <Text style={{fontSize: 18}}>{item?.name}</Text>
            <Text style={{marginTop: 5}}>{item?.lastMessage || ''}</Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
              <Text style={{marginTop: 5}}>{item?.createdAt}</Text>
              <Text style={{marginTop: 5}}>{item?.unreadMessagesCount}</Text>
            </View>
          </Pressable>
        )}
      />
      <TouchableOpacity style={{alignSelf: 'center'}} onPress={logout}>
        <Text style={styles.logout}>Logout</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default Home;

const styles = StyleSheet.create({
  dialogsContainer: {
    backgroundColor: '#eff0e9',
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginTop: 15,
    borderRadius: 8,
  },
  logout: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
});
