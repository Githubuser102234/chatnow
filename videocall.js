const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startCallButton = document.getElementById('startCall');
const joinCallButton = document.getElementById('joinCall');

let localStream;
let peerConnection;
const database = firebase.database();
const servers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ]
};

// Get room ID from URL hash
const callId = window.location.hash.substring(1) || "defaultRoom";

async function setupMedia() {
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  localVideo.srcObject = localStream;
}

startCallButton.onclick = async () => {
  await setupMedia();
  peerConnection = new RTCPeerConnection(servers);
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  database.ref(`/calls/${callId}/offer`).set(offer.toJSON());

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      database.ref(`/calls/${callId}/callerCandidates`).push(event.candidate.toJSON());
    }
  };

  peerConnection.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };

  database.ref(`/calls/${callId}/answer`).on('value', async snapshot => {
    const answer = snapshot.val();
    if (answer && !peerConnection.currentRemoteDescription) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }
  });

  database.ref(`/calls/${callId}/calleeCandidates`).on('child_added', snapshot => {
    const candidate = new RTCIceCandidate(snapshot.val());
    peerConnection.addIceCandidate(candidate);
  });
};

joinCallButton.onclick = async () => {
  await setupMedia();
  peerConnection = new RTCPeerConnection(servers);
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  const offerSnapshot = await database.ref(`/calls/${callId}/offer`).once('value');
  const offer = offerSnapshot.val();
  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  database.ref(`/calls/${callId}/answer`).set(answer.toJSON());

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      database.ref(`/calls/${callId}/calleeCandidates`).push(event.candidate.toJSON());
    }
  };

  peerConnection.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };

  database.ref(`/calls/${callId}/callerCandidates`).on('child_added', snapshot => {
    const candidate = new RTCIceCandidate(snapshot.val());
    peerConnection.addIceCandidate(candidate);
  });
};
