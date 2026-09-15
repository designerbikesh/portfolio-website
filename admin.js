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

let isAdminLoggedIn = false;


/* =========================================================
   GLOBAL DATA
========================================================= */

let studentsData = [];
let currentPage = 1;
const messagesPerPage = 10;


/* =========================================================
   DOM ELEMENTS
========================================================= */

const submitBtn = document.getElementById("submit_btn");

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
   AUTH STATE
========================================================= */

onAuthStateChanged(auth, (user) => {

    if (user) {

        console.log("✅ Admin authenticated:", user.email);
        console.log("Admin UID:", user.uid);

        isAdminLoggedIn = true;

        setAdminView(true);

    } else {

        console.log("🔒 No admin authenticated");

        isAdminLoggedIn = false;

        setAdminView(false);
    }

});


/* =========================================================
   CONTACT FORM → FIREBASE
========================================================= */

async function AddStudents(event) {

    if (event) {
        event.preventDefault();
    }

    console.log("📤 Sending contact message to Firebase...");


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


    console.log({
        name,
        email,
        phone,
        subject,
        message
    });


    /* -----------------------------------------
       VALIDATION
    ----------------------------------------- */

    if (!name || !email || !subject || !message) {

        console.error("❌ Required fields are missing.");

        if (notification) {

            notification.innerText =
                "Please fill in all required fields.";

            notification.style.display = "block";

        }

        return;
    }


    /* -----------------------------------------
       EMAIL VALIDATION
    ----------------------------------------- */

    const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {

        if (notification) {

            notification.innerText =
                "Please enter a valid email address.";

            notification.style.display = "block";

        }

        return;
    }


    try {

        /* -----------------------------------------
           CREATE FIREBASE MESSAGE
        ----------------------------------------- */

        const studentRef =
            push(ref(db, "students"));


        /* -----------------------------------------
           SAVE MESSAGE
        ----------------------------------------- */

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
            "✅ Message successfully saved!"
        );


        /* -----------------------------------------
           SUCCESS MESSAGE
        ----------------------------------------- */

        if (notification) {

            notification.innerText =
                "Message sent successfully!";

            notification.style.display = "block";

        }


        /* -----------------------------------------
           CLEAR FORM
        ----------------------------------------- */

        const contactForm =
            document.getElementById("contactForm");

        if (contactForm) {
            contactForm.reset();
        }


    } catch (error) {

        console.error(
            "❌ Firebase save error:",
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


        if (notification) {

            notification.innerText =
                "Failed to send message. Please try again.";

            notification.style.display = "block";

        }

    }

}


/* =========================================================
   CONTACT FORM EVENT
========================================================= */

const contactForm =
    document.getElementById("contactForm");

if (contactForm) {

    contactForm.addEventListener(
        "submit",
        AddStudents
    );

    console.log(
        "✅ Contact form listener connected"
    );

}


/* =========================================================
   LOAD STUDENTS / CONTACT MESSAGES
========================================================= */

function loadStudents() {

    console.log(
        "📥 Starting Firebase message listener..."
    );


    const studentsRef =
        ref(db, "students");


    onValue(

        studentsRef,

        (snapshot) => {

            console.log(
                "📦 Firebase snapshot received"
            );


            studentsData = [];


            /* -----------------------------------------
               NO DATA
            ----------------------------------------- */

            if (!snapshot.exists()) {

                console.log(
                    "⚠️ No messages found."
                );

                renderMessages();
                updateStats();

                return;
            }


            /* -----------------------------------------
               CONVERT FIREBASE DATA TO ARRAY
            ----------------------------------------- */

            snapshot.forEach(
                (childSnapshot) => {

                    const data =
                        childSnapshot.val();


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
                            data.subject || "",

                        message:
                            data.message || "",

                        createdAt:
                            data.createdAt || "",

                        read:
                            data.read === true

                    });

                }
            );


            /* -----------------------------------------
               NEWEST MESSAGE FIRST
            ----------------------------------------- */

            studentsData.sort(
                (a, b) => {

                    return (
                        new Date(b.createdAt || 0) -
                        new Date(a.createdAt || 0)
                    );

                }
            );


            console.log(
                "✅ Messages loaded:",
                studentsData
            );


            /* -----------------------------------------
               UPDATE ADMIN PANEL
            ----------------------------------------- */

            updateStats();

            renderMessages();

        },


        (error) => {

            console.error(
                "❌ Firebase read error:",
                error
            );


            if (messagesTableBody) {

                messagesTableBody.innerHTML = `

                    <tr>

                        <td
                            colspan="5"
                            style="
                                text-align:center;
                                padding:40px;
                                color:#dc2626;
                            "
                        >

                            Failed to load messages.

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


    /* -----------------------------------------
       SEARCH
    ----------------------------------------- */

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

                    String(student.message)
                        .toLowerCase()
                        .includes(search)

                );

            });

    }


    /* -----------------------------------------
       FILTER
    ----------------------------------------- */

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


    /* -----------------------------------------
       SUBJECT FILTERS
    ----------------------------------------- */

    const subjectFilters = [

        "notes",
        "past-papers",
        "lab",
        "model",
        "study-tips",
        "other"

    ];


    if (
        subjectFilters.includes(filter)
    ) {

        data =
            data.filter(
                student =>
                    String(
                        student.subject || ""
                    ) === filter
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
            "❌ messagesTableBody not found."
        );

        return;

    }


    const filteredMessages =
        getFilteredMessages();


    /* -----------------------------------------
       NO MESSAGES
    ----------------------------------------- */

    if (
        filteredMessages.length === 0
    ) {

        messagesTableBody.innerHTML = `

            <tr>

                <td
                    colspan="5"
                    style="
                        text-align:center;
                        padding:40px;
                    "
                >

                    <div
                        style="
                            font-size:40px;
                            margin-bottom:10px;
                            opacity:.5;
                        "
                    >
                        📥
                    </div>

                    <strong>
                        No messages found
                    </strong>

                </td>

            </tr>

        `;


        updatePagination(
            0,
            0
        );

        return;

    }


    /* -----------------------------------------
       PAGINATION
    ----------------------------------------- */

    const totalItems =
        filteredMessages.length;


    const totalPages =
        Math.ceil(
            totalItems /
            messagesPerPage
        );


    if (
        currentPage > totalPages
    ) {

        currentPage =
            totalPages;

    }


    const start =
        (
            currentPage - 1
        ) *
        messagesPerPage;


    const end =
        start +
        messagesPerPage;


    const pageMessages =
        filteredMessages.slice(
            start,
            end
        );


    /* -----------------------------------------
       TABLE HTML
    ----------------------------------------- */

    messagesTableBody.innerHTML =
        pageMessages.map(
            (student) => {

                const readClass =
                    student.read
                        ? "read"
                        : "unread";


                const readText =
                    student.read
                        ? "Read"
                        : "Unread";


                return `

                    <tr
                        class="${readClass}"
                        data-id="${escapeHTML(student.id)}"
                    >

                        <td>

                            <strong>
                                ${escapeHTML(student.name)}
                            </strong>

                            <br>

                            <small>
                                ${escapeHTML(student.email)}
                            </small>

                        </td>


                        <td>

                            ${escapeHTML(
                                student.phone || "-"
                            )}

                        </td>


                        <td>

                            ${escapeHTML(
                                student.subject
                            )}

                        </td>


                        <td>

                            <div
                                style="
                                    max-width:350px;
                                    white-space:normal;
                                    word-break:break-word;
                                "
                            >

                                ${escapeHTML(
                                    student.message
                                )}

                            </div>

                        </td>


                        <td>

                            ${formatDate(
                                student.createdAt
                            )}

                            <br>

                            <span
                                style="
                                    font-size:12px;
                                    opacity:.7;
                                "
                            >
                                ${readText}
                            </span>

                        </td>


                        <td>

                            <div
                                style="
                                    display:flex;
                                    gap:5px;
                                    flex-wrap:wrap;
                                "
                            >

                                <button
                                    type="button"
                                    onclick="toggleMessageRead('${escapeHTML(student.id)}', ${!student.read})"
                                    title="Mark ${student.read ? "unread" : "read"}"
                                >

                                    <i class="fas ${
                                        student.read
                                            ? "fa-envelope"
                                            : "fa-envelope-open"
                                    }"></i>

                                </button>


                                <button
                                    type="button"
                                    onclick="deleteMessage('${escapeHTML(student.id)}')"
                                    title="Delete message"
                                >

                                    <i class="fas fa-trash"></i>

                                </button>

                            </div>

                        </td>

                    </tr>

                `;

            }
        ).join("");


    updatePagination(
        totalItems,
        totalPages
    );

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(value) {

    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}


/* =========================================================
   FORMAT DATE
========================================================= */

function formatDate(value) {

    if (!value) {
        return "-";
    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "-";

    }


    return date.toLocaleString(
        "en-US",
        {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );

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


    if (totalItems === 0) {

        pagination.innerHTML =
            "";

        return;

    }


    let html = `

        <span>

            Showing ${
                (
                    (
                        currentPage - 1
                    ) *
                    messagesPerPage
                ) + 1
            }

            –

            ${
                Math.min(
                    currentPage *
                    messagesPerPage,
                    totalItems
                )
            }

            of ${totalItems}

        </span>

    `;


    if (totalPages > 1) {

        html += `

            <div
                style="
                    display:flex;
                    gap:6px;
                    align-items:center;
                    margin-left:15px;
                "
            >

                <button
                    type="button"
                    onclick="changePage(${currentPage - 1})"
                    ${currentPage === 1 ? "disabled" : ""}
                >
                    ‹
                </button>


                <span>

                    Page
                    ${currentPage}
                    of
                    ${totalPages}

                </span>


                <button
                    type="button"
                    onclick="changePage(${currentPage + 1})"
                    ${
                        currentPage === totalPages
                            ? "disabled"
                            : ""
                    }
                >
                    ›
                </button>

            </div>

        `;

    }


    pagination.innerHTML =
        html;

}


/* =========================================================
   CHANGE PAGE
========================================================= */

window.changePage =
    function(page) {

        if (
            page < 1 ||
            page > Math.ceil(
                getFilteredMessages().length /
                messagesPerPage
            )
        ) {

            return;

        }


        currentPage =
            page;


        renderMessages();

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
   MARK MESSAGE READ / UNREAD
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
                    read: readStatus
                }
            );


            console.log(
                "✅ Message status updated."
            );


        } catch (error) {

            console.error(
                "❌ Failed to update message:",
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
                "✅ Message deleted."
            );


        } catch (error) {

            console.error(
                "❌ Delete failed:",
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
            student =>
                !student.read
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


    console.log(
        "📊 Statistics:",
        {
            total,
            today: todayCount,
            unread,
            categories
        }
    );


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

                <div class="stat-number">
                    ${total}
                </div>

                <div class="stat-label">
                    Total Messages
                </div>

            </div>


            <div class="stat-card">

                <div class="stat-icon">
                    <i class="fas fa-calendar-day"></i>
                </div>

                <div class="stat-number">
                    ${todayCount}
                </div>

                <div class="stat-label">
                    Today
                </div>

            </div>


            <div class="stat-card">

                <div class="stat-icon">
                    <i class="fas fa-envelope"></i>
                </div>

                <div class="stat-number">
                    ${unread}
                </div>

                <div class="stat-label">
                    Unread
                </div>

            </div>


            <div class="stat-card">

                <div class="stat-icon">
                    <i class="fas fa-tags"></i>
                </div>

                <div class="stat-number">
                    ${categories}
                </div>

                <div class="stat-label">
                    Subjects
                </div>

            </div>

        `;

    }


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

        totalElement.innerText =
            total;

    }


    if (todayElement) {

        todayElement.innerText =
            todayCount;

    }


    if (unreadElement) {

        unreadElement.innerText =
            unread;

    }


    if (categoryElement) {

        categoryElement.innerText =
            categories;

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

window.openAdminPanel =
    function() {

        const overlay =
            document.getElementById(
                "adminOverlay"
            );


        if (!overlay) {

            console.error(
                "❌ adminOverlay not found."
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

window.closeAdminPanel =
    function() {

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
   CLOSE ON BACKDROP
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

window.loginAdmin =
    async function() {

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

            errorBox.textContent =
                "";

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
                "✅ Admin login successful."
            );


            setAdminView(
                true
            );


        } catch (error) {

            console.error(
                "❌ Admin login failed:",
                error
            );


            if (errorBox) {

                errorBox.textContent =
                    "Login failed. Check your email and password.";

                errorBox.classList.add(
                    "show"
                );

            }

        }

    };


/* =========================================================
   ADMIN LOGOUT
========================================================= */

window.logoutAdmin =
    async function() {

        try {

            await signOut(
                auth
            );


            console.log(
                "✅ Admin logged out."
            );


            setAdminView(
                false
            );


        } catch (error) {

            console.error(
                "❌ Logout failed:",
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


        if (!user || !user.email) {

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


        const showMessage =
            (
                text,
                success = false
            ) => {

                if (!msg) {
                    return;
                }


                msg.textContent =
                    text;


                msg.className =
                    `pw-change-msg show ${
                        success
                            ? "success"
                            : "error"
                    }`;

            };


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
                "❌ Password change failed:",
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

                    student.subject,

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
                    "\uFEFF" + csv
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


        link.href =
            url;


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


        console.log(
            "✅ Messages exported."
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
                "✅ All messages deleted."
            );


        } catch (error) {

            console.error(
                "❌ Failed to clear messages:",
                error
            );


            alert(
                "Failed to delete messages."
            );

        }

    };


/* =========================================================
   START FIREBASE LISTENER
========================================================= */

console.log(
    "🚀 Starting Plus 2 Guru Firebase..."
);


loadStudents();


console.log(
    "🔥 Firebase initialized."
);

console.log(
    "🔥 Database path: students"
);

console.log(
    "✅ Plus 2 Guru admin system ready."
);