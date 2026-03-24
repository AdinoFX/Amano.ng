import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const ordersBody = document.getElementById('orders-table-body');
const emptyState = document.getElementById('orders-empty');
const pendingDisplay = document.getElementById('escrow-pending');
const availableDisplay = document.getElementById('escrow-available');
const logoutBtn = document.getElementById('logout-btn');

onAuthStateChanged(auth, (user) => {
    if (user) {
        loadOrders(user.uid);
    } else {
        window.location.href = "auth.html";
    }
});

function loadOrders(sellerId) {
    // Query orders where the current user is the seller
    const q = query(collection(db, "orders"), where("sellerId", "==", sellerId));

    onSnapshot(q, (snapshot) => {
        let totalPending = 0;
        let totalAvailable = 0;

        if (snapshot.empty) {
            ordersBody.innerHTML = "";
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        ordersBody.innerHTML = "";

        snapshot.forEach((doc) => {
            const order = doc.data();
            
            // Calculate funds based on escrow status
            if (order.escrowStatus === 'pending') {
                totalPending += order.totalAmount;
            } else if (order.escrowStatus === 'released') {
                totalAvailable += order.totalAmount;
            }

            const row = `
                <tr class="hover:bg-gray-50 transition">
                    <td class="px-6 py-4 text-xs font-mono text-gray-400">#${doc.id.slice(0, 8)}</td>
                    <td class="px-6 py-4">
                        <p class="font-bold text-primary">${order.productName}</p>
                        <p class="text-[10px] text-gray-400 italic">Buyer: ${order.buyerName || 'Verified Buyer'}</p>
                    </td>
                    <td class="px-6 py-4 font-black text-secondary">₦${order.totalAmount.toLocaleString()}</td>
                    <td class="px-6 py-4">
                        <span class="px-3 py-1 rounded-full text-[9px] font-black uppercase ${getStatusClass(order.escrowStatus)}">
                            ${order.escrowStatus}
                        </span>
                    </td>
                    <td class="px-6 py-4 text-center">
                        <button class="text-primary hover:text-secondary transition">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
            ordersBody.innerHTML += row;
        });

        // Update Dashboard Cards
        pendingDisplay.innerText = `₦${totalPending.toLocaleString()}`;
        availableDisplay.innerText = `₦${totalAvailable.toLocaleString()}`;
    });
}

function getStatusClass(status) {
    switch (status) {
        case 'pending': return 'bg-orange-100 text-orange-600';
        case 'released': return 'bg-green-100 text-green-600';
        case 'disputed': return 'bg-red-100 text-red-600';
        default: return 'bg-gray-100 text-gray-600';
    }
}

logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => window.location.href = "auth.html");
});