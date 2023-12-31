let APP_ID = 'd48b98518ebf49f6b00cfd42e99bb2bd';
let token = null;
let uid = String(Math.floor(Math.random() * 1000));

let client;
let channel;


let localStream;
let remoteStream;
let peerConnection;

// using google stun servers to get ICE(IP + Port)
const servers = {
    iceServers: [
        {
            urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']
        }
    ]
}

 let init = async () => { 
    client = await AgoraRTM.createInstance(APP_ID)
    await client.login({uid, token});

    console.log('Creating Channel::main')
    channel = client.createChannel('main');     // creating a channel by name "main"
    await channel.join();

    channel.on('MemberJoined', handleUserJoined);
    channel.on('MemberLeft', handleUserLeft);

    client.on('MessageFromPeer', handleMessageFromPeer);

    localStream = await navigator.mediaDevices.getUserMedia({video: true, audio: false});   // using navigator service to access camera
    document.getElementById('user-1').srcObject = localStream;  // displaying user-1 screen  
 }

 let handleUserLeft = (memberId) => {
    document.getElementById('user-2').style.display = 'none';       // hiding user on leave
 }

 let handleUserJoined =  async (memberId) => {
    console.log(`${memberId} has joined the channel`);
    createOffer(memberId);
 }

 let handleMessageFromPeer = async (message, memberId) => {
    message = JSON.parse(message.text);
    if(message.type === 'offer') createAnswer(memberId, message.offer);
    if(message.type === 'answer') addAnswer(message.answer);
    if(message.type === 'candidate') {
        if(peerConnection) {
            peerConnection.addIceCandidate(message.candidate);
        }
    }
 }

 let createPeerConnection = async (memberId) => {
    // interface used to connect to peer device 
    peerConnection = new RTCPeerConnection(servers);

    // taking remote stream and setting up in user2 display
    remoteStream = new MediaStream();
    document.getElementById('user-2').srcObject = remoteStream;
    document.getElementById('user-2').style.display = 'block';
    
    if(!localStream) {
        localStream = await navigator.mediaDevices.getUserMedia({video: true, audio: false});   
        document.getElementById('user-1').srcObject = localStream;  
    }

    localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);    // adding video track to local stream
    })

    peerConnection.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
            remoteStream.addTrack(track);
        })
    }


    peerConnection.onicecandidate = aysnc = (event) => {
        if(event.candidate) {
            client.sendMessageToPeer({text: JSON.stringify({'type': 'candidate', 'candidate': event.candidate})}, memberId);
        }
    }
 }

 let createOffer = async (memberId) => {
    await createPeerConnection(memberId);

    // creating offer(which is sent to peer)
    let offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    client.sendMessageToPeer({text: JSON.stringify({'type': 'offer', 'offer': offer})}, memberId);
}

 let createAnswer = async (memberId, offer) => {
    await createPeerConnection(memberId);
    await peerConnection.setRemoteDescription(offer);

    let answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    client.sendMessageToPeer({text: JSON.stringify({'type': 'answer', 'answer': answer})}, memberId);
 } 

 let addAnswer = async (answer) => {
    if(!peerConnection.currentRemoteDescription) {
        peerConnection.setRemoteDescription(answer);
    }
 }

 let leaveChannel = async () => {
    await channel.leave();
    await client.logout();
 }

 window.addEventListener('beforeUnload', leaveChannel);

 init();