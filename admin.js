import { db } from './firebase-config.js';
import { ref, set, push, onValue, remove, update } from "firebase/database";
import Sortable from "sortablejs";
import { now, getTimeStatus, loadTimeStatus, getDhakaTime, getDhakaDate } from './shared-time.js';
// Security Logic
const loginOverlay = document.getElementById('login-overlay');
const appContainer = document.getElementById('app');
const passwordInput = document.getElementById('admin-password');
const loginBtn = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');

const checkAuth = () => {
    if (sessionStorage.getItem('adminAuthenticated') === 'true') {
        loginOverlay.style.display = 'none';
        appContainer.style.display = 'block';
    }
};

loginBtn.addEventListener('click', () => {
    if (passwordInput.value === '123987sayon') {
        sessionStorage.setItem('adminAuthenticated', 'true');
        loginOverlay.style.display = 'none';
        appContainer.style.display = 'block';
    } else {
        loginError.style.display = 'block';
        passwordInput.value = '';
        passwordInput.focus();
    }
});

passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') loginBtn.click();
});

checkAuth();

// DOM Elements
const memberListBody = document.getElementById('member-list-body');
const banListBody = document.getElementById('ban-list-body');
const memberCountEl = document.getElementById('member-count');
const banCountEl = document.getElementById('ban-count');
const addMemberBtn = document.getElementById('add-member-btn');
const memberModal = document.getElementById('member-modal');
const memberForm = document.getElementById('member-form');
const closeModalBtn = document.getElementById('close-modal');

// Warning Modal Elements
const warningModal = document.getElementById('warning-modal');
const warningForm = document.getElementById('warning-form');
const closeWarningModalBtn = document.getElementById('close-warning-modal');
const deleteWarningBtn = document.getElementById('delete-warning-btn');
const warningReasonInput = document.getElementById('warning-reason');
const warningMemberIdInput = document.getElementById('warning-member-id');
const warningLevelInput = document.getElementById('warning-level');
const warningModalTitle = document.getElementById('warning-modal-title');
const warningLevelNumber = document.getElementById('warning-level-number');
const warningLevelBadge = document.getElementById('warning-level-badge');
const warningMemberName = document.getElementById('warning-member-name');
const warningRunningList = document.getElementById('warning-running-list');
const expiryPresets = document.getElementById('expiry-presets');
const customExpiry = document.getElementById('custom-expiry');
const warningExpiryValue = document.getElementById('warning-expiry-value');
const warningExpiryUnit = document.getElementById('warning-expiry-unit');
const expiryPreview = document.getElementById('expiry-preview');
const searchInput = document.getElementById('search-member');
const navBtns = document.querySelectorAll('.nav-btn');
const tabContents = document.querySelectorAll('.tab-content');

// New Settings Elements
const groupNameDisplay = document.getElementById('group-name-display');
const editGroupNameInput = document.getElementById('edit-group-name');
const saveGroupNameBtn = document.getElementById('save-group-name');
const editAuthorNameInput = document.getElementById('edit-author-name');
const saveAuthorNameBtn = document.getElementById('save-author-name');
const rulesListContainer = document.getElementById('rules-list-container');
const rulesEditorContainer = document.getElementById('rules-editor-container');
const addRuleBtn = document.getElementById('add-rule-btn');

// Comments Elements
const adminCommentsList = document.getElementById('admin-comments-list');

// Feedback Elements
const feedbackListContainer = document.getElementById('feedback-list');
const testFeedbackBtn = document.getElementById('test-feedback-btn');

// World Time API Status
const timeStatusCard = document.getElementById('time-status-card');
const timeStatusText = document.getElementById('time-status-text');
const timeRefreshBtn = document.getElementById('time-refresh-btn');

function renderTimeStatus() {
    if (!timeStatusCard) return;
    const s = getTimeStatus();
    if (s.synced) {
        timeStatusCard.classList.add('ok');
        timeStatusCard.classList.remove('error');
        timeStatusText.textContent = 'Online · ' + getDhakaTime();
    } else if (s.lastError) {
        timeStatusCard.classList.add('error');
        timeStatusCard.classList.remove('ok');
        timeStatusText.textContent = 'Error';
    } else {
        timeStatusCard.classList.remove('ok', 'error');
        timeStatusText.textContent = 'Syncing...';
    }
}

// Listen for the shared clock's sync/error events and reflect them live.
window.addEventListener('timesync', renderTimeStatus);
window.addEventListener('timeerror', renderTimeStatus);

timeRefreshBtn.addEventListener('click', async () => {
    timeStatusText.textContent = 'Refreshing...';
    timeStatusCard.classList.remove('ok', 'error');
    const btnIcon = timeRefreshBtn.querySelector('i');
    if (btnIcon) btnIcon.classList.add('fa-spin');
    const s = await loadTimeStatus();
renderTimeStatus();

// Live Bangladesh (Dhaka) clock shown in the Settings tab. Driven entirely by
// the synced server time — never the device clock.
const dhakaClockTime = document.getElementById('dhaka-clock-time');
const dhakaClockDate = document.getElementById('dhaka-clock-date');

function tickDhakaClock() {
    if (!dhakaClockTime) return;
    dhakaClockTime.textContent = getDhakaTime();
    if (dhakaClockDate) dhakaClockDate.textContent = getDhakaDate();
}
tickDhakaClock();
setInterval(tickDhakaClock, 1000);
    if (btnIcon) btnIcon.classList.remove('fa-spin');
});

renderTimeStatus();

// State
let membersLoaded = false;
let allMembers = [];
let allFeedback = [];
let currentSettings = {
    groupName: 'Seven Poddoians',
    authorName: '',
    rules: []
};

// Tab Navigation
navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.dataset.tab;
        
        navBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        tabContents.forEach(tab => {
            tab.classList.remove('active');
            if (tab.id === `${target}-tab`) {
                tab.classList.add('active');
            }
        });
    });
});

// Nav Scroll Arrows
const mainNav = document.getElementById('main-nav');
const navLeft = document.getElementById('nav-left');
const navRight = document.getElementById('nav-right');

function updateNavArrows() {
    if (!mainNav || !navLeft || !navRight) return;
    const maxScroll = mainNav.scrollWidth - mainNav.clientWidth;
    navLeft.disabled = mainNav.scrollLeft <= 1;
    navRight.disabled = mainNav.scrollLeft >= maxScroll - 1;
}

navLeft.addEventListener('click', () => mainNav.scrollBy({ left: -260, behavior: 'smooth' }));
navRight.addEventListener('click', () => mainNav.scrollBy({ left: 260, behavior: 'smooth' }));
mainNav.addEventListener('scroll', updateNavArrows);
window.addEventListener('resize', updateNavArrows);
updateNavArrows();

// Modal Logic
const openModal = (id = '', name = '') => {
    document.getElementById('edit-id').value = id;
    document.getElementById('member-name').value = name;
    document.getElementById('modal-title').textContent = id ? 'Edit Member' : 'Add Member';
    memberModal.classList.add('open');
};

const closeModal = () => {
    memberModal.classList.remove('open');
    memberForm.reset();
};

addMemberBtn.addEventListener('click', () => openModal());
closeModalBtn.addEventListener('click', closeModal);

// Member Form Submission
memberForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const name = document.getElementById('member-name').value.trim();

    if (id) {
        update(ref(db, `members/${id}`), { name });
    } else {
        const newMemberRef = push(ref(db, 'members'));
        set(newMemberRef, {
            name,
            strikes: 0,
            isAdmin: false,
            isBanned: false,
            banReason: '',
            order: allMembers.length,
            createdAt: Date.now()
        });
    }
    closeModal();
});

// Warning helpers
const UNIT_MS = { minutes: 60000, hours: 3600000, days: 86400000, weeks: 604800000, months: 2592000000 };

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

function formatExpiry(expiresAt) {
    if (!expiresAt || expiresAt <= 0) return 'Never expires';
    const t = new Date(expiresAt);
    return `Expires ${t.toLocaleDateString()} at ${t.toLocaleTimeString()}`;
}

function getSelectedExpiryMs() {
    const active = expiryPresets.querySelector('.expiry-chip.active');
    if (!active) return 0;
    if (active.dataset.custom) {
        const val = parseInt(warningExpiryValue.value, 10);
        if (!val || val <= 0) return 0;
        return val * (UNIT_MS[warningExpiryUnit.value] || 0);
    }
    return parseInt(active.dataset.days, 10) * UNIT_MS.days;
}

function selectExpiryChip(daysOrNum, remainingMs = 0) {
    expiryPresets.querySelectorAll('.expiry-chip').forEach(c => c.classList.remove('active'));
    const preset = [1, 3, 7, 30].find(d => Math.abs(daysOrNum - d) < 0.01);
    if (preset !== undefined) {
        expiryPresets.querySelector(`.expiry-chip[data-days="${preset}"]`).classList.add('active');
        customExpiry.style.display = 'none';
    } else {
        const custom = expiryPresets.querySelector('.expiry-chip.custom');
        custom.classList.add('active');
        customExpiry.style.display = 'flex';
        if (remainingMs > 0) {
            let value = 1, unit = 'days';
            for (const [u, m] of [['minutes', UNIT_MS.minutes], ['hours', UNIT_MS.hours], ['days', UNIT_MS.days], ['weeks', UNIT_MS.weeks], ['months', UNIT_MS.months]]) {
                const v = remainingMs / m;
                if (Number.isInteger(Math.round(v)) && Math.abs(v) >= 1) { value = Math.round(v); unit = u; }
            }
            warningExpiryValue.value = value;
            warningExpiryUnit.value = unit;
        }
    }
    updateExpiryPreview();
}

function populateExpiryForEditing(expiresAt) {
    if (!expiresAt || expiresAt <= 0) {
        selectExpiryChip(0);
        return;
    }
    const remainingMs = expiresAt - now();
    selectExpiryChip(remainingMs / UNIT_MS.days, remainingMs);
}

function updateExpiryPreview() {
    const durMs = getSelectedExpiryMs();
    if (!durMs) {
        expiryPreview.textContent = 'This warning will never expire.';
        expiryPreview.style.color = 'var(--text-dim)';
        return;
    }
    const exp = new Date(now() + durMs);
    expiryPreview.textContent = 'Expires on ' + exp.toLocaleDateString() + ' at ' + exp.toLocaleTimeString();
    expiryPreview.style.color = 'var(--secondary)';
}

function renderWarningRunning(member) {
    warningRunningList.innerHTML = '';
    if (!member) return;
    const warnings = member.warnings || {};
    const active = Object.keys(warnings)
        .map(lvl => ({ lvl, w: warnings[lvl] }))
        .filter(x => !(x.w.expiresAt > 0 && x.w.expiresAt < now()));

    if (active.length === 0) {
        warningRunningList.innerHTML = '<div class="warning-running-empty"><i class="fas fa-check-circle"></i> No active warnings</div>';
        return;
    }

    warningRunningList.innerHTML = active.map(({ lvl, w }) => `
        <div class="warning-run-item ${parseInt(lvl) >= 6 ? 'severe' : ''}">
            <button type="button" class="warning-run-num" onclick="handleStrike('${m.id}', ${lvl})" title="Edit warning #${lvl}">#${lvl}</button>
            <div class="warning-run-body">
                <span class="warning-run-reason">${escapeHtml(w.reason || 'No reason provided')}</span>
                <span class="warning-run-exp">${formatExpiry(w.expiresAt)}</span>
            </div>
        </div>
    `).join('');
}

// Strike Logic
window.handleStrike = (id, level) => {
    const member = allMembers.find(m => m.id === id);
    if (!member) return;

    const existingWarning = member.warnings ? member.warnings[level] : null;
    warningMemberIdInput.value = id;
    warningLevelInput.value = level;
    warningLevelNumber.textContent = level;
    warningLevelBadge.classList.toggle('severe', parseInt(level) >= 6);
    warningModalTitle.textContent = existingWarning ? `Edit Warning #${level}` : `Issue Warning #${level}`;
    warningMemberName.textContent = member.name;
    warningReasonInput.value = existingWarning ? existingWarning.reason : '';

    populateExpiryForEditing(existingWarning ? existingWarning.expiresAt : 0);

    deleteWarningBtn.style.display = existingWarning ? 'block' : 'none';
    renderWarningRunning(member);
    warningModal.classList.add('open');
};

// Expiry chip interactions
expiryPresets.addEventListener('click', (e) => {
    const chip = e.target.closest('.expiry-chip');
    if (!chip) return;
    expiryPresets.querySelectorAll('.expiry-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    customExpiry.style.display = chip.dataset.custom ? 'flex' : 'none';
    updateExpiryPreview();
});

warningExpiryValue.addEventListener('input', updateExpiryPreview);
warningExpiryUnit.addEventListener('change', updateExpiryPreview);

warningForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = warningMemberIdInput.value;
    const level = parseInt(warningLevelInput.value);
    const reason = warningReasonInput.value.trim();
    if (!reason) return;

    const durMs = getSelectedExpiryMs();
    const timestamp = now();
    const expiresAt = durMs > 0 ? (timestamp + durMs) : 0;

    const warningData = {
        reason,
        level,
        expiresAt,
        timestamp
    };

    const updates = {};
    updates[`members/${id}/warnings/${level}`] = warningData;

    const member = allMembers.find(m => m.id === id);
    const currentWarnings = { ...(member.warnings || {}), [level]: warningData };
    const maxLevel = Object.keys(currentWarnings).length > 0 ? Math.max(...Object.keys(currentWarnings).map(Number)) : 0;
    updates[`members/${id}/strikes`] = maxLevel;

    update(ref(db), updates);
    closeWarningModal();
});

deleteWarningBtn.addEventListener('click', () => {
    const id = warningMemberIdInput.value;
    const level = warningLevelInput.value;

    if (confirm(`Remove warning ${level}?`)) {
        const member = allMembers.find(m => m.id === id);
        const updates = {};
        updates[`members/${id}/warnings/${level}`] = null;

        const remainingWarnings = { ...(member.warnings || {}) };
        delete remainingWarnings[level];
        const maxLevel = Object.keys(remainingWarnings).length > 0 ? Math.max(...Object.keys(remainingWarnings).map(Number)) : 0;
        updates[`members/${id}/strikes`] = maxLevel;

        update(ref(db), updates);
        closeWarningModal();
    }
});

const closeWarningModal = () => {
    warningModal.classList.remove('open');
    warningForm.reset();
    warningExpiryValue.value = '';
    warningExpiryUnit.value = 'days';
};

closeWarningModalBtn.addEventListener('click', closeWarningModal);

// Ban Logic
window.toggleBan = (id, currentStatus) => {
    const member = allMembers.find(m => m.id === id);
    if (!member) return;

    if (!currentStatus) {
        const reason = prompt(`Reason for banning ${member.name}?`, "Violating group rules");
        if (reason !== null) {
            update(ref(db, `members/${id}`), { 
                isBanned: true, 
                banReason: reason,
                bannedAt: Date.now()
            });
        }
    } else {
        if (confirm(`Unban ${member.name}?`)) {
            update(ref(db, `members/${id}`), { 
                isBanned: false,
                strikes: 0 // Reset strikes on unban usually
            });
        }
    }
};

// Toggle Admin
window.toggleAdmin = (id, currentIsAdmin) => {
    update(ref(db, `members/${id}`), { isAdmin: !currentIsAdmin });
};

// Move Member Up/Down (Exactly 1 step at a time)
window.moveMember = (id, direction) => {
    const activeMembers = allMembers
        .filter(m => !m.isBanned)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
    
    const index = activeMembers.findIndex(m => m.id === id);
    const newIndex = index + direction;
    
    if (newIndex >= 0 && newIndex < activeMembers.length) {
        const updates = {};
        const newList = [...activeMembers];
        
        // Perform the swap in a local copy
        const [movedItem] = newList.splice(index, 1);
        newList.splice(newIndex, 0, movedItem);
        
        // Normalize orders to 0, 1, 2... to prevent overlapping order values
        newList.forEach((m, idx) => {
            updates[`members/${m.id}/order`] = idx;
        });
        
        // Apply atomic update to the database
        update(ref(db), updates);
    }
};

// Delete Member
window.deleteMember = (id) => {
    if (confirm("Are you sure you want to remove this member from the list?")) {
        remove(ref(db, `members/${id}`));
    }
};

// Edit Member
window.editMember = (id, name) => {
    openModal(id, name);
};

// Search Logic
searchInput.addEventListener('input', (e) => {
    renderTables(e.target.value.toLowerCase());
});

function hideEntryLoader() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay && !overlay.classList.contains('hidden')) {
        overlay.classList.add('hidden');
        setTimeout(() => { overlay.style.display = 'none'; }, 500);
    }
}
function renderSkeleton() {
    memberListBody.innerHTML = '';
    banListBody.innerHTML = '';
    const makeRow = () => {
        const row = document.createElement('tr');
        [true, false, false].forEach((w, i) => {
            const td = document.createElement('td');
            const line = document.createElement('div');
            line.className = `skeleton-line ${i === 0 ? 'wide' : ''}`;
            td.appendChild(line);
            row.appendChild(td);
        });
        return row;
    };
    for (let i = 0; i < 6; i++) memberListBody.appendChild(makeRow());
    for (let i = 0; i < 3; i++) banListBody.appendChild(makeRow());
}
renderSkeleton();
// Fallback: never trap the admin even if the student list never arrives.
setTimeout(hideEntryLoader, 15000);

onValue(ref(db, 'members'), (snapshot) => {
    const data = snapshot.val();
    membersLoaded = true;
    allMembers = [];
    if (data) {
        allMembers = Object.keys(data).map(key => ({
            id: key,
            ...data[key]
        }));
    }
    renderTables();
    hideEntryLoader();
});

// Re-run expiration checks (every 5 minutes) as the synced clock ticks.
setInterval(() => renderTables(searchInput.value.toLowerCase()), 300000);

// Sync with Firebase (Comments)
onValue(ref(db, 'comments'), (snapshot) => {
    const data = snapshot.val();
    const comments = [];
    if (data) {
        Object.keys(data).map(key => comments.push({ id: key, ...data[key] }));
    }
    renderAdminComments(comments);
});

function renderAdminComments(comments) {
    adminCommentsList.innerHTML = '';
    if (comments.length === 0) {
        adminCommentsList.innerHTML = `<div style="text-align:center; padding: 2rem; color: var(--text-dim);">No comments found.</div>`;
        return;
    }

    comments.sort((a, b) => b.timestamp - a.timestamp).forEach(c => {
        const div = document.createElement('div');
        div.className = 'feedback-item';
        const dateStr = new Date(c.timestamp).toLocaleString();
        const isPending = c.status === 'pending';
        
        div.innerHTML = `
            <div class="feedback-header">
                <span class="feedback-user">
                    ${c.authorName} ${c.parentId ? '(Reply)' : ''}
                    ${isPending ? '<span class="admin-badge" style="background: var(--warning); margin-left: 10px;">Pending</span>' : ''}
                </span>
                <span class="feedback-date">${dateStr}</span>
            </div>
            <div class="feedback-content">${c.text}</div>
            <div class="feedback-actions">
                ${isPending ? `
                    <button class="btn-primary" onclick="adminVerifyComment('${c.id}')" style="padding: 4px 12px; font-size: 0.8rem; background: var(--secondary);">
                        <i class="fas fa-check"></i> Verify & Show
                    </button>
                ` : ''}
                <button class="btn-icon" onclick="adminDeleteComment('${c.id}')" title="Delete Comment">
                    <i class="fas fa-trash-can"></i>
                </button>
            </div>
        `;
        adminCommentsList.appendChild(div);
    });
}

window.adminVerifyComment = (id) => {
    update(ref(db, `comments/${id}`), { status: 'approved' });
};

window.adminDeleteComment = (id) => {
    if (confirm("Permanently delete this comment?")) {
        remove(ref(db, `comments/${id}`));
    }
};

// Sync with Firebase (Feedback)
onValue(ref(db, 'feedback'), (snapshot) => {
    const data = snapshot.val();
    allFeedback = [];
    if (data) {
        allFeedback = Object.keys(data).map(key => ({
            id: key,
            ...data[key]
        })).sort((a, b) => b.timestamp - a.timestamp);
    }
    renderFeedback();
});

// Sync with Firebase (Settings)
onValue(ref(db, 'settings'), (snapshot) => {
    const data = snapshot.val();
    if (data) {
        currentSettings = {
            groupName: data.groupName || 'Seven Poddoians',
            authorName: data.authorName || '',
            rules: data.rules ? Object.keys(data.rules).map(k => ({ id: k, ...data.rules[k] })) : []
        };
        renderSettings();
    } else {
        // Initialize default settings if empty
        const defaultRules = [
            { title: 'Be Respectful', text: 'Treat everyone with kindness. No bullying, hate speech, or personal attacks.' },
            { title: 'Timing Matters', text: "Please avoid sending messages late at night or very early in the morning." },
            { title: 'Keep it Clean', text: 'No inappropriate language, offensive memes, or controversial topics.' }
        ];
        update(ref(db, 'settings'), { 
            groupName: 'Seven Poddoians',
            authorName: ''
        });
        defaultRules.forEach(rule => push(ref(db, 'settings/rules'), rule));
    }
});

// Settings Management
saveGroupNameBtn.addEventListener('click', () => {
    const newName = editGroupNameInput.value.trim();
    if (newName) {
        update(ref(db, 'settings'), { groupName: newName });
    }
});

saveAuthorNameBtn.addEventListener('click', () => {
    const newAuthor = editAuthorNameInput.value.trim();
    update(ref(db, 'settings'), { authorName: newAuthor });
});

addRuleBtn.addEventListener('click', () => {
    const newRuleRef = push(ref(db, 'settings/rules'));
    set(newRuleRef, {
        title: 'New Rule',
        text: 'Description of the rule...'
    });
});

window.updateRule = (id, field, value) => {
    update(ref(db, `settings/rules/${id}`), { [field]: value });
};

window.deleteRule = (id) => {
    if (confirm('Delete this rule?')) {
        remove(ref(db, `settings/rules/${id}`));
    }
};

// Feedback Actions
if (testFeedbackBtn) {
    testFeedbackBtn.addEventListener('click', () => {
        const name = prompt("Enter sender name (Simulation):", "Anonymous Student");
        const msg = prompt("Enter feedback message:");
        if (msg) {
            const feedbackRef = push(ref(db, 'feedback'));
            set(feedbackRef, {
                user: name || "Anonymous",
                message: msg,
                timestamp: Date.now()
            });
        }
    });
}

window.deleteFeedback = (id) => {
    if (confirm("Delete this feedback report?")) {
        remove(ref(db, `feedback/${id}`));
    }
};

function renderFeedback() {
    feedbackListContainer.innerHTML = '';
    if (allFeedback.length === 0) {
        feedbackListContainer.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--text-dim);">
                <i class="fas fa-comment-slash" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>
                No feedback reports yet.
            </div>
        `;
        return;
    }

    allFeedback.forEach((f, index) => {
        const dateStr = new Date(f.timestamp).toLocaleString();
        const div = document.createElement('div');
        div.className = 'feedback-item';
        div.style.animationDelay = `${index * 0.1}s`;
        div.innerHTML = `
            <div class="feedback-header">
                <span class="feedback-user"><i class="fas fa-user-circle"></i> ${f.user}</span>
                <span class="feedback-date">${dateStr}</span>
            </div>
            <div class="feedback-content">${f.message}</div>
            <div class="feedback-actions">
                <button class="btn-icon" onclick="deleteFeedback('${f.id}')" title="Delete Feedback">
                    <i class="fas fa-trash-can"></i>
                </button>
            </div>
        `;
        feedbackListContainer.appendChild(div);
    });
}

function renderSettings() {
    // Update Header and Input
    groupNameDisplay.textContent = currentSettings.groupName;
    editGroupNameInput.value = currentSettings.groupName;
    editAuthorNameInput.value = currentSettings.authorName || '';

    // Render Public Rules Tab
    rulesListContainer.innerHTML = '';
    currentSettings.rules.forEach(rule => {
        const li = document.createElement('li');
        li.innerHTML = `<strong>${rule.title}</strong>${rule.text}`;
        rulesListContainer.appendChild(li);
    });

    // Render Admin Rules Editor
    rulesEditorContainer.innerHTML = '';
    currentSettings.rules.forEach(rule => {
        const div = document.createElement('div');
        div.className = 'rule-editor-item';
        div.innerHTML = `
            <button class="remove-rule" onclick="deleteRule('${rule.id}')"><i class="fas fa-times"></i></button>
            <div class="form-group">
                <input type="text" value="${rule.title}" placeholder="Rule Title" 
                    onchange="updateRule('${rule.id}', 'title', this.value)">
            </div>
            <div class="form-group" style="margin-bottom: 0;">
                <textarea placeholder="Rule Description" rows="2" 
                    onchange="updateRule('${rule.id}', 'text', this.value)">${rule.text}</textarea>
            </div>
        `;
        rulesEditorContainer.appendChild(div);
    });
}

// Initialize Sortable
const sortable = new Sortable(memberListBody, {
    handle: '.drag-handle',
    animation: 150,
    ghostClass: 'sortable-ghost',
    onEnd: () => {
        const rows = memberListBody.querySelectorAll('tr[data-id]');
        const updates = {};
        rows.forEach((row, index) => {
            const id = row.dataset.id;
            updates[`members/${id}/order`] = index;
        });
        update(ref(db), updates);
    }
});

function renderTables(filter = '') {
    const nowTime = now();
    const filtered = [...allMembers]
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .filter(m => {
            const matchesSearch = m.name.toLowerCase().includes(filter);
            
            // Check for expired warnings and update if necessary
            if (m.warnings) {
                let hasChanges = false;
                const updatedWarnings = { ...m.warnings };
                Object.keys(updatedWarnings).forEach(level => {
                    if (updatedWarnings[level].expiresAt > 0 && updatedWarnings[level].expiresAt < nowTime) {
                        delete updatedWarnings[level];
                        hasChanges = true;
                    }
                });

                if (hasChanges) {
                    const maxLevel = Object.keys(updatedWarnings).length > 0 ? Math.max(...Object.keys(updatedWarnings).map(Number)) : 0;
                    update(ref(db, `members/${m.id}`), {
                        warnings: updatedWarnings,
                        strikes: maxLevel
                    });
                }
            }
            
            return matchesSearch;
        });
    
    // Member List
    memberListBody.innerHTML = '';
    const activeMembers = filtered.filter(m => !m.isBanned);
    activeMembers.forEach((m, index) => {
        const row = document.createElement('tr');
        row.style.animation = `fadeInUp 0.3s ease-out forwards ${index * 0.05}s`;
        row.style.opacity = '0';
        row.dataset.id = m.id;
        row.innerHTML = `
            <td>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fas fa-grip-lines drag-handle"></i>
                    <div style="display: flex; flex-direction: column; gap: 2px;">
                        ${index > 0 ? `<button class="btn-sort" onclick="moveMember('${m.id}', -1)" title="Move Up"><i class="fas fa-chevron-up"></i></button>` : '<div style="height:24px;width:24px"></div>'}
                        ${index < activeMembers.length - 1 ? `<button class="btn-sort" onclick="moveMember('${m.id}', 1)" title="Move Down"><i class="fas fa-chevron-down"></i></button>` : '<div style="height:24px;width:24px"></div>'}
                    </div>
                    <div>
                        <div style="font-weight: 600; display: flex; align-items: center; gap: 8px;">
                            ${m.name}
                            ${m.isAdmin ? '<span class="admin-badge"><i class="fas fa-shield-halved"></i> Admin</span>' : ''}
                        </div>
                        <div style="font-size: 0.75rem; color: var(--text-dim)">Student Classmate</div>
                    </div>
                </div>
            </td>
            <td>
                <div class="strike-group" style="gap: 0.25rem;">
                    <div class="strike-indicator ${m.strikes >= 1 ? 'active' : ''}" onclick="handleStrike('${m.id}', 1)" title="Warning 1" style="width: 24px; height: 24px; font-size: 0.7rem;">1</div>
                    <div class="strike-indicator ${m.strikes >= 2 ? 'active' : ''}" onclick="handleStrike('${m.id}', 2)" title="Warning 2" style="width: 24px; height: 24px; font-size: 0.7rem;">2</div>
                    <div class="strike-indicator ${m.strikes >= 3 ? 'active' : ''}" onclick="handleStrike('${m.id}', 3)" title="Warning 3" style="width: 24px; height: 24px; font-size: 0.7rem;">3</div>
                    <div class="strike-indicator ${m.strikes >= 4 ? 'active' : ''}" onclick="handleStrike('${m.id}', 4)" title="Warning 4" style="width: 24px; height: 24px; font-size: 0.7rem;">4</div>
                    <div class="strike-indicator ${m.strikes >= 5 ? 'active' : ''}" onclick="handleStrike('${m.id}', 5)" title="Warning 5" style="width: 24px; height: 24px; font-size: 0.7rem;">5</div>
                    <div class="strike-indicator ${m.strikes >= 6 ? 'active severe' : ''}" onclick="handleStrike('${m.id}', 6)" title="Final Warning" style="width: 24px; height: 24px; font-size: 0.7rem;"><i class="fas fa-exclamation"></i></div>
                </div>
            </td>
            <td>
                <button class="btn-icon ${m.isAdmin ? 'active' : ''}" onclick="toggleAdmin('${m.id}', ${m.isAdmin || false})" title="Toggle Admin" style="${m.isAdmin ? 'color: var(--primary); border-color: var(--primary);' : ''}">
                    <i class="fas fa-shield-halved"></i>
                </button>
                <button class="btn-icon" onclick="editMember('${m.id}', '${m.name.replace(/'/g, "\\'")}')" title="Edit"><i class="fas fa-pen-to-square"></i></button>
                <button class="btn-icon ban" onclick="toggleBan('${m.id}', false)" title="Apply Ban"><i class="fas fa-gavel"></i></button>
                <button class="btn-icon" onclick="deleteMember('${m.id}')" title="Remove"><i class="fas fa-trash"></i></button>
            </td>
        `;
        memberListBody.appendChild(row);
    });

    // Ban List
    banListBody.innerHTML = '';
    const bannedMembers = filtered.filter(m => m.isBanned);
    bannedMembers.forEach((m, index) => {
        const dateStr = m.bannedAt ? new Date(m.bannedAt).toLocaleDateString() : 'N/A';
        const row = document.createElement('tr');
        row.style.animation = `fadeInUp 0.3s ease-out forwards ${index * 0.05}s`;
        row.style.opacity = '0';
        row.innerHTML = `
            <td>
                <div style="font-weight: 600;">${m.name}</div>
                <div style="font-size: 0.75rem; color: var(--error)">Banned</div>
            </td>
            <td>
                <div style="font-size:0.9rem">${m.banReason || 'No reason provided'}</div>
                <div style="font-size:0.7rem; color: var(--text-dim)">Date: ${dateStr}</div>
            </td>
            <td>
                <button class="btn-primary" style="display: inline-flex; padding: 6px 12px; font-size: 0.8rem" onclick="toggleBan('${m.id}', true)">
                    Restore Access
                </button>
                <button class="btn-icon" style="margin-left: 10px" onclick="deleteMember('${m.id}')"><i class="fas fa-user-xmark"></i></button>
            </td>
        `;
        banListBody.appendChild(row);
    });

    // Stats
    memberCountEl.textContent = activeMembers.length;
    banCountEl.textContent = bannedMembers.length;
}