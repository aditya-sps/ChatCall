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
import WebRTCView from 'quickblox-react-native-sdk/RTCView';
import {MyContext} from '../../App';

const ChatScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const {data} = route?.params;
  const [value, setValue] = useState('');
  const [lastMessageStatus, setLastMessageStatus] = useState<{
    status: '' | 'sent' | 'seen';
    userId: number | null;
  }>({status: '', userId: null});
  const [messages, setMessages] = useState([]);
  const [newMesssage, setNewMessage] = useState({});
  const [currentState, setCurrentState] = useState<
    'connected' | 'disconnected'
  >('disconnected');
  const [groupState, setGroupState] = useState<'connected' | 'disconnected'>(
    'disconnected',
  );
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
      emitter.current.addListener(QB.chat.EVENT_TYPE.MESSAGE_READ, messageRead);
      return () => {
        disconnect(false);
        if (data?.type === 2 && groupState === 'connected') {
          disconnectGroupChat();
        }
      };
    }, []),
  );

  useEffect(() => {
    if (Object.keys(newMesssage).length > 0) {
      setMessages([newMesssage, ...messages]);
      setNewMessage({});
    }
  }, [newMesssage]);

  useEffect(() => {
    if (currentState === 'connected') {
      const lastMessage = messages?.[0];
      if (
        lastMessage?.senderId !== userData?.user?.id &&
        lastMessage?.readIds?.length < data?.occupantsIds?.length
      ) {
        markMessageAsRead(lastMessage);
      }
    }
  }, [currentState]);

  useEffect(() => {
    if (lastMessageStatus?.status === 'seen') {
      let new_messages = messages.map(item => {
        if (
          data?.type === 3 &&
          item?.readIds?.length < data?.occupantsIds?.length
        ) {
          return {...item, readIds: data?.occupantsIds};
        } else if (
          data?.type === 2 &&
          item?.readIds?.length < data?.occupantsIds?.length &&
          lastMessageStatus?.userId &&
          !item?.readIds?.includes(lastMessageStatus?.userId)
        ) {
          return {
            ...item,
            readIds: [...item?.readIds, lastMessageStatus?.userId],
          };
        } else {
          return item;
        }
      });
      setMessages(new_messages);
    }
  }, [lastMessageStatus]);

  const receivedNewMessage = event => {
    const {type, payload} = event;
    // handle new message
    // type - event name (string)
    // payload - message received (object)

    // setMessages([payload, ...messages]);
    setNewMessage(payload);
    if (payload?.senderId !== userData?.user?.id) {
      markMessageAsRead(payload);
    }
  };

  const markMessageAsRead = message => {
    const markMessageReadParams = {
      message: {
        id: message?.id,
        dialogId: data?.id,
        senderId: message?.senderId,
      },
    };
    QB.chat
      .markMessageRead(markMessageReadParams)
      .then(function () {
        /* marked as "read" successfully */
        console.log('Message read successfull');
      })
      .catch(function (e) {
        /* handle error */
        console.log('Read error', e);
      });
  };

  const messageRead = event => {
    const {
      type, // name of the event (the one you've subscribed for)
      payload, // event data
    } = event;
    const {
      dialogId, // in dialog with id specified
      messageId, // message with id specified
      userId, // was delivered to user with id specified
    } = payload;
    // handle as necessary
    setLastMessageStatus({status: 'seen', userId: userId});
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
          if (data?.type === 2) {
            createGroupConnection();
          }
        }
      })
      .catch(function (e) {
        // some error occurred
      });
  };

  const createGroupConnection = () => {
    const joinDialogParam = {dialogId: data?.id};

    QB.chat
      .joinDialog(joinDialogParam)
      .then(function () {
        setGroupState('connected');
      })
      .catch(function (e) {
        console.log('GroupConnectionError', e);
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

  const disconnectGroupChat = () => {
    const leaveDialogParam = {dialogId: data?.id};

    QB.chat
      .leaveDialog(leaveDialogParam)
      .then(function () {
        setGroupState('disconnected');
      })
      .catch(function (e) {
        console.log('GroupDisconnectionError', e);
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
        const lastMessage = result?.messages?.[0];
        if (
          lastMessage?.senderId === userData?.user?.id &&
          lastMessage?.readIds?.length >= 2
        ) {
          setLastMessageStatus({userId: null, status: 'seen'});
        } else {
          setLastMessageStatus({userId: null, status: 'sent'});
        }
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
            setLastMessageStatus({userId: null, status: 'sent'});
          })
          .catch(function (error) {
            console.log('error', error);
          });
      } else {
      }
    }
  };

  const renderItem = ({item, index}: any) => {
    const readStatus =
      item?.readIds?.length === data?.occupantsIds?.length
        ? 'seen'
        : data?.type === 2 && item?.readIds?.length > 1
        ? 'partly seen'
        : 'sent';
    return (
      <View
        style={{
          marginBottom: 10,
        }}>
        <View
          style={[
            styles.message,
            item?.senderId === userData?.user?.id
              ? {alignSelf: 'flex-end'}
              : {alignSelf: 'flex-start'},
          ]}>
          <Text style={styles.text}>{item?.body}</Text>
        </View>
        {item?.senderId === userData?.user?.id && (
          <Text style={styles.sentStatus}>{readStatus}</Text>
        )}
      </View>
    );
  };

  return (
    <View style={{flex: 1, backgroundColor: 'white'}}>
      <View
        style={[
          styles.header,
          {paddingTop: insets.top > 10 ? insets.top : 20},
        ]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text>Back</Text>
        </TouchableOpacity>
        <Text>{data?.name}</Text>
        <View style={{width: 30}} />
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
    paddingVertical: 10,
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
  callUI: {
    height: 180,
    width: '90%',
    position: 'absolute',
    backgroundColor: '#dce3cf',
    alignSelf: 'center',
    borderRadius: 10,
    marginTop: 250,
  },
  userName: {
    textAlign: 'center',
    marginTop: 10,
    fontSize: 18,
    fontWeight: '600',
  },
  callStatus: {
    textAlign: 'center',
    marginTop: 6,
    fontSize: 16,
    fontWeight: '500',
  },
  button: {
    width: '30%',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e1f1e',
    borderRadius: 8,
  },
  actionText: {
    color: 'white',
  },
  video: {
    height: 5,
    width: '20%',
    marginBottom: 5,
  },
  sentStatus: {
    textAlign: 'right',
    marginRight: 5,
  },
});
