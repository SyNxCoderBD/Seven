import { db } from './firebase-config.js';
import { ref, onValue, push, set, update } from "firebase/database";
import { now } from './shared-time.js';

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

// Warning View Elements
const warningViewModal = document.getElementById('warning-view-modal');
const viewWarningTitle = document.getElementById('view-warning-title');
const viewWarningMember = document.getElementById('view-warning-member');
const viewWarningList = document.getElementById('view-warning-list');
const closeWarningViewBtn = document.getElementById('close-warning-view');

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

function formatExpiry(expiresAt) {
    if (!expiresAt || expiresAt <= 0) return currentLang === 'bn' ? 'মেয়াদ শেষ হবে না' : 'Never expires';
    const t = new Date(expiresAt);
    return (currentLang === 'bn' ? 'মেয়াদ শেষ হবে: ' : 'Expires: ') + t.toLocaleDateString() + ' ' + t.toLocaleTimeString();
}

// Filter to warnings that have not yet expired, using the synced clock.
function getWarningsForDisplay(member) {
    const warnings = member.warnings || {};
    const t = now();
    return Object.keys(warnings)
        .map(lvl => ({ level: lvl, w: warnings[lvl] }))
        .filter(x => !(x.w.expiresAt > 0 && x.w.expiresAt < t))
        .sort((a, b) => a.level - b.level);
}

closeWarningViewBtn.addEventListener('click', () => {
    warningViewModal.classList.remove('open');
});

window.viewWarning = (memberId) => {
    const member = allMembers.find(m => m.id === memberId);
    if (!member) return;

    const running = getWarningsForDisplay(member);
    viewWarningMember.textContent = member.name;
    viewWarningTitle.textContent = currentLang === 'bn' ? 'চলমান সতর্কবার্তা' : 'Running Warnings';

    if (running.length === 0) {
        viewWarningList.innerHTML = `<div class="warning-running-empty"><i class="fas fa-check-circle"></i> ${currentLang === 'bn' ? 'কোনো সক্রিয় সতর্কবার্তা নেই' : 'No active warnings'}</div>`;
        warningViewModal.classList.add('open');
        return;
    }

    viewWarningList.innerHTML = running.map(({ level, w }) => `
        <div class="warning-run-item ${parseInt(level) >= 6 ? 'severe' : ''}">
            <span class="warning-run-num">#${level}</span>
            <div class="warning-run-body">
                <span class="warning-run-reason">${escapeHtml(w.reason || (currentLang === 'bn' ? 'কোনো কারণ দেওয়া হয়নি' : 'No reason provided'))}</span>
                <span class="warning-run-exp">${formatExpiry(w.expiresAt)}</span>
            </div>
        </div>
    `).join('');

    warningViewModal.classList.add('open');
};

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

// Language Setting (defaults to English unless a preference is saved)
const langSwitchBtns = document.querySelectorAll('.lang-switch-btn');

const translations = {
    en: {
        subtitle: "Class Directory & Information",
        stat_active: "Active",
        nav_members: "Members",
        nav_rules: "Rules",
        nav_restrictions: "Restrictions",
        nav_feedback: "Feedback",
        nav_reports: "Reports",
        nav_settings: "Settings",
        search_placeholder: "Find a classmate...",
        th_name: "Name",
        th_status: "Status / Warnings",
        th_note: "Note",
        fb_title: "Submit Feedback",
        fb_desc: "Report an issue or suggest something for the group. Your feedback is sent directly to the admin.",
        fb_label_name: "Your Name (Optional)",
        fb_label_msg: "Message",
        fb_label_img: "Attach Image (Optional)",
        fb_placeholder_name: "Anonymous",
        fb_placeholder_msg: "Type your feedback here...",
        fb_btn: "Send Report",
        fb_success: "Feedback submitted successfully!",
        fb_error: "Failed to submit. Try again later.",
        rep_title: "Submit a Report",
        rep_desc: "Report a problem with a classmate. Your report is sent directly to the admin.",
        rep_label_name: "Your Name",
        rep_label_member: "Reported Member",
        rep_label_msg: "Problem / Message",
        rep_label_img: "Attach Image (Optional)",
        rep_btn: "Send Report",
        rep_success: "Report submitted successfully!",
        rep_error: "Failed to submit. Try again later.",
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
        nav_reports: "রিপোর্ট",
        nav_settings: "সেটিংস",
        search_placeholder: "সহপাঠী খুঁজুন...",
        th_name: "নাম",
        th_status: "অবস্থা / সতর্কবার্তা",
        th_note: "নোট",
        fb_title: "মতামত দিন",
        fb_desc: "গ্রুপের জন্য কোনো সমস্যা রিপোর্ট করুন বা পরামর্শ দিন। আপনার মতামত সরাসরি অ্যাডমিনের কাছে পাঠানো হবে।",
        fb_label_name: "আপনার নাম (ঐচ্ছিক)",
        fb_label_msg: "বার্তা",
        fb_label_img: "ছবি সংযুক্ত করুন (ঐচ্ছিক)",
        fb_placeholder_name: "অজ্ঞাতনামা",
        fb_placeholder_msg: "আপনার মতামত এখানে লিখুন...",
        fb_btn: "রিপোর্ট পাঠান",
        fb_success: "মতামত সফলভাবে জমা দেওয়া হয়েছে!",
        fb_error: "জমা দিতে ব্যর্থ হয়েছে। পরে আবার চেষ্টা করুন।",
        rep_title: "রিপোর্ট জমা দিন",
        rep_desc: "সহপাঠীর কোনো সমস্যা রিপোর্ট করুন। আপনার রিপোর্ট সরাসরি অ্যাডমিনের কাছে পাঠানো হবে।",
        rep_label_name: "আপনার নাম",
        rep_label_member: "রিপোর্টকৃত সদস্য",
        rep_label_msg: "সমস্যা / বার্তা",
        rep_label_img: "ছবি সংযুক্ত করুন (ঐচ্ছিক)",
        rep_btn: "রিপোর্ট পাঠান",
        rep_success: "রিপোর্ট সফলভাবে জমা দেওয়া হয়েছে!",
        rep_error: "জমা দিতে ব্যর্থ হয়েছে। পরে আবার চেষ্টা করুন।",
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
    document.getElementById('ui-fb-label-img').textContent = t.fb_label_img;
    document.getElementById('fb-name').placeholder = t.fb_placeholder_name;
    document.getElementById('fb-message').placeholder = t.fb_placeholder_msg;
    document.getElementById('rep-title').textContent = t.rep_title;
    document.getElementById('rep-desc').textContent = t.rep_desc;
    document.getElementById('rep-label-name').textContent = t.rep_label_name;
    document.getElementById('rep-label-member').textContent = t.rep_label_member;
    document.getElementById('rep-label-msg').textContent = t.rep_label_msg;
    document.getElementById('rep-label-img').textContent = t.rep_label_img;
    document.getElementById('rep-submit-btn').textContent = t.rep_btn;
    
    if (document.getElementById('rules-title')) {
        document.getElementById('rules-title').innerHTML = `<i class="fas fa-scroll"></i> ${t.rules_default_title}`;
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

// Initial load checks
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('preferredTheme');
    applyTheme(savedTheme || 'dark');

    const savedLang = localStorage.getItem('preferredLang') || 'en';
    applyLanguage(savedLang);
});
const themeCards = document.querySelectorAll('.theme-card');

function applyTheme(theme) {
    if (!theme) theme = 'dark';
    document.body.setAttribute('data-theme', theme);
    document.body.classList.toggle('theme-switching', true);
    setTimeout(() => document.body.classList.remove('theme-switching'), 600);
    themeCards.forEach(card => {
        card.classList.toggle('active', card.dataset.theme === theme);
    });
    localStorage.setItem('preferredTheme', theme);
}

themeCards.forEach(card => {
    card.addEventListener('click', () => applyTheme(card.dataset.theme));
});

// Collapsible settings panels
document.querySelectorAll('.collapse-toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
        const key = toggle.dataset.collapse;
        const body = document.querySelector(`.collapse-body[data-collapse-body="${key}"]`);
        const isOpen = toggle.classList.toggle('open');
        body.classList.toggle('collapsed', !isOpen);
    });
});

// Language Switching in Settings
langSwitchBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const selectedLang = btn.dataset.lang;
        localStorage.setItem('preferredLang', selectedLang);
        applyLanguage(selectedLang);
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
let membersLoaded = false;
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
        switchTab(target);
    });
});

function switchTab(target) {
    navBtns.forEach(b => {
        b.classList.remove('active');
        if(b.dataset.tab === target) b.classList.add('active');
    });
    tabContents.forEach(tab => {
        tab.classList.remove('active');
        if (tab.id === `${target}-tab`) {
            tab.classList.add('active');
        }
    });
}

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

// Search Logic
searchInput.addEventListener('input', (e) => {
    renderTables(e.target.value.toLowerCase());
});

// Feedback Submission
const fbImageInput = document.getElementById('fb-image');
const fbImagePreview = document.getElementById('fb-image-preview');
let fbImageBase64 = null;

fbImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    setFileUploadState(fbImageInput, file ? file.name : null);
    if (!file) { fbImageBase64 = null; fbImagePreview.innerHTML = ''; return; }
    fileToBase64(file, result => {
        fbImageBase64 = result;
        fbImagePreview.innerHTML = `<img src="${result}" alt="Feedback image">`;
    });
});

feedbackForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('fb-name').value.trim() || 'Anonymous';
    const message = document.getElementById('fb-message').value.trim();

    if (message) {
        const feedbackRef = push(ref(db, 'feedback'));
        set(feedbackRef, {
            user: name,
            message: message,
            imageBase64: fbImageBase64 || null,
            timestamp: Date.now()
        }).then(() => {
            feedbackStatus.textContent = translations[currentLang].fb_success;
            feedbackStatus.style.color = 'var(--secondary)';
            feedbackStatus.style.display = 'block';
            feedbackForm.reset();
            setFileUploadState(fbImageInput, null);
            fbImageBase64 = null;
            fbImagePreview.innerHTML = '';
            setTimeout(() => { feedbackStatus.style.display = 'none'; }, 3000);
        }).catch(() => {
            feedbackStatus.textContent = translations[currentLang].fb_error;
            feedbackStatus.style.color = 'var(--error)';
            feedbackStatus.style.display = 'block';
        });
    }
});

// Report Section
const reportForm = document.getElementById('user-report-form');
const reportStatus = document.getElementById('report-status');
const reportMemberSelect = document.getElementById('report-member');
const reportImageInput = document.getElementById('report-image');
const reportImagePreview = document.getElementById('report-image-preview');
let reportImageBase64 = null;

function populateReportMembers() {
    reportMemberSelect.innerHTML = `<option value="" disabled selected>${currentLang === 'bn' ? 'একজন সদস্য নির্বাচন করুন...' : 'Select a member...'}</option>`;
    allMembers.filter(m => !m.isBanned).forEach(m => {
        const option = document.createElement('option');
        option.value = m.id;
        option.textContent = m.name;
        reportMemberSelect.appendChild(option);
    });
}

reportImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    setFileUploadState(reportImageInput, file ? file.name : null);
    if (!file) { reportImageBase64 = null; reportImagePreview.innerHTML = ''; return; }
    fileToBase64(file, result => {
        reportImageBase64 = result;
        reportImagePreview.innerHTML = `<img src="${result}" alt="Report image">`;
    });
});

reportForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('report-name').value.trim();
    const memberId = reportMemberSelect.value;
    const message = document.getElementById('report-message').value.trim();
    const member = allMembers.find(m => m.id === memberId);

    if (name && memberId && message) {
        const reportRef = push(ref(db, 'reports'));
        set(reportRef, {
            reporterName: name,
            reportedMemberId: memberId,
            reportedMemberName: member ? member.name : '',
            message: message,
            imageBase64: reportImageBase64 || null,
            timestamp: Date.now()
        }).then(() => {
            reportStatus.textContent = translations[currentLang].rep_success;
            reportStatus.style.color = 'var(--secondary)';
            reportStatus.style.display = 'block';
            reportForm.reset();
            setFileUploadState(reportImageInput, null);
            reportImageBase64 = null;
            reportImagePreview.innerHTML = '';
            setTimeout(() => { reportStatus.style.display = 'none'; }, 3000);
        }).catch(() => {
            reportStatus.textContent = translations[currentLang].rep_error;
            reportStatus.style.color = 'var(--error)';
            reportStatus.style.display = 'block';
        });
    }
});

// Image to base64 converter (auto-resized to keep the DB small)
function fileToBase64(file, cb) {
    const reader = new FileReader();
    reader.onload = () => {
        const img = new Image();
        img.onload = () => {
            let w = img.width, h = img.height;
            const maxDim = 1000;
            const scale = Math.min(1, maxDim / Math.max(w, h));
            if (scale < 1) { w = Math.round(w * scale); h = Math.round(h * scale); }
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            cb(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = reader.result;
    };
    reader.readAsDataURL(file);
}

// Update the custom file-upload button state
function setFileUploadState(input, fileName) {
    const wrap = input.closest('.file-upload');
    if (!wrap) return;
    const textEl = wrap.querySelector('.file-upload-text');
    wrap.classList.toggle('has-file', !!fileName);
    if (textEl) textEl.textContent = fileName || 'Choose Image';
}

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
        alert(currentLang === 'bn' ? 'আপনার মন্তব্যটি অ্যাডমিন পর্যালোচনার জন্য পাঠানো হয়েছে।' : 'Sent for admin review.');
    }
});

window.postReply = (parentId) => {
    const replyText = document.getElementById(`reply-input-${parentId}`).value.trim();
    if (!replyText) return;

    if (!commenterIdentity) {
        alert(currentLang === 'bn' ? 'অনুগ্রহ করে প্রথমে আপনার পরিচয় নির্বাচন করুন।' : 'Please select your identity first.');
        const selector = document.getElementById('identity-selector');
        if (selector) selector.scrollIntoView({ behavior: 'smooth' });
        return;
    }

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
    const box = document.getElementById(`reply-box-${parentId}`);
    if (box) box.style.display = 'none';

    if (!isAnonymous) {
        alert(currentLang === 'bn' ? 'আপনার উত্তরটি অ্যাডমিন পর্যালোচনার জন্য পাঠানো হয়েছে।' : 'Reply sent for admin review.');
    }
};

window.toggleReplyBox = (id) => {
    if (!commenterIdentity) {
        alert(currentLang === 'bn' ? 'মন্তব্য করার আগে অনুগ্রহ করে আপনার পরিচয় নির্বাচন করুন।' : 'Please select your identity before replying.');
        const selector = document.getElementById('identity-selector');
        if (selector) selector.scrollIntoView({ behavior: 'smooth' });
        return;
    }
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
    
    // Only show comments that have been approved by the admin
    const visibleComments = allComments.filter(c => c.status === 'approved');
    
    const topLevel = visibleComments.filter(c => !c.parentId).sort((a, b) => b.timestamp - a.timestamp);
    const replies = visibleComments.filter(c => c.parentId);

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
function hideEntryLoader() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay && !overlay.classList.contains('hidden')) {
        overlay.classList.add('hidden');
        setTimeout(() => { overlay.style.display = 'none'; }, 500);
    }
}
// Fallback: never trap the visitor even if the student list never arrives.
setTimeout(hideEntryLoader, 15000);

function renderSkeleton() {
    memberListBody.innerHTML = '';
    banListBody.innerHTML = '';
    const makeRow = (cols, wideFirst) => {
        const row = document.createElement('tr');
        row.innerHTML = cols.map((c, i) =>
            `<td><div class="skeleton-line ${i === 0 && wideFirst ? 'wide' : ''}"></div></td>`
        ).join('');
        return row;
    };
    for (let i = 0; i < 6; i++) memberListBody.appendChild(makeRow([true, false], true));
    for (let i = 0; i < 3; i++) banListBody.appendChild(makeRow([true, false], true));
}
renderSkeleton();

onValue(ref(db, 'members'), (snapshot) => {
    const data = snapshot.val();
    membersLoaded = true;
    allMembers = [];
    if (data) {
        allMembers = Object.keys(data).map(key => ({ id: key, ...data[key] }));
    }
    renderTables();
    updateIdentityUI();
    populateReportMembers();
    hideEntryLoader();
});

// Re-evaluate running warnings live as the synced clock ticks (every 5 minutes).
setInterval(() => renderTables(searchInput.value.toLowerCase()), 300000);

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
    // Remove any warnings that have expired (using the synced clock).
    const nowTime = now();
    allMembers.forEach(m => {
        if (m.warnings) {
            let hasChanges = false;
            const updated = {};
            Object.keys(m.warnings).forEach(level => {
                if (m.warnings[level].expiresAt > 0 && m.warnings[level].expiresAt < nowTime) {
                    hasChanges = true;
                } else {
                    updated[level] = m.warnings[level];
                }
            });
            if (hasChanges) {
                const maxLevel = Object.keys(updated).length > 0 ? Math.max(...Object.keys(updated).map(Number)) : 0;
                update(ref(db, `members/${m.id}`), { warnings: updated, strikes: maxLevel });
                m.warnings = updated;
                m.strikes = maxLevel;
            }
        }
    });

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
        
        const running = getWarningsForDisplay(m);
        let strikeDisplay = '';
        if (running.length > 0) {
            // Show icon + "WARNINGS" + count. Clicking opens the full reasons.
            const severe = running.some(r => parseInt(r.level) >= 6);
            strikeDisplay = `
                <div class="warning-summary ${severe ? 'severe' : ''}" onclick="viewWarning('${m.id}')" title="${currentLang === 'bn' ? 'চলমান সতর্কবার্তা দেখুন' : 'View running warnings'}">
                    <span class="warning-count-badge"><i class="fas fa-triangle-exclamation"></i> ${currentLang === 'bn' ? 'সতর্কবার্তা' : 'WARNINGS'} <span class="warning-number">${running.length}</span></span>
                </div>
            `;
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
                ${strikeDisplay}
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
window.viewImage = (src) => {
    const lightbox = document.createElement('div');
    lightbox.className = 'image-lightbox';
    lightbox.innerHTML = `<img src="${src}" alt="Attachment">`;
    lightbox.addEventListener('click', () => lightbox.remove());
    document.body.appendChild(lightbox);
};
