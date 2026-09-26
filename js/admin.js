/**
 * FlipPage Enterprise SaaS Admin Dashboard Controller
 * Real-time Firebase Firestore RBAC, User Management, Plan Tiers & Time Duration
 * Matching Reference UI Layout & SaaS Design System
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
  "omethranhasacz@gmail.com",
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

// Initial User & Plan Template Dataset
const initialSeedData = [
  {
    uid: 'u-1',
    displayName: 'Jane Cooper',
    email: 'jane.cooper@example.com',
    photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    taskName: 'Wireframe Homepage',
    project: 'Landing Page Design',
    priority: 'Low',
    status: 'To Do',
    plan: 'Free',
    isPaid: false,
    trialDays: 14,
    trialStartDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    trialEndDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
    brandName: 'Cooper Studio',
    brandUrl: 'FlipPage.com/jane-cooper',
    role: 'user'
  },
  {
    uid: 'u-2',
    displayName: 'Robert Fox',
    email: 'robert.fox@example.com',
    photoURL: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
    taskName: 'Update Brand Colors',
    project: 'Landing Page Design',
    priority: 'Medium',
    status: 'To Do',
    plan: 'Starter',
    isPaid: false,
    trialDays: 14,
    trialStartDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    trialEndDate: new Date(Date.now() + 13 * 24 * 60 * 60 * 1000).toISOString(),
    brandName: 'Fox Media',
    brandUrl: 'FlipPage.com/robert-fox',
    role: 'user'
  },
  {
    uid: 'u-3',
    displayName: 'Eleanor Pena',
    email: 'eleanor.pena@example.com',
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    taskName: 'Checkout Flow Redesign',
    project: 'Landing Page Design',
    priority: 'High',
    status: 'In Progress',
    plan: 'Pro',
    isPaid: true,
    trialDays: 30,
    trialStartDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    trialEndDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
    brandName: 'Pena Fashion',
    brandUrl: 'FlipPage.com/eleanor-pena',
    role: 'user'
  },
  {
    uid: 'u-4',
    displayName: 'Guy Hawkins',
    email: 'guy.hawkins@example.com',
    photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    taskName: 'API Integration Testing',
    project: 'Website Revamp',
    priority: 'Medium',
    status: 'In Progress',
    plan: 'Pro',
    isPaid: true,
    trialDays: 30,
    trialStartDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    trialEndDate: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000).toISOString(),
    brandName: 'Hawkins Tech',
    brandUrl: 'FlipPage.com/guy-hawkins',
    role: 'user'
  },
  {
    uid: 'u-5',
    displayName: 'Annette Black',
    email: 'annette.black@example.com',
    photoURL: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80',
    taskName: 'Design System Audit',
    project: 'Landing Page Design',
    priority: 'Medium',
    status: 'Review',
    plan: 'Starter',
    isPaid: false,
    trialDays: 14,
    trialStartDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    trialEndDate: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000).toISOString(),
    brandName: 'Black Design Group',
    brandUrl: 'FlipPage.com/annette-black',
    role: 'user'
  },
  {
    uid: 'u-6',
    displayName: 'Jacob Jones',
    email: 'jacob.jones@example.com',
    photoURL: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&auto=format&fit=crop&q=80',
    taskName: 'Email Template QA',
    project: 'Daily Tasks',
    priority: 'Low',
    status: 'Review',
    plan: 'Free',
    isPaid: false,
    trialDays: 7,
    trialStartDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    trialEndDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    brandName: 'Jones Agency',
    brandUrl: 'FlipPage.com/jacob-jones',
    role: 'user'
  },
  {
    uid: 'u-7',
    displayName: 'Esther Howard',
    email: 'esther.howard@example.com',
    photoURL: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=100&auto=format&fit=crop&q=80',
    taskName: 'User Research Interviews',
    project: 'Landing Page Design',
    priority: 'Low',
    status: 'Completed',
    plan: 'Enterprise',
    isPaid: true,
    trialDays: 60,
    trialStartDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    trialEndDate: new Date(Date.now() + 50 * 24 * 60 * 60 * 1000).toISOString(),
    brandName: 'Howard Global',
    brandUrl: 'FlipPage.com/esther-howard',
    role: 'user'
  },
  {
    uid: 'u-8',
    displayName: 'Alex Morgan',
    email: 'alex.morgan@workspace.io',
    photoURL: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80',
    taskName: 'Annual Sustainability Report',
    project: 'Corporate Publishing',
    priority: 'High',
    status: 'In Progress',
    plan: 'Pro',
    isPaid: true,
    trialDays: 90,
    trialStartDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    trialEndDate: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000).toISOString(),
    brandName: 'Morgan Media Co.',
    brandUrl: 'FlipPage.com/morgan-media',
    role: 'user'
  },
  {
    uid: 'u-9',
    displayName: 'Senuri Jayawardena',
    email: 'senuri@northbay.lk',
    photoURL: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80',
    taskName: 'Spring Lookbook 2026',
    project: 'Catalogues',
    priority: 'High',
    status: 'Completed',
    plan: 'Enterprise',
    isPaid: true,
    trialDays: 365,
    trialStartDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    trialEndDate: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000).toISOString(),
    brandName: 'Northbay Finance',
    brandUrl: 'FlipPage.com/northbay-finance',
    role: 'user'
  },
  {
    uid: 'u-10',
    displayName: 'Dineth Abeysekara',
    email: 'dineth@apexcreative.co',
    photoURL: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&auto=format&fit=crop&q=80',
    taskName: 'Vector Zoom 4K Optimization',
    project: 'Core Engine',
    priority: 'Medium',
    status: 'Overdue',
    plan: 'Free',
    isPaid: false,
    trialDays: 14,
    trialStartDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    trialEndDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    brandName: 'Apex Studio',
    brandUrl: 'FlipPage.com/apex-studio',
    role: 'user'
  },
  {
    uid: 'u-11',
    displayName: 'Kavindi Perera',
    email: 'kavindi@designstudio.lk',
    photoURL: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&auto=format&fit=crop&q=80',
    taskName: 'Brand Custom Domain Routing',
    project: 'SaaS Platform',
    priority: 'Low',
    status: 'To Do',
    plan: 'Starter',
    isPaid: false,
    trialDays: 30,
    trialStartDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    trialEndDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(),
    brandName: 'Perera Design Systems',
    brandUrl: 'FlipPage.com/perera-design',
    role: 'user'
  },
  {
    uid: 'u-12',
    displayName: 'Ometh Ranhas',
    email: 'omethranhasacz@gmail.com',
    photoURL: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80',
    taskName: 'System Security & ABAC Audit',
    project: 'Security & Auth',
    priority: 'High',
    status: 'Completed',
    plan: 'Pro',
    isPaid: true,
    trialDays: 365,
    trialStartDate: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
    trialEndDate: new Date(Date.now() + 325 * 24 * 60 * 60 * 1000).toISOString(),
    brandName: 'FlipPage Core',
    brandUrl: 'FlipPage.com/core',
    role: 'admin'
  }
];

let usersData = [];
let activeFilter = 'all';
let currentSearchTerm = '';
let currentPage = 1;
const pageSize = 10;
let currentEditingUserId = null;
let currentEditingUserPlan = 'Free';
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
const editPlanOptions = document.getElementById('edit-plan-options');
const editCustomDays = document.getElementById('edit-custom-days');
const editPlanStatus = document.getElementById('edit-plan-status');
const btnSavePlanChanges = document.getElementById('btn-save-plan-changes');

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

        // Initialize Firestore Data Sync & Seeding
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

// ============ REAL-TIME FIRESTORE DATA SYNC ============
async function initFirestoreData() {
  const usersPath = 'users';
  try {
    const usersCol = collection(db, usersPath);

    // Initial check: if users collection has fewer than 5 items, seed full dataset to Firestore
    const existingSnap = await getDocs(usersCol);
    if (existingSnap.size < 5) {
      await seedUsersToFirestore();
    }

    // Attach real-time listener
    onSnapshot(usersCol, (snapshot) => {
      const liveList = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const trialEnd = data.trialEndDate ? data.trialEndDate.split('T')[0] : '2026-03-20';
        const isPaidUser = data.isPaid === true || data.plan === 'Pro' || data.plan === 'Enterprise';
        
        liveList.push({
          id: docSnap.id,
          taskName: data.taskName || (data.brandName ? `${data.brandName} Workspace` : `${data.displayName || 'User'}'s Workspace`),
          project: data.project || 'Landing Page Design',
          assigneeName: data.displayName || data.assigneeName || 'Member',
          assigneeEmail: data.email || 'user@example.com',
          assigneeAvatar: data.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.displayName || 'U')}`,
          priority: data.priority || (isPaidUser ? 'High' : 'Medium'),
          status: data.status === 'active' ? (isPaidUser ? 'In Progress' : 'To Do') : (data.status === 'expired' ? 'Overdue' : (data.status === 'review' ? 'Review' : 'Completed')),
          dueDate: trialEnd,
          durationDays: data.trialDays || 14,
          planTier: data.plan || (isPaidUser ? 'Pro' : 'Free'),
          isPaid: isPaidUser,
          brandUrl: data.brandUrl || `FlipPage.com/${encodeURIComponent((data.displayName || 'user').toLowerCase().replace(/\s+/g, '-'))}`,
          role: data.role || 'user'
        });
      });

      usersData = liveList;
      renderTable();
    }, (error) => {
      handleFirestoreError(error, 'list', usersPath);
      // Fallback to memory if offline
      if (usersData.length === 0) {
        usersData = initialSeedData.map(u => ({
          id: u.uid,
          taskName: u.taskName,
          project: u.project,
          assigneeName: u.displayName,
          assigneeEmail: u.email,
          assigneeAvatar: u.photoURL,
          priority: u.priority,
          status: u.status,
          dueDate: u.trialEndDate.split('T')[0],
          durationDays: u.trialDays,
          planTier: u.plan,
          isPaid: u.isPaid,
          brandUrl: u.brandUrl,
          role: u.role
        }));
        renderTable();
      }
    });

  } catch (err) {
    handleFirestoreError(err, 'get', usersPath);
  }
}

// Seed initial dataset into Firestore
async function seedUsersToFirestore() {
  try {
    for (const item of initialSeedData) {
      const userRef = doc(db, 'users', item.uid);
      await setDoc(userRef, {
        uid: item.uid,
        displayName: item.displayName,
        email: item.email,
        photoURL: item.photoURL,
        taskName: item.taskName,
        project: item.project,
        priority: item.priority,
        status: item.status === 'Overdue' ? 'expired' : 'active',
        plan: item.plan,
        isPaid: item.isPaid,
        trialDays: item.trialDays,
        trialStartDate: item.trialStartDate,
        trialEndDate: item.trialEndDate,
        brandName: item.brandName,
        brandUrl: item.brandUrl,
        role: item.role,
        createdAt: new Date().toISOString()
      }, { merge: true });
    }
    console.log('Seeded users collection to Firestore');
  } catch (err) {
    console.warn('Initial Firestore user seeding warning:', err);
  }
}

// ============ RENDER DATA TABLE ============
function renderTable() {
  if (!usersTableBody) return;
  usersTableBody.innerHTML = '';

  let filtered = usersData.filter(user => {
    // Filter chip
    if (activeFilter === 'pro' && !user.isPaid && user.planTier !== 'Pro' && user.planTier !== 'Enterprise') return false;
    if (activeFilter === 'active' && user.status === 'Overdue') return false;
    if (activeFilter === 'expiring') {
      const daysLeft = Math.ceil((new Date(user.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
      if (daysLeft < 0 || daysLeft > 7) return false;
    }
    if (activeFilter === 'expired' && user.status !== 'Overdue') return false;
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
  const startIndex = (currentPage - 1) * pageSize;
  const paginated = filtered.slice(startIndex, startIndex + pageSize);

  if (paginationInfoText) {
    const endDisplay = Math.min(startIndex + pageSize, totalFiltered);
    paginationInfoText.textContent = `Showing ${totalFiltered === 0 ? 0 : startIndex + 1}-${endDisplay} of ${totalFiltered} users in Firestore`;
  }

  if (paginated.length === 0) {
    usersTableBody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center; padding: 48px 20px; color:#64748B;">
          <div style="font-size:1.8rem; margin-bottom:8px;">👥</div>
          <strong style="color:#0F172A; font-size:1rem;">No users or plans match your search</strong>
          <p style="margin:6px 0 0; font-size:0.85rem;">All records are queried live from Firestore collection <code>/users</code>.</p>
        </td>
      </tr>
    `;
    return;
  }

  paginated.forEach(user => {
    const tr = document.createElement('tr');

    const isPro = Boolean(user.isPaid || user.planTier === 'PRO' || user.planTier === 'Pro');
    const planDisplay = isPro ? 'PRO' : 'FREE';

    // Priority / Plan badge with SVG icons matching prompt
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
        <span class="duration-subtag">${daysText} • ${user.durationDays}d duration</span>
      </td>
      <td style="text-align:right; white-space:nowrap;">
        <div style="display:inline-flex; align-items:center; gap:6px;">
          ${isPro 
            ? `<button type="button" class="btn-quick-plan" data-action="set-free" data-user-id="${user.id}" title="Switch to FREE Plan" style="padding:3px 8px; border-radius:6px; border:1px solid #CBD5E1; background:#FFFFFF; font-size:0.75rem; font-weight:700; cursor:pointer; color:#475569;">Set FREE</button>`
            : `<button type="button" class="btn-quick-plan" data-action="set-pro" data-user-id="${user.id}" title="Grant PRO Crown Plan" style="padding:3px 8px; border-radius:6px; border:1px solid #FCD34D; background:#FEF3C7; font-size:0.75rem; font-weight:800; cursor:pointer; color:#B45309;">👑 Set PRO</button>`
          }
          <button type="button" class="btn-quick-plan" data-action="extend-30" data-user-id="${user.id}" title="Extend +30 Days in Firestore" style="padding:3px 8px; border-radius:6px; border:1px solid #BFDBFE; background:#EFF6FF; font-size:0.75rem; font-weight:700; cursor:pointer; color:#2563EB;">+30d</button>
          <button type="button" class="row-actions-btn" data-action="edit" data-user-id="${user.id}" title="Full Plan & Duration Settings">⋮</button>
        </div>
      </td>
    `;

    // Row action click listeners
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

    usersTableBody.appendChild(tr);
  });
}

// Quick Firestore Plan Update
async function quickUpdateUserPlan(userId, targetPlan) {
  const isPaid = (targetPlan === 'PRO');
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      plan: targetPlan,
      isPaid: isPaid,
      status: 'active',
      updatedAt: new Date().toISOString()
    });
    showToast(`Updated user plan to ${targetPlan} in Firestore!`);
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

function formatDateDisplay(dateStr) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (_) {
    return dateStr;
  }
}

// ============ MODALS: ADD USER & EDIT PLAN/DURATION ============
function openEditModal(userId) {
  const user = usersData.find(u => u.id === userId);
  if (!user) return;

  currentEditingUserId = userId;
  currentEditingUserPlan = user.planTier || (user.isPaid ? 'Pro' : 'Free');
  currentEditingDuration = user.durationDays || 14;

  if (editModalUserName) editModalUserName.textContent = user.assigneeName;
  if (editModalUserEmail) editModalUserEmail.textContent = user.assigneeEmail;
  if (editModalAvatar) {
    editModalAvatar.innerHTML = `<img src="${user.assigneeAvatar}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
  }
  if (editCustomDays) editCustomDays.value = currentEditingDuration;
  if (editPlanStatus) {
    if (user.status === 'In Progress' || user.status === 'To Do') editPlanStatus.value = 'active';
    else if (user.status === 'Review') editPlanStatus.value = 'review';
    else if (user.status === 'Overdue') editPlanStatus.value = 'expired';
    else editPlanStatus.value = 'active';
  }

  // Update plan option buttons
  if (editPlanOptions) {
    editPlanOptions.querySelectorAll('.plan-btn-option').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.plan === currentEditingUserPlan);
    });
  }

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
      const plan = activePlanBtn ? activePlanBtn.dataset.plan : 'Free';
      const isPaid = plan === 'Pro' || plan === 'Enterprise';

      const dueDateObj = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);
      const newId = 'u-' + Date.now();

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
          trialDays: duration,
          trialStartDate: new Date().toISOString(),
          trialEndDate: dueDateObj.toISOString(),
          status: 'active',
          role: 'user',
          brandName: brand,
          brandUrl: `FlipPage.com/${brand}`,
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
      });
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
    });
  });

  if (editCustomDays) {
    editCustomDays.addEventListener('input', () => {
      currentEditingDuration = parseInt(editCustomDays.value, 10) || 14;
    });
  }

  // Save changes from Edit Modal to Firestore
  if (btnSavePlanChanges) {
    btnSavePlanChanges.addEventListener('click', async () => {
      if (!currentEditingUserId) return;
      const user = usersData.find(u => u.id === currentEditingUserId);
      if (!user) return;

      const duration = parseInt(editCustomDays.value, 10) || 14;
      const plan = currentEditingUserPlan;
      const isPaid = plan === 'Pro' || plan === 'Enterprise';
      const statusVal = editPlanStatus ? editPlanStatus.value : 'active';

      const newDueDateObj = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);

      // Update Firestore in real-time
      try {
        await updateDoc(doc(db, 'users', user.id), {
          plan: plan,
          isPaid: isPaid,
          trialDays: duration,
          trialEndDate: newDueDateObj.toISOString(),
          status: statusVal,
          updatedAt: new Date().toISOString()
        });
        showToast(`Updated ${user.assigneeName}'s plan to ${plan} (${duration} Days) in Firestore!`);
      } catch (err) {
        handleFirestoreError(err, 'update', `users/${user.id}`);
      }

      if (modalEditPlan) modalEditPlan.hidden = true;
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
      btnPage1.classList.add('is-active');
      if (btnPage2) btnPage2.classList.remove('is-active');
      renderTable();
    });
  }

  if (btnPage2) {
    btnPage2.addEventListener('click', () => {
      currentPage = 2;
      btnPage2.classList.add('is-active');
      if (btnPage1) btnPage1.classList.remove('is-active');
      renderTable();
    });
  }

  if (btnPagePrev) {
    btnPagePrev.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        if (btnPage1) btnPage1.classList.toggle('is-active', currentPage === 1);
        if (btnPage2) btnPage2.classList.toggle('is-active', currentPage === 2);
        renderTable();
      }
    });
  }

  if (btnPageNext) {
    btnPageNext.addEventListener('click', () => {
      const maxPages = Math.ceil(usersData.length / pageSize);
      if (currentPage < maxPages) {
        currentPage++;
        if (btnPage1) btnPage1.classList.toggle('is-active', currentPage === 1);
        if (btnPage2) btnPage2.classList.toggle('is-active', currentPage === 2);
        renderTable();
      }
    });
  }
}

// ============ ASK AI DRAWER (Matching "Ask Renza AI" button) ============
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

      // Append user msg
      const userBubble = document.createElement('div');
      userBubble.className = 'ai-msg user';
      userBubble.textContent = question;
      aiChatStream.appendChild(userBubble);
      aiChatInput.value = '';

      // Compute smart admin response
      setTimeout(() => {
        const botBubble = document.createElement('div');
        botBubble.className = 'ai-msg bot';
        
        const q = question.toLowerCase();
        if (q.includes('pro') || q.includes('crown') || q.includes('paid')) {
          const proUsers = usersData.filter(u => u.isPaid || u.planTier === 'Pro').map(u => `${u.assigneeName} (${u.assigneeEmail})`).join(', ');
          botBubble.innerHTML = `<strong>👑 Pro Plan Analysis:</strong><br>Currently, ${usersData.filter(u => u.isPaid).length} users are on Pro tiers in Firestore:<br><em>${proUsers}</em>.`;
        } else if (q.includes('overdue') || q.includes('expir')) {
          const overdue = usersData.filter(u => u.status === 'Overdue');
          botBubble.innerHTML = `<strong>⚠️ Overdue &amp; Expiring Notice:</strong><br>Found ${overdue.length} subscriptions that have exceeded their trial period in Firestore (e.g. <em>${overdue.map(u => u.assigneeName).join(', ')}</em>).`;
        } else {
          botBubble.innerHTML = `<strong>📊 Firestore Live Sync:</strong><br>Managing ${usersData.length} total users directly in Firebase Firestore collection <code>/users</code>. All changes are saved and synced instantly.`;
        }

        aiChatStream.appendChild(botBubble);
        aiChatStream.scrollTop = aiChatStream.scrollHeight;
      }, 500);
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
