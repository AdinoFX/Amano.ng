import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { 
    collection, query, where, onSnapshot, doc, deleteDoc, updateDoc, getDoc 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// --- DOM ELEMENTS ---
const tableBody = document.getElementById('inventory-table-body');
const emptyState = document.getElementById('inventory-empty-state');
const logoutBtn = document.getElementById('logout-btn');

// Edit Modal Elements
const editModal = document.getElementById('edit-modal');
const editForm = document.getElementById('edit-product-form');
const editAlert = document.getElementById('edit-alert');

// --- AUTH CHECK ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        loadInventory(user.uid);
    } else {
        window.location.href = "auth.html";
    }
});

// --- LOAD INVENTORY (REAL-TIME) ---
function loadInventory(sellerId) {
    const q = query(collection(db, "products"), where("sellerId", "==", sellerId));

    onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            tableBody.innerHTML = "";
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        tableBody.innerHTML = "";

        snapshot.forEach((docSnap) => {
            const product = docSnap.data();
            const productId = docSnap.id;

            const row = document.createElement('tr');
            row.className = "hover:bg-orange-50/30 transition fade-in";
            row.innerHTML = `
                <td class="px-6 py-4">
                    <div class="flex items-center space-x-3">
                        <img src="${product.imageUrl}" class="w-12 h-12 rounded-lg object-cover shadow-sm border border-gray-100">
                        <span class="font-bold text-primary">${product.name}</span>
                    </div>
                </td>
                <td class="px-6 py-4 text-sm text-gray-500">${product.category}</td>
                <td class="px-6 py-4">
                    <div class="text-sm font-black text-secondary">₦${product.price.toLocaleString()}</div>
                    <div class="text-[10px] text-gray-400">${product.unit}</div>
                </td>
                <td class="px-6 py-4">
                    <span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase ${product.status === 'available' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                        ${product.status || 'available'}
                    </span>
                </td>
                <td class="px-6 py-4 text-center">
                    <div class="flex justify-center space-x-2">
                        <button onclick="openEditModal('${productId}')" class="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteProduct('${productId}')" class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition" title="Delete">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });
    });
}

// --- EDIT FUNCTIONALITY ---

// 1. Open Modal & Fill Data
window.openEditModal = async (id) => {
    try {
        const docRef = doc(db, "products", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            // Fill the hidden ID field and visible inputs
            document.getElementById('edit-id').value = id;
            document.getElementById('edit-name').value = data.name;
            document.getElementById('edit-price').value = data.price;
            document.getElementById('edit-status').value = data.status || "available";
            
            // Show modal
            editModal.classList.remove('hidden');
        }
    } catch (error) {
        console.error("Error fetching product:", error);
        alert("Could not load product details.");
    }
};

// 2. Close Modal
window.closeEditModal = () => {
    editModal.classList.add('hidden');
    editAlert.classList.add('hidden');
    editForm.reset();
};

// 3. Handle Form Update
editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('edit-id').value;
    const updateBtn = document.getElementById('update-btn');

    // UI Loading State
    updateBtn.disabled = true;
    updateBtn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> Updating...`;

    try {
        const docRef = doc(db, "products", id);
        await updateDoc(docRef, {
            name: document.getElementById('edit-name').value,
            price: Number(document.getElementById('edit-price').value),
            status: document.getElementById('edit-status').value
        });

        // Show Success Alert
        editAlert.innerText = "Listing updated successfully!";
        editAlert.className = "mx-6 mt-4 p-4 rounded-xl text-sm font-medium bg-green-100 text-green-700 block";
        
        // Close modal after brief delay
        setTimeout(() => {
            closeEditModal();
        }, 1500);

    } catch (error) {
        console.error("Update Error:", error);
        editAlert.innerText = "Error: " + error.message;
        editAlert.className = "mx-6 mt-4 p-4 rounded-xl text-sm font-medium bg-red-100 text-red-700 block";
    } finally {
        updateBtn.disabled = false;
        updateBtn.innerText = "Update Listing";
    }
});

// --- DELETE FUNCTIONALITY ---
window.deleteProduct = async (id) => {
    if (confirm("Are you sure you want to delete this listing? This cannot be undone.")) {
        try {
            await deleteDoc(doc(db, "products", id));
        } catch (error) {
            console.error("Error deleting product:", error);
            alert("Failed to delete product.");
        }
    }
};

// --- LOGOUT ---
logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => {
        window.location.href = "auth.html";
    });
});