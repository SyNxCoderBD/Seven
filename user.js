import { db } from './firebase-config.js';
import { ref, onValue, push, set, update } from "firebase/database";

// DOM Elements
const memberListBody = document.getElementById('member-list-body');
const banListBody = document.getElementById('ban-list-body');
const memberCountEl = document.getElementById('member-count');
const groupNameDisplay = document.getElementById('group-name-display');
const authorDisplay = document.getElementById('author-display');
const rulesListContainer = document.getElementById('rules-list-container');
const searchInput = document.getElementById('search-member');
const navBtns = document.querySelectorAll('.nav-btn');
const tabContents = document.querySelectorAll('.tab-content');
const feedbackForm = document.getElementById('user-feedback-form');
const feedbackStatus = document.getElementById('feedback-status');
const adminTrigger = document.getElementById('admin-trigger');

// Comments Elements
const identitySelector = document.getElementById('identity-selector');
const commentInterface = document.getElementById('comment-interface');
const identityDropdown = document.getElementById('identity-dropdown');
const setIdentityBtn = document.getElementById('set-identity-btn');
const currentUserDisplay = document.getElementById('current-user-display');
const changeIdentityBtn = document.getElementById('change-identity-btn');
const newCommentText = document.getElementById('new-comment-text');
const submitCommentBtn = document.getElementById('submit-comment-btn');
const commentsList = document.getElementById('comments-list');

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
        nav_settings: "Settings",
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
        st_appearance: "Appearance",
        st_appearance_desc: "Customize how the portal looks on your device.",
        st_language: "Language",
        st_language_desc: "Switch between English and Bangla languages.",
        standing_good: "Good Standing",
        standing_warning: "Warning Issued",
        restricted_label: "Restricted",
        rules_default_title: "Community Guidelines",
        admin_label: "Admin",
        nav_comments: "Comments",
        cm_warning: "Warning: If you impersonate others, we will strike your name with a warning!",
        cm_identity_title: "Join the Conversation",
        cm_identity_desc: "Select your name from the list or continue as anonymous to post comments.",
        cm_anonymous: "Anonymous",
        cm_start_btn: "Start Commenting",
        cm_post_btn: "Post",
        cm_change: "Change Identity",
        cm_reply: "Reply",
        cm_edit: "Edit",
        cm_delete: "Delete",
        cm_cancel: "Cancel",
        cm_save: "Save",
        cm_placeholder: "Write a comment...",
        cm_reply_placeholder: "Write a reply...",
        cm_edited: "(edited)"
    },
    bn: {
        subtitle: "ক্লাস ডিরেক্টরি এবং তথ্য",
        stat_active: "সক্রিয়",
        nav_members: "সদস্যগণ",
        nav_rules: "নিয়মাবলী",
        nav_restrictions: "নিষেধাজ্ঞা",
        nav_feedback: "মতামত",
        nav_settings: "সেটিংস",
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
        st_appearance: "চেহারা",
        st_appearance_desc: "আপনার ডিভাইসে পোর্টালটি কেমন দেখাবে তা কাস্টমাইজ করুন।",
        st_language: "ভাষা",
        st_language_desc: "ইংরেজি এবং বাংলা ভাষার মধ্যে পরিবর্তন করুন।",
        standing_good: "ভালো অবস্থা",
        standing_warning: "সতর্কবার্তা জারি",
        restricted_label: "নিষিদ্ধ",
        rules_default_title: "কমিউনিটি নির্দেশিকা",
        admin_label: "অ্যাডমিন",
        nav_comments: "মন্তব্য",
        cm_warning: "সতর্কতা: আপনি যদি অন্যদের ছদ্মবেশ ধারণ করেন, আমরা আপনার নামে সতর্কতা স্ট্রাইক দেব!",
        cm_identity_title: "আলোচনায় যোগ দিন",
        cm_identity_desc: "মন্তব্য করতে তালিকা থেকে আপনার নাম নির্বাচন করুন অথবা বেনামী হিসেবে চালিয়ে যান।",
        cm_anonymous: "বেনামী (Anonymous)",
        cm_start_btn: "মন্তব্য শুরু করুন",
        cm_post_btn: "পোস্ট করুন",
        cm_change: "পরিচয় পরিবর্তন",
        cm_reply: "উত্তর",
        cm_edit: "সম্পাদনা",
        cm_delete: "মুছুন",
        cm_cancel: "বাতিল",
        cm_save: "সংরক্ষণ",
        cm_placeholder: "একটি মন্তব্য লিখুন...",
        cm_reply_placeholder: "একটি উত্তর লিখুন...",
        cm_edited: "(সম্পাদিত)"
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

    // Update Placeholders
    if (newCommentText) newCommentText.placeholder = t.cm_placeholder;

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
        localStorage.setItem('preferredLang', selectedLang);
        applyLanguage(selectedLang);
        languageOverlay.style.display = 'none';
        appContainer.style.display = 'block';
    });
});

// Theme Management
const themeDarkBtn = document.getElementById('theme-dark-btn');
const themeLightBtn = document.getElementById('theme-light-btn');

function applyTheme(theme) {
    if (theme === 'light') {
        document.body.classList.add('light-theme');
    } else {
        document.body.classList.remove('light-theme');
    }
    localStorage.setItem('preferredTheme', theme);
}

themeDarkBtn.addEventListener('click', () => applyTheme('dark'));
themeLightBtn.addEventListener('click', () => applyTheme('light'));

// Language Switching in Settings
const langSwitchBtns = document.querySelectorAll('.lang-switch-btn');
langSwitchBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const selectedLang = btn.dataset.lang;
        localStorage.setItem('preferredLang', selectedLang);
        applyLanguage(selectedLang);
    });
});

// Initial load checks
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('preferredTheme');
    if (savedTheme) applyTheme(savedTheme);

    const savedLang = localStorage.getItem('preferredLang');
    if (savedLang) {
        applyLanguage(savedLang);
        languageOverlay.style.display = 'none';
        appContainer.style.display = 'block';
    }
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
let allComments = [];
let userUID = localStorage.getItem('user_uid') || (Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));
localStorage.setItem('user_uid', userUID);

let commenterIdentity = JSON.parse(localStorage.getItem('commenter_identity') || 'null');

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

// Comment Identity Management
function updateIdentityUI() {
    if (commenterIdentity) {
        identitySelector.style.display = 'none';
        commentInterface.style.display = 'block';
        currentUserDisplay.textContent = commenterIdentity.name;
    } else {
        identitySelector.style.display = 'block';
        commentInterface.style.display = 'none';
        
        // Populate dropdown
        identityDropdown.innerHTML = `<option value="anonymous">${translations[currentLang].cm_anonymous}</option>`;
        allMembers.filter(m => !m.isBanned).forEach(m => {
            const option = document.createElement('option');
            option.value = m.id;
            option.textContent = m.name;
            identityDropdown.appendChild(option);
        });
    }
}

setIdentityBtn.addEventListener('click', () => {
    const val = identityDropdown.value;
    if (val === 'anonymous') {
        commenterIdentity = { id: 'anonymous', name: translations[currentLang].cm_anonymous };
    } else {
        const member = allMembers.find(m => m.id === val);
        commenterIdentity = { id: member.id, name: member.name };
    }
    localStorage.setItem('commenter_identity', JSON.stringify(commenterIdentity));
    updateIdentityUI();
});

changeIdentityBtn.addEventListener('click', () => {
    commenterIdentity = null;
    localStorage.removeItem('commenter_identity');
    updateIdentityUI();
});

// Comment CRUD
submitCommentBtn.addEventListener('click', () => {
    const text = newCommentText.value.trim();
    if (!text || !commenterIdentity) return;

    const commentRef = push(ref(db, 'comments'));
    const isAnonymous = commenterIdentity.id === 'anonymous';
    set(commentRef, {
        text,
        authorId: commenterIdentity.id,
        authorName: commenterIdentity.name,
        authorUID: userUID, // Secret token to verify owner
        timestamp: Date.now(),
        parentId: null,
        isEdited: false,
        status: isAnonymous ? 'approved' : 'pending'
    });
    newCommentText.value = '';
    if (!isAnonymous) {
        alert(currentLang === 'bn' ? 'আপনার মন্তব্যটি পর্যালোচনার জন্য জমা দেওয়া হয়েছে।' : 'Your comment has been submitted for verification.');
    }
});

window.postReply = (parentId) => {
    const replyText = document.getElementById(`reply-input-${parentId}`).value.trim();
    if (!replyText || !commenterIdentity) return;

    const isAnonymous = commenterIdentity.id === 'anonymous';
    const commentRef = push(ref(db, 'comments'));
    set(commentRef, {
        text: replyText,
        authorId: commenterIdentity.id,
        authorName: commenterIdentity.name,
        authorUID: userUID,
        timestamp: Date.now(),
        parentId: parentId,
        isEdited: false,
        status: isAnonymous ? 'approved' : 'pending'
    });
    document.getElementById(`reply-input-${parentId}`).value = '';
    if (!isAnonymous) {
        alert(currentLang === 'bn' ? 'আপনার উত্তরটি পর্যালোচনার জন্য জমা দেওয়া হয়েছে।' : 'Your reply has been submitted for verification.');
    }
};

window.toggleReplyBox = (id) => {
    const box = document.getElementById(`reply-box-${id}`);
    box.style.display = box.style.display === 'none' ? 'block' : 'none';
};

window.deleteComment = (id) => {
    if (confirm("Delete this comment?")) {
        set(ref(db, `comments/${id}`), null);
    }
};

window.editComment = (id) => {
    const textEl = document.getElementById(`comment-text-${id}`);
    const actionsEl = document.getElementById(`comment-actions-${id}`);
    
    if (!textEl || !actionsEl) return;

    const originalText = textEl.textContent;
    textEl.innerHTML = `<textarea id="edit-input-${id}" class="form-group" style="width: 100%; margin: 0.5rem 0; background: var(--bg); color: var(--text); border: 1px solid var(--border); border-radius: 8px; padding: 0.5rem;">${originalText}</textarea>`;
    actionsEl.innerHTML = `
        <button class="btn-text" onclick="saveEdit('${id}')">${translations[currentLang].cm_save}</button>
        <button class="btn-text" onclick="renderComments()">${translations[currentLang].cm_cancel}</button>
    `;
    
    // Focus the textarea
    const input = document.getElementById(`edit-input-${id}`);
    if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
    }
};

window.saveEdit = (id) => {
    const editInput = document.getElementById(`edit-input-${id}`);
    if (!editInput) {
        renderComments();
        return;
    }
    
    const newText = editInput.value.trim();
    if (newText) {
        update(ref(db, `comments/${id}`), {
            text: newText,
            isEdited: true
        }).then(() => {
            renderComments();
        });
    } else {
        renderComments();
    }
};

function renderComments() {
    commentsList.innerHTML = '';
    
    // Only show approved comments to the public
    const approvedComments = allComments.filter(c => c.status === 'approved');
    
    const topLevel = approvedComments.filter(c => !c.parentId).sort((a, b) => b.timestamp - a.timestamp);
    const replies = approvedComments.filter(c => c.parentId);

    if (topLevel.length === 0) {
        commentsList.innerHTML = `<div style="text-align:center; padding: 2rem; color: var(--text-dim);"><i class="fas fa-comment-slash" style="display:block; font-size: 2rem; margin-bottom: 0.5rem;"></i> No comments yet.</div>`;
        return;
    }

    topLevel.forEach(c => {
        commentsList.appendChild(createCommentElement(c, replies.filter(r => r.parentId === c.id)));
    });
}

function createCommentElement(c, childReplies = []) {
    const div = document.createElement('div');
    div.className = 'feedback-item';
    div.style.marginBottom = '0.5rem';
    
    const isOwner = c.authorUID === userUID;
    const dateStr = new Date(c.timestamp).toLocaleString();
    const t = translations[currentLang];

    div.innerHTML = `
        <div class="feedback-header">
            <span class="feedback-user">
                <i class="fas ${c.authorId === 'anonymous' ? 'fa-user-secret' : 'fa-user-circle'}"></i> 
                ${c.authorName}
                ${c.isEdited ? `<span class="comment-edited-label">${t.cm_edited}</span>` : ''}
            </span>
            <span class="feedback-date">${dateStr}</span>
        </div>
        <div class="feedback-content" id="comment-text-${c.id}">${c.text}</div>
        <div class="feedback-actions" id="comment-actions-${c.id}">
            ${!c.parentId ? `<button class="btn-text" onclick="toggleReplyBox('${c.id}')"><i class="fas fa-reply"></i> ${t.cm_reply}</button>` : ''}
            ${isOwner ? `
                <button class="btn-text" onclick="editComment('${c.id}')"><i class="fas fa-pen"></i> ${t.cm_edit}</button>
                <button class="btn-text delete" onclick="deleteComment('${c.id}')"><i class="fas fa-trash"></i> ${t.cm_delete}</button>
            ` : ''}
        </div>
        ${!c.parentId ? `
            <div id="reply-box-${c.id}" class="comment-reply-box" style="display: none;">
                <textarea id="reply-input-${c.id}" rows="2" placeholder="${t.cm_reply_placeholder}" style="width: 100%; background: var(--bg); border: 1px solid var(--border); color: var(--text); padding: 0.5rem; border-radius: 8px; margin-bottom: 0.5rem;"></textarea>
                <div style="display:flex; justify-content: flex-end;">
                    <button class="btn-primary" style="padding: 4px 12px; font-size: 0.8rem;" onclick="postReply('${c.id}')">${t.cm_post_btn}</button>
                </div>
            </div>
            <div class="comment-reply-container" id="replies-${c.id}"></div>
        ` : ''}
    `;

    const repliesContainer = div.querySelector(`#replies-${c.id}`);
    if (repliesContainer) {
        childReplies.sort((a, b) => a.timestamp - b.timestamp).forEach(reply => {
            repliesContainer.appendChild(createCommentElement(reply, []));
        });
    }

    return div;
}

// Listeners
onValue(ref(db, 'members'), (snapshot) => {
    const data = snapshot.val();
    allMembers = [];
    if (data) {
        allMembers = Object.keys(data).map(key => ({ id: key, ...data[key] }));
    }
    renderTables();
    updateIdentityUI();
});

onValue(ref(db, 'comments'), (snapshot) => {
    const data = snapshot.val();
    allComments = [];
    if (data) {
        allComments = Object.keys(data).map(key => ({ id: key, ...data[key] }));
    }
    renderComments();
});

onValue(ref(db, 'settings'), (snapshot) => {
    const data = snapshot.val();
    if (data) {
        currentSettings = {
            groupName: data.groupName || 'Seven Poddoians',
            authorName: data.authorName || '',
            rules: data.rules ? Object.keys(data.rules).map(k => ({ id: k, ...data.rules[k] })) : []
        };
        renderView();
    }
});

function renderView() {
    groupNameDisplay.textContent = currentSettings.groupName;
    authorDisplay.textContent = currentSettings.authorName ? `| Author: ${currentSettings.authorName}` : '';
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
            const level = m.strikes >= 6 ? 'severe' : '';
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