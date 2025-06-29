// Firebase Configuration for DJR Tenda Salary Management
const firebaseConfig = {
  apiKey: "AIzaSyDyyDU2UpWHlPM_xh7A2mcR3V9RDt9S09Q",
  authDomain: "gajitendadjr-58d60.firebaseapp.com",
  projectId: "gajitendadjr-58d60",
  storageBucket: "gajitendadjr-58d60.firebasestorage.app",
  messagingSenderId: "875985398599",
  appId: "1:875985398599:android:061b055584cdfd9431fa62"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

// Auth state observer
auth.onAuthStateChanged((user) => {
  if (user) {
    console.log('User signed in:', user.email);
  } else {
    console.log('User signed out');
  }
});

