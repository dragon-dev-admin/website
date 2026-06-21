import {
  createUserWithEmailAndPassword,
  doc,
  firebase,
  firebaseReady,
  getDoc,
  getDownloadURL,
  increment,
  onAuthStateChanged,
  onSnapshot,
  query,
  ref,
  runTransaction,
  sendPasswordResetEmail,
  serverTimestamp,
  setDoc,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateDoc,
  uploadBytes,
  where,
  collection,
} from './firebase-config.js';
import { defaultModules } from './default-modules.js';

const state = {
  authMode: 'signin',
  user: null,
  userDoc: null,
  modules: [...defaultModules],
  votes: new Map(),
  unsubscribeModules: null,
};

const els = {
  firebaseStatus: document.getElementById('firebaseStatus'),
  moduleGrid: document.getElementById('moduleGrid'),
  moduleCount: document.getElementById('moduleCount'),
  authSummary: document.getElementById('authSummary'),
  authForm: document.getElementById('authForm'),
  authEmail: document.getElementById('authEmail'),
  authPassword: document.getElementById('authPassword'),
  authSubmit: document.getElementById('authSubmit'),
  authMessage: document.getElementById('authMessage'),
  googleButton: document.getElementById('googleButton'),
  forgotPasswordButton: document.getElementById('forgotPasswordButton'),
  signOutButton: document.getElementById('signOutButton'),
  uploadForm: document.getElementById('uploadForm'),
  uploadButton: document.getElementById('uploadButton'),
  uploadMessage: document.getElementById('uploadMessage'),
  template: document.getElementById('moduleCardTemplate'),
};

function setMessage(element, text, tone = 'muted') {
  element.textContent = text;
  element.dataset.tone = tone;
}

function parseTags(value) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 72);
}

function bySequenceThenName(a, b) {
  const sequenceA = Number(a.sequence) || 9999;
  const sequenceB = Number(b.sequence) || 9999;
  if (sequenceA !== sequenceB) return sequenceA - sequenceB;
  return String(a.name).localeCompare(String(b.name));
}

function mergeModules(remoteModules) {
  const byId = new Map(defaultModules.map((moduleItem) => [moduleItem.id, { ...moduleItem }]));
  for (const moduleItem of remoteModules) {
    const fallbackId = moduleItem.id || moduleItem.slug;
    byId.set(fallbackId, {
      ...byId.get(fallbackId),
      ...moduleItem,
      id: fallbackId,
    });
  }
  state.modules = [...byId.values()]
    .filter((moduleItem) => moduleItem.status === 'active')
    .sort(bySequenceThenName);
  renderModules();
}

function renderTags(container, label, tags) {
  container.dataset.label = label;
  container.innerHTML = '';
  const items = tags?.length ? tags : ['none listed'];
  for (const tag of items) {
    const span = document.createElement('span');
    span.className = 'tag';
    span.textContent = tag;
    container.appendChild(span);
  }
}

function renderModules() {
  els.moduleGrid.innerHTML = '';
  els.moduleCount.textContent = `${state.modules.length} module${state.modules.length === 1 ? '' : 's'}`;

  if (!state.modules.length) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = 'No active modules yet.';
    els.moduleGrid.appendChild(empty);
    return;
  }

  for (const moduleItem of state.modules) {
    const node = els.template.content.firstElementChild.cloneNode(true);
    const voteValue = state.votes.get(moduleItem.id) || 0;
    node.dataset.moduleId = moduleItem.id;
    node.querySelector('.module-thumb').src = moduleItem.thumbnailUrl || '../icon-128.png';
    node.querySelector('.module-thumb').alt = `${moduleItem.name} thumbnail`;
    node.querySelector('h3').textContent = moduleItem.name;
    node.querySelector('.sequence-pill').textContent = `#${moduleItem.sequence || '-'}`;
    node.querySelector('.module-description').textContent = moduleItem.description || 'No description provided yet.';
    renderTags(node.querySelector('.inputs'), 'Inputs', moduleItem.dataInputs || []);
    renderTags(node.querySelector('.apis'), 'APIs', moduleItem.dataApis || []);
    node.querySelector('.module-meta').textContent = `Published by ${moduleItem.uploaderEmail || 'community'}${moduleItem.isDefault ? ' - core module' : ''}`;
    const downloadLink = node.querySelector('.download-link');
    downloadLink.href = moduleItem.packageUrl || '#';
    if (!moduleItem.packageUrl) {
      downloadLink.classList.add('is-disabled');
      downloadLink.removeAttribute('href');
    }

    const upButton = node.querySelector('[data-vote="1"]');
    const downButton = node.querySelector('[data-vote="-1"]');
    upButton.querySelector('span').textContent = moduleItem.upvotes || 0;
    downButton.querySelector('span').textContent = moduleItem.downvotes || 0;
    upButton.classList.toggle('is-active', voteValue === 1);
    downButton.classList.toggle('is-active', voteValue === -1);
    els.moduleGrid.appendChild(node);
  }
}

async function ensureAnonymousUser() {
  if (!firebaseReady) return null;
  if (!firebase.auth.currentUser) {
    await signInAnonymously(firebase.auth);
  }
  return firebase.auth.currentUser;
}

async function upsertUserProfile(user) {
  if (!firebaseReady || !user || user.isAnonymous) return null;
  const profileRef = doc(firebase.db, 'users', user.uid);
  const existing = await getDoc(profileRef);
  const provider = user.providerData?.[0]?.providerId || 'password';
  const base = {
    email: user.email || '',
    displayName: user.displayName || '',
    provider,
    lastLoginAt: serverTimestamp(),
  };
  if (existing.exists()) {
    await updateDoc(profileRef, base);
    return { id: user.uid, ...existing.data(), ...base };
  }
  const newProfile = {
    ...base,
    blacklisted: false,
    createdAt: serverTimestamp(),
  };
  await setDoc(profileRef, newProfile);
  return { id: user.uid, ...newProfile };
}

async function loadVotesForUser(user) {
  state.votes = new Map();
  if (!firebaseReady || !user) {
    renderModules();
    return;
  }

  const votePromises = state.modules.map(async (moduleItem) => {
    const voteRef = doc(firebase.db, 'votes', `${moduleItem.id}_${user.uid}`);
    const snapshot = await getDoc(voteRef);
    if (snapshot.exists()) {
      state.votes.set(moduleItem.id, snapshot.data().value);
    }
  });
  await Promise.allSettled(votePromises);
  renderModules();
}

function defaultModuleDocument(moduleItem) {
  return {
    name: moduleItem.name,
    slug: moduleItem.slug,
    sequence: moduleItem.sequence,
    description: moduleItem.description,
    setupInstructions: moduleItem.setupInstructions,
    dataInputs: moduleItem.dataInputs || [],
    dataApis: moduleItem.dataApis || [],
    thumbnailUrl: moduleItem.thumbnailUrl,
    packageUrl: moduleItem.packageUrl,
    uploaderUid: 'core',
    uploaderEmail: moduleItem.uploaderEmail || 'Alpha Dragon core',
    status: 'active',
    upvotes: moduleItem.upvotes || 0,
    downvotes: moduleItem.downvotes || 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

async function vote(moduleId, value) {
  if (!firebaseReady) {
    setMessage(els.authMessage, 'Firebase is not configured yet, so votes are local-only in this preview.');
    const moduleItem = state.modules.find((item) => item.id === moduleId);
    if (!moduleItem) return;
    const previous = state.votes.get(moduleId) || 0;
    if (previous === value) {
      state.votes.delete(moduleId);
      if (value === 1) moduleItem.upvotes = Math.max(0, (moduleItem.upvotes || 0) - 1);
      if (value === -1) moduleItem.downvotes = Math.max(0, (moduleItem.downvotes || 0) - 1);
    } else {
      if (previous === 1) moduleItem.upvotes = Math.max(0, (moduleItem.upvotes || 0) - 1);
      if (previous === -1) moduleItem.downvotes = Math.max(0, (moduleItem.downvotes || 0) - 1);
      if (value === 1) moduleItem.upvotes = (moduleItem.upvotes || 0) + 1;
      if (value === -1) moduleItem.downvotes = (moduleItem.downvotes || 0) + 1;
      state.votes.set(moduleId, value);
    }
    renderModules();
    return;
  }

  const user = await ensureAnonymousUser();
  const moduleItem = state.modules.find((item) => item.id === moduleId);
  if (!user || !moduleItem) return;

  const voteRef = doc(firebase.db, 'votes', `${moduleId}_${user.uid}`);
  const moduleRef = doc(firebase.db, 'modules', moduleId);
  const previous = state.votes.get(moduleId) || 0;
  await runTransaction(firebase.db, async (transaction) => {
    const moduleSnapshot = await transaction.get(moduleRef);
    const next = previous === value ? 0 : value;

    const changes = {};
    if (previous === 1 && next !== 1) {
      changes.upvotes = increment(-1);
    }
    if (previous === -1 && next !== -1) {
      changes.downvotes = increment(-1);
    }
    if (next === 1 && previous !== 1) {
      changes.upvotes = increment(1);
    }
    if (next === -1 && previous !== -1) {
      changes.downvotes = increment(1);
    }

    if (!moduleSnapshot.exists()) {
      transaction.set(moduleRef, {
        ...defaultModuleDocument(moduleItem),
        upvotes: next === 1 ? 1 : 0,
        downvotes: next === -1 ? 1 : 0,
        updatedAt: serverTimestamp(),
      });
    } else if (Object.keys(changes).length) {
      transaction.set(moduleRef, {
        ...changes,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }

    if (next === 0) {
      transaction.set(voteRef, {
        moduleId,
        uid: user.uid,
        value: 0,
        updatedAt: serverTimestamp(),
      });
    } else {
      transaction.set(voteRef, {
        moduleId,
        uid: user.uid,
        value: next,
        updatedAt: serverTimestamp(),
      });
    }
    state.votes.set(moduleId, next);
    if (next === 0) state.votes.delete(moduleId);
  });
}

function subscribeModules() {
  if (!firebaseReady) {
    els.firebaseStatus.textContent = 'Firebase is not configured yet. The static default modules are visible, but login, upload, persisted votes, and admin tools need real project keys in firebase-config.js.';
    renderModules();
    return;
  }

  els.firebaseStatus.textContent = 'Connected to Firebase. Public visitors can browse and vote; signed-in builders can upload modules.';
  const modulesQuery = query(
    collection(firebase.db, 'modules'),
    where('status', '==', 'active')
  );

  state.unsubscribeModules?.();
  state.unsubscribeModules = onSnapshot(
    modulesQuery,
    (snapshot) => {
      const remoteModules = snapshot.docs.map((moduleDoc) => ({
        id: moduleDoc.id,
        ...moduleDoc.data(),
      }));
      mergeModules(remoteModules);
      if (state.user) loadVotesForUser(state.user);
    },
    (error) => {
      console.error(error);
      els.firebaseStatus.textContent = 'Firebase is reachable, but the module query failed. Check Firestore rules/indexes. Showing static defaults.';
      renderModules();
    }
  );
}

function updateAuthUi() {
  const user = state.user;
  const realUser = user && !user.isAnonymous;
  const blacklisted = Boolean(state.userDoc?.blacklisted);

  if (!firebaseReady) {
    els.authSummary.textContent = 'Add Firebase project values before account features can run.';
    els.uploadButton.disabled = true;
    return;
  }

  if (!user) {
    els.authSummary.textContent = 'Anonymous users can browse and vote. Sign in to upload.';
    els.signOutButton.hidden = true;
    els.uploadButton.disabled = true;
    return;
  }

  if (user.isAnonymous) {
    els.authSummary.textContent = 'Browsing anonymously. Sign in with email or Google to upload a module.';
    els.signOutButton.hidden = true;
    els.uploadButton.disabled = true;
    return;
  }

  els.authSummary.textContent = blacklisted
    ? `${user.email || 'This account'} is blacklisted from uploads.`
    : `Signed in as ${user.email || user.displayName || 'builder'}.`;
  els.signOutButton.hidden = false;
  els.uploadButton.disabled = blacklisted;
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  if (!firebaseReady) {
    setMessage(els.authMessage, 'Fill firebase-config.js before using authentication.');
    return;
  }

  const email = els.authEmail.value.trim();
  const password = els.authPassword.value;
  if (!email || !password) {
    setMessage(els.authMessage, 'Enter email and password.');
    return;
  }

  try {
    if (state.authMode === 'signup') {
      await createUserWithEmailAndPassword(firebase.auth, email, password);
      setMessage(els.authMessage, 'Account created. You can upload modules now.');
    } else {
      await signInWithEmailAndPassword(firebase.auth, email, password);
      setMessage(els.authMessage, 'Signed in.');
    }
    els.authForm.reset();
  } catch (error) {
    setMessage(els.authMessage, error.message);
  }
}

async function handleGoogleSignIn() {
  if (!firebaseReady) {
    setMessage(els.authMessage, 'Fill firebase-config.js before using Google sign-in.');
    return;
  }
  try {
    await signInWithPopup(firebase.auth, firebase.googleProvider);
    setMessage(els.authMessage, 'Signed in with Google.');
  } catch (error) {
    setMessage(els.authMessage, error.message);
  }
}

async function handleForgotPassword() {
  if (!firebaseReady) {
    setMessage(els.authMessage, 'Fill firebase-config.js before sending reset emails.');
    return;
  }
  const email = els.authEmail.value.trim();
  if (!email) {
    setMessage(els.authMessage, 'Enter your email first.');
    return;
  }
  try {
    await sendPasswordResetEmail(firebase.auth, email);
    setMessage(els.authMessage, 'Password reset email sent.');
  } catch (error) {
    setMessage(els.authMessage, error.message);
  }
}

async function handleUpload(event) {
  event.preventDefault();
  if (!firebaseReady || !state.user || state.user.isAnonymous) {
    setMessage(els.uploadMessage, 'Sign in before uploading.');
    return;
  }
  if (state.userDoc?.blacklisted) {
    setMessage(els.uploadMessage, 'This account is blacklisted from uploading.');
    return;
  }

  const form = event.currentTarget;
  const name = document.getElementById('moduleName').value.trim();
  const description = document.getElementById('moduleDescription').value.trim();
  const setupInstructions = document.getElementById('setupInstructions').value.trim();
  const dataInputs = parseTags(document.getElementById('dataInputs').value);
  const dataApis = parseTags(document.getElementById('dataApis').value);
  const thumbnailFile = document.getElementById('thumbnailFile').files[0];
  const packageFile = document.getElementById('packageFile').files[0];
  const rightsConfirmed = document.getElementById('rightsConfirmed').checked;

  if (!name || !description || !setupInstructions) {
    setMessage(els.uploadMessage, 'Complete module name, description, and setup instructions.');
    return;
  }

  if (!thumbnailFile) {
    setMessage(els.uploadMessage, 'Add a thumbnail image.');
    return;
  }

  if (!packageFile) {
    setMessage(els.uploadMessage, 'Add a module zip package.');
    return;
  }

  if (!rightsConfirmed) {
    setMessage(els.uploadMessage, 'Confirm that you have rights to share this module and disclosed required services or data terms.');
    return;
  }

  const slug = slugify(name);
  const moduleId = `${slug}-${Date.now()}`;

  try {
    els.uploadButton.disabled = true;
    setMessage(els.uploadMessage, 'Uploading files...');

    const thumbRef = ref(firebase.storage, `module-thumbnails/${state.user.uid}/${moduleId}-${thumbnailFile.name}`);
    const packageRef = ref(firebase.storage, `module-packages/${state.user.uid}/${moduleId}-${packageFile.name}`);

    await uploadBytes(thumbRef, thumbnailFile);
    await uploadBytes(packageRef, packageFile);
    const thumbnailUrl = await getDownloadURL(thumbRef);
    const packageUrl = await getDownloadURL(packageRef);

    await setDoc(doc(firebase.db, 'modules', moduleId), {
      name,
      slug,
      sequence: 1000,
      description,
      setupInstructions,
      dataInputs,
      dataApis,
      thumbnailUrl,
      packageUrl,
      uploaderUid: state.user.uid,
      uploaderEmail: state.user.email || '',
      moduleAuthorRightsConfirmed: true,
      status: 'active',
      upvotes: 0,
      downvotes: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    form.reset();
    setMessage(els.uploadMessage, 'Module published to the Playground.');
  } catch (error) {
    setMessage(els.uploadMessage, error.message);
  } finally {
    updateAuthUi();
  }
}

function bindEvents() {
  document.querySelectorAll('[data-auth-mode]').forEach((button) => {
    button.addEventListener('click', () => {
      state.authMode = button.dataset.authMode;
      document.querySelectorAll('[data-auth-mode]').forEach((tab) => tab.classList.remove('is-active'));
      button.classList.add('is-active');
      els.authSubmit.textContent = state.authMode === 'signup' ? 'Sign up' : 'Sign in';
    });
  });

  els.authForm.addEventListener('submit', handleAuthSubmit);
  els.googleButton.addEventListener('click', handleGoogleSignIn);
  els.forgotPasswordButton.addEventListener('click', handleForgotPassword);
  els.signOutButton.addEventListener('click', () => {
    if (firebaseReady) signOut(firebase.auth);
  });
  els.uploadForm.addEventListener('submit', handleUpload);
  els.moduleGrid.addEventListener('click', async (event) => {
    const voteButton = event.target.closest('[data-vote]');
    if (!voteButton) return;
    const card = event.target.closest('[data-module-id]');
    try {
      await vote(card.dataset.moduleId, Number(voteButton.dataset.vote));
    } catch (error) {
      console.error(error);
      setMessage(els.authMessage, `Vote failed: ${error.message}`);
    }
  });
}

function boot() {
  bindEvents();
  subscribeModules();

  if (!firebaseReady) {
    updateAuthUi();
    return;
  }

  onAuthStateChanged(firebase.auth, async (user) => {
    state.user = user;
    state.userDoc = await upsertUserProfile(user);
    updateAuthUi();
    await loadVotesForUser(user);
  });

  ensureAnonymousUser().catch((error) => {
    console.error(error);
    setMessage(els.authMessage, error.message);
  });
}

boot();
