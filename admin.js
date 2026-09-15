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


/* =========================================================
   FIREBASE CONFIG
========================================================= */

const firebaseConfig = {
  apiKey: "AIzaSyBkyOg675arXH3DW3I8yqjW9dHi-lOcHJc",
  authDomain: "plus-2-guru.firebaseapp.com",
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

console.log("🔥 Firebase initialized");
console.log("🔥 Database:", db);
console.log("🔥 Reading path: students");


/* =========================================================
   GLOBAL VARIABLES
========================================================= */

let studentsData = [];

let currentPage = 1;

const messagesPerPage = 10;


/* =========================================================
   DOM ELEMENTS
========================================================= */

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
   CONTACT FORM → FIREBASE
========================================================= */

async function AddStudents(event) {

  if (event) {
    event.preventDefault();
  }

  console.log("📤 Sending data to Firebase...");


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


  /* Validation */

  if (
    !name ||
    !email ||
    !phone ||
    !subject ||
    !message
  ) {

    console.error(
      "❌ Please fill all fields."
    );

    if (notification) {
      notification.innerText =
        "Please fill in all fields.";
    }

    return;
  }


  try {

    /* Create unique Firebase ID */

    const studentRef =
      push(ref(db, "students"));


    /* Save */

    await set(studentRef, {

      name: name,

      email: email,

      phone: phone,

      subject: subject,

      message: message,

      createdAt:
        new Date().toISOString(),

      read: false

    });


    console.log(
      "✅ Data successfully saved!"
    );


    if (notification) {

      notification.innerText =
        "Message sent successfully!";

    }


    /* Clear form */

    const nameInput =
      document.getElementById("name");

    const emailInput =
      document.getElementById("email");

    const phoneInput =
      document.getElementById("phone");

    const subjectInput =
      document.getElementById("subject");

    const messageInput =
      document.getElementById("message");


    if (nameInput)
      nameInput.value = "";

    if (emailInput)
      emailInput.value = "";

    if (phoneInput)
      phoneInput.value = "";

    if (subjectInput)
      subjectInput.value = "";

    if (messageInput)
      messageInput.value = "";


  } catch (error) {

    console.error(
      "❌ Firebase error:",
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
        "Failed to save: " +
        error.message;

    }

  }

}


/* =========================================================
   CONTACT FORM EVENT
========================================================= */

if (submitBtn) {

  submitBtn.addEventListener(
    "click",
    AddStudents
  );

  console.log(
    "✅ Submit button event listener added"
  );

}


/* =========================================================
   LOAD STUDENTS FROM FIREBASE
========================================================= */

function loadStudents() {

  console.log(
    "📥 Starting Firebase read..."
  );


  const studentsRef =
    ref(db, "students");


  onValue(

    studentsRef,

    (snapshot) => {

      console.log(
        "📦 Snapshot received"
      );

      console.log(
        "Exists:",
        snapshot.exists()
      );

      console.log(
        "Data:",
        snapshot.val()
      );


      studentsData = [];


      /* No data */

      if (!snapshot.exists()) {

        console.log(
          "⚠️ No students found"
        );

        renderMessages();

        updateStats();

        return;

      }


      /* Convert Firebase object → array */

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


      /* Newest first */

      studentsData.sort(
        (a, b) => {

          return (
            new Date(b.createdAt || 0) -
            new Date(a.createdAt || 0)
          );

        }
      );


      console.log(
        "✅ Firebase messages:",
        studentsData
      );

      console.log(
        "📊 Total:",
        studentsData.length
      );


      /* IMPORTANT */

      renderMessages();

      updateStats();

    },


    /* Firebase error */

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

              ❌ Failed to load messages.

              <br>

              <small>
                ${escapeHTML(error.message)}
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


  /* Search */

  const search =
    searchInput?.value
      ?.trim()
      .toLowerCase() || "";


  if (search) {

    data =
      data.filter(
        (student) => {

          return (

            String(student.name || "")
              .toLowerCase()
              .includes(search)

            ||

            String(student.email || "")
              .toLowerCase()
              .includes(search)

            ||

            String(student.phone || "")
              .toLowerCase()
              .includes(search)

            ||

            String(student.subject || "")
              .toLowerCase()
              .includes(search)

            ||

            String(student.message || "")
              .toLowerCase()
              .includes(search)

          );

        }
      );

  }


  /* Filter */

  const filter =
    filterSelect?.value || "all";


  if (filter === "unread") {

    data =
      data.filter(
        student =>
          student.read !== true
      );

  }


  if (filter === "read") {

    data =
      data.filter(
        student =>
          student.read === true
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
      "❌ messagesTableBody not found"
    );

    return;

  }


  const filteredMessages =
    getFilteredMessages();


  /* No messages */

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

          <div
            style="
              margin-top:8px;
              color:#718096;
            "
          >
            Messages will appear here
            once students submit the contact form.
          </div>

        </td>

      </tr>

    `;


    if (pagination) {
      pagination.innerHTML = "";
    }


    return;

  }


  /* Total pages */

  const totalPages =
    Math.ceil(
      filteredMessages.length /
      messagesPerPage
    );


  /* Keep current page valid */

  if (currentPage > totalPages) {

    currentPage =
      totalPages;

  }


  if (currentPage < 1) {

    currentPage = 1;

  }


  const start =
    (currentPage - 1) *
    messagesPerPage;


  const end =
    start +
    messagesPerPage;


  const pageMessages =
    filteredMessages.slice(
      start,
      end
    );


  /* Table */

  messagesTableBody.innerHTML =
    pageMessages.map(
      (student) => {

        const name =
          escapeHTML(
            student.name ||
            "Unknown"
          );


        const email =
          escapeHTML(
            student.email ||
            ""
          );


        const subject =
          escapeHTML(
            student.subject ||
            "-"
          );


        const fullMessage =
          escapeHTML(
            student.message ||
            "-"
          );


        const preview =
          fullMessage.length > 80
            ? fullMessage.substring(
                0,
                80
              ) + "..."
            : fullMessage;


        const date =
          formatDate(
            student.createdAt
          );


        /* New badge */

        const newBadge =
          student.read !== true
            ? `
              <span
                style="
                  display:inline-block;
                  margin-left:6px;
                  padding:3px 8px;
                  border-radius:20px;
                  background:#ff7a00;
                  color:white;
                  font-size:11px;
                  font-weight:700;
                "
              >
                NEW
              </span>
            `
            : "";


        return `

          <tr
            class="${
              student.read
                ? ""
                : "unread"
            }"
          >

            <!-- NAME -->

            <td>

              <strong>
                ${name}
              </strong>

              ${newBadge}

              <div
                style="
                  font-size:12px;
                  color:#2563eb;
                  margin-top:4px;
                "
              >

                ${email}

              </div>

            </td>


            <!-- SUBJECT -->

            <td>

              ${subject}

            </td>


            <!-- MESSAGE -->

            <td>

              <div
                class="message-preview"
                title="${fullMessage}"
              >

                ${preview}

              </div>

            </td>


            <!-- DATE -->

            <td>

              ${date}

            </td>


            <!-- ACTIONS -->

            <td>

              <div
                class="message-actions"
                style="
                  display:flex;
                  gap:8px;
                "
              >

                <!-- VIEW -->

                <button
                  class="action-btn view"
                  onclick="viewMessage('${student.id}')"
                  title="View Message"
                  type="button"
                >

                  <i
                    class="fas fa-eye"
                  ></i>

                </button>


                <!-- READ / UNREAD -->

                <button
                  class="action-btn mark"
                  onclick="toggleRead('${student.id}')"
                  title="${
                    student.read
                      ? "Mark unread"
                      : "Mark as read"
                  }"
                  type="button"
                >

                  <i
                    class="fas ${
                      student.read
                        ? "fa-envelope"
                        : "fa-envelope-open"
                    }"
                  ></i>

                </button>


                <!-- DELETE -->

                <button
                  class="action-btn delete"
                  onclick="deleteMessage('${student.id}')"
                  title="Delete Message"
                  type="button"
                >

                  <i
                    class="fas fa-trash"
                  ></i>

                </button>

              </div>

            </td>

          </tr>

        `;

      }
    ).join("");


  /* Pagination */

  updatePagination(
    filteredMessages.length,
    totalPages
  );


  console.log(
    "✅ Table rendered:",
    pageMessages.length,
    "of",
    filteredMessages.length
  );

}


/* =========================================================
   VIEW MESSAGE
========================================================= */

window.viewMessage =
  async function(id) {

    const student =
      studentsData.find(
        item =>
          item.id === id
      );


    if (!student) {

      console.error(
        "❌ Message not found:",
        id
      );

      return;

    }


    /* Name */

    const detailName =
      document.getElementById(
        "detailName"
      );


    if (detailName) {

      detailName.innerText =
        student.name ||
        "Unknown";

    }


    /* Meta */

    const detailMeta =
      document.getElementById(
        "detailMeta"
      );


    if (detailMeta) {

      detailMeta.innerText =
        `${
          student.email ||
          "No email"
        } • ${
          formatDate(
            student.createdAt
          )
        }`;

    }


    /* Email */

    const detailEmail =
      document.getElementById(
        "detailEmail"
      );


    if (detailEmail) {

      detailEmail.innerText =
        student.email ||
        "-";

    }


    /* Phone */

    const detailPhone =
      document.getElementById(
        "detailPhone"
      );


    if (detailPhone) {

      detailPhone.innerText =
        student.phone ||
        "-";

    }


    /* Subject */

    const detailSubject =
      document.getElementById(
        "detailSubject"
      );


    if (detailSubject) {

      detailSubject.innerText =
        student.subject ||
        "-";

    }


    /* Message */

    const detailMessage =
      document.getElementById(
        "detailMessage"
      );


    if (detailMessage) {

      detailMessage.innerText =
        student.message ||
        "-";

    }


    /* Reply */

    const replyLink =
      document.getElementById(
        "detailReplyLink"
      );


    if (replyLink) {

      if (student.email) {

        replyLink.href =
          `mailto:${encodeURIComponent(
            student.email
          )}?subject=${encodeURIComponent(
            "Re: " +
            (
              student.subject ||
              "Your Message"
            )
          )}`;

      } else {

        replyLink.href = "#";

      }

    }


    /* Open modal */

    const overlay =
      document.getElementById(
        "msgDetailOverlay"
      );


    if (overlay) {

      overlay.classList.add(
        "active"
      );

    }


    /* Automatically mark as read */

    if (!student.read) {

      try {

        await update(
          ref(
            db,
            `students/${id}`
          ),
          {
            read: true
          }
        );


        console.log(
          "✅ Message marked as read"
        );


      } catch (error) {

        console.error(
          "❌ Failed to mark as read:",
          error
        );

      }

    }

  };


/* =========================================================
   CLOSE MESSAGE MODAL
========================================================= */

window.closeMsgDetail =
  function() {

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


window.closeMessageDetail =
  window.closeMsgDetail;


/* =========================================================
   DELETE ONE MESSAGE
========================================================= */

window.deleteMessage =
  async function(id) {

    if (!id) {

      console.error(
        "❌ No Firebase ID supplied"
      );

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

      console.log(
        "🗑️ Deleting Firebase message:",
        id
      );


      await remove(
        ref(
          db,
          `students/${id}`
        )
      );


      console.log(
        "✅ Message deleted successfully:",
        id
      );


      /*
        onValue() automatically runs again,
        so table and statistics update automatically.
      */


    } catch (error) {

      console.error(
        "❌ Delete failed:",
        error
      );


      alert(
        "Failed to delete message:\n\n" +
        error.message
      );

    }

  };


/* =========================================================
   MARK READ / UNREAD
========================================================= */

window.toggleRead =
  async function(id) {

    const student =
      studentsData.find(
        item =>
          item.id === id
      );


    if (!student) {

      console.error(
        "❌ Student not found:",
        id
      );

      return;

    }


    try {

      await update(
        ref(
          db,
          `students/${id}`
        ),
        {
          read:
            !student.read
        }
      );


      console.log(
        "✅ Read status updated"
      );


    } catch (error) {

      console.error(
        "❌ Read status update failed:",
        error
      );


      alert(
        "Failed to update read status:\n\n" +
        error.message
      );

    }

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
        `Are you sure you want to delete ALL ${studentsData.length} messages?\n\nThis cannot be undone.`
      );


    if (!confirmed) {
      return;
    }


    try {

      console.log(
        "🗑️ Deleting all Firebase messages..."
      );


      await remove(
        ref(
          db,
          "students"
        )
      );


      console.log(
        "✅ All messages deleted"
      );


    } catch (error) {

      console.error(
        "❌ Clear all failed:",
        error
      );


      alert(
        "Failed to delete all messages:\n\n" +
        error.message
      );

    }

  };


/* =========================================================
   DATE FORMAT
========================================================= */

function formatDate(dateString) {

  if (!dateString) {
    return "-";
  }


  const date =
    new Date(dateString);


  if (
    isNaN(
      date.getTime()
    )
  ) {

    return "-";

  }


  return date.toLocaleString(
    "en-NP",
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
   HTML ESCAPE
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


  const firstItem =
    ((currentPage - 1) *
      messagesPerPage) + 1;


  const lastItem =
    Math.min(
      currentPage *
        messagesPerPage,
      totalItems
    );


  let html = `

    <span>
      Showing
      ${firstItem}–${lastItem}
      of ${totalItems}
    </span>

  `;


  if (totalPages > 1) {

    html += `

      <div
        style="
          display:flex;
          gap:8px;
          align-items:center;
          margin-left:15px;
        "
      >

        <button
          type="button"
          onclick="changePage(${currentPage - 1})"
          ${
            currentPage === 1
              ? "disabled"
              : ""
          }
        >
          ‹
        </button>


        <span>
          Page ${currentPage}
          of ${totalPages}
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

    if (page < 1) {
      return;
    }


    const filteredMessages =
      getFilteredMessages();


    const totalPages =
      Math.max(
        1,
        Math.ceil(
          filteredMessages.length /
          messagesPerPage
        )
      );


    if (page > totalPages) {
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
   DASHBOARD STATISTICS
========================================================= */

function updateStats() {

  const total =
    studentsData.length;


  const unread =
    studentsData.filter(
      student =>
        student.read !== true
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
            String(
              student.subject || ""
            )
            .trim()
            .toLowerCase()
        )
        .filter(Boolean)

    ).size;


  console.log(
    "📊 Firebase Stats:",
    {
      total,
      today: todayCount,
      unread,
      categories
    }
  );


  /*
  =========================================================
  METHOD 1
  If your cards have IDs
  =========================================================
  */

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


  /*
  =========================================================
  METHOD 2
  Your existing .stat-card design
  =========================================================

  This is the important fix for your screenshot.
  */

  const statCards =
    document.querySelectorAll(
      ".stat-card"
    );


  if (statCards.length >= 4) {


    /* TOTAL */

    const totalNumber =
      statCards[0].querySelector(
        ".stat-number, .number, h1, h2, h3, .value"
      );


    if (
      totalNumber &&
      !totalElement
    ) {

      totalNumber.innerText =
        total;

    }


    /* TODAY */

    const todayNumber =
      statCards[1].querySelector(
        ".stat-number, .number, h1, h2, h3, .value"
      );


    if (
      todayNumber &&
      !todayElement
    ) {

      todayNumber.innerText =
        todayCount;

    }


    /* UNREAD */

    const unreadNumber =
      statCards[2].querySelector(
        ".stat-number, .number, h1, h2, h3, .value"
      );


    if (
      unreadNumber &&
      !unreadElement
    ) {

      unreadNumber.innerText =
        unread;

    }


    /* CATEGORIES */

    const categoryNumber =
      statCards[3].querySelector(
        ".stat-number, .number, h1, h2, h3, .value"
      );


    if (
      categoryNumber &&
      !categoryElement
    ) {

      categoryNumber.innerText =
        categories;

    }

  }

}


/* =========================================================
   START
========================================================= */

console.log(
  "🚀 Starting Firebase student loader..."
);


loadStudents();