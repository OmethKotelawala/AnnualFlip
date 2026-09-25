/**
 * Firebase Real Authentication & Brand URL Customization Backend Controller - FlipPage
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  sendPasswordResetEmail, 
  updateProfile, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";

// Master Admin Email
const MASTER_ADMIN_EMAIL = "paneljoker145@gmail.com";

// Firebase Configuration from Active Project
const firebaseConfig = {
  projectId: "gen-lang-client-0435835472",
  appId: "1:772093074138:web:42bda395d4aed6154023e3",
  apiKey: "AIzaSyCf6Fp-qy8fkkDGOGKiouF1n64tgSNfAzY",
  authDomain: "gen-lang-client-0435835472.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-annualflip-d5e05e1e-4c28-4cf6-b18c-1e967bd5cdc9",
  storageBucket: "gen-lang-client-0435835472.firebasestorage.app",
  messagingSenderId: "772093074138"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize optional analytics safely
isSupported().then(supported => {
  if (supported) {
    try { getAnalytics(app); } catch (_) {}
  }
});

// DOM Elements - Auth Form
const authFormWrapper = document.getElementById('auth-form-wrapper');
const signedInCard = document.getElementById('signedin-state');
const userDisplayName = document.getElementById('user-display-name');
const userDisplayEmail = document.getElementById('user-display-email');
const userAvatarInitial = document.getElementById('user-avatar-initial');
const signoutButton = document.getElementById('signout-button');

const form = document.getElementById('account-form');
const signInTab = document.getElementById('signin-tab');
const signUpTab = document.getElementById('signup-tab');
const nameFields = document.getElementById('name-fields');
const firstNameInput = document.getElementById('first-name-input');
const lastNameInput = document.getElementById('last-name-input');
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password');
const accountTitle = document.getElementById('account-title');
const accountSubtitle = document.getElementById('account-subtitle');
const submitButton = document.getElementById('submit-button');
const rememberOption = document.getElementById('remember-option');
const forgotButton = document.getElementById('forgot-button');
const passwordToggle = document.getElementById('password-toggle');
const formStatus = document.getElementById('form-status');
const googleAuthBtn = document.getElementById('google-auth-btn');

// DOM Elements - Brand URL Customization Step (Screenshot Match)
const brandStep = document.getElementById('brand-onboarding-step');
const brandUserName = document.getElementById('brand-user-name');
const brandUserEmail = document.getElementById('brand-user-email');
const brandLogoutLink = document.getElementById('brand-logout-link');
const brandNameInput = document.getElementById('brand-name-input');
const saveBrandBtn = document.getElementById('save-brand-btn');
const brandFormStatus = document.getElementById('brand-form-status');

let currentMode = 'signin'; // 'signin' | 'signup'
let activeFirebaseUser = null;

// Check URL params for auth=required notification
try {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('auth') === 'required') {
    setTimeout(() => {
      showStatus('🔒 Please sign in or create an account to access the FlipPage Workspace.', false);
    }, 100);
  }
} catch (_) {}

/**
 * Switch Auth Mode (Sign in / Create account)
 */
function setMode(mode) {
  currentMode = mode;
  const isSignUp = mode === 'signup';

  signInTab.classList.toggle('is-active', !isSignUp);
  signUpTab.classList.toggle('is-active', isSignUp);
  signInTab.setAttribute('aria-selected', String(!isSignUp));
  signUpTab.setAttribute('aria-selected', String(isSignUp));

  nameFields.hidden = !isSignUp;
  accountTitle.textContent = isSignUp ? 'Create your workspace' : 'Welcome back';
  accountSubtitle.textContent = isSignUp ? 'Start building beautiful flipbooks today.' : 'Sign in to continue to your workspace.';
  submitButton.textContent = isSignUp ? 'Create account' : 'Sign in';
  
  if (rememberOption) rememberOption.hidden = isSignUp;
  if (forgotButton) forgotButton.hidden = isSignUp;

  clearStatus();
}

signInTab.addEventListener('click', () => setMode('signin'));
signUpTab.addEventListener('click', () => setMode('signup'));

/**
 * Toggle Password Visibility
 */
if (passwordToggle && passwordInput) {
  passwordToggle.addEventListener('click', () => {
    const isVisible = passwordInput.type === 'text';
    passwordInput.type = isVisible ? 'password' : 'text';
    passwordToggle.textContent = isVisible ? 'Show' : 'Hide';
    passwordToggle.setAttribute('aria-label', `${isVisible ? 'Show' : 'Hide'} password`);
  });
}

/**
 * Helper to display status message
 */
function showStatus(message, isError = false) {
  if (!formStatus) return;
  formStatus.textContent = message;
  formStatus.classList.toggle('is-error', isError);
}

function clearStatus() {
  if (!formStatus) return;
  formStatus.textContent = '';
  formStatus.classList.remove('is-error');
}

/**
 * Friendly Error Parser for Firebase Auth
 */
function parseAuthError(error) {
  const code = error.code || '';
  switch (code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password. Please try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try signing in.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in popup was closed before completing.';
    case 'auth/popup-blocked':
      return 'Sign-in popup was blocked by your browser. Please allow popups.';
    case 'auth/network-request-failed':
      return 'Network connection failed. Please check your internet connection.';
    case 'auth/too-many-requests':
      return 'Access temporarily disabled due to too many failed attempts. Reset password or try later.';
    case 'auth/unauthorized-domain':
      return `This domain (${window.location.hostname}) is not authorized in your Firebase Project. Please add it to Firebase Console > Authentication > Settings > Authorized Domains, or use Email sign in / Guest mode below.`;
    default:
      return error.message || 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Ensure user document is provisioned with 14-day trial in Firestore
 */
async function syncUserTrialRecord(user, customName = '', customBrand = '') {
  try {
    const userRef = doc(db, 'users', user.uid);
    const existingSnap = await getDoc(userRef);
    const now = new Date();
    const isAdmin = (user.email || '').toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();

    if (!existingSnap.exists()) {
      const trialDays = 14;
      const trialStartDate = now.toISOString();
      const trialEndDate = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000).toISOString();

      await setDoc(userRef, {
        uid: user.uid,
        displayName: customName || user.displayName || (user.email ? user.email.split('@')[0] : 'User'),
        email: user.email || '',
        photoURL: user.photoURL || '',
        role: isAdmin ? 'admin' : 'user',
        brandName: customBrand || '',
        brandUrl: customBrand ? `FlipPage.com/${customBrand.toLowerCase().replace(/\s+/g, '-')}` : '',
        createdAt: trialStartDate,
        trialDays: trialDays,
        trialStartDate: trialStartDate,
        trialEndDate: trialEndDate,
        status: 'active',
        lastLoginAt: trialStartDate
      });
    } else {
      const updatePayload = { 
        lastLoginAt: now.toISOString() 
      };
      if (user.photoURL) {
        updatePayload.photoURL = user.photoURL;
      }
      if (customBrand) {
        updatePayload.brandName = customBrand;
        updatePayload.brandUrl = `FlipPage.com/${customBrand.toLowerCase().replace(/\s+/g, '-')}`;
      }
      await setDoc(userRef, updatePayload, { merge: true });
    }
  } catch (err) {
    console.warn('Firestore trial sync notice:', err);
  }
}

/**
 * Show Customize Your URL / Brand Onboarding Screen
 */
async function presentBrandCustomizationStep(user) {
  activeFirebaseUser = user;
  
  if (authFormWrapper) authFormWrapper.hidden = true;
  if (signedInCard) signedInCard.hidden = true;
  if (brandStep) brandStep.hidden = false;

  const displayName = user.displayName || (user.email ? user.email.split('@')[0] : 'User');
  if (brandUserName) brandUserName.textContent = displayName;
  if (brandUserEmail) brandUserEmail.textContent = user.email || '';

  const avatarBox = document.getElementById('brand-avatar-box');
  let userPhoto = user.photoURL || user.providerData?.[0]?.photoURL || '';
  if (userPhoto && userPhoto.includes('googleusercontent.com')) {
    // Request HD quality from Google profile photo server
    userPhoto = userPhoto.replace(/=s\d+(-c)?/i, '=s384-c');
  }

  if (avatarBox) {
    if (userPhoto) {
      avatarBox.innerHTML = `<img src="${userPhoto}" alt="${escapeHtml(displayName)}" class="brand-avatar-img" referrerpolicy="no-referrer" onerror="this.parentElement.textContent='${(displayName.charAt(0) || 'U').toUpperCase()}';">`;
    } else {
      avatarBox.textContent = (displayName.charAt(0) || user.email?.charAt(0) || 'U').toUpperCase();
    }
  }

  // Check if existing brand is already set
  try {
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);
    if (snap.exists() && snap.data().brandName) {
      if (brandNameInput) brandNameInput.value = snap.data().brandName;
      if (saveBrandBtn) saveBrandBtn.textContent = 'Continue to Workspace';
    }
  } catch (_) {}
}

/**
 * Dynamic button label on typing brand name
 */
if (brandNameInput && saveBrandBtn) {
  brandNameInput.addEventListener('input', () => {
    const val = brandNameInput.value.trim();
    if (val.length > 0) {
      saveBrandBtn.textContent = 'Continue & Start 14-Day Free Trial';
    } else {
      saveBrandBtn.textContent = 'Skip and Sign Up';
    }
  });
}

/**
 * Save Brand Name & Enter Workspace
 */
if (saveBrandBtn) {
  saveBrandBtn.addEventListener('click', async () => {
    if (!activeFirebaseUser) {
      window.location.href = 'workspace.html';
      return;
    }

    const brand = brandNameInput ? brandNameInput.value.trim() : '';
    saveBrandBtn.disabled = true;
    saveBrandBtn.textContent = 'Starting 14-day trial...';

    await syncUserTrialRecord(activeFirebaseUser, activeFirebaseUser.displayName, brand);

    if (brandFormStatus) {
      brandFormStatus.textContent = '14-Day Free Trial Activated! Launching Workspace...';
    }

    setTimeout(() => {
      window.location.href = 'workspace.html';
    }, 600);
  });
}

/**
 * Brand step log out button
 */
if (brandLogoutLink) {
  brandLogoutLink.addEventListener('click', async (e) => {
    e.preventDefault();
    await signOut(auth);
    if (brandStep) brandStep.hidden = true;
    if (authFormWrapper) authFormWrapper.hidden = false;
  });
}

/**
 * Handle Form Submit (Sign In or Sign Up)
 */
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearStatus();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email) {
    showStatus('Please enter your email address.', true);
    emailInput.focus();
    return;
  }

  if (!password || password.length < 6) {
    showStatus('Password must be at least 6 characters long.', true);
    passwordInput.focus();
    return;
  }

  submitButton.disabled = true;
  const originalBtnText = submitButton.textContent;
  submitButton.textContent = currentMode === 'signup' ? 'Creating account...' : 'Signing in...';

  try {
    if (currentMode === 'signup') {
      // Create user with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update Display Name if provided
      const firstName = firstNameInput ? firstNameInput.value.trim() : '';
      const lastName = lastNameInput ? lastNameInput.value.trim() : '';
      const fullName = [firstName, lastName].filter(Boolean).join(' ');

      if (fullName) {
        try {
          await updateProfile(user, { displayName: fullName });
        } catch (_) {}
      }

      // Provision 14-day trial in Firestore
      await syncUserTrialRecord(user, fullName);
      await presentBrandCustomizationStep(user);

    } else {
      // Sign In with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await syncUserTrialRecord(user);
      await presentBrandCustomizationStep(user);
    }
  } catch (error) {
    console.error('Firebase Auth Error:', error);
    showStatus(parseAuthError(error), true);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = originalBtnText;
  }
});

/**
 * Google Sign-In with Popup
 */
const unauthorizedCard = document.getElementById('unauthorized-domain-card');
const currentHostnameCode = document.getElementById('current-hostname-code');
const btnUnauthorizedDemo = document.getElementById('btn-unauthorized-demo');
const guestAuthBtn = document.getElementById('guest-auth-btn');

function enterGuestMode() {
  const guestUser = {
    uid: 'guest-' + Date.now(),
    displayName: 'Preview Explorer',
    email: 'guest@flippage.preview',
    photoURL: ''
  };
  localStorage.setItem('flippage_guest_user', JSON.stringify(guestUser));
  localStorage.setItem('flippage_user_name', 'Preview Explorer');
  showStatus('Entering workspace in Guest/Demo Mode...', false);
  setTimeout(() => {
    window.location.href = 'workspace.html';
  }, 400);
}

if (guestAuthBtn) {
  guestAuthBtn.addEventListener('click', () => {
    enterGuestMode();
  });
}

if (btnUnauthorizedDemo) {
  btnUnauthorizedDemo.addEventListener('click', () => {
    enterGuestMode();
  });
}

if (googleAuthBtn) {
  googleAuthBtn.addEventListener('click', async () => {
    clearStatus();
    if (unauthorizedCard) unauthorizedCard.style.display = 'none';
    googleAuthBtn.disabled = true;

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      console.log('--- Google Authenticated User Profile ---');
      console.log('User Display Name:', user.displayName);
      console.log('User Email:', user.email);
      console.log('User Photo URL (Google Chrome Icon):', user.photoURL);
      console.log('User UID:', user.uid);

      if (user.photoURL) {
        try {
          localStorage.setItem('flippage_user_photo', user.photoURL);
          localStorage.setItem('flippage_user_name', user.displayName || '');
        } catch (_) {}
      }

      // Provision/sync 14-day trial in Firestore
      await syncUserTrialRecord(user);
      await presentBrandCustomizationStep(user);

    } catch (error) {
      console.error('Google Sign-In Error:', error);
      const msg = parseAuthError(error);
      showStatus(msg, true);
      
      if (error.code === 'auth/unauthorized-domain' && unauthorizedCard) {
        if (currentHostnameCode) {
          currentHostnameCode.textContent = window.location.hostname;
        }
        unauthorizedCard.style.display = 'block';
      }
    } finally {
      googleAuthBtn.disabled = false;
    }
  });
}

/**
 * Password Reset Handler
 */
if (forgotButton) {
  forgotButton.addEventListener('click', async () => {
    clearStatus();
    const email = emailInput.value.trim();

    if (!email) {
      showStatus('Please enter your email address above to reset your password.', true);
      emailInput.focus();
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      showStatus(`Password reset email sent to ${email}. Check your inbox!`, false);
    } catch (error) {
      console.error('Password Reset Error:', error);
      showStatus(parseAuthError(error), true);
    }
  });
}

/**
 * Sign Out Handler
 */
if (signoutButton) {
  signoutButton.addEventListener('click', async () => {
    try {
      await signOut(auth);
      showStatus('You have been signed out.', false);
    } catch (error) {
      console.error('Sign Out Error:', error);
      showStatus('Failed to sign out. Please try again.', true);
    }
  });
}

/**
 * Listen for Auth State Changes (Real-time Firebase listener)
 */
onAuthStateChanged(auth, (user) => {
  if (user) {
    activeFirebaseUser = user;
    if (authFormWrapper) authFormWrapper.hidden = true;
    if (signedInCard) signedInCard.hidden = false;

    const displayName = user.displayName || (user.email ? user.email.split('@')[0] : 'Workspace Member');
    if (userDisplayName) userDisplayName.textContent = `Welcome back, ${displayName}!`;
    if (userDisplayEmail) userDisplayEmail.textContent = user.email || '';

    if (userAvatarInitial) {
      let photo = user.photoURL || user.providerData?.[0]?.photoURL || localStorage.getItem('flippage_user_photo') || '';
      console.log('Rendering signed-in profile avatar photoURL:', photo);
      if (photo && photo.includes('googleusercontent.com')) {
        photo = photo.replace(/=s\d+(-c)?/i, '=s384-c');
      }
      if (photo) {
        userAvatarInitial.innerHTML = `<img src="${photo}" alt="${escapeHtml(displayName)}" class="user-avatar-img" referrerpolicy="no-referrer" onerror="this.parentElement.textContent='${(displayName.charAt(0) || 'U').toUpperCase()}';">`;
        userAvatarInitial.style.padding = '0';
        userAvatarInitial.style.overflow = 'hidden';
      } else {
        const initial = (displayName.charAt(0) || 'U').toUpperCase();
        userAvatarInitial.textContent = initial;
      }
    }
  } else {
    activeFirebaseUser = null;
    if (authFormWrapper) authFormWrapper.hidden = false;
    if (signedInCard) signedInCard.hidden = true;
    if (brandStep) brandStep.hidden = true;
  }
});

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
