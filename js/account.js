/**
 * Firebase Real Authentication, Required Company Setup & Profile Management - FlipPage
 * Full Firestore Real-Time Sync for Registered Users
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
  setDoc,
  updateDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
import { firebaseConfig } from "./firebaseConfig.js";

// Master Admin Access List
const ADMIN_EMAILS = [
  "yutrytopipygh@gmail.com",
  "paneljoker145@gmail.com",
  "colddoggy1@gmail.com",
  "admin@gmail.com",
  "admin@northbay.lk",
  "admin@flippage.com"
];

function isAuthorizedAdmin(email) {
  if (!email) return false;
  const clean = email.toLowerCase().trim();
  return ADMIN_EMAILS.includes(clean) || clean.startsWith('admin@');
}

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

// Standard Error Handler per Firebase Skill
function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

// DOM Elements - Auth Form
const authFormWrapper = document.getElementById('auth-form-wrapper');
const signedInCard = document.getElementById('signedin-state');
const userDisplayName = document.getElementById('user-display-name');
const userDisplayEmail = document.getElementById('user-display-email');
const userAvatarInitial = document.getElementById('user-avatar-initial');
const userPlanTierLabel = document.getElementById('user-plan-tier-label');
const userTrialDaysLabel = document.getElementById('user-trial-days-label');
const signoutButton = document.getElementById('signout-button');

// Profile Edit Form DOMs
const profileEditForm = document.getElementById('profile-edit-form');
const profileDisplayNameInput = document.getElementById('profile-display-name');
const profileCompanyNameInput = document.getElementById('profile-company-name');
const profileBrandSlugInput = document.getElementById('profile-brand-slug');
const btnSaveProfile = document.getElementById('btn-save-profile');
const profileFormStatus = document.getElementById('profile-form-status');

// Sign-in / Sign-up Forms
const form = document.getElementById('account-form');
const signInTab = document.getElementById('signin-tab');
const signUpTab = document.getElementById('signup-tab');
const nameFields = document.getElementById('name-fields');
const firstNameInput = document.getElementById('first-name-input');
const lastNameInput = document.getElementById('last-name-input');
const signupCompanyField = document.getElementById('signup-company-field');
const signupCompanyInput = document.getElementById('signup-company-input');
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

// Mandatory Company Setup Step Elements
const brandStep = document.getElementById('brand-onboarding-step');
const brandUserName = document.getElementById('brand-user-name');
const brandUserEmail = document.getElementById('brand-user-email');
const brandLogoutLink = document.getElementById('brand-logout-link');
const brandSetupForm = document.getElementById('brand-setup-form');
const companyNameInput = document.getElementById('company-name-input');
const brandNameInput = document.getElementById('brand-name-input');
const saveBrandBtn = document.getElementById('save-brand-btn');
const brandFormStatus = document.getElementById('brand-form-status');

let currentMode = 'signin'; // 'signin' | 'signup'
let activeFirebaseUser = null;
let activeUserFirestoreData = null;
let unsubscribeUserDoc = null;

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

  if (nameFields) nameFields.hidden = !isSignUp;
  if (signupCompanyField) signupCompanyField.hidden = !isSignUp;
  
  accountTitle.textContent = isSignUp ? 'Create your workspace' : 'Welcome back';
  accountSubtitle.textContent = isSignUp ? 'Start building beautiful flipbooks today.' : 'Sign in to continue to your workspace.';
  submitButton.textContent = isSignUp ? 'Create account' : 'Sign in';
  
  if (rememberOption) rememberOption.hidden = isSignUp;
  if (forgotButton) forgotButton.hidden = isSignUp;

  clearStatus();
}

if (signInTab) signInTab.addEventListener('click', () => setMode('signin'));
if (signUpTab) signUpTab.addEventListener('click', () => setMode('signup'));

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

function showStatus(message, isError = false) {
  if (!formStatus) return;
  formStatus.textContent = message;
  formStatus.classList.toggle('is-error', isError);
  formStatus.style.color = isError ? '#DC2626' : '#059669';
}

function clearStatus() {
  if (!formStatus) return;
  formStatus.textContent = '';
  formStatus.classList.remove('is-error');
}

function showBrandStatus(message, isError = false) {
  if (!brandFormStatus) return;
  brandFormStatus.textContent = message;
  brandFormStatus.style.color = isError ? '#DC2626' : '#059669';
  brandFormStatus.style.fontWeight = '600';
  brandFormStatus.style.fontSize = '0.88rem';
}

function showProfileStatus(message, isError = false) {
  if (!profileFormStatus) return;
  profileFormStatus.textContent = message;
  profileFormStatus.style.color = isError ? '#DC2626' : '#059669';
  profileFormStatus.style.fontWeight = '600';
  profileFormStatus.style.fontSize = '0.88rem';
}

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
      return `This domain (${window.location.hostname}) is not authorized in your Firebase Project. Please add it to Firebase Console > Authentication > Settings > Authorized Domains, or use Email sign in below.`;
    default:
      return error.message || 'An unexpected error occurred. Please try again.';
  }
}

// Convert string to clean URL slug
function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Auto-sync Company Name to Brand Slug in Setup Form
 */
if (companyNameInput && brandNameInput) {
  companyNameInput.addEventListener('input', () => {
    const val = companyNameInput.value.trim();
    if (val.length > 0) {
      brandNameInput.value = slugify(val);
    }
  });
}

if (profileCompanyNameInput && profileBrandSlugInput) {
  profileCompanyNameInput.addEventListener('input', () => {
    if (!profileBrandSlugInput.value || profileBrandSlugInput.value.trim() === '') {
      profileBrandSlugInput.value = slugify(profileCompanyNameInput.value.trim());
    }
  });
}

/**
 * Present Mandatory Company Setup Step
 */
function presentBrandCustomizationStep(user, existingData = null) {
  activeFirebaseUser = user;
  
  if (authFormWrapper) authFormWrapper.hidden = true;
  if (signedInCard) signedInCard.hidden = true;
  if (brandStep) brandStep.hidden = false;

  const displayName = user.displayName || (user.email ? user.email.split('@')[0] : 'Member');
  if (brandUserName) brandUserName.textContent = displayName;
  if (brandUserEmail) brandUserEmail.textContent = user.email || '';

  const avatarBox = document.getElementById('brand-avatar-box');
  let userPhoto = user.photoURL || user.providerData?.[0]?.photoURL || '';
  if (userPhoto && userPhoto.includes('googleusercontent.com')) {
    userPhoto = userPhoto.replace(/=s\d+(-c)?/i, '=s384-c');
  }

  if (avatarBox) {
    if (userPhoto) {
      avatarBox.innerHTML = `<img src="${userPhoto}" alt="${escapeHtml(displayName)}" class="brand-avatar-img" referrerpolicy="no-referrer" onerror="this.parentElement.textContent='${(displayName.charAt(0) || 'U').toUpperCase()}';">`;
    } else {
      avatarBox.textContent = (displayName.charAt(0) || user.email?.charAt(0) || 'U').toUpperCase();
    }
  }

  // Pre-fill existing data if available
  if (existingData) {
    if (companyNameInput && existingData.companyName) {
      companyNameInput.value = existingData.companyName;
    }
    if (brandNameInput && existingData.brandName) {
      brandNameInput.value = slugify(existingData.brandName);
    }
  }

  if (companyNameInput) {
    setTimeout(() => companyNameInput.focus(), 150);
  }
}

/**
 * Handle Mandatory Company Setup Submission
 */
if (brandSetupForm) {
  brandSetupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!activeFirebaseUser) {
      showBrandStatus('No active user session. Please sign in.', true);
      return;
    }

    const company = companyNameInput ? companyNameInput.value.trim() : '';
    if (!company) {
      showBrandStatus('⚠️ Company / Organization Name is required.', true);
      if (companyNameInput) companyNameInput.focus();
      return;
    }

    const slug = (brandNameInput ? brandNameInput.value.trim() : '') || slugify(company);
    const brandUrl = `FlipPage.com/${slug}`;

    if (saveBrandBtn) {
      saveBrandBtn.disabled = true;
      saveBrandBtn.textContent = 'Saving to Firestore & launching...';
    }

    try {
      const user = activeFirebaseUser;
      const userRef = doc(db, 'users', user.uid);
      const existingSnap = await getDoc(userRef);
      const existing = existingSnap.exists() ? existingSnap.data() : {};
      const now = new Date();

      const isAdmin = isAuthorizedAdmin(user.email);
      const plan = existing.plan || (isAdmin ? 'PRO' : 'FREE');
      const isPaid = Boolean(existing.isPaid || plan === 'PRO');
      const trialDays = existing.trialDays || 14;
      const trialStartDate = existing.trialStartDate || now.toISOString();
      const trialEndDate = existing.trialEndDate || new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000).toISOString();

      const payload = {
        uid: user.uid,
        displayName: user.displayName || company,
        email: user.email || '',
        photoURL: user.photoURL || '',
        companyName: company,
        brandName: company,
        brandUrl: brandUrl,
        taskName: `${company} Workspace`,
        project: company,
        role: isAdmin ? 'admin' : (existing.role || 'user'),
        plan: plan,
        isPaid: isPaid,
        trialDays: trialDays,
        trialStartDate: trialStartDate,
        trialEndDate: trialEndDate,
        status: 'active',
        createdAt: existing.createdAt || now.toISOString(),
        updatedAt: now.toISOString(),
        lastLoginAt: now.toISOString()
      };

      await setDoc(userRef, payload, { merge: true });
      showBrandStatus('✅ Workspace configured! Redirecting...', false);

      setTimeout(() => {
        window.location.href = 'workspace.html';
      }, 500);

    } catch (err) {
      handleFirestoreError(err, 'write', `users/${activeFirebaseUser.uid}`);
      showBrandStatus(`Failed to update Firestore: ${err.message}`, true);
      if (saveBrandBtn) {
        saveBrandBtn.disabled = false;
        saveBrandBtn.textContent = 'Save Company & Launch Workspace →';
      }
    }
  });
}

/**
 * Live Auto-Save Profile & Company Details to Firestore
 */
let autoSaveTimeout = null;
let isSavingProfile = false;

async function autoSaveProfile() {
  if (!activeFirebaseUser) return;
  const newDisplayName = profileDisplayNameInput ? profileDisplayNameInput.value.trim() : '';
  const newCompanyName = profileCompanyNameInput ? profileCompanyNameInput.value.trim() : '';
  const rawSlug = profileBrandSlugInput ? profileBrandSlugInput.value.trim() : '';

  if (!newCompanyName) {
    showProfileStatus('⚠️ Company Name is required to save.', true);
    return;
  }

  const cleanSlug = rawSlug ? slugify(rawSlug) : slugify(newCompanyName);
  const brandUrl = `FlipPage.com/${cleanSlug}`;

  showProfileStatus('💾 Saving to Firestore...', false);
  isSavingProfile = true;

  try {
    // 1. Update Firebase Auth display name if changed
    if (newDisplayName && newDisplayName !== activeFirebaseUser.displayName) {
      await updateProfile(activeFirebaseUser, { displayName: newDisplayName }).catch(() => {});
    }

    // 2. Update Firestore document
    const userRef = doc(db, 'users', activeFirebaseUser.uid);
    const updatePayload = {
      displayName: newDisplayName || newCompanyName,
      companyName: newCompanyName,
      brandName: newCompanyName,
      brandUrl: brandUrl,
      taskName: `${newCompanyName} Workspace`,
      project: newCompanyName,
      updatedAt: new Date().toISOString()
    };

    await setDoc(userRef, updatePayload, { merge: true });

    if (userDisplayName) {
      userDisplayName.textContent = `Welcome back, ${newDisplayName || newCompanyName}!`;
    }

    showProfileStatus('✓ All changes saved to Firestore', false);
    setTimeout(() => {
      if (profileFormStatus && profileFormStatus.textContent === '✓ All changes saved to Firestore') {
        profileFormStatus.textContent = '';
      }
    }, 2500);

  } catch (err) {
    handleFirestoreError(err, 'update', `users/${activeFirebaseUser.uid}`);
    showProfileStatus(`Failed to auto-save: ${err.message}`, true);
  } finally {
    isSavingProfile = false;
  }
}

function triggerDebouncedAutoSave() {
  clearTimeout(autoSaveTimeout);
  if (profileFormStatus) {
    profileFormStatus.textContent = 'Saving...';
    profileFormStatus.style.color = '#64748B';
    profileFormStatus.style.fontWeight = '500';
  }
  autoSaveTimeout = setTimeout(autoSaveProfile, 400);
}

if (profileDisplayNameInput) {
  profileDisplayNameInput.addEventListener('input', triggerDebouncedAutoSave);
  profileDisplayNameInput.addEventListener('change', autoSaveProfile);
}

if (profileCompanyNameInput) {
  profileCompanyNameInput.addEventListener('input', () => {
    if (profileBrandSlugInput && profileBrandSlugInput.dataset.manual !== 'true') {
      profileBrandSlugInput.value = slugify(profileCompanyNameInput.value.trim());
    }
    triggerDebouncedAutoSave();
  });
  profileCompanyNameInput.addEventListener('change', autoSaveProfile);
}

if (profileBrandSlugInput) {
  profileBrandSlugInput.addEventListener('input', () => {
    profileBrandSlugInput.dataset.manual = 'true';
    triggerDebouncedAutoSave();
  });
  profileBrandSlugInput.addEventListener('change', autoSaveProfile);
}

if (profileEditForm) {
  profileEditForm.addEventListener('submit', (e) => {
    e.preventDefault();
    autoSaveProfile();
  });
}

/**
 * Handle Auth Form Submit (Sign In or Sign Up)
 */
if (form) {
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
        const companyEntered = signupCompanyInput ? signupCompanyInput.value.trim() : '';
        const firstName = firstNameInput ? firstNameInput.value.trim() : '';
        const lastName = lastNameInput ? lastNameInput.value.trim() : '';
        const fullName = [firstName, lastName].filter(Boolean).join(' ');

        // Create user with Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        if (fullName) {
          try {
            await updateProfile(user, { displayName: fullName });
          } catch (_) {}
        }

        // Initialize user document in Firestore
        const now = new Date();
        const trialDays = 14;
        const trialEndDate = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000).toISOString();
        const isAdmin = isAuthorizedAdmin(email);
        const initialPlan = isAdmin ? 'PRO' : 'FREE';

        const userDocPayload = {
          uid: user.uid,
          displayName: fullName || (email ? email.split('@')[0] : 'Member'),
          email: user.email,
          photoURL: user.photoURL || '',
          companyName: companyEntered,
          brandName: companyEntered,
          brandUrl: companyEntered ? `FlipPage.com/${slugify(companyEntered)}` : '',
          taskName: companyEntered ? `${companyEntered} Workspace` : `${fullName || 'Member'}'s Workspace`,
          project: companyEntered || 'Flipbook Publishing',
          role: isAdmin ? 'admin' : 'user',
          plan: initialPlan,
          isPaid: initialPlan === 'PRO',
          trialDays: trialDays,
          trialStartDate: now.toISOString(),
          trialEndDate: trialEndDate,
          status: 'active',
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          lastLoginAt: now.toISOString()
        };

        await setDoc(doc(db, 'users', user.uid), userDocPayload, { merge: true });

        // If company was not entered or empty, present mandatory company setup step
        if (!companyEntered) {
          presentBrandCustomizationStep(user);
        } else {
          window.location.href = 'workspace.html';
        }

      } else {
        // Sign In with Firebase Auth
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Check if user has completed company setup in Firestore
        const userDocRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userDocRef);
        const userData = userSnap.exists() ? userSnap.data() : null;

        if (!userData || !userData.companyName) {
          presentBrandCustomizationStep(user, userData);
        } else {
          // Update lastLoginAt
          await updateDoc(userDocRef, { lastLoginAt: new Date().toISOString() }).catch(() => {});
          window.location.href = 'workspace.html';
        }
      }
    } catch (error) {
      console.error('Firebase Auth Error:', error);
      showStatus(parseAuthError(error), true);
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = originalBtnText;
    }
  });
}

/**
 * Google Sign-In with Popup
 */
const unauthorizedCard = document.getElementById('unauthorized-domain-card');
const currentHostnameCode = document.getElementById('current-hostname-code');

if (googleAuthBtn) {
  googleAuthBtn.addEventListener('click', async () => {
    clearStatus();
    if (unauthorizedCard) unauthorizedCard.style.display = 'none';
    googleAuthBtn.disabled = true;

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      console.log('Google Auth User:', user.email, user.displayName);

      // Check user document in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userDocRef);
      const now = new Date();
      const isAdmin = isAuthorizedAdmin(user.email);

      if (!snap.exists()) {
        // First-time Google user -> Provision Firestore trial and present REQUIRED company setup
        const trialDays = 14;
        const trialEndDate = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000).toISOString();
        const initialPlan = isAdmin ? 'PRO' : 'FREE';

        await setDoc(userDocRef, {
          uid: user.uid,
          displayName: user.displayName || (user.email ? user.email.split('@')[0] : 'Member'),
          email: user.email || '',
          photoURL: user.photoURL || '',
          role: isAdmin ? 'admin' : 'user',
          plan: initialPlan,
          isPaid: initialPlan === 'PRO',
          companyName: '',
          brandName: '',
          brandUrl: '',
          trialDays: trialDays,
          trialStartDate: now.toISOString(),
          trialEndDate: trialEndDate,
          status: 'active',
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          lastLoginAt: now.toISOString()
        });

        presentBrandCustomizationStep(user);
      } else {
        const data = snap.data() || {};
        // Sync photo and last login
        await setDoc(userDocRef, {
          photoURL: user.photoURL || data.photoURL || '',
          lastLoginAt: now.toISOString()
        }, { merge: true });

        // If company name is missing, show mandatory company setup
        if (!data.companyName && !data.brandName) {
          presentBrandCustomizationStep(user, data);
        } else {
          window.location.href = 'workspace.html';
        }
      }

    } catch (error) {
      console.error('Google Sign-In Error:', error);
      showStatus(parseAuthError(error), true);
      
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
      if (unsubscribeUserDoc) unsubscribeUserDoc();
      await signOut(auth);
      showStatus('You have been signed out.', false);
    } catch (error) {
      console.error('Sign Out Error:', error);
      showStatus('Failed to sign out. Please try again.', true);
    }
  });
}

/**
 * Render Signed-In User State & Populate Profile Editor
 */
function renderSignedInUserState(user, firestoreData) {
  activeFirebaseUser = user;
  activeUserFirestoreData = firestoreData;

  const displayName = firestoreData?.displayName || user.displayName || (user.email ? user.email.split('@')[0] : 'Member');
  const companyName = firestoreData?.companyName || firestoreData?.brandName || '';
  const brandUrl = firestoreData?.brandUrl || (companyName ? `FlipPage.com/${slugify(companyName)}` : '');
  const plan = firestoreData?.plan || (firestoreData?.isPaid ? 'PRO' : 'FREE');
  const isPaid = firestoreData?.isPaid || plan === 'PRO';

  if (userDisplayName) userDisplayName.textContent = `Welcome back, ${displayName}!`;
  if (userDisplayEmail) userDisplayEmail.textContent = user.email || '';

  // Avatar
  if (userAvatarInitial) {
    let photo = user.photoURL || firestoreData?.photoURL || '';
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

  // Plan info
  if (userPlanTierLabel) {
    userPlanTierLabel.innerHTML = isPaid 
      ? `👑 <strong>PRO Plan</strong>`
      : `<strong>14-Day Free Trial</strong>`;
  }

  if (userTrialDaysLabel && firestoreData?.trialEndDate) {
    const daysLeft = Math.ceil((new Date(firestoreData.trialEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) {
      userTrialDaysLabel.textContent = `(Trial expired ${Math.abs(daysLeft)}d ago)`;
      userTrialDaysLabel.style.color = '#DC2626';
    } else {
      userTrialDaysLabel.textContent = `(${daysLeft} days remaining)`;
    }
  }

  // Pre-fill profile & company inputs
  if (profileDisplayNameInput) profileDisplayNameInput.value = displayName;
  if (profileCompanyNameInput) profileCompanyNameInput.value = companyName;
  if (profileBrandSlugInput) {
    const slug = brandUrl ? brandUrl.replace(/^FlipPage\.com\//i, '') : slugify(companyName);
    profileBrandSlugInput.value = slug;
  }

  // Show signed in view
  if (authFormWrapper) authFormWrapper.hidden = true;
  if (brandStep) brandStep.hidden = true;
  if (signedInCard) signedInCard.hidden = false;
}

/**
 * Listen for Auth State Changes (Real-time Firebase listener)
 */
onAuthStateChanged(auth, async (user) => {
  if (user) {
    activeFirebaseUser = user;

    // Listen to real-time user document updates in Firestore
    const userDocRef = doc(db, 'users', user.uid);
    
    if (unsubscribeUserDoc) unsubscribeUserDoc();
    
    unsubscribeUserDoc = onSnapshot(userDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        // If company is still not configured, show mandatory company setup step
        if (!data.companyName && !data.brandName) {
          presentBrandCustomizationStep(user, data);
        } else {
          renderSignedInUserState(user, data);
        }
      } else {
        // Document not created yet -> present company onboarding step
        presentBrandCustomizationStep(user);
      }
    }, (error) => {
      handleFirestoreError(error, 'listen', `users/${user.uid}`);
      // Fallback
      renderSignedInUserState(user, null);
    });

  } else {
    activeFirebaseUser = null;
    activeUserFirestoreData = null;
    if (unsubscribeUserDoc) {
      unsubscribeUserDoc();
      unsubscribeUserDoc = null;
    }
    if (authFormWrapper) authFormWrapper.hidden = false;
    if (signedInCard) signedInCard.hidden = true;
    if (brandStep) brandStep.hidden = true;
  }
});

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
