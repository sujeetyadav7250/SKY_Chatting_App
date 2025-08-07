# ✨ Full Stack Realtime Chat App ✨

![Demo App](/frontend/public/screenshot-for-readme.png)

[Video Tutorial on Youtube](https://youtu.be/ntKkVrQqBYY)

Highlights:

- 🌟 Tech stack: MERN + Socket.io + TailwindCSS + Daisy UI
- 🎃 Authentication && Authorization with JWT
- 👾 Real-time messaging with Socket.io
- 🚀 Online user status
- 👌 Global state management with Zustand
- 🐞 Error handling both on the server and on the client
- 📱 Fully responsive design for mobile and desktop
- ✅ Message seen status with real-time updates
- 🗑️ Message deletion (sender can delete their own messages)
- 📊 Unread message indicators in sidebar
- 💬 Last message preview in contact list
- 🎤 Voice message recording and playback
- 📞 Audio calls with WebRTC
- ⭐ At the end Deployment like a pro for FREE!
- ⏳ And much more!

## ✨ New Features Added

### Audio Calls
- **WebRTC Integration**: Peer-to-peer audio calls using WebRTC
- **Call Management**: Initiate, answer, decline, and end calls
- **Real-time Signaling**: Socket.io for call signaling and status updates
- **Call Controls**: Mute, speaker toggle, and call duration
- **Call History**: Track and view call history
- **Call Status**: Visual indicators for calling, ringing, and active calls

### Voice Messages
- **Record Voice Messages**: Click the microphone button to record voice messages
- **Real-time Recording**: See recording duration and visual feedback
- **Playback Controls**: Play, pause, and seek through voice messages
- **Progress Bar**: Visual progress indicator for voice playback
- **Duration Display**: Shows current time and total duration
- **Cloud Storage**: Voice messages are stored securely in Cloudinary

### Message Seen Status
- Real-time message seen indicators
- Blue double check mark for seen messages
- Gray single check mark for sent messages
- Automatic marking as seen when chat is opened

### Message Deletion
- Delete your own messages with confirmation
- Real-time deletion across all connected clients
- Visual feedback during deletion process
- Messages are soft-deleted (hidden from sender's view)

### Enhanced UI/UX
- Unread message count badges in sidebar
- Last message preview in contact list
- Voice message indicators in chat preview
- Call buttons in chat headers
- Responsive design for all screen sizes
- Mobile-friendly navigation with collapsible sidebar
- Better visual feedback for user actions

## 📞 Audio Call Features

### Call Initiation
- **Call Button**: Click phone icon in chat header to start call
- **User Validation**: Only call online users
- **Call Status**: Visual feedback during call initiation
- **Call History**: Track all call attempts and outcomes

### Incoming Calls
- **Call Modal**: Beautiful incoming call interface
- **Caller Info**: Display caller name and avatar
- **Answer/Decline**: Easy-to-use call controls
- **Ringing Animation**: Visual feedback for incoming calls

### Active Calls
- **WebRTC Connection**: Direct peer-to-peer audio
- **Call Duration**: Real-time call timer
- **Mute Control**: Toggle microphone on/off
- **Speaker Control**: Toggle speaker mode
- **Call Quality**: Optimized audio for web browsers

### Call Management
- **Call History**: View past calls with duration
- **Call Status**: Track call outcomes (answered, declined, missed)
- **Real-time Updates**: Instant status updates across devices
- **Call Analytics**: Duration tracking and call statistics

## 🎤 Voice Message Features

### Recording
- **Microphone Permission**: Automatic microphone access request
- **Recording Timer**: Real-time recording duration display
- **Visual Feedback**: Red pulsing dot during recording
- **Stop Recording**: Square button to stop recording

### Playback
- **Play/Pause**: Control voice message playback
- **Seek Bar**: Click to jump to specific time
- **Duration Display**: Current time / total duration
- **Auto-reset**: Playback resets when finished

### Storage
- **Cloudinary Integration**: Voice files stored securely
- **MP3 Format**: Optimized audio format for web
- **Base64 Encoding**: Secure transmission to server

### Setup .env file

```js
MONGODB_URI=...
PORT=5001
JWT_SECRET=...

CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

NODE_ENV=development
```

### Build the app

```shell
npm run build
```

### Start the app

```shell
npm start
```
