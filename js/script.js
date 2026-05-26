/**
 * PickleHub Client Interface Engine & Dynamic Database Controller
 */

const COURT_HOURLY_PRICE = 400; // PHP Currency Value Rate Definition

// FIX: Use localStorage so Client Page and Admin Page can share data
function loadBookings() {
  const saved = localStorage.getItem('picklehub_bookings');
  if (saved) {
    return JSON.parse(saved);
  }
  return [
    { name: "Juan Dela Cruz", phone: "+639151112222", date: "2026-06-15", start: "08:00", duration: 2, court: "1", cost: 800 },
    { name: "Maria Santos", phone: "+639183334444", date: "2026-06-15", start: "14:00", duration: 1, court: "2", cost: 400 },
    { name: "Carlos Reyes", phone: "+639195556666", date: "2026-06-16", start: "18:00", duration: 3, court: "3", cost: 1200 }
  ];
}
function saveBookings() {
  localStorage.setItem('picklehub_bookings', JSON.stringify(globalBookingRegistry));
}

let globalBookingRegistry = loadBookings();
let pendingFormPackage = null;

document.addEventListener('DOMContentLoaded', () => {
  // Check if navbar exists (meaning we are on client page)
  if (document.getElementById('navbar')) {
    setupNavbarIntersectionObserver();
  }
  
  if (document.getElementById('bookDate')) {
    initCalendarRestraints();
  }

  // Check if dashboard table exists (meaning we are on admin page)
  if (document.getElementById('dashboardTableBody')) {
    syncDashboardViewTable();
  }

  // Mobile Menu Binding
  const hamburger = document.getElementById('hamburger');
  if (hamburger) {
    hamburger.addEventListener('click', () => {
      document.getElementById('mobileMenu').classList.add('open');
    });
    document.getElementById('mobileClose').addEventListener('click', closeMobile);
  }
});

function initCalendarRestraints() {
  const dateInput = document.getElementById('bookDate');
  if (dateInput) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateInput.min = tomorrow.toISOString().split('T')[0];
  }
}

function setupNavbarIntersectionObserver() {
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
    highlightActiveSectionLinks();
  });
}

function highlightActiveSectionLinks() {
  const sections = document.querySelectorAll('section');
  const navItems = document.querySelectorAll('.nav-link-item');
  let currentActiveId = "";

  sections.forEach(sec => {
    const topOffset = sec.offsetTop - 120;
    if (window.scrollY >= topOffset && window.scrollY < topOffset + sec.offsetHeight) {
      currentActiveId = sec.getAttribute('id');
    }
  });

  navItems.forEach(item => {
    item.classList.remove('active-nav-link');
    if (item.getAttribute('href') === `#${currentActiveId}`) {
      item.classList.add('active-nav-link');
    }
  });
}

function closeMobile() {
  document.getElementById('mobileMenu').classList.remove('open');
}

function selectCourt(btn, courtNum) {
  document.querySelectorAll('.court-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('bookCourt').value = courtNum;
  runLiveAvailabilityCheck();
}

function runLiveAvailabilityCheck() {
  const date = document.getElementById('bookDate').value;
  const start = document.getElementById('bookStartTime').value;
  const durationRaw = document.getElementById('bookDuration').value;
  const court = document.getElementById('bookCourt').value;
  
  const banner = document.getElementById('availabilityCheckerBanner');
  const messageEl = document.getElementById('availabilityBannerMessage');
  const priceBox = document.getElementById('priceEstimationBox');

  if (start && durationRaw) {
    const duration = parseInt(durationRaw);
    const totalCost = duration * COURT_HOURLY_PRICE;
    document.getElementById('calcHoursText').textContent = `${duration} ${duration === 1 ? 'Hour' : 'Hours'}`;
    document.getElementById('calcBasePrice').textContent = `₱${totalCost}`;
    document.getElementById('calcTotalAmount').textContent = `₱${totalCost}`;
    priceBox.style.display = 'block';
  } else {
    priceBox.style.display = 'none';
  }

  if (!date || !start || !durationRaw || !court) {
    banner.style.display = 'none';
    return;
  }

  banner.style.display = 'flex';
  banner.className = "checker-banner status-checking";
  messageEl.textContent = "Checking line availability coordinates against live schedule...";

  setTimeout(() => {
    const conflictFound = checkTimeOverlapConflict(date, start, parseInt(durationRaw), court);
    if (conflictFound) {
      banner.className = "checker-banner status-conflict";
      messageEl.textContent = `❌ Time Conflict: Court ${court} is already booked for this time block.`;
    } else {
      banner.className = "checker-banner status-available";
      messageEl.textContent = `✓ Court Available! Court ${court} is clear on this date.`;
    }
  }, 400);
}

function checkTimeOverlapConflict(date, startTimeStr, durationHours, courtNum) {
  const requestedStart = convertTimeToMinutes(startTimeStr);
  const requestedEnd = requestedStart + (durationHours * 60);
  const matchGroup = globalBookingRegistry.filter(b => b.date === date && b.court === courtNum);

  for (let record of matchGroup) {
    const registeredStart = convertTimeToMinutes(record.start);
    const registeredEnd = registeredStart + (record.duration * 60);
    if (requestedStart < registeredEnd && requestedEnd > registeredStart) {
      return true; 
    }
  }
  return false;
}

function convertTimeToMinutes(timeString) {
  const [h, m] = timeString.split(':').map(Number);
  return (h * 60) + m;
}

function submitBookingFormStage() {
  const name = document.getElementById('bookName').value.trim();
  const phone = document.getElementById('bookPhone').value.trim();
  const date = document.getElementById('bookDate').value;
  const start = document.getElementById('bookStartTime').value;
  const duration = document.getElementById('bookDuration').value;
  const court = document.getElementById('bookCourt').value;
  const terms = document.getElementById('bookTerms').checked;

  if (!name) { showToast('Please enter your full name.'); return; }
  if (!phone) { showToast('Please enter your mobile number.'); return; }
  if (!date) { showToast('Please select a reservation date.'); return; }
  if (!start) { showToast('Please select a court start time.'); return; }
  if (!duration) { showToast('Please select a reservation duration.'); return; }
  if (!court) { showToast('Please specify your desired Court track.'); return; }
  
  if (checkTimeOverlapConflict(date, start, parseInt(duration), court)) {
    showToast('🚨 Cannot proceed: The selected slot has a time conflict.');
    return;
  }
  
  if (!terms) { showToast('Please agree to the terms & conditions criteria.'); return; }

  const parsedDuration = parseInt(duration);
  const computedCost = parsedDuration * COURT_HOURLY_PRICE;

  pendingFormPackage = { name, phone, date, start, duration: parsedDuration, court, cost: computedCost };

  document.getElementById('modalSummaryContent').innerHTML = `
    <div class="summary-line"><strong>Primary Booker:</strong> <span>${name}</span></div>
    <div class="summary-line"><strong>Mobile Number:</strong> <span>${phone}</span></div>
    <div class="summary-line"><strong>Target Schedule:</strong> <span>${date}</span></div>
    <div class="summary-line"><strong>Allocated Slot:</strong> <span>${start} (${parsedDuration} ${parsedDuration === 1 ? 'Hr' : 'Hrs'})</span></div>
    <div class="summary-line"><strong>Assigned Court:</strong> <span>Court ${court} (Premium Indoor)</span></div>
    <div class="summary-line highlight-total"><strong>Grand Revenue Total:</strong> <span>₱${computedCost}.00</span></div>
  `;

  document.getElementById('summaryModal').classList.add('modal-open');
}

function closeSummaryModal() {
  document.getElementById('summaryModal').classList.remove('modal-open');
}

function executeFinalBooking() {
  const spinner = document.getElementById('modalSpinner');
  if (spinner) spinner.style.display = 'block';

  setTimeout(() => {
    if (spinner) spinner.style.display = 'none';
    closeSummaryModal();

    globalBookingRegistry.push(pendingFormPackage);
    saveBookings(); // Save to local storage for Admin Dashboard sync

    document.getElementById('successSummaryContent').innerHTML = `
      <strong>Court track:</strong> Court ${pendingFormPackage.court} Premium &nbsp;|&nbsp; 
      <strong>Date:</strong> ${pendingFormPackage.date} &nbsp;|&nbsp; 
      <strong>Time:</strong> ${pendingFormPackage.start} (${pendingFormPackage.duration} hrs)
    `;

    document.getElementById('successModal').classList.add('modal-open');
    resetBookingFormFields();
  }, 1400);
}

function closeSuccessModal() {
  document.getElementById('successModal').classList.remove('modal-open');
}

function resetBookingFormFields() {
  document.getElementById('bookName').value = '';
  document.getElementById('bookPhone').value = '';
  document.getElementById('bookDate').value = '';
  document.getElementById('bookStartTime').value = '';
  document.getElementById('bookDuration').value = '';
  document.getElementById('bookCourt').value = '';
  if (document.getElementById('bookPlayers')) document.getElementById('bookPlayers').value = '';
  document.getElementById('bookTerms').checked = false;
  document.querySelectorAll('.court-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('priceEstimationBox').style.display = 'none';
  document.getElementById('availabilityCheckerBanner').style.display = 'none';
}

/**
 * MISSING ADMIN LOGIC (Added)
 */
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.auth-form-view').forEach(f => f.classList.remove('active'));
  
  if (tab === 'signin') {
      document.getElementById('tabSignIn').classList.add('active');
      document.getElementById('formSignIn').classList.add('active');
  } else {
      document.getElementById('tabRegister').classList.add('active');
      document.getElementById('formRegister').classList.add('active');
  }
}

function handleAdminSignIn() {
  const email = document.getElementById('authSignInEmail').value;
  const pwd = document.getElementById('authSignInPassword').value;
  const spinner = document.getElementById('signInSpinner');
  
  if(!email || !pwd) { showToast('Please enter your credentials.'); return; }
  
  if(spinner) spinner.style.display = 'block';
  setTimeout(() => {
      if(spinner) spinner.style.display = 'none';
      document.getElementById('adminAuthView').style.display = 'none';
      document.getElementById('adminDashboardSection').style.display = 'block';
      syncDashboardViewTable();
  }, 1000);
}

function handleAdminRegister() {
  const email = document.getElementById('authRegEmail').value;
  const name = document.getElementById('authRegName').value;
  const pwd = document.getElementById('authRegPassword').value;
  const spinner = document.getElementById('registerSpinner');
  
  if(!email || !pwd || !name) { showToast('Please fill out all registration fields.'); return; }
  
  if(spinner) spinner.style.display = 'block';
  setTimeout(() => {
      if(spinner) spinner.style.display = 'none';
      showToast('Registration sent to supervisor for validation.');
      switchAuthTab('signin');
  }, 1000);
}

function syncDashboardViewTable() {
  const tbody = document.getElementById('dashboardTableBody');
  if (!tbody) return;

  tbody.innerHTML = "";
  let aggregateGrossRevenueSum = 0;

  // We map the original index BEFORE reversing so we don't delete the wrong item!
  const orderLogs = globalBookingRegistry.map((entry, index) => ({...entry, originalIndex: index})).reverse();

  orderLogs.forEach(entry => {
    aggregateGrossRevenueSum += entry.cost;
    const tableRowElement = document.createElement('tr');
    tableRowElement.innerHTML = `
      <td><strong>${entry.name}</strong></td>
      <td>${entry.phone}</td>
      <td><span class="table-court-badge">Court ${entry.court}</span></td>
      <td>${entry.date}</td>
      <td>${entry.start} (${entry.duration} hrs)</td>
      <td><strong style="color: var(--green-dark);">₱${entry.cost}</strong></td>
      <td>
        <button class="btn-remove" onclick="removeBooking(${entry.originalIndex})" title="Mark Done or Cancel">✕</button>
      </td>
    `;
    tbody.appendChild(tableRowElement);
  });

  document.getElementById('statTotalBookings').textContent = `${globalBookingRegistry.length} Reservations`;
  document.getElementById('statRevenue').textContent = `₱${aggregateGrossRevenueSum.toLocaleString()}`;
}

// NEW FUNCTION: Handles deleting the booking safely
function removeBooking(index) {
  // Adds a popup to prevent accidental clicks
  if (confirm("Are you sure you want to remove this booking?")) {
    globalBookingRegistry.splice(index, 1); // Removes it from the array
    saveBookings(); // Updates Local Storage
    syncDashboardViewTable(); // Refreshes the table
    showToast('✓ Booking removed successfully.');
  }
}

function sendMessage() {
  const name = document.getElementById('cName').value.trim();
  const email = document.getElementById('cEmail').value.trim();
  const message = document.getElementById('cMessage').value.trim();
  if (!name || !email || !message) { showToast('Please fill out all standard fields.'); return; }
  showToast('✓ Message transmitted successfully! Our team will respond shortly.');
  document.getElementById('cName').value = '';
  document.getElementById('cEmail').value = '';
  document.getElementById('cMessage').value = '';
}

function handleNewsletterSubmit() {
  const email = document.getElementById('newsletterEmailInput').value.trim();
  if (!email || !email.includes('@')) { showToast('Please input a valid email address.'); return; }
  showToast('✓ Welcome to the inner circle! Exclusive booking access unlocked.');
  document.getElementById('newsletterEmailInput').value = '';
}

function showToast(msg) {
  const t = document.getElementById('toast');
  if(t) {
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3200);
  }
}

const scrollObserverInstance = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('revealed');
    }
  });
}, { threshold: 0.08 });

document.querySelectorAll('.scroll-reveal, #story, #services, #book, #contact, footer').forEach(el => {
  el.classList.add('scroll-reveal');
  scrollObserverInstance.observe(el);
});