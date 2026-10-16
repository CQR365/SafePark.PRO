/* Firebase project used to hold review responses centrally. Same settings as the existing modules. */
window.GSS_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBvbKg5SAVOON7JoZMOag3-5R24S145xN4",
  authDomain: "safepark-pro.firebaseapp.com",
  projectId: "safepark-pro",
  storageBucket: "safepark-pro.firebasestorage.app",
  messagingSenderId: "511221743341",
  appId: "1:511221743341:web:95bcc7e83d4861578016e4"
};
/* Firestore collection that holds one document per contributor, and the Storage folder for the submitted copies. */
window.GSS_REVIEW_COLLECTION = "gss_org_review";
/* Review rounds, oldest first. The last one is the round people are answering now.
   To start the six monthly review, add the next entry below. The earlier round is then left exactly as it was, kept as the baseline,
   and each person's last answers are filled in on their next visit (same browser) for them to check and change.
   Example next round:  { id: '2027-04', label: 'April 2027', collection: 'gss_org_review_2027-04', storageKey: 'gss-post-profiles-2027-04' } */
window.GSS_ROUNDS = [
  { id: '2026-10', label: 'October 2026', collection: 'gss_org_review', storageKey: 'gss-post-profiles-v1' }
];
