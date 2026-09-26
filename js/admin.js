/**
 * FlipPage Enterprise SaaS Admin Dashboard Controller
 * Real-time Firebase Firestore RBAC, Real User Management, Plan Tiers & Time Duration
 * Loads ONLY real users from Firestore without fake/seed data
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  GoogleAuthProvider, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs,
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Master Admin Access Allowlist
const ADMIN_EMAILS = [
  "yutrytopipygh@gmail.com",
  "paneljoker145@gmail.com",
  "colddoggy1@gmail.com",
  "admin@gmail.com",
  "admin@northbay.lk",
  "admin@flippage.com"
];

function isAuthorizedAdmin(email, userDocRole) {
  if (userDocRole === 'admin') return true;
  if (!email) return false;
  const clean = email.toLowerCase().trim();
  return ADMIN_EMAILS.includes(clean) || clean.startsWith('admin@');
}

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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

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
  showToast(error?.message || 'Database error occurred');
}

let usersData = [];
let activeFilter = 'all';
let currentSearchTerm = '';
let currentPage = 1;
const pageSize = 10;
let currentEditingUserId = null;
let currentEditingUserPlan = 'FREE';
let currentEditingDuration = 14;

// DOM Elements
const authGuardContainer = document.getElementById('auth-guard-container');
const adminDashboardLayout = document.getElementById('admin-dashboard-layout');
const guardFeedback = document.getElementById('guard-auth-feedback');
const btnAdminGoogleLogin = document.getElementById('btn-admin-google-login');
const adminLoginForm = document.getElementById('admin-login-form');
const adminEmailInput = document.getElementById('admin-email-input');
const adminPasswordInput = document.getElementById('admin-password-input');

const topbarAdminName = document.getElementById('topbar-admin-name');
const topbarAdminRole = document.getElementById('topbar-admin-role');
const topbarAdminPhoto = document.getElementById('topbar-admin-photo');
const btnSidebarLogout = document.getElementById('btn-sidebar-logout');

const usersTableBody = document.getElementById('users-table-body');
const paginationInfoText = document.getElementById('pagination-info-text');
const btnPagePrev = document.getElementById('btn-page-prev');
const btnPageNext = document.getElementById('btn-page-next');
const btnPage1 = document.getElementById('btn-page-1');
const btnPage2 = document.getElementById('btn-page-2');

const sidebarQuickSearch = document.getElementById('sidebar-quick-search');
const btnFocusSearch = document.getElementById('btn-focus-search');
const filterChipsBar = document.getElementById('filter-chips-bar');

// Modal Elements
const modalAddUser = document.getElementById('modal-add-user');
const btnOpenAddUserModal = document.getElementById('btn-open-add-user-modal');
const btnCloseAddModal = document.getElementById('btn-close-add-modal');
const btnCancelAddModal = document.getElementById('btn-cancel-add-modal');
const formAddUser = document.getElementById('form-add-user');

const modalEditPlan = document.getElementById('modal-edit-plan');
const btnCloseEditModal = document.getElementById('btn-close-edit-modal');
const btnCancelEditModal = document.getElementById('btn-cancel-edit-modal');
const editModalAvatar = document.getElementById('edit-modal-avatar');
const editModalUserName = document.getElementById('edit-modal-user-name');
const editModalUserEmail = document.getElementById('edit-modal-user-email');
const editModalPriorityPill = document.getElementById('edit-modal-priority-pill');
const editUserDisplayName = document.getElementById('edit-user-display-name');
const editUserCompanyName = document.getElementById('edit-user-company-name');
const editUserBrandSlug = document.getElementById('edit-user-brand-slug');
const editPlanOptions = document.getElementById('edit-plan-options');
const editCustomDays = document.getElementById('edit-custom-days');
const editCalcExpiryPreview = document.getElementById('edit-calc-expiry-preview');
const editPlanStatus = document.getElementById('edit-plan-status');
const editUserRole = document.getElementById('edit-user-role');
const btnSavePlanChanges = document.getElementById('btn-save-plan-changes');

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const adminToast = document.getElementById('admin-toast');
const toastMessage = document.getElementById('toast-message');

const btnTopbarAskAi = document.getElementById('btn-topbar-ask-ai');
const adminAiDrawer = document.getElementById('admin-ai-drawer');
const btnCloseAiDrawer = document.getElementById('btn-close-ai-drawer');
const aiChatForm = document.getElementById('ai-chat-form');
const aiChatInput = document.getElementById('ai-chat-input');
const aiChatStream = document.getElementById('ai-chat-stream');

// Toast Notification
function showToast(msg) {
  if (!adminToast || !toastMessage) return;
  toastMessage.textContent = msg;
  adminToast.style.display = 'flex';
  setTimeout(() => {
    adminToast.style.display = 'none';
  }, 3000);
}

// ============ AUTHENTICATION & ACCESS GUARD ============
function setupAuth() {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      const email = user.email || '';
      let isAllowed = isAuthorizedAdmin(email, null);

      // Check firestore role if not in immediate email list
      if (!isAllowed) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists() && userDoc.data().role === 'admin') {
            isAllowed = true;
          }
        } catch (_) {}
      }

      if (isAllowed) {
        // Unlock Dashboard
        if (authGuardContainer) authGuardContainer.style.display = 'none';
        if (adminDashboardLayout) adminDashboardLayout.style.display = 'flex';

        const name = user.displayName || email.split('@')[0] || 'Administrator';
        if (topbarAdminName) topbarAdminName.textContent = name;
        if (topbarAdminRole) topbarAdminRole.textContent = 'Super Admin';

        if (user.photoURL && topbarAdminPhoto) {
          topbarAdminPhoto.src = user.photoURL;
        }

        // Initialize Real-time Firestore Sync (Real Users Only)
        initFirestoreData();
      } else {
        // Access Denied: User is logged in, but not an admin
        if (authGuardContainer) authGuardContainer.style.display = 'flex';
        if (adminDashboardLayout) adminDashboardLayout.style.display = 'none';
        if (guardFeedback) {
          guardFeedback.className = 'guard-feedback error';
          guardFeedback.style.display = 'block';
          guardFeedback.innerHTML = `⚠️ Access Denied: <strong>${escapeHtml(email)}</strong> is not registered as an Administrator.`;
        }
      }
    } else {
      // Unauthenticated
      if (authGuardContainer) authGuardContainer.style.display = 'flex';
      if (adminDashboardLayout) adminDashboardLayout.style.display = 'none';
    }
  });

  // Google Sign In for Admin
  if (btnAdminGoogleLogin) {
    btnAdminGoogleLogin.addEventListener('click', async () => {
      try {
        if (guardFeedback) guardFeedback.style.display = 'none';
        btnAdminGoogleLogin.disabled = true;
        await signInWithPopup(auth, googleProvider);
      } catch (err) {
        console.warn('Admin Google Login Error:', err);
        if (guardFeedback) {
          guardFeedback.className = 'guard-feedback error';
          guardFeedback.style.display = 'block';
          guardFeedback.textContent = err.message || 'Google Admin sign in failed.';
        }
      } finally {
        btnAdminGoogleLogin.disabled = false;
      }
    });
  }

  // Email & Password Admin Login
  if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = adminEmailInput.value.trim();
      const password = adminPasswordInput.value;

      if (!isAuthorizedAdmin(email, null)) {
        if (guardFeedback) {
          guardFeedback.className = 'guard-feedback error';
          guardFeedback.style.display = 'block';
          guardFeedback.textContent = `Email "${email}" is not an authorized administrator.`;
        }
        return;
      }

      try {
        if (guardFeedback) guardFeedback.style.display = 'none';
        await signInWithEmailAndPassword(auth, email, password);
      } catch (err) {
        console.warn('Admin Auth Error:', err);
        if (guardFeedback) {
          guardFeedback.className = 'guard-feedback error';
          guardFeedback.style.display = 'block';
          guardFeedback.textContent = 'Invalid administrator credentials. Try signing in with Google.';
        }
      }
    });
  }

  // Logout
  if (btnSidebarLogout) {
    btnSidebarLogout.addEventListener('click', async () => {
      await signOut(auth);
      window.location.reload();
    });
  }
}

// Clean any legacy fake seed documents (e.g. u-1 .. u-12) from Firestore if found
async function purgeLegacyFakeSeeds(snapshot) {
  const fakeIds = ['u-1','u-2','u-3','u-4','u-5','u-6','u-7','u-8','u-9','u-10','u-11','u-12'];
  const fakeDocDeletes = [];
  snapshot.forEach((docSnap) => {
    if (fakeIds.includes(docSnap.id) || (docSnap.data().email && docSnap.data().email.endsWith('@example.com'))) {
      fakeDocDeletes.push(deleteDoc(doc(db, 'users', docSnap.id)).catch(() => {}));
    }
  });
  if (fakeDocDeletes.length > 0) {
    console.log(`Cleaning ${fakeDocDeletes.length} legacy demo placeholder records from Firestore...`);
    await Promise.all(fakeDocDeletes);
  }
}

// ============ REAL-TIME FIRESTORE DATA SYNC (REAL USERS ONLY) ============
async function initFirestoreData() {
  const usersPath = 'users';
  try {
    const usersCol = collection(db, usersPath);

    // Attach real-time listener to Firestore
    onSnapshot(usersCol, async (snapshot) => {
      // Purge any legacy mock seed records in background so Firestore only holds real users
      purgeLegacyFakeSeeds(snapshot);

      const liveList = [];
      const fakeIds = ['u-1','u-2','u-3','u-4','u-5','u-6','u-7','u-8','u-9','u-10','u-11','u-12'];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const docId = docSnap.id;

        // Strictly ignore fake/seed records
        if (fakeIds.includes(docId) || (data.email && data.email.endsWith('@example.com'))) {
          return;
        }

        const now = new Date();
        const createdAt = data.createdAt ? new Date(data.createdAt) : now;
        const trialDays = Number(data.trialDays) || 14;
        
        let trialEndStr = data.trialEndDate;
        if (!trialEndStr) {
          const calculatedEnd = new Date(createdAt.getTime() + trialDays * 24 * 60 * 60 * 1000);
          trialEndStr = calculatedEnd.toISOString();
        }
        const dueDate = trialEndStr.split('T')[0];

        const planRaw = (data.plan || (data.isPaid ? 'PRO' : 'FREE')).toUpperCase();
        const isPaidUser = data.isPaid === true || planRaw === 'PRO' || planRaw === 'ENTERPRISE' || planRaw === 'STARTER';
        const planTier = planRaw === 'PRO' ? 'PRO' : (planRaw === 'ENTERPRISE' ? 'Enterprise' : (planRaw === 'STARTER' ? 'Starter' : 'FREE'));

        const daysRemaining = Math.ceil((new Date(trialEndStr).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        let calculatedStatus = data.status || 'active';
        if (daysRemaining < 0 && calculatedStatus !== 'extended') {
          calculatedStatus = 'Overdue';
        } else if (calculatedStatus === 'active') {
          calculatedStatus = isPaidUser ? 'In Progress' : 'To Do';
        }

        const name = data.displayName || data.name || (data.email ? data.email.split('@')[0] : 'Member');
        const email = data.email || '—';
        const brandName = data.brandName || '';
        const brandSlug = brandName ? brandName.toLowerCase().replace(/\s+/g, '-') : name.toLowerCase().replace(/\s+/g, '-');
        const brandUrl = data.brandUrl || `FlipPage.com/${brandSlug}`;

        const avatar = data.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=2563eb,3b82f6,1d4ed8`;

        liveList.push({
          id: docId,
          uid: data.uid || docId,
          taskName: data.taskName || (brandName ? `${brandName} Flipbook Hub` : `${name}'s Workspace`),
          project: data.project || (brandName || 'Flipbook Publishing'),
          assigneeName: name,
          assigneeEmail: email,
          assigneeAvatar: avatar,
          priority: isPaidUser ? 'High' : 'Low',
          status: calculatedStatus,
          dueDate: dueDate,
          durationDays: trialDays,
          planTier: planTier,
          isPaid: isPaidUser,
          brandName: brandName,
          brandUrl: brandUrl,
          role: data.role || 'user',
          createdAt: data.createdAt || now.toISOString(),
          lastLoginAt: data.lastLoginAt || data.createdAt
        });
      });

      // Sort newest users first
      liveList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      usersData = liveList;
      updateFilterChipCounts();
      renderTable();
    }, (error) => {
      handleFirestoreError(error, 'list', usersPath);
      usersData = [];
      renderTable();
    });

  } catch (err) {
    handleFirestoreError(err, 'get', usersPath);
  }
}

// Update filter chip count badges dynamically
function updateFilterChipCounts() {
  if (!filterChipsBar) return;
  const total = usersData.length;
  const proCount = usersData.filter(u => u.isPaid || u.planTier === 'PRO').length;
  const activeCount = usersData.filter(u => u.status !== 'Overdue' && u.status !== 'expired').length;
  const expiringCount = usersData.filter(u => {
    const daysLeft = Math.ceil((new Date(u.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
    return daysLeft >= 0 && daysLeft <= 7;
  }).length;
  const expiredCount = usersData.filter(u => u.status === 'Overdue' || u.status === 'expired').length;
  const adminCount = usersData.filter(u => isAuthorizedAdmin(u.assigneeEmail, u.role)).length;

  const allChip = filterChipsBar.querySelector('[data-filter="all"]');
  if (allChip) allChip.textContent = `All (${total})`;

  const proChip = filterChipsBar.querySelector('[data-filter="pro"]');
  if (proChip) proChip.textContent = `👑 Pro (${proCount})`;

  const activeChip = filterChipsBar.querySelector('[data-filter="active"]');
  if (activeChip) activeChip.textContent = `Active (${activeCount})`;

  const expiringChip = filterChipsBar.querySelector('[data-filter="expiring"]');
  if (expiringChip) expiringChip.textContent = `Expiring Soon (${expiringCount})`;

  const expiredChip = filterChipsBar.querySelector('[data-filter="expired"]');
  if (expiredChip) expiredChip.textContent = `Expired (${expiredCount})`;

  const adminChip = filterChipsBar.querySelector('[data-filter="admin"]');
  if (adminChip) adminChip.textContent = `Admins (${adminCount})`;
}

// ============ RENDER DATA TABLE ============
function renderTable() {
  if (!usersTableBody) return;
  usersTableBody.innerHTML = '';

  let filtered = usersData.filter(user => {
    // Filter chip logic
    if (activeFilter === 'pro' && !user.isPaid && user.planTier !== 'PRO' && user.planTier !== 'Enterprise') return false;
    if (activeFilter === 'active' && (user.status === 'Overdue' || user.status === 'expired')) return false;
    if (activeFilter === 'expiring') {
      const daysLeft = Math.ceil((new Date(user.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
      if (daysLeft < 0 || daysLeft > 7) return false;
    }
    if (activeFilter === 'expired' && user.status !== 'Overdue' && user.status !== 'expired') return false;
    if (activeFilter === 'admin' && !isAuthorizedAdmin(user.assigneeEmail, user.role)) return false;

    // Search query
    if (currentSearchTerm) {
      const query = currentSearchTerm.toLowerCase();
      const match = (user.taskName && user.taskName.toLowerCase().includes(query)) ||
                    (user.project && user.project.toLowerCase().includes(query)) ||
                    (user.assigneeName && user.assigneeName.toLowerCase().includes(query)) ||
                    (user.assigneeEmail && user.assigneeEmail.toLowerCase().includes(query)) ||
                    (user.planTier && user.planTier.toLowerCase().includes(query)) ||
                    (user.brandUrl && user.brandUrl.toLowerCase().includes(query));
      if (!match) return false;
    }
    return true;
  });

  const totalFiltered = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  if (currentPage > totalPages) currentPage = totalPages;

  const startIndex = (currentPage - 1) * pageSize;
  const paginated = filtered.slice(startIndex, startIndex + pageSize);

  if (paginationInfoText) {
    const endDisplay = Math.min(startIndex + pageSize, totalFiltered);
    paginationInfoText.textContent = `Showing ${totalFiltered === 0 ? 0 : startIndex + 1}-${endDisplay} of ${totalFiltered} real users in Firestore`;
  }

  // Update page buttons
  if (btnPage1) {
    btnPage1.classList.toggle('is-active', currentPage === 1);
    btnPage1.textContent = '1';
  }
  if (btnPage2) {
    btnPage2.style.display = totalPages > 1 ? 'inline-block' : 'none';
    btnPage2.classList.toggle('is-active', currentPage === 2);
  }

  if (paginated.length === 0) {
    usersTableBody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center; padding: 56px 20px; color:#64748B;">
          <div style="font-size:2.2rem; margin-bottom:12px;">👤</div>
          <strong style="color:#0F172A; font-size:1.05rem; display:block; margin-bottom:6px;">No real users found in Firestore</strong>
          <p style="margin:0 0 16px; font-size:0.88rem; color:#64748B; max-width:420px; margin-left:auto; margin-right:auto;">
            When users register or sign in on <code>account.html</code>, their live Firebase profiles, custom brand URLs, and trial periods will appear here instantly.
          </p>
          <div style="display:inline-flex; gap:10px;">
            <button type="button" class="btn-primary-add" id="btn-empty-add-user" style="padding:7px 14px; font-size:0.85rem;">
              + Add User Manually
            </button>
            <a href="account.html" target="_blank" style="display:inline-flex; align-items:center; padding:7px 14px; border:1px solid #CBD5E1; border-radius:8px; color:#2563EB; font-weight:600; text-decoration:none; font-size:0.85rem;">
              Open Account Portal ↗
            </a>
          </div>
        </td>
      </tr>
    `;

    const emptyAddBtn = document.getElementById('btn-empty-add-user');
    if (emptyAddBtn && modalAddUser) {
      emptyAddBtn.addEventListener('click', () => {
        modalAddUser.hidden = false;
      });
    }
    return;
  }

  paginated.forEach(user => {
    const tr = document.createElement('tr');

    const isPro = Boolean(user.isPaid || user.planTier === 'PRO' || user.planTier === 'Enterprise');
    
    // Priority / Plan badge with SVG icons
    const planBadgeHtml = isPro
      ? `<span class="priority-tag crown" style="display:inline-flex; align-items:center; gap:4px; background:#FFFBEB; border:1px solid #FCD34D; color:#B45309; padding:3px 8px; border-radius:6px; font-weight:800;"><img src="src/svg/crown.svg" class="crown-svg-icon" style="width:14px; height:14px;" alt="Crown"> PRO</span>`
      : `<span class="priority-tag low" style="display:inline-flex; align-items:center; gap:4px; background:#F1F5F9; border:1px solid #CBD5E1; color:#475569; padding:3px 8px; border-radius:6px; font-weight:700;"><img src="src/svg/free.svg" class="free-svg-icon" style="width:14px; height:14px;" alt="Free"> FREE</span>`;

    // Status pill styling
    let statusClass = 'todo';
    if (user.status === 'In Progress') statusClass = 'inprogress';
    if (user.status === 'Review') statusClass = 'review';
    if (user.status === 'Completed') statusClass = 'completed';
    if (user.status === 'Overdue' || user.status === 'expired') statusClass = 'overdue';

    // Calculate days remaining
    const daysLeft = Math.ceil((new Date(user.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
    let daysText = `${daysLeft} days left`;
    if (daysLeft < 0) daysText = `Expired ${Math.abs(daysLeft)}d ago`;
    else if (daysLeft === 0) daysText = 'Expires today';

    const formattedDate = formatDateDisplay(user.dueDate);

    tr.innerHTML = `
      <td class="col-checkbox">
        <input type="checkbox" class="row-select-checkbox" data-user-id="${user.id}">
      </td>
      <td class="task-name-cell">
        <div style="font-weight:700; color:#0F172A;">${escapeHtml(user.taskName)}</div>
        <div style="font-size:0.75rem; color:#2563EB; font-family:monospace; margin-top:2px;">${escapeHtml(user.brandUrl)}</div>
      </td>
      <td>
        <span style="color:#475569; font-weight:500;">${escapeHtml(user.project)}</span>
      </td>
      <td>
        <div class="assignee-cell-wrap">
          <img src="${user.assigneeAvatar}" alt="${escapeHtml(user.assigneeName)}" class="assignee-avatar-img" onerror="this.src='https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.assigneeName)}';">
          <div style="display:flex; flex-direction:column;">
            <span class="assignee-name" style="font-weight:600;">${escapeHtml(user.assigneeName)}</span>
            <span style="font-size:0.75rem; color:#64748B;">${escapeHtml(user.assigneeEmail)}</span>
          </div>
        </div>
      </td>
      <td>
        ${planBadgeHtml}
      </td>
      <td>
        <span class="status-pill ${statusClass}">${user.status}</span>
      </td>
      <td class="due-date-cell">
        <span style="font-weight:600; color:#1E293B;">${formattedDate}</span>
        <span class="duration-subtag">${daysText} • ${user.durationDays}d trial</span>
      </td>
      <td style="text-align:right; white-space:nowrap;">
        <div style="display:inline-flex; align-items:center; gap:6px;">
          ${isPro 
            ? `<button type="button" class="btn-quick-plan" data-action="set-free" data-user-id="${user.id}" title="Switch to FREE Plan" style="padding:3px 8px; border-radius:6px; border:1px solid #CBD5E1; background:#FFFFFF; font-size:0.75rem; font-weight:700; cursor:pointer; color:#475569;">Set FREE</button>`
            : `<button type="button" class="btn-quick-plan" data-action="set-pro" data-user-id="${user.id}" title="Grant PRO Crown Plan" style="padding:3px 8px; border-radius:6px; border:1px solid #FCD34D; background:#FEF3C7; font-size:0.75rem; font-weight:800; cursor:pointer; color:#B45309;">👑 Set PRO</button>`
          }
          <button type="button" class="btn-quick-plan" data-action="extend-30" data-user-id="${user.id}" title="Extend +30 Days in Firestore" style="padding:3px 8px; border-radius:6px; border:1px solid #BFDBFE; background:#EFF6FF; font-size:0.75rem; font-weight:700; cursor:pointer; color:#2563EB;">+30d</button>
          <button type="button" class="row-actions-btn" data-action="edit" data-user-id="${user.id}" title="Edit Plan & Duration">⚙️</button>
          <button type="button" class="row-actions-btn" data-action="delete" data-user-id="${user.id}" title="Delete User from Firestore" style="color:#EF4444;">🗑️</button>
        </div>
      </td>
    `;

    // Row action listeners
    const editBtn = tr.querySelector('[data-action="edit"]');
    if (editBtn) {
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openEditModal(user.id);
      });
    }

    const setProBtn = tr.querySelector('[data-action="set-pro"]');
    if (setProBtn) {
      setProBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await quickUpdateUserPlan(user.id, 'PRO');
      });
    }

    const setFreeBtn = tr.querySelector('[data-action="set-free"]');
    if (setFreeBtn) {
      setFreeBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await quickUpdateUserPlan(user.id, 'FREE');
      });
    }

    const extendBtn = tr.querySelector('[data-action="extend-30"]');
    if (extendBtn) {
      extendBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await quickExtendUserDuration(user.id, 30);
      });
    }

    const deleteBtn = tr.querySelector('[data-action="delete"]');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm(`Are you sure you want to delete user "${user.assigneeName}" (${user.assigneeEmail}) from Firestore?`)) {
          await deleteUserFromFirestore(user.id);
        }
      });
    }

    usersTableBody.appendChild(tr);
  });
}

// Quick Firestore Plan Update
async function quickUpdateUserPlan(userId, targetPlan) {
  const isPaid = (targetPlan === 'PRO' || targetPlan === 'Enterprise');
  const priority = isPaid ? 'High' : 'Low';
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      plan: targetPlan,
      isPaid: isPaid,
      priority: priority,
      status: 'active',
      updatedAt: new Date().toISOString()
    });
    showToast(`Updated user priority & plan to ${targetPlan} in Firestore!`);
  } catch (err) {
    handleFirestoreError(err, 'update', `users/${userId}`);
  }
}

// Quick Firestore Duration Extension
async function quickExtendUserDuration(userId, additionalDays) {
  const user = usersData.find(u => u.id === userId);
  if (!user) return;
  const currentDays = user.durationDays || 14;
  const newDays = currentDays + additionalDays;
  const newDueDateObj = new Date(Date.now() + newDays * 24 * 60 * 60 * 1000);

  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      trialDays: newDays,
      trialEndDate: newDueDateObj.toISOString(),
      status: 'active',
      updatedAt: new Date().toISOString()
    });
    showToast(`Extended ${user.assigneeName}'s duration to ${newDays} days in Firestore!`);
  } catch (err) {
    handleFirestoreError(err, 'update', `users/${userId}`);
  }
}

// Delete real user from Firestore
async function deleteUserFromFirestore(userId) {
  try {
    await deleteDoc(doc(db, 'users', userId));
    showToast('User record removed from Firestore.');
  } catch (err) {
    handleFirestoreError(err, 'delete', `users/${userId}`);
  }
}

function formatDateDisplay(dateStr) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (_) {
    return dateStr;
  }
}

// Calculate & display friendly expiry date preview
function updateExpiryPreview(days) {
  if (!editCalcExpiryPreview) return;
  const numDays = parseInt(days, 10) || 0;
  const expDate = new Date(Date.now() + numDays * 24 * 60 * 60 * 1000);
  const formatted = expDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  editCalcExpiryPreview.textContent = `${formatted} (in ${numDays}d)`;
}

// ============ MODALS: ADD USER & EDIT PLAN/DURATION ============
function openEditModal(userId) {
  const user = usersData.find(u => u.id === userId);
  if (!user) return;

  currentEditingUserId = userId;
  currentEditingUserPlan = user.planTier || (user.isPaid ? 'PRO' : 'FREE');
  currentEditingDuration = user.durationDays || 14;

  if (editModalUserName) editModalUserName.textContent = user.assigneeName;
  if (editModalUserEmail) editModalUserEmail.textContent = user.assigneeEmail;
  if (editUserDisplayName) editUserDisplayName.value = user.assigneeName || '';
  if (editUserCompanyName) editUserCompanyName.value = user.brandName || user.project || '';
  if (editUserBrandSlug) {
    const rawSlug = user.brandUrl ? user.brandUrl.replace(/^FlipPage\.com\//i, '') : slugify(user.brandName || user.assigneeName);
    editUserBrandSlug.value = rawSlug;
  }

  if (editModalAvatar) {
    editModalAvatar.innerHTML = `<img src="${user.assigneeAvatar}" alt="${escapeHtml(user.assigneeName)}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;" onerror="this.parentElement.textContent='${(user.assigneeName.charAt(0) || 'U').toUpperCase()}';">`;
  }
  if (editCustomDays) editCustomDays.value = currentEditingDuration;
  
  if (editPlanStatus) {
    const s = String(user.status || 'active').toLowerCase();
    if (s.includes('overdue') || s.includes('expired')) editPlanStatus.value = 'expired';
    else if (s.includes('review')) editPlanStatus.value = 'review';
    else if (s.includes('extend')) editPlanStatus.value = 'extended';
    else if (s.includes('suspend')) editPlanStatus.value = 'suspended';
    else editPlanStatus.value = 'active';
  }

  if (editUserRole) {
    editUserRole.value = (user.role === 'admin' || isAuthorizedAdmin(user.assigneeEmail, user.role)) ? 'admin' : 'user';
  }

  // Update plan option buttons
  if (editPlanOptions) {
    editPlanOptions.querySelectorAll('.plan-btn-option').forEach(btn => {
      const matches = btn.dataset.plan.toUpperCase() === currentEditingUserPlan.toUpperCase();
      btn.classList.toggle('is-active', matches);
    });
  }

  // Update preset pills
  const presetPills = document.querySelectorAll('.preset-pill');
  presetPills.forEach(pill => {
    pill.classList.toggle('is-active', parseInt(pill.dataset.days, 10) === currentEditingDuration);
  });

  // Update priority badge pill
  if (editModalPriorityPill) {
    const isPro = (currentEditingUserPlan === 'PRO' || currentEditingUserPlan === 'Enterprise' || user.isPaid);
    editModalPriorityPill.style.background = isPro ? '#FEF3C7' : '#F1F5F9';
    editModalPriorityPill.style.color = isPro ? '#B45309' : '#475569';
    editModalPriorityPill.style.border = isPro ? '1px solid #FCD34D' : '1px solid #CBD5E1';
    editModalPriorityPill.innerHTML = isPro 
      ? `<img src="src/svg/crown.svg" style="width:14px; height:14px;" alt="Crown"> ${currentEditingUserPlan}` 
      : `<img src="src/svg/free.svg" style="width:14px; height:14px;" alt="Free"> ${currentEditingUserPlan}`;
  }

  updateExpiryPreview(currentEditingDuration);

  if (modalEditPlan) modalEditPlan.hidden = false;
}

function setupModals() {
  // Add User Modal
  if (btnOpenAddUserModal) {
    btnOpenAddUserModal.addEventListener('click', () => {
      if (modalAddUser) modalAddUser.hidden = false;
    });
  }
  if (btnCloseAddModal) btnCloseAddModal.addEventListener('click', () => { if (modalAddUser) modalAddUser.hidden = true; });
  if (btnCancelAddModal) btnCancelAddModal.addEventListener('click', () => { if (modalAddUser) modalAddUser.hidden = true; });

  // Plan selector in Add Modal
  const newPlanOptions = document.getElementById('new-plan-options');
  if (newPlanOptions) {
    newPlanOptions.querySelectorAll('.plan-btn-option').forEach(btn => {
      btn.addEventListener('click', () => {
        newPlanOptions.querySelectorAll('.plan-btn-option').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
      });
    });
  }

  // Add User Form Submission (Direct Firestore Write)
  if (formAddUser) {
    formAddUser.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('new-user-name').value.trim();
      const email = document.getElementById('new-user-email').value.trim();
      const project = document.getElementById('new-user-project').value.trim() || 'Landing Page Design';
      const brand = document.getElementById('new-user-brand').value.trim() || name.toLowerCase().replace(/\s+/g, '-');
      const duration = parseInt(document.getElementById('new-user-duration').value, 10) || 14;
      const activePlanBtn = newPlanOptions ? newPlanOptions.querySelector('.plan-btn-option.is-active') : null;
      const plan = activePlanBtn ? activePlanBtn.dataset.plan : 'FREE';
      const isPaid = plan === 'PRO' || plan === 'Enterprise' || plan === 'Starter';
      const priority = isPaid ? 'High' : 'Low';

      const dueDateObj = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);
      const newId = 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

      // Save directly to Firestore collection users
      try {
        await setDoc(doc(db, 'users', newId), {
          uid: newId,
          displayName: name,
          email: email,
          photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
          taskName: `${name}'s Workspace`,
          project: project,
          plan: plan,
          isPaid: isPaid,
          priority: priority,
          trialDays: duration,
          trialStartDate: new Date().toISOString(),
          trialEndDate: dueDateObj.toISOString(),
          status: 'active',
          role: isAuthorizedAdmin(email, null) ? 'admin' : 'user',
          companyName: brand,
          brandName: brand,
          brandUrl: `FlipPage.com/${slugify(brand)}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        showToast(`Added ${name} (${email}) to Firestore with ${plan} plan!`);
      } catch (err) {
        handleFirestoreError(err, 'create', `users/${newId}`);
      }

      if (modalAddUser) modalAddUser.hidden = true;
      formAddUser.reset();
    });
  }

  // Edit Modal Event Listeners
  if (btnCloseEditModal) btnCloseEditModal.addEventListener('click', () => { if (modalEditPlan) modalEditPlan.hidden = true; });
  if (btnCancelEditModal) btnCancelEditModal.addEventListener('click', () => { if (modalEditPlan) modalEditPlan.hidden = true; });

  if (editPlanOptions) {
    editPlanOptions.querySelectorAll('.plan-btn-option').forEach(btn => {
      btn.addEventListener('click', () => {
        editPlanOptions.querySelectorAll('.plan-btn-option').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        currentEditingUserPlan = btn.dataset.plan;

        if (editModalPriorityPill) {
          const isPro = (currentEditingUserPlan === 'PRO' || currentEditingUserPlan === 'Enterprise' || currentEditingUserPlan === 'Starter');
          editModalPriorityPill.style.background = isPro ? '#FEF3C7' : '#F1F5F9';
          editModalPriorityPill.style.color = isPro ? '#B45309' : '#475569';
          editModalPriorityPill.style.border = isPro ? '1px solid #FCD34D' : '1px solid #CBD5E1';
          editModalPriorityPill.innerHTML = isPro 
            ? `<img src="src/svg/crown.svg" style="width:14px; height:14px;" alt="Crown"> ${currentEditingUserPlan}` 
            : `<img src="src/svg/free.svg" style="width:14px; height:14px;" alt="Free"> ${currentEditingUserPlan}`;
        }
      });
    });
  }

  // Auto slugify company to brand input in Edit modal
  if (editUserCompanyName && editUserBrandSlug) {
    editUserCompanyName.addEventListener('input', () => {
      if (!editUserBrandSlug.value || editUserBrandSlug.dataset.manual !== 'true') {
        editUserBrandSlug.value = slugify(editUserCompanyName.value.trim());
      }
    });
    editUserBrandSlug.addEventListener('input', () => {
      editUserBrandSlug.dataset.manual = 'true';
    });
  }

  // Preset pills in Edit Modal
  const presetPills = document.querySelectorAll('.preset-pill');
  presetPills.forEach(pill => {
    pill.addEventListener('click', () => {
      presetPills.forEach(p => p.classList.remove('is-active'));
      pill.classList.add('is-active');
      const days = parseInt(pill.dataset.days, 10);
      currentEditingDuration = days;
      if (editCustomDays) editCustomDays.value = days;
      updateExpiryPreview(days);
    });
  });

  if (editCustomDays) {
    editCustomDays.addEventListener('input', () => {
      const days = parseInt(editCustomDays.value, 10) || 14;
      currentEditingDuration = days;
      updateExpiryPreview(days);
      presetPills.forEach(p => {
        p.classList.toggle('is-active', parseInt(p.dataset.days, 10) === days);
      });
    });
  }

  // Save changes from Edit Modal to Firestore (Real-time Live Sync)
  if (btnSavePlanChanges) {
    btnSavePlanChanges.addEventListener('click', async () => {
      if (!currentEditingUserId) return;
      const user = usersData.find(u => u.id === currentEditingUserId);
      if (!user) return;

      const newName = editUserDisplayName ? editUserDisplayName.value.trim() || user.assigneeName : user.assigneeName;
      const newCompany = editUserCompanyName ? editUserCompanyName.value.trim() : (user.brandName || user.project);
      const rawSlug = editUserBrandSlug ? editUserBrandSlug.value.trim() : '';
      const cleanSlug = rawSlug ? slugify(rawSlug) : slugify(newCompany || newName);
      const brandUrl = `FlipPage.com/${cleanSlug}`;

      const duration = parseInt(editCustomDays.value, 10) || 14;
      const plan = currentEditingUserPlan;
      const isPaid = (plan === 'PRO' || plan === 'Enterprise' || plan === 'Starter');
      const priority = isPaid ? 'High' : 'Low';
      const statusVal = editPlanStatus ? editPlanStatus.value : 'active';
      const roleVal = editUserRole ? editUserRole.value : user.role;

      const newDueDateObj = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);

      btnSavePlanChanges.disabled = true;
      btnSavePlanChanges.textContent = 'Saving to Firestore...';

      // Update Firestore in real-time
      try {
        await updateDoc(doc(db, 'users', user.id), {
          displayName: newName,
          companyName: newCompany,
          brandName: newCompany,
          brandUrl: brandUrl,
          taskName: `${newCompany || newName}'s Workspace`,
          project: newCompany || 'Digital Flipbooks',
          plan: plan,
          isPaid: isPaid,
          priority: priority,
          trialDays: duration,
          trialEndDate: newDueDateObj.toISOString(),
          status: statusVal,
          role: roleVal,
          updatedAt: new Date().toISOString()
        });
        showToast(`Saved ${newName}'s details, ${plan} plan & ${duration}d duration in Firestore!`);
        if (modalEditPlan) modalEditPlan.hidden = true;
      } catch (err) {
        handleFirestoreError(err, 'update', `users/${user.id}`);
      } finally {
        btnSavePlanChanges.disabled = false;
        btnSavePlanChanges.textContent = '💾 Save All Changes to Firestore';
      }
    });
  }
}

// ============ SEARCH, FILTERS & PAGINATION ============
function setupFiltersAndSearch() {
  if (sidebarQuickSearch) {
    sidebarQuickSearch.addEventListener('input', (e) => {
      currentSearchTerm = e.target.value.trim();
      currentPage = 1;
      renderTable();
    });
  }

  if (btnFocusSearch && sidebarQuickSearch) {
    btnFocusSearch.addEventListener('click', () => {
      sidebarQuickSearch.focus();
    });
  }

  if (filterChipsBar) {
    filterChipsBar.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        filterChipsBar.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('is-active'));
        chip.classList.add('is-active');
        activeFilter = chip.dataset.filter || 'all';
        currentPage = 1;
        renderTable();
      });
    });
  }

  // Pagination buttons
  if (btnPage1) {
    btnPage1.addEventListener('click', () => {
      currentPage = 1;
      renderTable();
    });
  }

  if (btnPage2) {
    btnPage2.addEventListener('click', () => {
      currentPage = 2;
      renderTable();
    });
  }

  if (btnPagePrev) {
    btnPagePrev.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderTable();
      }
    });
  }

  if (btnPageNext) {
    btnPageNext.addEventListener('click', () => {
      const maxPages = Math.ceil(usersData.length / pageSize);
      if (currentPage < maxPages) {
        currentPage++;
        renderTable();
      }
    });
  }
}

// ============ ASK AI DRAWER ============
function setupAiDrawer() {
  if (btnTopbarAskAi && adminAiDrawer) {
    btnTopbarAskAi.addEventListener('click', () => {
      adminAiDrawer.hidden = false;
      if (aiChatInput) aiChatInput.focus();
    });
  }

  if (btnCloseAiDrawer && adminAiDrawer) {
    btnCloseAiDrawer.addEventListener('click', () => {
      adminAiDrawer.hidden = true;
    });
  }

  if (aiChatForm && aiChatInput && aiChatStream) {
    aiChatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const question = aiChatInput.value.trim();
      if (!question) return;

      const userBubble = document.createElement('div');
      userBubble.className = 'ai-msg user';
      userBubble.textContent = question;
      aiChatStream.appendChild(userBubble);
      aiChatInput.value = '';

      setTimeout(() => {
        const botBubble = document.createElement('div');
        botBubble.className = 'ai-msg bot';
        
        const q = question.toLowerCase();
        if (q.includes('pro') || q.includes('crown') || q.includes('paid')) {
          const proUsers = usersData.filter(u => u.isPaid || u.planTier === 'PRO').map(u => `${u.assigneeName} (${u.assigneeEmail})`).join(', ');
          botBubble.innerHTML = `<strong>👑 Pro Plan Analysis:</strong><br>Currently, <strong>${usersData.filter(u => u.isPaid || u.planTier === 'PRO').length}</strong> real user(s) on Pro tier in Firestore:<br><em>${proUsers || 'None yet'}</em>.`;
        } else if (q.includes('overdue') || q.includes('expir')) {
          const overdue = usersData.filter(u => u.status === 'Overdue');
          botBubble.innerHTML = `<strong>⚠️ Overdue &amp; Expiring Notice:</strong><br>Found <strong>${overdue.length}</strong> subscription(s) that exceeded trial in Firestore${overdue.length ? ` (${overdue.map(u => u.assigneeName).join(', ')})` : '.'}`;
        } else {
          botBubble.innerHTML = `<strong>📊 Firestore Real-Time Query:</strong><br>Managing <strong>${usersData.length}</strong> real registered user(s) in collection <code>/users</code>. All changes sync directly to Firestore.`;
        }

        aiChatStream.appendChild(botBubble);
        aiChatStream.scrollTop = aiChatStream.scrollHeight;
      }, 400);
    });
  }
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ============ BOOT ============
document.addEventListener('DOMContentLoaded', () => {
  setupAuth();
  setupFiltersAndSearch();
  setupModals();
  setupAiDrawer();
});
