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
  const [currentState, setCurrentState] = useState<
    'connected' | 'disconnected'
  >('disconnected');
  const [groupState, setGroupState] = useState<'connected' | 'disconnected'>(
    'disconnected',
  );
  const [callReady, setCallReady] = useState(false);
  const [callingStatus, setCallingStatus] = useState<
    'disconnected' | 'calling' | 'inProgress' | 'incoming'
  >('disconnected');
  const [callSession, setCallSession] = useState('');
  const keyboardHeight = useKeyboardHeight();
  const emitter = useRef(
    Platform.OS === 'ios'
      ? new NativeEventEmitter(QB.chat)
      : new NativeEventEmitter(),
  );
  const callEmitter = useRef(
    Platform.OS === 'ios'
      ? new NativeEventEmitter(QB.webrtc)
      : new NativeEventEmitter(),
  );
  const callEmitterPeerChange = useRef(
    Platform.OS === 'ios'
      ? new NativeEventEmitter(QB.webrtc)
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
      QB.webrtc
        .init()
        .then(function () {
          /* module is ready for calls processing */
          setCallReady(true);
          Object.keys(QB.webrtc.EVENT_TYPE)
            ?.filter(
              key => key !== QB.webrtc.EVENT_TYPE.PEER_CONNECTION_STATE_CHANGED,
            )
            .forEach(key => {
              callEmitter.current.addListener(
                QB.webrtc.EVENT_TYPE[key],
                callEventHandler,
              );
            });
          callEmitterPeerChange.current.addListener(
            QB.webrtc.EVENT_TYPE.PEER_CONNECTION_STATE_CHANGED,
            peerConnectionChange,
          );
        })
        .catch(function (error) {
          /* handle error */
          console.log('error', error);
          setCallReady(false);
        });
    } else {
      setCallReady(false);
    }
  }, [currentState]);

  const callEventHandler = event => {
    const {
      type, // type of the event (i.e. `@QB/CALL` or `@QB/REJECT`)
      payload,
    } = event;
    const {
      userId, // id of QuickBlox user who initiated this event (if any)
      session, // current or new session
    } = payload;
    // handle as necessary
    setCallSession(session?.id);
    console.log('type', type, userData?.user);
    switch (type) {
      case QB.webrtc.EVENT_TYPE.CALL:
        setCallingStatus('incoming');
        break;

      case QB.webrtc.EVENT_TYPE.ACCEPT:
        setCallingStatus('inProgress');
        break;

      case QB.webrtc.EVENT_TYPE.REJECT:
        setCallingStatus('disconnected');
        setCallSession('');
        break;

      case QB.webrtc.EVENT_TYPE.HANG_UP:
        setCallingStatus('disconnected');
        setCallSession('');
        break;

      case QB.webrtc.EVENT_TYPE.NOT_ANSWER:
        setCallingStatus('disconnected');
        setCallSession('');
        break;

      case QB.webrtc.EVENT_TYPE.CALL_END:
        setCallingStatus('disconnected');
        setCallSession('');
        break;

      default:
        setCallingStatus('disconnected');
        break;
    }
  };

  const peerConnectionChange = event => {
    const {
      type, // type of the event (i.e. `@QB/CALL` or `@QB/REJECT`)
      payload,
    } = event;
    const {
      userId, // id of QuickBlox user who initiated this event (if any)
      session, // current or new session
      state, // new peerconnection state (one of QB.webrtc.RTC_PEER_CONNECTION_STATE)
    } = payload;
    console.log('state', state);
    switch (state) {
      case QB.webrtc.RTC_PEER_CONNECTION_STATE.NEW:
        setCallingStatus('inProgress');
        break;

      case QB.webrtc.RTC_PEER_CONNECTION_STATE.CONNECTED:
        setCallingStatus('inProgress');
        break;

      case QB.webrtc.RTC_PEER_CONNECTION_STATE.FAILED:
        setCallingStatus('disconnected');
        setCallSession('');
        break;

      case QB.webrtc.RTC_PEER_CONNECTION_STATE.DISCONNECTED:
        setCallingStatus('disconnected');
        setCallSession('');
        break;

      case QB.webrtc.RTC_PEER_CONNECTION_STATE.CLOSED:
        setCallingStatus('disconnected');
        setCallSession('');
        break;

      default:
        break;
    }
  };

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

  const onCallPress = () => {
    if (callReady) {
      const ids = data?.occupantsIds?.filter(
        item => item !== userData?.user?.id,
      );
      const params = {
        opponentsIds: ids,
        type: QB.webrtc.RTC_SESSION_TYPE.AUDIO,
      };

      QB.webrtc
        .call(params)
        .then(function (session) {
          /* session created */
          setCallingStatus('calling');
          setCallSession(session?.id);
        })
        .catch(function (e) {
          /* handle error */
        });
    }
  };

  const acceptCall = () => {
    console.log('callSession', callSession);
    const acceptParams = {
      sessionId: callSession,
    };

    QB.webrtc
      .accept(acceptParams)
      .then(function (session) {
        /* handle session */
        setCallingStatus('inProgress');
      })
      .catch(function (e) {
        /* handle error */
        console.log('acceptCallError', e);
      });
  };

  const rejectCall = () => {
    const rejectParams = {
      sessionId: callSession,
    };

    QB.webrtc
      .reject(rejectParams)
      .then(function (session) {
        /* handle session */
        setCallingStatus('disconnected');
        setCallSession('');
      })
      .catch(function (e) {
        /* handle error */
        console.log('rejectCallError', e);
      });
  };

  const endCall = () => {
    const hangUpParams = {
      sessionId: callSession,
    };

    QB.webrtc
      .hangUp(hangUpParams)
      .then(function (session) {
        /* handle session */
        setCallingStatus('disconnected');
        setCallSession('');
      })
      .catch(function (e) {
        /* handle error */
        console.log('endCallError', e);
      });
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

  const CallUI = () => {
    return (
      <View style={styles.callUI}>
        <Text style={styles.userName}>{data?.name}</Text>
        <Text style={styles.callStatus}>{`Status: ${callingStatus}`}</Text>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            marginTop: 24,
          }}>
          {callingStatus === 'calling' || callingStatus === 'inProgress' ? (
            <TouchableOpacity style={styles.button} onPress={endCall}>
              <Text style={styles.actionText}>END</Text>
            </TouchableOpacity>
          ) : callingStatus === 'incoming' ? (
            <>
              <TouchableOpacity
                style={[styles.button, {marginRight: 10}]}
                onPress={acceptCall}>
                <Text style={styles.actionText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, {marginLeft: 10}]}
                onPress={rejectCall}>
                <Text style={styles.actionText}>Reject</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>
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
        {data?.type !== 2 ? (
          <TouchableOpacity onPress={onCallPress}>
            <Text>Call</Text>
          </TouchableOpacity>
        ) : (
          <View style={{width: 30}} />
        )}
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
      {callingStatus !== 'disconnected' && <CallUI />}
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
});
