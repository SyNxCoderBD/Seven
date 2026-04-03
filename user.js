import { db } from './firebase-config.js';
import { ref, onValue, push, set } from "firebase/database";

// DOM Elements
const memberListBody = document.getElementById('member-list-body');
const banListBody = document.getElementById('ban-list-body');
const memberCountEl = document.getElementById('member-count');
const groupNameDisplay = document.getElementById('group-name-display');
const rulesListContainer = document.getElementById('rules-list-container');
const searchInput = document.getElementById('search-member');
const navBtns = document.querySelectorAll('.nav-btn');
const tabContents = document.querySelectorAll('.tab-content');
const feedbackForm = document.getElementById('user-feedback-form');
const feedbackStatus = document.getElementById('feedback-status');
const adminTrigger = document.getElementById('admin-trigger');

// Language Logic
const languageOverlay = document.getElementById('language-overlay');
const appContainer = document.getElementById('app');
const langBtns = document.querySelectorAll('.lang-choice-btn');

const translations = {
    en: {
        subtitle: "Class Directory & Information",
        stat_active: "Active",
        nav_members: "Members",
        nav_rules: "Rules",
        nav_restrictions: "Restrictions",
        nav_feedback: "Feedback",
        search_placeholder: "Find a classmate...",
        th_name: "Name",
        th_status: "Status / Warnings",
        th_note: "Note",
        fb_title: "Submit Feedback",
        fb_desc: "Report an issue or suggest something for the group. Your feedback is sent directly to the admin.",
        fb_label_name: "Your Name (Optional)",
        fb_label_msg: "Message",
        fb_placeholder_name: "Anonymous",
        fb_placeholder_msg: "Type your feedback here...",
        fb_btn: "Send Report",
        fb_success: "Feedback submitted successfully!",
        fb_error: "Failed to submit. Try again later.",
        standing_good: "Good Standing",
        standing_warning: "Warning Issued",
        restricted_label: "Restricted",
        rules_default_title: "Community Guidelines",
        admin_label: "Admin"
    },
    bn: {
        subtitle: "ক্লাস ডিরেক্টরি এবং তথ্য",
        stat_active: "সক্রিয়",
        nav_members: "সদস্যগণ",
        nav_rules: "নিয়মাবলী",
        nav_restrictions: "নিষেধাজ্ঞা",
        nav_feedback: "মতামত",
        search_placeholder: "সহপাঠী খুঁজুন...",
        th_name: "নাম",
        th_status: "অবস্থা / সতর্কবার্তা",
        th_note: "নোট",
        fb_title: "মতামত দিন",
        fb_desc: "গ্রুপের জন্য কোনো সমস্যা রিপোর্ট করুন বা পরামর্শ দিন। আপনার মতামত সরাসরি অ্যাডমিনের কাছে পাঠানো হবে।",
        fb_label_name: "আপনার নাম (ঐচ্ছিক)",
        fb_label_msg: "বার্তা",
        fb_placeholder_name: "অজ্ঞাতনামা",
        fb_placeholder_msg: "আপনার মতামত এখানে লিখুন...",
        fb_btn: "রিপোর্ট পাঠান",
        fb_success: "মতামত সফলভাবে জমা দেওয়া হয়েছে!",
        fb_error: "জমা দিতে ব্যর্থ হয়েছে। পরে আবার চেষ্টা করুন।",
        standing_good: "ভালো অবস্থা",
        standing_warning: "সতর্কবার্তা জারি",
        restricted_label: "নিষিদ্ধ",
        rules_default_title: "কমিউনিটি নির্দেশিকা",
        admin_label: "অ্যাডমিন"
    }
};

let currentLang = 'en';

function applyLanguage(lang) {
    currentLang = lang;
    const t = translations[lang];
    
    // Update Static UI
    document.getElementById('ui-subtitle').textContent = t.subtitle;
    document.getElementById('ui-stat-active').textContent = t.stat_active;
    document.getElementById('search-member').placeholder = t.search_placeholder;
    document.getElementById('ui-fb-desc').textContent = t.fb_desc;
    document.getElementById('ui-fb-label-name').textContent = t.fb_label_name;
    document.getElementById('ui-fb-label-msg').textContent = t.fb_label_msg;
    document.getElementById('fb-name').placeholder = t.fb_placeholder_name;
    document.getElementById('fb-message').placeholder = t.fb_placeholder_msg;
    
    if (document.getElementById('rules-title')) {
        document.getElementById('rules-title').textContent = `📜 ${t.rules_default_title}`;
    }

    // Update i18n data elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) el.textContent = t[key];
    });

    renderTables(searchInput.value.toLowerCase());
}

langBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const selectedLang = btn.dataset.lang;
        applyLanguage(selectedLang);
        languageOverlay.style.display = 'none';
        appContainer.style.display = 'block';
    });
});

// Admin Hidden Access
let clickCount = 0;
adminTrigger.addEventListener('click', () => {
    clickCount++;
    if (clickCount >= 5) {
        window.location.href = 'admin.html';
    }
    // Reset click count after 3 seconds of inactivity
    clearTimeout(window.adminTimer);
    window.adminTimer = setTimeout(() => { clickCount = 0; }, 3000);
});

// State
let allMembers = [];
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

// Search Logic
searchInput.addEventListener('input', (e) => {
    renderTables(e.target.value.toLowerCase());
});

// Feedback Submission
feedbackForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('fb-name').value.trim() || 'Anonymous';
    const message = document.getElementById('fb-message').value.trim();

    if (message) {
        const feedbackRef = push(ref(db, 'feedback'));
        set(feedbackRef, {
            user: name,
            message: message,
            timestamp: Date.now()
        }).then(() => {
            feedbackStatus.textContent = translations[currentLang].fb_success;
            feedbackStatus.style.color = 'var(--secondary)';
            feedbackStatus.style.display = 'block';
            feedbackForm.reset();
            setTimeout(() => { feedbackStatus.style.display = 'none'; }, 3000);
        }).catch(() => {
            feedbackStatus.textContent = translations[currentLang].fb_error;
            feedbackStatus.style.color = 'var(--error)';
            feedbackStatus.style.display = 'block';
        });
    }
});

// Listeners
onValue(ref(db, 'members'), (snapshot) => {
    const data = snapshot.val();
    allMembers = [];
    if (data) {
        allMembers = Object.keys(data).map(key => ({ id: key, ...data[key] }));
    }
    renderTables();
});

onValue(ref(db, 'settings'), (snapshot) => {
    const data = snapshot.val();
    if (data) {
        currentSettings = {
            groupName: data.groupName || 'Seven Poddoians',
            rules: data.rules ? Object.keys(data.rules).map(k => ({ id: k, ...data.rules[k] })) : []
        };
        renderView();
    }
});

function renderView() {
    groupNameDisplay.textContent = currentSettings.groupName;
    rulesListContainer.innerHTML = '';
    currentSettings.rules.forEach(rule => {
        const li = document.createElement('li');
        li.innerHTML = `<strong>${rule.title}</strong>${rule.text}`;
        rulesListContainer.appendChild(li);
    });
}

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
        
        let strikeDisplay = '';
        if (m.strikes > 0) {
            const level = m.strikes === 3 ? 'severe' : '';
            strikeDisplay = `<div class="strike-indicator active ${level}" style="display:inline-flex; width: 24px; height: 24px; font-size: 10px;">${m.strikes}</div>`;
        } else {
            strikeDisplay = `<span style="color: var(--secondary); font-size: 0.8rem;"><i class="fas fa-check-circle"></i> ${translations[currentLang].standing_good}</span>`;
        }

        row.innerHTML = `
            <td>
                <div style="font-weight: 600; display: flex; align-items: center; gap: 8px;">
                    ${m.name}
                    ${m.isAdmin ? `<span class="admin-badge"><i class="fas fa-shield-halved"></i> ${translations[currentLang].admin_label}</span>` : ''}
                </div>
            </td>
            <td>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    ${strikeDisplay}
                    ${m.strikes > 0 ? `<span style="font-size: 0.75rem; color: var(--warning)">${translations[currentLang].standing_warning}</span>` : ''}
                </div>
            </td>
        `;
        memberListBody.appendChild(row);
    });

    // Ban List
    banListBody.innerHTML = '';
    const bannedMembers = filtered.filter(m => m.isBanned);
    bannedMembers.forEach((m, index) => {
        const row = document.createElement('tr');
        row.style.animation = `fadeInUp 0.3s ease-out forwards ${index * 0.05}s`;
        row.style.opacity = '0';
        row.innerHTML = `
            <td>
                <div style="font-weight: 600; color: var(--text-dim); text-decoration: line-through;">${m.name}</div>
            </td>
            <td>
                <span class="stat-info" style="color: var(--error); font-size: 0.75rem; text-transform: uppercase;">${translations[currentLang].restricted_label}</span>
            </td>
        `;
        banListBody.appendChild(row);
    });

    memberCountEl.textContent = activeMembers.length;
}