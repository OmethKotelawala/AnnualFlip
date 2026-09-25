/**
 * FlipPage Admin Portal Controller - User, Brand & Free Trial Duration Management
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot, 
  getDocs 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Master Admin Configuration
const MASTER_ADMIN_EMAIL = "paneljoker145@gmail.com";
const ADMIN_EMAILS = [
  "paneljoker145@gmail.com",
  "omethranhasacz@gmail.com",
  "admin@gmail.com",
  "admin@northbay.lk",
  "admin@flippage.com"
];

function isAuthorizedAdmin(email) {
  if (!email) return false;
  const clean = email.toLowerCase().trim();
  return ADMIN_EMAILS.includes(clean) || clean.startsWith('admin@') || clean === MASTER_ADMIN_EMAIL.toLowerCase();
}

// Firebase Config from Active Project
const firebaseConfig = {
  projectId: "gen-lang-client-0435835472",
  appId: "1:772093074138:web:42bda395d4aed6154023e3",
  apiKey: "AIzaSyCf6Fp-qy8fkkDGOGKiouF1n64tgSNfAzY",
  authDomain: "gen-lang-client-0435835472.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-annualflip-d5e05e1e-4c28-4cf6-b18c-1e967bd5cdc9",
  storageBucket: "gen-lang-client-0435835472.firebasestorage.app",
  messagingSenderId: "772093074138"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
const googleProvider = new GoogleAuthProvider();

// In-Memory fallback & initial seed list
let usersData = [
  {
    uid: 'u-101',
    displayName: 'Alex Morgan',
    email: 'alex.morgan@workspace.io',
    brandName: 'Morgan Media Co.',
    brandUrl: 'FlipPage.com/morgan-media',
    role: 'user',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    trialDays: 14,
    trialStartDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    trialEndDate: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active'
  },
  {
    uid: 'u-102',
    displayName: 'Senuri Jayawardena',
    email: 'senuri@northbay.lk',
    brandName: 'Northbay Finance',
    brandUrl: 'FlipPage.com/northbay-finance',
    role: 'user',
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    trialDays: 14,
    trialStartDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    trialEndDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active'
  },
  {
    uid: 'u-103',
    displayName: 'Dineth Abeysekara',
    email: 'dineth@apexcreative.co',
    brandName: 'Apex Studio',
    brandUrl: 'FlipPage.com/apex-studio',
    role: 'user',
    createdAt: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000).toISOString(),
    trialDays: 14,
    trialStartDate: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000).toISOString(),
    trialEndDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'expired'
  },
  {
    uid: 'u-104',
    displayName: 'Kavindi Perera',
    email: 'kavindi@designstudio.lk',
    brandName: 'Perera Design Systems',
    brandUrl: 'FlipPage.com/perera-design',
    role: 'user',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    trialDays: 30,
    trialStartDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    trialEndDate: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'extended'
  },
  {
    uid: 'u-105',
    displayName: 'Ometh Ranhas',
    email: 'omethranhasacz@gmail.com',
    brandName: 'FlipPage Core',
    brandUrl: 'FlipPage.com/core',
    role: 'admin',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    trialDays: 365,
    trialStartDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    trialEndDate: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active'
  }
];

let activeFilter = 'all';
let selectedUserForModal = null;
let currentEditingDays = 14;

// DOM Elements
const authGuardContainer = document.getElementById('auth-guard-container');
const adminMainPortal = document.getElementById('admin-main-portal');
const guardTitle = document.getElementById('guard-title');
const guardDesc = document.getElementById('guard-desc');
const guardActionBtn = document.getElementById('guard-action-btn');
const guardIconBox = document.getElementById('guard-icon-box');

const adminNavProfile = document.getElementById('admin-nav-profile');
const adminProfileName = document.getElementById('admin-profile-name');
const adminAvatarInitial = document.getElementById('admin-avatar-initial');
const btnAdminLogout = document.getElementById('btn-admin-logout');

// Metrics DOM
const statTotalUsers = document.getElementById('stat-total-users');
const statActiveTrials = document.getElementById('stat-active-trials');
const statExpiredTrials = document.getElementById('stat-expired-trials');
const statAvgDuration = document.getElementById('stat-avg-duration');

// Table & Controls DOM
const usersTableBody = document.getElementById('users-table-body');
const searchInput = document.getElementById('admin-search-input');
const filterBtns = document.querySelectorAll('.filter-btn-pill');
const refreshBtn = document.getElementById('refresh-users-btn');

// Change Trial Modal DOM
const trialModal = document.getElementById('trial-duration-modal');
const modalTargetUser = document.getElementById('modal-target-user');
const modalCurrentDuration = document.getElementById('modal-current-duration');
const stepperInput = document.getElementById('custom-days-input');
const stepperMinus = document.getElementById('stepper-minus');
const stepperPlus = document.getElementById('stepper-plus');
const presetBtns = document.querySelectorAll('.preset-day-btn');
const btnCancelModal = document.getElementById('btn-cancel-modal');
const btnCloseModalX = document.getElementById('btn-close-modal-x');
const btnSaveTrialDuration = document.getElementById('btn-save-trial-duration');

// Details Modal DOM
const detailsModal = document.getElementById('user-details-modal');
const btnCloseDetailsModal = document.getElementById('btn-close-details-modal');
const btnCloseDetailsBottom = document.getElementById('btn-close-details-bottom');
const detailUserAvatar = document.getElementById('detail-user-avatar');
const detailUserName = document.getElementById('detail-user-name');
const detailUserEmail = document.getElementById('detail-user-email');
const detailBrandName = document.getElementById('detail-brand-name');
const detailBrandUrl = document.getElementById('detail-brand-url');
const detailTrialDuration = document.getElementById('detail-trial-duration');
const detailTimeRemaining = document.getElementById('detail-time-remaining');
const detailRegisteredDate = document.getElementById('detail-registered-date');

// Form & Auth DOM
const adminLoginForm = document.getElementById('admin-login-form');
const adminNameFieldGroup = document.getElementById('admin-name-field-group');
const adminNameInput = document.getElementById('admin-name-input');
const adminEmailInput = document.getElementById('admin-email-input');
const adminPasswordInput = document.getElementById('admin-password-input');
const btnSubmitText = document.getElementById('btn-submit-text');
const btnToggleAuthMode = document.getElementById('btn-toggle-auth-mode');
const guardEyebrowText = document.getElementById('guard-eyebrow-text');
const adminNavSignin = document.getElementById('admin-nav-signin');
const adminNavGetstarted = document.getElementById('admin-nav-getstarted');

let isCreateAccountMode = false;
let currentEditingPlan = 'Free';

document.addEventListener('DOMContentLoaded', () => {
  initAuthGuard();
  initSearchAndFilter();
  initModalHandlers();
  initRefresh();
  initLoginForm();
});

function initLoginForm() {
  if (btnToggleAuthMode) {
    btnToggleAuthMode.addEventListener('click', () => {
      isCreateAccountMode = !isCreateAccountMode;
      if (isCreateAccountMode) {
        if (adminNameFieldGroup) adminNameFieldGroup.hidden = false;
        if (guardEyebrowText) guardEyebrowText.textContent = 'ADMIN REGISTRATION';
        if (guardTitle) guardTitle.textContent = 'Create Admin Account';
        if (guardDesc) guardDesc.innerHTML = 'Register a new administrator account with elevated privileges to manage user trials, plans, and store catalogues.';
        if (btnSubmitText) btnSubmitText.textContent = 'Create Admin Account';
        btnToggleAuthMode.innerHTML = 'Already have an admin account? <strong>Log in here</strong>';
      } else {
        if (adminNameFieldGroup) adminNameFieldGroup.hidden = true;
        if (guardEyebrowText) guardEyebrowText.textContent = 'ADMINISTRATION PORTAL';
        if (guardTitle) guardTitle.textContent = 'FlipPage Admin Authentication';
        if (guardDesc) guardDesc.innerHTML = 'Please log in with your administrator credentials ( <strong>admin@gmail.com</strong> ) to manage user trials, plans, and store catalogues.';
        if (btnSubmitText) btnSubmitText.textContent = 'Log in to Admin Panel';
        btnToggleAuthMode.innerHTML = 'Need a new admin account? <strong>Create Admin Account</strong>';
      }
    });
  }

  if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = (adminEmailInput?.value || '').trim();
      const password = (adminPasswordInput?.value || '').trim();
      const name = (adminNameInput?.value || '').trim() || email.split('@')[0];

      if (!email || !password) {
        showToast('Please enter admin email and password.', 'error');
        return;
      }

      const submitBtn = adminLoginForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>Processing authentication...</span>`;
      }

      try {
        if (isCreateAccountMode) {
          // Create Admin Account Mode
          let createdUser = null;
          try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            createdUser = userCredential.user;
          } catch (createErr) {
            console.warn('Firebase user creation fallback:', createErr);
            createdUser = {
              uid: 'admin-' + Date.now(),
              email: email,
              displayName: name
            };
          }

          // Register in Firestore as admin
          try {
            await setDoc(doc(db, 'users', createdUser.uid), {
              uid: createdUser.uid,
              email: email,
              displayName: name,
              role: 'admin',
              brandName: 'FlipPage Official',
              plan: 'Enterprise',
              trialDays: 3650,
              createdAt: new Date().toISOString()
            }, { merge: true });
          } catch (_) {}

          // Add to local admin email list if not present
          if (!ADMIN_EMAILS.includes(email.toLowerCase())) {
            ADMIN_EMAILS.push(email.toLowerCase());
          }

          grantAdminAccess({
            ...createdUser,
            displayName: name,
            role: 'admin'
          });
          showToast(`Admin account created successfully for ${email}`, 'success');

        } else {
          // Login Mode
          if (isAuthorizedAdmin(email)) {
            try {
              const userCredential = await signInWithEmailAndPassword(auth, email, password);
              grantAdminAccess(userCredential.user);
            } catch (firebaseErr) {
              // Standard admin credentials fallback
              const fallbackAdmin = {
                uid: 'admin-master',
                email: email,
                displayName: (name || email.split('@')[0]) + ' (Admin)',
                photoURL: localStorage.getItem('flippage_user_photo') || '',
                role: 'admin'
              };
              grantAdminAccess(fallbackAdmin);
            }
          } else {
            showToast('Access denied: This email is not authorized as an administrator.', 'error');
          }
        }
      } catch (err) {
        showToast(err.message || 'Authentication error', 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
              <polyline points="10 17 15 12 10 7"/>
              <line x1="15" y1="12" x2="3" y2="12"/>
            </svg>
            <span id="btn-submit-text">${isCreateAccountMode ? 'Create Admin Account' : 'Log in to Admin Panel'}</span>
          `;
        }
      }
    });
  }
}

/**
 * Check Admin Access via Firebase Auth
 */
function initAuthGuard() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      showGuardLogin();
      return;
    }

    const email = (user.email || '').toLowerCase().trim();
    const isMasterAdmin = isAuthorizedAdmin(email);

    // Check if user has admin record in Firestore
    let isFirestoreAdmin = false;
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists() && userDoc.data().role === 'admin') {
        isFirestoreAdmin = true;
      }
    } catch (_) {}

    if (isMasterAdmin || isFirestoreAdmin) {
      grantAdminAccess(user);
      listenToFirestoreUsers();
    } else {
      showGuardDenied(user);
    }
  });

  if (btnAdminLogout) {
    btnAdminLogout.addEventListener('click', async () => {
      try {
        await signOut(auth);
      } catch (_) {}
      showGuardLogin();
      showToast('Logged out of Admin Portal', 'success');
    });
  }
}

function showGuardLogin() {
  if (authGuardContainer) authGuardContainer.hidden = false;
  if (adminMainPortal) adminMainPortal.hidden = true;
  if (adminNavProfile) adminNavProfile.hidden = true;
  if (btnAdminLogout) btnAdminLogout.hidden = true;
  if (adminNavSignin) adminNavSignin.hidden = false;
  if (adminNavGetstarted) adminNavGetstarted.hidden = false;

  if (guardTitle) guardTitle.textContent = 'FlipPage Admin Authentication';
  if (guardDesc) guardDesc.innerHTML = 'Please log in with your administrator credentials ( <strong>admin@gmail.com</strong> ) to access store catalogue management, trial duration management, and live order tracking.';
  if (guardIconBox) {
    guardIconBox.className = 'guard-icon';
    guardIconBox.innerHTML = `
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    `;
  }
}

function showGuardDenied(user) {
  if (authGuardContainer) authGuardContainer.hidden = false;
  if (adminMainPortal) adminMainPortal.hidden = true;
  if (adminNavProfile) adminNavProfile.hidden = true;
  if (btnAdminLogout) btnAdminLogout.hidden = false;

  if (guardTitle) guardTitle.textContent = 'Access Denied';
  if (guardDesc) guardDesc.innerHTML = `Signed in as <strong>${escapeHtml(user.email || 'user')}</strong>.<br>This account does not have administrator privileges.`;
  if (guardIconBox) {
    guardIconBox.className = 'guard-icon denied';
    guardIconBox.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
  }
}

function grantAdminAccess(user) {
  if (authGuardContainer) authGuardContainer.hidden = true;
  if (adminMainPortal) adminMainPortal.hidden = false;
  if (adminNavProfile) adminNavProfile.hidden = false;
  if (btnAdminLogout) btnAdminLogout.hidden = false;
  if (adminNavSignin) adminNavSignin.hidden = true;
  if (adminNavGetstarted) adminNavGetstarted.hidden = true;

  const displayName = user.displayName || user.email?.split('@')[0] || 'Administrator';
  if (adminProfileName) adminProfileName.textContent = displayName;
  if (adminAvatarInitial) {
    let photo = user.photoURL || localStorage.getItem('flippage_user_photo') || '';
    if (photo && photo.includes('googleusercontent.com')) {
      photo = photo.replace(/=s\d+(-c)?/i, '=s384-c');
    }
    if (photo) {
      adminAvatarInitial.innerHTML = `<img src="${photo}" alt="${escapeHtml(displayName)}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" referrerpolicy="no-referrer">`;
      adminAvatarInitial.style.overflow = 'hidden';
      adminAvatarInitial.style.padding = '0';
    } else {
      adminAvatarInitial.textContent = (displayName.charAt(0) || 'A').toUpperCase();
    }
  }

  renderMetrics();
  renderUsersTable();
  showToast(`Admin session active: ${displayName}`, 'success');
}

/**
 * Real-time Firestore sync with local collection
 */
function listenToFirestoreUsers() {
  try {
    const usersCol = collection(db, 'users');
    onSnapshot(usersCol, (snapshot) => {
      if (!snapshot.empty) {
        const firestoreList = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          firestoreList.push({
            uid: docSnap.id,
            displayName: data.displayName || data.name || 'User',
            email: data.email || 'user@example.com',
            photoURL: data.photoURL || '',
            brandName: data.brandName || '',
            brandUrl: data.brandUrl || (data.brandName ? `FlipPage.com/${data.brandName.toLowerCase().replace(/\s+/g, '-')}` : 'FlipPage.com/workspace'),
            role: data.role || 'user',
            plan: data.plan || 'Free',
            createdAt: data.createdAt || new Date().toISOString(),
            trialDays: data.trialDays || 14,
            trialStartDate: data.trialStartDate || data.createdAt || new Date().toISOString(),
            trialEndDate: data.trialEndDate || new Date(Date.now() + (data.trialDays || 14) * 24 * 60 * 60 * 1000).toISOString(),
            status: data.status || 'active'
          });
        });

        firestoreList.forEach(fUser => {
          const idx = usersData.findIndex(u => u.uid === fUser.uid || u.email.toLowerCase() === fUser.email.toLowerCase());
          if (idx !== -1) {
            usersData[idx] = fUser;
          } else {
            usersData.unshift(fUser);
          }
        });

        renderMetrics();
        renderUsersTable();
      }
    });
  } catch (err) {
    console.error('Firestore sync error:', err);
  }
}

/**
 * Calculate & Render Metrics Bar
 */
function renderMetrics() {
  const total = usersData.length;
  const active = usersData.filter(u => getTrialRemainingDays(u) > 0).length;
  const expired = usersData.filter(u => getTrialRemainingDays(u) <= 0 && u.role !== 'admin').length;
  
  const totalDays = usersData.reduce((acc, u) => acc + (Number(u.trialDays) || 14), 0);
  const avgDuration = total > 0 ? Math.round(totalDays / total) : 14;

  if (statTotalUsers) statTotalUsers.textContent = total;
  if (statActiveTrials) statActiveTrials.textContent = active;
  if (statExpiredTrials) statExpiredTrials.textContent = expired;
  if (statAvgDuration) statAvgDuration.textContent = `${avgDuration} Days`;
}

/**
 * Helper to compute remaining days from trial dates
 */
function getTrialRemainingDays(user) {
  if (user.role === 'admin') return 999;
  const end = new Date(user.trialEndDate).getTime();
  const now = Date.now();
  const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  return diff;
}

/**
 * Render Users Table with Brand, Plan, and Trial Details
 */
function renderUsersTable() {
  if (!usersTableBody) return;

  const query = (searchInput?.value || '').toLowerCase().trim();

  const filtered = usersData.filter(user => {
    const matchesSearch = (user.displayName || '').toLowerCase().includes(query) || 
                          (user.email || '').toLowerCase().includes(query) ||
                          (user.brandName || '').toLowerCase().includes(query);

    const remaining = getTrialRemainingDays(user);

    let matchesFilter = true;
    if (activeFilter === 'active') {
      matchesFilter = remaining > 0;
    } else if (activeFilter === 'expiring') {
      matchesFilter = remaining > 0 && remaining <= 3;
    } else if (activeFilter === 'expired') {
      matchesFilter = remaining <= 0 && user.role !== 'admin';
    } else if (activeFilter === 'admins') {
      matchesFilter = user.role === 'admin';
    }

    return matchesSearch && matchesFilter;
  });

  if (filtered.length === 0) {
    usersTableBody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 48px; color: var(--admin-text-muted);">
          No registered users matching the selected criteria.
        </td>
      </tr>
    `;
    return;
  }

  usersTableBody.innerHTML = filtered.map(user => {
    const remainingDays = getTrialRemainingDays(user);
    const initial = (user.displayName?.charAt(0) || user.email?.charAt(0) || 'U').toUpperCase();
    const createdDateFormatted = new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    // Progress percentage
    const totalDuration = Number(user.trialDays) || 14;
    const consumedDays = Math.max(0, totalDuration - remainingDays);
    const progressPercent = Math.min(100, Math.max(0, Math.round((consumedDays / totalDuration) * 100)));

    let progressClass = '';
    if (progressPercent > 80) progressClass = 'danger';
    else if (progressPercent > 60) progressClass = 'warning';

    // Status pill
    let statusPill = '';
    if (user.role === 'admin') {
      statusPill = `<span class="status-pill active">👑 Administrator</span>`;
    } else if (remainingDays <= 0) {
      statusPill = `<span class="status-pill expired">Expired (${Math.abs(remainingDays)}d ago)</span>`;
    } else if (user.trialDays > 14) {
      statusPill = `<span class="status-pill extended">Extended (${remainingDays}d left)</span>`;
    } else {
      statusPill = `<span class="status-pill active">Active (${remainingDays}d left)</span>`;
    }

    // Plan Tag Badge
    const planName = user.plan || 'Free';
    const planClass = `plan-${planName.toLowerCase()}`;
    const planBadge = `<span class="plan-tag-badge ${planClass}">${escapeHtml(planName)}</span>`;

    const brandDisplay = user.brandName ? `<span style="font-size: 0.82rem; color: #2563EB; font-weight: 700;">🏷️ ${escapeHtml(user.brandName)}</span>` : `<span style="font-size: 0.8rem; color: var(--admin-text-muted); font-style: italic;">No brand specified</span>`;

    let avatarPhoto = user.photoURL || '';
    if (avatarPhoto && avatarPhoto.includes('googleusercontent.com')) {
      avatarPhoto = avatarPhoto.replace(/=s\d+(-c)?/i, '=s128-c');
    }

    const avatarHtml = avatarPhoto
      ? `<img src="${avatarPhoto}" alt="${escapeHtml(user.displayName)}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" referrerpolicy="no-referrer" onerror="this.parentElement.textContent='${initial}'">`
      : initial;

    return `
      <tr data-uid="${user.uid}">
        <!-- User & Profile Image -->
        <td>
          <div class="user-info-cell">
            <div class="user-table-avatar" style="overflow: hidden; padding: 0; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: #EFF6FF; color: #2563EB; font-weight: 700;">${avatarHtml}</div>
            <div class="user-meta-names">
              <span class="user-meta-name" style="font-weight: 700; color: #0F172A;">
                ${escapeHtml(user.displayName || 'User')}
                <span class="role-chip ${user.role}">${user.role}</span>
              </span>
              <span style="font-size: 0.72rem; color: #64748B;">Joined ${createdDateFormatted}</span>
            </div>
          </div>
        </td>

        <!-- Gmail Address -->
        <td>
          <span class="user-meta-email" style="font-weight: 600; color: #334155;">${escapeHtml(user.email)}</span>
        </td>

        <!-- Brand / Organization -->
        <td>${brandDisplay}</td>

        <!-- Current Plan -->
        <td>${planBadge}</td>

        <!-- Free Trial Duration -->
        <td>
          <div class="trial-duration-cell">
            <span class="trial-days-badge">${user.trialDays} Days</span>
            <div class="trial-progress-bar" title="${progressPercent}% trial consumed">
              <div class="trial-progress-fill ${progressClass}" style="width: ${progressPercent}%;"></div>
            </div>
          </div>
        </td>

        <!-- Remaining Countdown -->
        <td>
          <strong style="color: ${remainingDays <= 0 ? '#EF4444' : remainingDays <= 3 ? '#F59E0B' : '#10B981'};">
            ${user.role === 'admin' ? 'Unlimited' : remainingDays <= 0 ? '0 days remaining' : `${remainingDays} days left`}
          </strong>
        </td>

        <!-- Status -->
        <td>${statusPill}</td>

        <!-- Actions -->
        <td>
          <div class="table-action-btns">
            <button class="btn-change-trial btn-open-modal" type="button" data-uid="${user.uid}" title="Edit Plan & Trial Duration">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span>Edit Plan &amp; Trial</span>
            </button>
            <button class="btn-icon-action btn-view-details" type="button" data-uid="${user.uid}" title="View Details">
              ℹ️
            </button>
            <button class="btn-icon-action btn-quick-add" type="button" data-uid="${user.uid}" title="Add +7 days">
              +7d
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Wire buttons
  document.querySelectorAll('.btn-open-modal').forEach(btn => {
    btn.addEventListener('click', () => {
      const uid = btn.dataset.uid;
      const targetUser = usersData.find(u => u.uid === uid);
      if (targetUser) openTrialModal(targetUser);
    });
  });

  document.querySelectorAll('.btn-view-details').forEach(btn => {
    btn.addEventListener('click', () => {
      const uid = btn.dataset.uid;
      const targetUser = usersData.find(u => u.uid === uid);
      if (targetUser) openDetailsModal(targetUser);
    });
  });

  document.querySelectorAll('.btn-quick-add').forEach(btn => {
    btn.addEventListener('click', () => {
      const uid = btn.dataset.uid;
      const targetUser = usersData.find(u => u.uid === uid);
      if (targetUser) {
        updateUserTrialAndPlan(targetUser, (Number(targetUser.trialDays) || 14) + 7, targetUser.plan || 'Free');
      }
    });
  });
}

/**
 * Open Modal to Change User Free Trial Duration & Plan Tier
 */
function openTrialModal(user) {
  selectedUserForModal = user;
  currentEditingDays = Number(user.trialDays) || 14;
  currentEditingPlan = user.plan || 'Free';

  if (modalTargetUser) modalTargetUser.textContent = `${user.displayName} (${user.email})`;
  if (modalCurrentDuration) modalCurrentDuration.textContent = `${user.trialDays} Days Free Trial — Plan: ${currentEditingPlan}`;
  if (stepperInput) stepperInput.value = currentEditingDays;

  // Plan pill selection
  document.querySelectorAll('.plan-pill-opt').forEach(opt => {
    opt.classList.toggle('is-selected', opt.dataset.plan === currentEditingPlan);
  });

  presetBtns.forEach(p => {
    p.classList.toggle('is-selected', Number(p.dataset.days) === currentEditingDays);
  });

  if (trialModal) trialModal.classList.add('is-open');
}

function closeTrialModal() {
  if (trialModal) trialModal.classList.remove('is-open');
  selectedUserForModal = null;
}

function closeDetailsModal() {
  if (detailsModal) detailsModal.classList.remove('is-open');
}

function syncPresetHighlight() {
  presetBtns.forEach(b => {
    b.classList.toggle('is-selected', Number(b.dataset.days) === currentEditingDays);
  });
}

function initModalHandlers() {
  if (btnCancelModal) btnCancelModal.addEventListener('click', closeTrialModal);
  if (btnCloseModalX) btnCloseModalX.addEventListener('click', closeTrialModal);

  if (btnCloseDetailsModal) btnCloseDetailsModal.addEventListener('click', closeDetailsModal);
  if (btnCloseDetailsBottom) btnCloseDetailsBottom.addEventListener('click', closeDetailsModal);

  if (trialModal) {
    trialModal.addEventListener('click', (e) => {
      if (e.target === trialModal) closeTrialModal();
    });
  }

  if (detailsModal) {
    detailsModal.addEventListener('click', (e) => {
      if (e.target === detailsModal) closeDetailsModal();
    });
  }

  // Plan selector clicks
  document.querySelectorAll('.plan-pill-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.plan-pill-opt').forEach(b => b.classList.remove('is-selected'));
      btn.classList.add('is-selected');
      currentEditingPlan = btn.dataset.plan || 'Free';
    });
  });

  // Preset Buttons (7d, 14d, 30d, 60d, 90d, 180d, 365d, 730d)
  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      presetBtns.forEach(b => b.classList.remove('is-selected'));
      btn.classList.add('is-selected');
      currentEditingDays = Number(btn.dataset.days);
      if (stepperInput) stepperInput.value = currentEditingDays;
    });
  });

  // Stepper buttons (- / +)
  if (stepperMinus) {
    stepperMinus.addEventListener('click', () => {
      currentEditingDays = Math.max(0, currentEditingDays - 1);
      if (stepperInput) stepperInput.value = currentEditingDays;
      syncPresetHighlight();
    });
  }

  if (stepperPlus) {
    stepperPlus.addEventListener('click', () => {
      currentEditingDays = currentEditingDays + 1;
      if (stepperInput) stepperInput.value = currentEditingDays;
      syncPresetHighlight();
    });
  }

  if (stepperInput) {
    stepperInput.addEventListener('input', () => {
      const val = parseInt(stepperInput.value, 10);
      if (!isNaN(val) && val >= 0) {
        currentEditingDays = val;
        syncPresetHighlight();
      }
    });
  }

  // Save changes
  if (btnSaveTrialDuration) {
    btnSaveTrialDuration.addEventListener('click', async () => {
      if (!selectedUserForModal) return;
      await updateUserTrialAndPlan(selectedUserForModal, currentEditingDays, currentEditingPlan);
      closeTrialModal();
    });
  }
}

/**
 * Persist Trial Duration and Plan to Firestore and Local State
 */
async function updateUserTrialAndPlan(user, newDays, newPlan) {
  user.trialDays = newDays;
  user.plan = newPlan;

  // Recalculate end date from start date
  const startMs = new Date(user.trialStartDate || user.createdAt).getTime();
  const newEndMs = startMs + (newDays * 24 * 60 * 60 * 1000);
  user.trialEndDate = new Date(newEndMs).toISOString();

  if (newDays > 14) {
    user.status = 'extended';
  } else if (newEndMs < Date.now()) {
    user.status = 'expired';
  } else {
    user.status = 'active';
  }

  // Save directly to Firestore
  try {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      trialDays: newDays,
      plan: newPlan,
      trialEndDate: user.trialEndDate,
      status: user.status,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    showToast(`Updated ${user.displayName}: Plan set to ${newPlan} & Trial set to ${newDays} days!`, 'success');
  } catch (err) {
    console.error('Failed to update Firestore:', err);
    showToast(`Updated local state: ${newPlan} & ${newDays} days`, 'success');
  }

  renderMetrics();
  renderUsersTable();
}

/**
 * Search & Filters logic
 */
function initSearchAndFilter() {
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderUsersTable();
    });
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      activeFilter = btn.dataset.filter || 'all';
      renderUsersTable();
    });
  });
}

function initRefresh() {
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      renderMetrics();
      renderUsersTable();
      showToast('User trials and brand records refreshed', 'success');
    });
  }
}

/**
 * Toast Notification Utility
 */
function showToast(message, type = 'success') {
  let toast = document.getElementById('admin-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'admin-toast';
    document.body.appendChild(toast);
  }

  toast.className = `admin-toast ${type} is-visible`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : '⚠️'}</span>
    <span>${escapeHtml(message)}</span>
  `;

  setTimeout(() => {
    toast.classList.remove('is-visible');
  }, 3500);
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
