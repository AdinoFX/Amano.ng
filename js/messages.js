import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { 
    collection, query, where, onSnapshot, addDoc, serverTimestamp, orderBy, doc, updateDoc, getDoc 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// --- DOM ELEMENTS ---
const inquiryList = document.getElementById('inquiry-list');
const chatWindow = document.getElementById('chat-window');
const chatPlaceholder = document.getElementById('chat-placeholder');
const chatMessages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const sidebarDot = document.getElementById('sidebar-dot');
const logoutBtn = document.getElementById('logout-btn');

// Invoice Modal Elements
const invoiceModal = document.getElementById('invoice-modal');
const invoiceForm = document.getElementById('invoice-form');

let activeInquiryId = null;
let currentBuyerName = "";
let currentProductName = "";

// --- AUTH CHECK ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        loadInquiries(user.uid);
    } else {
        window.location.href = "auth.html";
    }
});

// --- LOAD INQUIRY LIST & NOTIFICATION DOT ---
function loadInquiries(sellerId) {
    const q = query(collection(db, "inquiries"), where("sellerId", "==", sellerId), orderBy("lastUpdated", "desc"));

    onSnapshot(q, (snapshot) => {
        inquiryList.innerHTML = "";
        let hasUnread = false;

        if (snapshot.empty) {
            inquiryList.innerHTML = `<div class="p-8 text-center text-gray-400 text-xs italic">No inquiries found.</div>`;
            sidebarDot.style.display = "none";
            return;
        }

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const id = docSnap.id;
            
            // Check if any message is unread by seller
            if (data.readBySeller === false) hasUnread = true;

            const item = document.createElement('div');
            item.className = `p-4 border-b cursor-pointer transition hover:bg-orange-50 relative ${activeInquiryId === id ? 'bg-orange-50 border-r-4 border-orange-500' : ''}`;
            
            item.innerHTML = `
                <div onclick="selectInquiry('${id}', '${data.buyerName}', '${data.productName}')">
                    <div class="flex justify-between items-start mb-1">
                        <span class="font-bold text-sm ${data.readBySeller === false ? 'text-black' : 'text-gray-600'}">${data.buyerName}</span>
                        ${data.readBySeller === false ? '<span class="w-2 h-2 bg-orange-500 rounded-full"></span>' : ''}
                    </div>
                    <p class="text-xs ${data.readBySeller === false ? 'font-bold text-gray-800' : 'text-gray-500'} truncate">${data.lastMessage}</p>
                    <span class="inline-block mt-2 text-[9px] bg-gray-100 px-2 py-0.5 rounded font-black text-gray-400 uppercase tracking-tighter">${data.productName}</span>
                </div>
            `;
            inquiryList.appendChild(item);
        });

        // Toggle Sidebar Red Dot
        sidebarDot.style.display = hasUnread ? "block" : "none";
    });
}

// --- SELECT INQUIRY & MARK AS READ ---
window.selectInquiry = async (id, buyerName, productName) => {
    activeInquiryId = id;
    currentBuyerName = buyerName;
    currentProductName = productName;

    chatPlaceholder.classList.add('hidden');
    chatWindow.classList.remove('hidden');
    document.getElementById('chat-buyer-name').innerText = buyerName;
    document.getElementById('chat-product-ref').innerText = `Ref: ${productName}`;
    
    // Mark as read in Firestore
    await updateDoc(doc(db, "inquiries", id), { readBySeller: true });
    
    loadMessages(id);
};

// --- LOAD CHAT MESSAGES ---
function loadMessages(inquiryId) {
    const q = query(collection(db, `inquiries/${inquiryId}/messages`), orderBy("timestamp", "asc"));
    
    onSnapshot(q, (snapshot) => {
        chatMessages.innerHTML = "";
        snapshot.forEach((docSnap) => {
            const msg = docSnap.data();
            const isSeller = msg.senderId === auth.currentUser.uid;
            
            const msgDiv = document.createElement('div');
            msgDiv.className = `flex ${isSeller ? 'justify-end' : 'justify-start'}`;
            
            // Special rendering if message is an Invoice
            if (msg.type === "invoice") {
                msgDiv.innerHTML = `
                    <div class="max-w-[80%] bg-primary text-white p-4 rounded-2xl shadow-xl border-t-4 border-secondary">
                        <p class="text-[10px] font-black uppercase tracking-widest text-secondary mb-2">Official Trade Invoice</p>
                        <h4 class="font-bold text-lg">₦${msg.price.toLocaleString()}</h4>
                        <p class="text-xs opacity-80 mb-3">${msg.qty} of ${currentProductName}</p>
                        <div class="bg-white/10 p-2 rounded text-[10px] italic">Awaiting buyer payment...</div>
                    </div>
                `;
            } else {
                msgDiv.innerHTML = `
                    <div class="max-w-[80%] px-4 py-3 rounded-2xl text-sm ${isSeller ? 'bg-secondary text-white rounded-tr-none' : 'bg-white border rounded-tl-none shadow-sm'}">
                        ${msg.text}
                    </div>
                `;
            }
            chatMessages.appendChild(msgDiv);
        });
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
}

// --- SEND TEXT MESSAGE ---
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!activeInquiryId || !chatInput.value.trim()) return;

    const text = chatInput.value;
    chatInput.value = "";

    try {
        await addDoc(collection(db, `inquiries/${activeInquiryId}/messages`), {
            text: text,
            senderId: auth.currentUser.uid,
            timestamp: serverTimestamp(),
            type: "text"
        });

        await updateDoc(doc(db, "inquiries", activeInquiryId), {
            lastMessage: text,
            lastUpdated: serverTimestamp()
        });
    } catch (err) {
        console.error("Error:", err);
    }
});

// --- INVOICE MODAL LOGIC ---
window.openInvoiceModal = () => invoiceModal.classList.remove('hidden');
window.closeInvoiceModal = () => {
    invoiceModal.classList.add('hidden');
    invoiceForm.reset();
};

invoiceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const price = Number(document.getElementById('invoice-price').value);
    const qty = document.getElementById('invoice-qty').value;

    try {
        // 1. Send Invoice as a special message type
        await addDoc(collection(db, `inquiries/${activeInquiryId}/messages`), {
            type: "invoice",
            price: price,
            qty: qty,
            senderId: auth.currentUser.uid,
            timestamp: serverTimestamp()
        });

        // 2. Update list summary
        await updateDoc(doc(db, "inquiries", activeInquiryId), {
            lastMessage: `📜 Invoice Sent: ₦${price.toLocaleString()}`,
            lastUpdated: serverTimestamp()
        });

        closeInvoiceModal();
    } catch (err) {
        console.error("Invoice Error:", err);
        alert("Failed to send invoice.");
    }
});

// --- LOGOUT ---
logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => window.location.href = "auth.html");
});