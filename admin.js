import { db } from './firebase-config.js';
import { ref, set, push, onValue, remove, update } from "firebase/database";
import Sortable from "sortablejs";

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
const searchInput = document.getElementById('search-member');
const navBtns = document.querySelectorAll('.nav-btn');
const tabContents = document.querySelectorAll('.tab-content');

// New Settings Elements
const groupNameDisplay = document.getElementById('group-name-display');
const editGroupNameInput = document.getElementById('edit-group-name');
const saveGroupNameBtn = document.getElementById('save-group-name');
const rulesListContainer = document.getElementById('rules-list-container');
const rulesEditorContainer = document.getElementById('rules-editor-container');
const addRuleBtn = document.getElementById('add-rule-btn');

// Feedback Elements
const feedbackListContainer = document.getElementById('feedback-list');
const testFeedbackBtn = document.getElementById('test-feedback-btn');

// State
let allMembers = [];
let allFeedback = [];
let currentSettings = {
    groupName: 'Seven Poddoians',
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

// Strike Logic
window.handleStrike = (id, level) => {
    const member = allMembers.find(m => m.id === id);
    if (!member) return;

    // Toggle strike
    const newStrike = member.strikes === level ? level - 1 : level;
    update(ref(db, `members/${id}`), { strikes: newStrike });
};

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

// Sync with Firebase (Members)
onValue(ref(db, 'members'), (snapshot) => {
    const data = snapshot.val();
    allMembers = [];
    if (data) {
        allMembers = Object.keys(data).map(key => ({
            id: key,
            ...data[key]
        }));
    }
    renderTables();
});

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
        update(ref(db, 'settings'), { groupName: 'Seven Poddoians' });
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
    const filtered = [...allMembers]
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .filter(m => m.name.toLowerCase().includes(filter));
    
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
                <div class="strike-group">
                    <div class="strike-indicator ${m.strikes >= 1 ? 'active' : ''}" onclick="handleStrike('${m.id}', 1)" title="Warning 1">
                        <i class="fas fa-check"></i>
                    </div>
                    <div class="strike-indicator ${m.strikes >= 2 ? 'active' : ''}" onclick="handleStrike('${m.id}', 2)" title="Warning 2">
                        <i class="fas fa-check"></i>
                    </div>
                    <div class="strike-indicator ${m.strikes >= 3 ? 'active severe' : ''}" onclick="handleStrike('${m.id}', 3)" title="Final Warning">
                        <i class="fas fa-exclamation"></i>
                    </div>
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