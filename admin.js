/* =========================================================
   PLUS 2 GURU - FIREBASE ADMIN SYSTEM
   Firebase Authentication + Realtime Database
   ========================================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import {
    getDatabase,
    ref,
    push,
    set,
    onValue,
    remove,
    update
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";

import {
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updatePassword
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";


/* =========================================================
   FIREBASE CONFIG
   ========================================================= */
const firebaseConfig = {
  apiKey: "AIzaSyBkyOg675arxH3DW3I8yqjW9dHi-lOcHJc",
  authDomain: "plus-2-guru.firebaseapp.com",
  databaseURL: "https://plus-2-guru-default-rtdb.firebaseio.com",
  projectId: "plus-2-guru",
  storageBucket: "plus-2-guru.firebasestorage.app",
  messagingSenderId: "632910641461",
  appId: "1:632910641461:web:beac522e9a3121666e347c"
};


/* =========================================================
   INITIALIZE FIREBASE
   ========================================================= */

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);


/* =========================================================
   GLOBAL STATE
   ========================================================= */

let isAdminLoggedIn = false;
let databaseListenerStarted = false;

let studentsData = [];

let currentPage = 1;

const messagesPerPage = 10;


/* =========================================================
   DOM ELEMENTS
   ========================================================= */

const contactForm =
    document.getElementById("contactForm");

const submitBtn =
    document.getElementById("submit_btn");

const notification =
    document.getElementById("notification");

const messagesTableBody =
    document.getElementById("messagesTableBody");

const pagination =
    document.getElementById("pagination");

const searchInput =
    document.getElementById("msgSearch");

const filterSelect =
    document.getElementById("msgFilter");


/* =========================================================
   SUBJECT LABELS
   ========================================================= */

const subjectLabels = {
    "notes": "Notes",
    "past-papers": "Past Papers",
    "lab": "Lab Practical",
    "model": "Model Questions",
    "study-tips": "Study Tips",
    "other": "Other"
};


function getSubjectLabel(subject) {
    return subjectLabels[subject] || subject || "Other";
}


/* =========================================================
   AUTH STATE
   ========================================================= */

onAuthStateChanged(auth, (user) => {

    if (user) {

        console.log("Admin authenticated:", user.email);
        console.log("Admin UID:", user.uid);

        isAdminLoggedIn = true;

        setAdminView(true);

        if (!databaseListenerStarted) {

            databaseListenerStarted = true;

            loadStudents();
        }

    } else {

        console.log("No admin authenticated");

        isAdminLoggedIn = false;

        setAdminView(false);

        studentsData = [];

        currentPage = 1;

        renderMessages();

        updateStats();
    }
});


/* =========================================================
   CONTACT FORM → FIREBASE
   ========================================================= */

async function AddStudents(event) {

    if (event) {
        event.preventDefault();
    }

    const name =
        document.getElementById("name")?.value.trim();

    const email =
        document.getElementById("email")?.value.trim();

    const phone =
        document.getElementById("phone")?.value.trim();

    const subject =
        document.getElementById("subject")?.value.trim();

    const message =
        document.getElementById("message")?.value.trim();


    /* Validation */

    if (!name || !email || !subject || !message) {

        showNotification(
            "Please fill in all required fields.",
            "error"
        );

        return;
    }


    /* Correct email regex */

    const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {

        showNotification(
            "Please enter a valid email address.",
            "error"
        );

        return;
    }


    try {

        if (submitBtn) {

            submitBtn.disabled = true;

            submitBtn.dataset.originalText =
                submitBtn.innerHTML;

            submitBtn.innerHTML =
                '<i class="fas fa-spinner fa-spin"></i> Sending...';
        }


        const studentRef =
            push(ref(db, "students"));


        await set(studentRef, {

            name: name,

            email: email,

            phone: phone || "",

            subject: subject,

            message: message,

            createdAt:
                new Date().toISOString(),

            read: false

        });


        console.log(
            "Message successfully saved:",
            studentRef.key
        );


        showNotification(
            "Message sent successfully!",
            "success"
        );


        if (contactForm) {
            contactForm.reset();
        }


    } catch (error) {

        console.error(
            "Firebase save error:",
            error
        );

        console.error(
            "Error code:",
            error.code
        );

        console.error(
            "Error message:",
            error.message
        );


        showNotification(
            "Failed to send message. Please try again.",
            "error"
        );

    } finally {

        if (submitBtn) {

            submitBtn.disabled = false;

            submitBtn.innerHTML =
                submitBtn.dataset.originalText ||
                "Send Message";
        }
    }
}


/* =========================================================
   CONTACT FORM EVENT
   ========================================================= */

if (contactForm) {

    contactForm.addEventListener(
        "submit",
        AddStudents
    );

    console.log(
        "Contact form listener connected"
    );
}


/* =========================================================
   NOTIFICATION
   ========================================================= */

function showNotification(message, type = "success") {

    if (!notification) {
        return;
    }

    notification.textContent = message;

    notification.style.display = "block";

    notification.classList.remove(
        "success",
        "error"
    );

    notification.classList.add(type);


    setTimeout(() => {

        if (notification) {

            notification.style.display =
                "none";
        }

    }, 5000);
}


/* =========================================================
   LOAD FIREBASE MESSAGES
   ========================================================= */

function loadStudents() {

    console.log(
        "Starting Firebase message listener..."
    );


    const studentsRef =
        ref(db, "students");


    onValue(
        studentsRef,

        (snapshot) => {

            studentsData = [];


            if (!snapshot.exists()) {

                console.log(
                    "No messages found."
                );

                updateStats();

                renderMessages();

                return;
            }


            snapshot.forEach((childSnapshot) => {

                const data =
                    childSnapshot.val() || {};


                studentsData.push({

                    id:
                        childSnapshot.key,

                    name:
                        data.name || "",

                    email:
                        data.email || "",

                    phone:
                        data.phone || "",

                    subject:
                        data.subject || "other",

                    message:
                        data.message || "",

                    createdAt:
                        data.createdAt || "",

                    read:
                        data.read === true
                });

            });


            /* Newest first */

            studentsData.sort((a, b) => {

                const dateA =
                    new Date(a.createdAt || 0).getTime();

                const dateB =
                    new Date(b.createdAt || 0).getTime();

                return dateB - dateA;
            });


            console.log(
                "Messages loaded:",
                studentsData
            );


            updateStats();

            renderMessages();

        },

        (error) => {

            console.error(
                "Firebase read error:",
                error
            );


            if (messagesTableBody) {

                messagesTableBody.innerHTML = `

                    <tr>

                        <td colspan="6"
                            class="admin-table-error">

                            <div class="error-icon">
                                <i class="fas fa-triangle-exclamation"></i>
                            </div>

                            <strong>
                                Failed to load messages
                            </strong>

                            <small>
                                ${escapeHTML(
                                    error.message || "Unknown Firebase error"
                                )}
                            </small>

                        </td>

                    </tr>

                `;
            }
        }
    );
}


/* =========================================================
   FILTER MESSAGES
   ========================================================= */

function getFilteredMessages() {

    let data =
        [...studentsData];


    const search =
        searchInput?.value
            ?.trim()
            .toLowerCase() || "";


    if (search) {

        data =
            data.filter((student) => {

                return (

                    String(student.name)
                        .toLowerCase()
                        .includes(search)

                    ||

                    String(student.email)
                        .toLowerCase()
                        .includes(search)

                    ||

                    String(student.phone)
                        .toLowerCase()
                        .includes(search)

                    ||

                    String(student.subject)
                        .toLowerCase()
                        .includes(search)

                    ||

                    getSubjectLabel(student.subject)
                        .toLowerCase()
                        .includes(search)

                    ||

                    String(student.message)
                        .toLowerCase()
                        .includes(search)
                );
            });
    }


    const filter =
        filterSelect?.value || "all";


    if (filter === "unread") {

        data =
            data.filter(
                student => !student.read
            );
    }


    if (filter === "read") {

        data =
            data.filter(
                student => student.read
            );
    }


    if (
        Object.prototype.hasOwnProperty.call(
            subjectLabels,
            filter
        )
    ) {

        data =
            data.filter(
                student =>
                    student.subject === filter
            );
    }


    return data;
}


/* =========================================================
   RENDER MESSAGES
   ========================================================= */

function renderMessages() {

    if (!messagesTableBody) {

        console.error(
            "messagesTableBody not found."
        );

        return;
    }


    const filteredMessages =
        getFilteredMessages();


    /* Empty state */

    if (filteredMessages.length === 0) {

        messagesTableBody.innerHTML = `

            <tr>

                <td colspan="6"
                    class="empty-messages">

                    <div class="empty-icon">
                        <i class="fas fa-inbox"></i>
                    </div>

                    <strong>
                        No messages found
                    </strong>

                    <span>
                        Contact form messages will appear here.
                    </span>

                </td>

            </tr>

        `;


        updatePagination(0, 0);

        return;
    }


    const totalItems =
        filteredMessages.length;


    const totalPages =
        Math.ceil(
            totalItems / messagesPerPage
        );


    if (currentPage > totalPages) {
        currentPage = totalPages;
    }


    if (currentPage < 1) {
        currentPage = 1;
    }


    const start =
        (currentPage - 1) *
        messagesPerPage;


    const end =
        start + messagesPerPage;


    const pageMessages =
        filteredMessages.slice(
            start,
            end
        );


    messagesTableBody.innerHTML =
        pageMessages
            .map(createMessageRow)
            .join("");


    updatePagination(
        totalItems,
        totalPages
    );
}


/* =========================================================
   CREATE TABLE ROW
   ========================================================= */

function createMessageRow(student) {

    const firstLetter =
        String(
            student.name || "?"
        )
            .charAt(0)
            .toUpperCase();


    const subjectLabel =
        getSubjectLabel(
            student.subject
        );


    const statusClass =
        student.read
            ? "status-read"
            : "status-unread";


    const statusText =
        student.read
            ? "Read"
            : "Unread";


    const rowClass =
        student.read
            ? "message-row read-row"
            : "message-row unread-row";


    return `

        <tr
            class="${rowClass}"
            data-message-id="${escapeHTML(student.id)}"
        >

            <!-- NAME -->

            <td class="name-column">

                <div class="user-cell">

                    <div class="user-avatar">
                        ${escapeHTML(firstLetter)}
                    </div>

                    <div class="user-details">

                        <strong>
                            ${escapeHTML(student.name || "Unknown")}
                            ${!student.read ? '<span class="unread-mark">UNREAD</span>' : ''}
                        </strong>

                        <span>
                            ${escapeHTML(student.email || "-")}
                        </span>

                    </div>

                </div>

            </td>


            <!-- SUBJECT -->

            <td class="subject-column">

                <span class="subject-badge">

                    <i class="fas fa-tag"></i>

                    ${escapeHTML(subjectLabel)}

                </span>

            </td>


            <!-- MESSAGE -->

            <td class="message-column">

                <div
                    class="message-preview"
                    title="${escapeHTML(student.message)}"
                >

                    ${escapeHTML(student.message || "-")}

                </div>

            </td>


            <!-- DATE -->

            <td class="date-column">

                <div class="message-date">

                    ${escapeHTML(
                        formatDate(student.createdAt)
                    )}

                </div>

                <span class="message-status ${statusClass}">

                    <i class="fas ${
                        student.read
                            ? "fa-check-circle"
                            : "fa-envelope"
                    }"></i>

                    ${statusText}

                </span>

            </td>


            <!-- ACTIONS -->

            <td class="actions-column">

                <div class="message-actions">

                    <button
                        type="button"
                        class="message-action view-action"
                        onclick="viewMessage('${escapeJS(student.id)}')"
                        title="View message"
                        aria-label="View message"
                    >

                        <i class="fas fa-eye"></i>

                    </button>


                    <button
                        type="button"
                        class="message-action read-action"
                        onclick="toggleMessageRead(
                            '${escapeJS(student.id)}',
                            ${!student.read}
                        )"
                        title="${
                            student.read
                                ? "Mark unread"
                                : "Mark read"
                        }"
                        aria-label="${
                            student.read
                                ? "Mark unread"
                                : "Mark read"
                        }"
                    >

                        <i class="fas ${
                            student.read ? "fa-envelope-open" : "fa-envelope"
                        }"></i>

                    </button>


                    <button
                        type="button"
                        class="message-action delete-action"
                        onclick="deleteMessage('${escapeJS(student.id)}')"
                        title="Delete message"
                        aria-label="Delete message"
                    >

                        <i class="fas fa-trash"></i>

                    </button>

                </div>

            </td>

        </tr>

    `;
}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   ESCAPE JS STRING
   ========================================================= */

function escapeJS(value) {

    return String(value ?? "")
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/\r/g, "\\r")
        .replace(/\n/g, "\\n");
}


/* =========================================================
   FORMAT DATE
   ========================================================= */
function formatDate(dateValue) {
    if (!dateValue) return "—";

    const date = new Date(dateValue);

    if (isNaN(date.getTime())) {
        return "Invalid date";
    }

    return date.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

/* =========================================================
   PAGINATION
   ========================================================= */

function updatePagination(
    totalItems,
    totalPages
) {

    if (!pagination) {
        return;
    }


    if (
        totalItems === 0 ||
        totalPages === 0
    ) {

        pagination.innerHTML = "";

        return;
    }


    const from =
        (currentPage - 1) *
            messagesPerPage +
        1;


    const to =
        Math.min(
            currentPage *
                messagesPerPage,
            totalItems
        );


    let html = `

        <div class="pagination-info">

            Showing
            <strong>${from}</strong>
            –
            <strong>${to}</strong>
            of
            <strong>${totalItems}</strong>

        </div>

        <div class="pagination-controls">

            <button
                type="button"
                class="pagination-btn"
                onclick="changePage(${currentPage - 1})"
                ${currentPage === 1 ? "disabled" : ""}
                aria-label="Previous page"
            >

                <i class="fas fa-chevron-left"></i>

            </button>

    `;


    /* Page numbers */

    const maxButtons = 5;


    let startPage =
        Math.max(
            1,
            currentPage -
                Math.floor(maxButtons / 2)
        );


    let endPage =
        Math.min(
            totalPages,
            startPage + maxButtons - 1
        );


    if (
        endPage - startPage <
        maxButtons - 1
    ) {

        startPage =
            Math.max(
                1,
                endPage - maxButtons + 1
            );
    }


    for (
        let page = startPage;
        page <= endPage;
        page++
    ) {

        html += `

            <button
                type="button"
                class="pagination-btn ${
                    page === currentPage
                        ? "active"
                        : ""
                }"
                onclick="changePage(${page})"
            >

                ${page}

            </button>

        `;
    }


    html += `

            <button
                type="button"
                class="pagination-btn"
                onclick="changePage(${currentPage + 1})"
                ${
                    currentPage === totalPages
                        ? "disabled"
                        : ""
                }
                aria-label="Next page"
            >

                <i class="fas fa-chevron-right"></i>

            </button>

        </div>

    `;


    pagination.innerHTML = html;
}


/* =========================================================
   CHANGE PAGE
   ========================================================= */

window.changePage = function(page) {

    const totalPages =
        Math.ceil(
            getFilteredMessages().length /
            messagesPerPage
        );


    if (
        page < 1 ||
        page > totalPages
    ) {
        return;
    }


    currentPage = page;

    renderMessages();


    const table =
        document.querySelector(
            ".messages-table"
        );


    if (table) {

        table.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }
};


/* =========================================================
   SEARCH
   ========================================================= */

if (searchInput) {

    searchInput.addEventListener(
        "input",
        () => {

            currentPage = 1;

            renderMessages();
        }
    );
}


/* =========================================================
   FILTER
   ========================================================= */

if (filterSelect) {

    filterSelect.addEventListener(
        "change",
        () => {

            currentPage = 1;

            renderMessages();
        }
    );
}


/* =========================================================
   VIEW MESSAGE
   ========================================================= */

window.viewMessage = function(messageId) {

    const student =
        studentsData.find(
            item =>
                item.id === messageId
        );


    if (!student) {

        console.error(
            "Message not found:",
            messageId
        );

        return;
    }


    const detailName =
        document.getElementById(
            "detailName"
        );

    const detailMeta =
        document.getElementById(
            "detailMeta"
        );

    const detailEmail =
        document.getElementById(
            "detailEmail"
        );

    const detailPhone =
        document.getElementById(
            "detailPhone"
        );

    const detailSubject =
        document.getElementById(
            "detailSubject"
        );

    const detailMessage =
        document.getElementById(
            "detailMessage"
        );

    const detailReplyLink =
        document.getElementById(
            "detailReplyLink"
        );


    if (detailName) {

        detailName.textContent =
            student.name || "-";
    }


    if (detailMeta) {

        detailMeta.textContent =
            formatDate(
                student.createdAt
            );
    }


    if (detailEmail) {

        detailEmail.textContent =
            student.email || "-";
    }


    if (detailPhone) {

        detailPhone.textContent =
            student.phone || "-";
    }


    if (detailSubject) {

        detailSubject.textContent =
            getSubjectLabel(
                student.subject
            );
    }


    if (detailMessage) {

        detailMessage.textContent =
            student.message || "";
    }


    if (detailReplyLink) {

        if (student.email) {

            detailReplyLink.href =
                `mailto:${encodeURIComponent(student.email)}`;

            detailReplyLink.style.display =
                "inline-flex";

        } else {

            detailReplyLink.style.display =
                "none";
        }
    }


    const overlay =
        document.getElementById(
            "msgDetailOverlay"
        );


    if (overlay) {

        overlay.classList.add(
            "active"
        );
    }


    /* Automatically mark read */

    if (!student.read) {

        toggleMessageRead(
            student.id,
            true
        );
    }
};


/* =========================================================
   CLOSE MESSAGE DETAIL
   ========================================================= */

window.closeMsgDetail = function() {

    const overlay =
        document.getElementById(
            "msgDetailOverlay"
        );


    if (overlay) {

        overlay.classList.remove(
            "active"
        );
    }
};


/* =========================================================
   MARK READ / UNREAD
   ========================================================= */

window.toggleMessageRead =
    async function(
        messageId,
        readStatus
    ) {

        if (!messageId) {
            return;
        }


        try {

            await update(
                ref(
                    db,
                    `students/${messageId}`
                ),
                {
                    read: Boolean(readStatus)
                }
            );


            console.log(
                "Message status updated."
            );

        } catch (error) {

            console.error(
                "Failed to update message:",
                error
            );


            alert(
                "Failed to update message."
            );
        }
    };


/* =========================================================
   DELETE MESSAGE
   ========================================================= */

window.deleteMessage =
    async function(messageId) {

        if (!messageId) {
            return;
        }


        const confirmed =
            confirm(
                "Are you sure you want to delete this message?"
            );


        if (!confirmed) {
            return;
        }


        try {

            await remove(
                ref(
                    db,
                    `students/${messageId}`
                )
            );


            console.log(
                "Message deleted."
            );

        } catch (error) {

            console.error(
                "Delete failed:",
                error
            );


            alert(
                "Failed to delete message."
            );
        }
    };


/* =========================================================
   DASHBOARD STATISTICS
   ========================================================= */

function updateStats() {

    const total =
        studentsData.length;


    const unread =
        studentsData.filter(
            student => !student.read
        ).length;


    const today =
        new Date();


    const todayCount =
        studentsData.filter(
            student => {

                if (!student.createdAt) {
                    return false;
                }


                const date =
                    new Date(
                        student.createdAt
                    );


                return (

                    date.getDate() ===
                    today.getDate()

                    &&

                    date.getMonth() ===
                    today.getMonth()

                    &&

                    date.getFullYear() ===
                    today.getFullYear()
                );
            }
        ).length;


    const categories =
        new Set(
            studentsData
                .map(
                    student =>
                        student.subject
                )
                .filter(Boolean)
        ).size;


    /* Existing IDs */

    const totalElement =
        document.getElementById(
            "totalMessages"
        );


    const todayElement =
        document.getElementById(
            "todayMessages"
        );


    const unreadElement =
        document.getElementById(
            "unreadMessages"
        );


    const categoryElement =
        document.getElementById(
            "categoryCount"
        );


    if (totalElement) {
        totalElement.textContent = total;
    }


    if (todayElement) {
        todayElement.textContent = todayCount;
    }


    if (unreadElement) {
        unreadElement.textContent = unread;
    }


    if (categoryElement) {
        categoryElement.textContent = categories;
    }


    /* Modern generated stat cards */

    const statsContainer =
        document.getElementById(
            "adminStats"
        );


    if (statsContainer) {

        statsContainer.innerHTML = `

            <div class="stat-card">

                <div class="stat-icon">
                    <i class="fas fa-inbox"></i>
                </div>

                <div class="stat-content">

                    <div class="stat-number">
                        ${total}
                    </div>

                    <div class="stat-label">
                        Total Messages
                    </div>

                </div>

            </div>


            <div class="stat-card">

                <div class="stat-icon">
                    <i class="fas fa-calendar-day"></i>
                </div>

                <div class="stat-content">

                    <div class="stat-number">
                        ${todayCount}
                    </div>

                    <div class="stat-label">
                        Today
                    </div>

                </div>

            </div>


            <div class="stat-card">

                <div class="stat-icon">
                    <i class="fas fa-envelope"></i>
                </div>

                <div class="stat-content">

                    <div class="stat-number">
                        ${unread}
                    </div>

                    <div class="stat-label">
                        Unread
                    </div>

                </div>

            </div>


            <div class="stat-card">

                <div class="stat-icon">
                    <i class="fas fa-tags"></i>
                </div>

                <div class="stat-content">

                    <div class="stat-number">
                        ${categories}
                    </div>

                    <div class="stat-label">
                        Subjects
                    </div>

                </div>

            </div>

        `;
    }
}


/* =========================================================
   ADMIN PANEL VIEW
   ========================================================= */

function setAdminView(loggedIn) {

    const login =
        document.getElementById(
            "adminLogin"
        );


    const dashboard =
        document.getElementById(
            "adminDashboard"
        );


    const actions =
        document.getElementById(
            "adminHeaderActions"
        );


    const closeLogin =
        document.getElementById(
            "adminCloseLogin"
        );


    if (login) {

        login.style.display =
            loggedIn
                ? "none"
                : "block";
    }


    if (dashboard) {

        dashboard.style.display =
            loggedIn
                ? "block"
                : "none";
    }


    if (actions) {

        actions.style.display =
            loggedIn
                ? "flex"
                : "none";
    }


    if (closeLogin) {

        closeLogin.style.display =
            loggedIn
                ? "none"
                : "flex";
    }


    if (loggedIn) {

        updateStats();

        renderMessages();
    }
}


/* =========================================================
   OPEN ADMIN PANEL
   ========================================================= */

window.openAdminPanel = function() {

    const overlay =
        document.getElementById(
            "adminOverlay"
        );


    if (!overlay) {

        console.error(
            "adminOverlay not found."
        );

        return;
    }


    overlay.classList.add(
        "active"
    );


    setAdminView(
        isAdminLoggedIn
    );


    if (!isAdminLoggedIn) {

        document
            .getElementById(
                "adminEmail"
            )
            ?.focus();
    }
};


/* =========================================================
   CLOSE ADMIN PANEL
   ========================================================= */

window.closeAdminPanel = function() {

    const overlay =
        document.getElementById(
            "adminOverlay"
        );


    if (overlay) {

        overlay.classList.remove(
            "active"
        );
    }


    const passwordSection =
        document.getElementById(
            "changePasswordSection"
        );


    if (passwordSection) {

        passwordSection.classList.remove(
            "active"
        );
    }
};


/* =========================================================
   CLOSE BACKDROP
   ========================================================= */

window.closeAdminOnBackdrop =
    function(event) {

        if (
            event.target?.id ===
            "adminOverlay"
        ) {

            window.closeAdminPanel();
        }
    };


/* =========================================================
   ADMIN LOGIN
   ========================================================= */

window.loginAdmin = async function() {

    const email =
        document
            .getElementById(
                "adminEmail"
            )
            ?.value
            .trim();


    const password =
        document
            .getElementById(
                "adminPassword"
            )
            ?.value || "";


    const errorBox =
        document.getElementById(
            "loginError"
        );


    if (errorBox) {

        errorBox.textContent = "";

        errorBox.classList.remove(
            "show"
        );
    }


    if (!email || !password) {

        if (errorBox) {

            errorBox.textContent =
                "Enter your admin email and password.";

            errorBox.classList.add(
                "show"
            );
        }

        return;
    }


    try {

        await signInWithEmailAndPassword(
            auth,
            email,
            password
        );


        console.log(
            "Admin login successful."
        );

    } catch (error) {

        console.error(
            "Admin login failed:",
            error
        );


        let message =
            "Login failed. Check your email and password.";


        switch (error.code) {

            case "auth/invalid-credential":

                message =
                    "Invalid email or password.";

                break;


            case "auth/user-not-found":

                message =
                    "No admin account found.";

                break;


            case "auth/wrong-password":

                message =
                    "Incorrect password.";

                break;


            case "auth/too-many-requests":

                message =
                    "Too many attempts. Please try again later.";

                break;


            case "auth/invalid-email":

                message =
                    "Please enter a valid email address.";

                break;
        }


        if (errorBox) {

            errorBox.textContent =
                message;

            errorBox.classList.add(
                "show"
            );
        }
    }
};


/* =========================================================
   LOGOUT
   ========================================================= */

window.logoutAdmin =
    async function() {

        try {

            await signOut(auth);

            console.log(
                "Admin logged out."
            );

            isAdminLoggedIn = false;

            setAdminView(false);

        } catch (error) {

            console.error(
                "Logout failed:",
                error
            );
        }
    };


/* =========================================================
   TOGGLE CHANGE PASSWORD
   ========================================================= */

window.toggleChangePassword =
    function() {

        const section =
            document.getElementById(
                "changePasswordSection"
            );


        if (section) {

            section.classList.toggle(
                "active"
            );
        }
    };


/* =========================================================
   CHANGE PASSWORD
   ========================================================= */

window.changePassword =
    async function() {

        const user =
            auth.currentUser;


        if (
            !user ||
            !user.email
        ) {

            return;
        }


        const current =
            document
                .getElementById(
                    "currentPassword"
                )
                ?.value || "";


        const next =
            document
                .getElementById(
                    "newPassword"
                )
                ?.value || "";


        const confirmNext =
            document
                .getElementById(
                    "confirmPassword"
                )
                ?.value || "";


        const msg =
            document.getElementById(
                "pwChangeMsg"
            );


        function showMessage(
            text,
            success = false
        ) {

            if (!msg) {
                return;
            }


            msg.textContent = text;


            msg.className =
                `pw-change-msg show ${
                    success
                        ? "success"
                        : "error"
                }`;
        }


        if (
            !current ||
            !next ||
            !confirmNext
        ) {

            showMessage(
                "Fill in all password fields."
            );

            return;
        }


        if (next.length < 6) {

            showMessage(
                "New password must be at least 6 characters."
            );

            return;
        }


        if (next !== confirmNext) {

            showMessage(
                "New passwords do not match."
            );

            return;
        }


        try {

            /* Re-authenticate */

            const credential =
                await signInWithEmailAndPassword(
                    auth,
                    user.email,
                    current
                );


            await updatePassword(
                credential.user,
                next
            );


            showMessage(
                "Password changed successfully.",
                true
            );


            document.getElementById(
                "currentPassword"
            ).value = "";


            document.getElementById(
                "newPassword"
            ).value = "";


            document.getElementById(
                "confirmPassword"
            ).value = "";


        } catch (error) {

            console.error(
                "Password change failed:",
                error
            );


            showMessage(
                "Password change failed. Verify your current password and try again."
            );
        }
    };


/* =========================================================
   EXPORT MESSAGES
   ========================================================= */

window.exportMessages =
    function() {

        if (
            studentsData.length === 0
        ) {

            alert(
                "There are no messages to export."
            );

            return;
        }


        const headers = [
            "Name",
            "Email",
            "Phone",
            "Subject",
            "Message",
            "Date",
            "Read"
        ];


        const rows =
            studentsData.map(
                student => [

                    student.name,

                    student.email,

                    student.phone,

                    getSubjectLabel(
                        student.subject
                    ),

                    student.message,

                    formatDate(
                        student.createdAt
                    ),

                    student.read
                        ? "Yes"
                        : "No"
                ]
            );


        const csv =
            [
                headers,
                ...rows
            ]
                .map(
                    row =>
                        row
                            .map(
                                value =>
                                    `"${String(
                                        value ?? ""
                                    ).replace(
                                        /"/g,
                                        '""'
                                    )}"`
                            )
                            .join(",")
                )
                .join("\r\n");


        const blob =
            new Blob(
                [
                    "\uFEFF" +
                    csv
                ],
                {
                    type:
                        "text/csv;charset=utf-8;"
                }
            );


        const url =
            URL.createObjectURL(
                blob
            );


        const link =
            document.createElement(
                "a"
            );


        link.href = url;


        link.download =
            `plus-2-guru-messages-${
                new Date()
                    .toISOString()
                    .slice(0, 10)
            }.csv`;


        document.body.appendChild(
            link
        );


        link.click();


        link.remove();


        URL.revokeObjectURL(
            url
        );
    };


/* =========================================================
   CLEAR ALL MESSAGES
   ========================================================= */

window.clearAllMessages =
    async function() {

        if (
            studentsData.length === 0
        ) {

            alert(
                "There are no messages to delete."
            );

            return;
        }


        const confirmed =
            confirm(
                "WARNING: This will permanently delete ALL messages. Continue?"
            );


        if (!confirmed) {
            return;
        }


        try {

            await remove(
                ref(
                    db,
                    "students"
                )
            );


            console.log(
                "All messages deleted."
            );

        } catch (error) {

            console.error(
                "Failed to clear messages:",
                error
            );


            alert(
                "Failed to delete messages."
            );
        }
    };


/* =========================================================
   KEYBOARD SUPPORT
   ========================================================= */

document.addEventListener(
    "keydown",
    (event) => {

        if (event.key === "Escape") {

            const detail =
                document.getElementById(
                    "msgDetailOverlay"
                );


            if (
                detail?.classList.contains(
                    "active"
                )
            ) {

                window.closeMsgDetail();

                return;
            }


            const admin =
                document.getElementById(
                    "adminOverlay"
                );


            if (
                admin?.classList.contains(
                    "active"
                )
            ) {

                window.closeAdminPanel();
            }
        }
    }
);


/* =========================================================
   START
   ========================================================= */

console.log(
    "Starting Plus 2 Guru Firebase..."
);

console.log(
    "Firebase initialized."
);

console.log(
    "Database path: students"
);

console.log(
    "Plus 2 Guru admin system ready."
);