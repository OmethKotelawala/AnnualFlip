/**
 * FlipPage Admin Portal Controller - User, Brand & Free Trial Duration Management
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithPopup, 
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
const MASTER_ADMIN_EMAIL = "omethranhasacz@gmail.com";

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyC7EHsN6CiX5JlbRiLFo_f_-OfWIj4VIIo",
  authDomain: "flippage-e7f06.firebaseapp.com",
  projectId: "flippage-e7f06",
  storageBucket: "flippage-e7f06.firebasestorage.app",
  messagingSenderId: "1090051466641",
  appId: "1:1090051466641:web:237cbd139ca71cd186a630",
  measurementId: "G-BNY548FEEM"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
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

document.addEventListener('DOMContentLoaded', () => {
  initAuthGuard();
  initSearchAndFilter();
  initModalHandlers();
  initRefresh();
});

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
    const isMasterAdmin = email === MASTER_ADMIN_EMAIL.toLowerCase();

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
      await signOut(auth);
      showToast('Logged out of Admin Portal', 'success');
    });
  }
}

function showGuardLogin() {
  if (authGuardContainer) authGuardContainer.hidden = false;
  if (adminMainPortal) adminMainPortal.hidden = true;
  if (adminNavProfile) adminNavProfile.hidden = true;

  if (guardTitle) guardTitle.textContent = 'Admin Portal Authentication';
  if (guardDesc) guardDesc.textContent = 'Please sign in with an authorized FlipPage administrator account to manage users and customize free trial durations.';
  if (guardIconBox) {
    guardIconBox.className = 'guard-icon';
    guardIconBox.innerHTML = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
  }

  if (guardActionBtn) {
    guardActionBtn.textContent = 'Sign in with Google';
    guardActionBtn.onclick = async () => {
      try {
        await signInWithPopup(auth, googleProvider);
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
  }
}

function showGuardDenied(user) {
  if (authGuardContainer) authGuardContainer.hidden = false;
  if (adminMainPortal) adminMainPortal.hidden = true;
  if (adminNavProfile) adminNavProfile.hidden = true;

  if (guardTitle) guardTitle.textContent = 'Access Denied';
  if (guardDesc) guardDesc.innerHTML = `Signed in as <strong>${escapeHtml(user.email || 'user')}</strong>.<br>This account does not have administrator privileges.`;
  if (guardIconBox) {
    guardIconBox.className = 'guard-icon denied';
    guardIconBox.innerHTML = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
  }

  if (guardActionBtn) {
    guardActionBtn.textContent = 'Switch Account / Log out';
    guardActionBtn.onclick = async () => {
      await signOut(auth);
    };
  }
}

function grantAdminAccess(user) {
  if (authGuardContainer) authGuardContainer.hidden = true;
  if (adminMainPortal) adminMainPortal.hidden = false;
  if (adminNavProfile) adminNavProfile.hidden = false;

  const displayName = user.displayName || user.email?.split('@')[0] || 'Administrator';
  if (adminProfileName) adminProfileName.textContent = displayName;
  if (adminAvatarInitial) {
    if (user.photoURL) {
      adminAvatarInitial.innerHTML = `<img src="${user.photoURL}" alt="${escapeHtml(displayName)}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" referrerpolicy="no-referrer">`;
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
 * Render Users Table with Brand and Trial Details
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
        <td colspan="7" style="text-align: center; padding: 48px; color: var(--admin-text-muted);">
          No users matching the selected criteria.
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

    const brandDisplay = user.brandName ? `<span style="font-size: 0.78rem; color: #60A5FA; font-weight: 600;">🏷️ ${escapeHtml(user.brandName)}</span>` : `<span style="font-size: 0.78rem; color: var(--admin-text-muted); font-style: italic;">No brand set</span>`;
    const brandUrlDisplay = user.brandUrl ? `<span style="font-size: 0.82rem; color: #34D399; font-family: monospace;">${escapeHtml(user.brandUrl)}</span>` : `<span style="font-size: 0.82rem; color: var(--admin-text-muted);">—</span>`;

    const avatarHtml = user.photoURL
      ? `<img src="${user.photoURL}" alt="${escapeHtml(user.displayName)}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" referrerpolicy="no-referrer">`
      : initial;

    return `
      <tr data-uid="${user.uid}">
        <!-- User Info -->
        <td>
          <div class="user-info-cell">
            <div class="user-table-avatar" style="overflow: hidden; padding: 0;">${avatarHtml}</div>
            <div class="user-meta-names">
              <span class="user-meta-name">
                ${escapeHtml(user.displayName || 'User')}
                <span class="role-chip ${user.role}">${user.role}</span>
              </span>
              <span class="user-meta-email">${escapeHtml(user.email)}</span>
              ${brandDisplay}
            </div>
          </div>
        </td>

        <!-- Brand URL -->
        <td>${brandUrlDisplay}</td>

        <!-- Registered Date -->
        <td style="color: var(--admin-text-secondary);">${createdDateFormatted}</td>

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
          <strong style="color: ${remainingDays <= 0 ? '#F87171' : remainingDays <= 3 ? '#FBBF24' : '#34D399'};">
            ${user.role === 'admin' ? 'Unlimited' : remainingDays <= 0 ? '0 days remaining' : `${remainingDays} days remaining`}
          </strong>
        </td>

        <!-- Status -->
        <td>${statusPill}</td>

        <!-- Actions -->
        <td>
          <div class="table-action-btns">
            <button class="btn-change-trial btn-open-modal" type="button" data-uid="${user.uid}" title="Edit Trial Time Duration">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span>Change Trial</span>
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
        updateUserTrialDuration(targetUser, (Number(targetUser.trialDays) || 14) + 7);
      }
    });
  });
}

/**
 * Open Modal to View User Details
 */
function openDetailsModal(user) {
  const initial = (user.displayName?.charAt(0) || user.email?.charAt(0) || 'U').toUpperCase();
  const remaining = getTrialRemainingDays(user);

  if (detailUserAvatar) {
    if (user.photoURL) {
      detailUserAvatar.innerHTML = `<img src="${user.photoURL}" alt="${escapeHtml(user.displayName)}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" referrerpolicy="no-referrer">`;
      detailUserAvatar.style.overflow = 'hidden';
      detailUserAvatar.style.padding = '0';
    } else {
      detailUserAvatar.textContent = initial;
    }
  }

  if (detailUserName) detailUserName.textContent = user.displayName || 'User';
  if (detailUserEmail) detailUserEmail.textContent = user.email || '';
  if (detailBrandName) detailBrandName.textContent = user.brandName || 'Not specified';
  if (detailBrandUrl) detailBrandUrl.textContent = user.brandUrl || 'FlipPage.com/workspace';
  if (detailTrialDuration) detailTrialDuration.textContent = `${user.trialDays} Days`;
  if (detailTimeRemaining) detailTimeRemaining.textContent = user.role === 'admin' ? 'Unlimited' : `${remaining} days remaining`;
  if (detailRegisteredDate) detailRegisteredDate.textContent = new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  if (detailsModal) detailsModal.classList.add('is-open');
}

function closeDetailsModal() {
  if (detailsModal) detailsModal.classList.remove('is-open');
}

/**
 * Open Modal to Change User Free Trial Duration
 */
function openTrialModal(user) {
  selectedUserForModal = user;
  currentEditingDays = Number(user.trialDays) || 14;

  if (modalTargetUser) modalTargetUser.textContent = `${user.displayName} (${user.email})`;
  if (modalCurrentDuration) modalCurrentDuration.textContent = `${user.trialDays} Days`;
  if (stepperInput) stepperInput.value = currentEditingDays;

  presetBtns.forEach(p => {
    p.classList.toggle('is-selected', Number(p.dataset.days) === currentEditingDays);
  });

  if (trialModal) trialModal.classList.add('is-open');
}

function closeTrialModal() {
  if (trialModal) trialModal.classList.remove('is-open');
  selectedUserForModal = null;
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
      currentEditingDays = Math.max(1, currentEditingDays - 1);
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
      if (!isNaN(val) && val > 0) {
        currentEditingDays = val;
        syncPresetHighlight();
      }
    });
  }

  // Save changes
  if (btnSaveTrialDuration) {
    btnSaveTrialDuration.addEventListener('click', async () => {
      if (!selectedUserForModal) return;
      await updateUserTrialDuration(selectedUserForModal, currentEditingDays);
      closeTrialModal();
    });
  }
}

function syncPresetHighlight() {
  presetBtns.forEach(b => {
    b.classList.toggle('is-selected', Number(b.dataset.days) === currentEditingDays);
  });
}

/**
 * Persist Trial Duration to Firestore and Local State
 */
async function updateUserTrialDuration(user, newDays) {
  user.trialDays = newDays;

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

  // Save to Firestore
  try {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      trialDays: newDays,
      trialEndDate: user.trialEndDate,
      status: user.status,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    showToast(`Updated ${user.displayName}'s free trial to ${newDays} days!`, 'success');
  } catch (err) {
    console.error('Failed to update Firestore:', err);
    showToast(`Updated local state to ${newDays} days`, 'success');
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
