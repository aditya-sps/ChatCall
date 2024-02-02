import {
  FlatList,
  Keyboard,
  NativeEventEmitter,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import React, {useContext, useEffect, useRef, useState} from 'react';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useKeyboardHeight} from '../hooks/useKeyboardHeight';
import QB from 'quickblox-react-native-sdk';
import {MyContext} from '../../App';

const ChatScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const {data} = route?.params;
  const [value, setValue] = useState('');
  const [messages, setMessages] = useState([]);
  const [newMesssage, setNewMessage] = useState({});
  const [currentState, setCurrentState] = useState('disconnected');
  const keyboardHeight = useKeyboardHeight();
  const emitter = useRef(
    Platform.OS === 'ios'
      ? new NativeEventEmitter(QB.chat)
      : new NativeEventEmitter(),
  );
  const {userData, userPassword} = useContext(MyContext);

  useFocusEffect(
    React.useCallback(() => {
      getMessages(0);
      createConnection(Platform.OS === 'android' ? true : false);
      emitter.current.addListener(
        QB.chat.EVENT_TYPE.RECEIVED_NEW_MESSAGE,
        receivedNewMessage,
      );
      return () => {
        disconnect(false);
      };
    }, []),
  );

  useEffect(() => {
    if (Object.keys(newMesssage).length > 0) {
      setMessages([newMesssage, ...messages]);
      setNewMessage({});
    }
  }, [newMesssage]);

  const receivedNewMessage = event => {
    const {type, payload} = event;
    // handle new message
    // type - event name (string)
    // payload - message received (object)

    // setMessages([payload, ...messages]);
    setNewMessage(payload);
  };

  const createConnection = (reconnect: boolean) => {
    const chatConnectParams = {
      userId: userData?.user?.id,
      password: userPassword,
    };
    QB.chat
      .connect(chatConnectParams)
      .then(function () {
        console.log('Connected');
        if (reconnect) {
          disconnect(reconnect);
        } else {
          setCurrentState('connected');
        }
      })
      .catch(function (e) {
        // some error occurred
      });
  };

  const disconnect = (reconnect: boolean) => {
    QB.chat
      .disconnect()
      .then(function () {
        console.log('Disconnected');
        if (reconnect) createConnection(false);
        else setCurrentState('disconnected');
      })
      .catch(function (e) {
        // handle error
      });
  };

  const getMessages = (skip: number) => {
    const getDialogMessagesParams = {
      dialogId: data?.id,
      sort: {
        ascending: false,
        field: QB.chat.MESSAGES_SORT.FIELD.DATE_SENT,
      },
      markAsRead: true,
      skip: skip,
      limit: 100,
    };
    QB.chat
      .getDialogMessages(getDialogMessagesParams)
      .then(result => {
        setMessages(result?.messages);
      })
      .catch(error => {
        console.log('error', error);
      });
  };

  const sendMessage = () => {
    if (value?.trim()) {
      if (currentState === 'connected') {
        const message = {
          dialogId: data?.id,
          body: value,
          saveToHistory: true,
        };

        QB.chat
          .sendMessage(message)
          .then(function () {
            setValue('');
          })
          .catch(function (error) {
            console.log('error', error);
          });
      } else {
      }
    }
  };

  const renderItem = ({item}: any) => (
    <View
      style={[
        styles.message,
        item?.senderId === userData?.user?.id
          ? {alignSelf: 'flex-end'}
          : {alignSelf: 'flex-start'},
      ]}>
      <Text style={styles.text}>{item?.body}</Text>
    </View>
  );

  return (
    <View style={{flex: 1, backgroundColor: 'white'}}>
      <View style={[styles.header, {paddingTop: insets.top + 10}]}>
        <Text onPress={() => navigation.goBack()}>Back</Text>
        <Text>{data?.name}</Text>
        <Text>Call</Text>
      </View>
      <View style={{flex: 1}}>
        <View style={styles.status}>
          <Text>{`${currentState}${
            currentState === 'disconnected' ? ' trying to connect' : ''
          }`}</Text>
        </View>
        <FlatList
          contentContainerStyle={{paddingHorizontal: 5}}
          inverted
          data={messages}
          renderItem={renderItem}
        />
      </View>
      <View
        style={[
          styles.inputBottom,
          {
            paddingBottom: insets.bottom,
            marginBottom: Platform.OS === 'ios' ? keyboardHeight : 0,
          },
        ]}>
        <TextInput
          value={value}
          onChangeText={text => setValue(text)}
          style={styles.textInput}
          placeholder="type message..."
        />
        <TouchableOpacity onPress={sendMessage}>
          <Text>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ChatScreen;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    backgroundColor: '#d4d4d4',
    paddingVertical: 5,
  },
  inputBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  textInput: {
    backgroundColor: '#d4d4d4',
    flex: 1,
    height: 46,
    paddingHorizontal: 8,
    fontSize: 16,
    marginRight: 10,
    borderRadius: 6,
  },
  message: {
    backgroundColor: 'green',
    marginBottom: 10,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  text: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  status: {
    position: 'absolute',
    paddingHorizontal: 4,
    paddingVertical: 2,
    alignSelf: 'center',
  },
});
