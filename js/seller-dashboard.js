import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { 
    collection, addDoc, doc, getDoc, query, where, onSnapshot, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// Cloudinary Configuration
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dr64ch3ez/image/upload";
const CLOUDINARY_UPLOAD_PRESET = "amanoNG";

// --- DOM ELEMENTS ---
const businessNameDisplay = document.getElementById('business-name-display');
const userInitial = document.getElementById('user-initial');
const verifyBanner = document.getElementById('verify-banner');
const logoutBtn = document.getElementById('logout-btn');

const addProductForm = document.getElementById('add-product-form');
const imageInput = document.getElementById('product-image');
const imagePreview = document.getElementById('image-preview');
const placeholder = document.getElementById('upload-placeholder');
const dropzone = document.getElementById('image-dropzone');

// New UI Elements
const productAlert = document.getElementById('product-alert');
const emptyState = document.getElementById('empty-state');
const productsContainer = document.getElementById('products-container');
const listingCount = document.getElementById('listing-count');

// --- AUTH & PROFILE LOADING ---
let currentSellerData = null;

onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                currentSellerData = userSnap.data();

                if (currentSellerData.role !== 'seller') {
                    window.location.href = "index.html";
                    return;
                }

                businessNameDisplay.innerText = currentSellerData.businessName || currentSellerData.name;
                userInitial.innerText = (currentSellerData.businessName || currentSellerData.name).charAt(0).toUpperCase();

                if (!currentSellerData.verified) {
                    verifyBanner.classList.remove('hidden');
                }

                // Load the seller's products after profile is ready
                loadSellerProducts(user.uid);
            }
        } catch (error) {
            console.error("Error loading profile:", error);
        }
    } else {
        window.location.href = "auth.html";
    }
});

// --- FETCH & DISPLAY PRODUCTS ---
function loadSellerProducts(sellerId) {
    const q = query(collection(db, "products"), where("sellerId", "==", sellerId));

    // real-time listener
    onSnapshot(q, (snapshot) => {
        listingCount.innerText = snapshot.size;

        if (snapshot.empty) {
            emptyState.classList.remove('hidden');
            productsContainer.classList.add('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        productsContainer.classList.remove('hidden');
        productsContainer.innerHTML = ""; // Clear existing

        snapshot.forEach((doc) => {
            const product = doc.data();
            const card = `
                <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden fade-in">
                    <img src="${product.imageUrl}" class="w-full h-40 object-cover">
                    <div class="p-4">
                        <div class="flex justify-between items-start">
                            <h3 class="font-bold text-primary">${product.name}</h3>
                            <span class="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold uppercase">${product.status}</span>
                        </div>
                        <p class="text-xs text-gray-500 mt-1">${product.category}</p>
                        <div class="mt-4 flex justify-between items-center">
                            <div>
                                <span class="text-lg font-black text-secondary">₦${product.price.toLocaleString()}</span>
                                <span class="text-[10px] text-gray-400">/${product.unit}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            productsContainer.innerHTML += card;
        });
    });
}

// --- DOM ALERT HELPER ---
function showAlert(message, type = 'success') {
    productAlert.innerText = message;
    productAlert.classList.remove('hidden', 'bg-red-100', 'text-red-700', 'bg-green-100', 'text-green-700');
    
    if (type === 'error') {
        productAlert.classList.add('bg-red-100', 'text-red-700');
    } else {
        productAlert.classList.add('bg-green-100', 'text-green-700');
    }

    // Auto-hide after 4 seconds
    setTimeout(() => {
        productAlert.classList.add('hidden');
    }, 4000);
}

// --- MODAL TOGGLE ---
window.toggleModal = () => {
    const modal = document.getElementById('product-modal');
    modal.classList.toggle('hidden');
    if (modal.classList.contains('hidden')) {
        addProductForm.reset();
        imagePreview.classList.add('hidden');
        placeholder.classList.remove('hidden');
        productAlert.classList.add('hidden');
    }
};

// --- IMAGE PREVIEW LOGIC ---
dropzone.addEventListener('click', (e) => {
    if (e.target !== imageInput) imageInput.click();
});

imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        if (file.size > 5 * 1024 * 1024) {
            showAlert("File is too large (Max 5MB)", "error");
            imageInput.value = "";
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            imagePreview.classList.remove('hidden');
            placeholder.classList.add('hidden');
        };
        reader.readAsDataURL(file);
    }
});

// --- FORM SUBMISSION ---
addProductForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!auth.currentUser) return;

    const submitBtn = document.getElementById('submit-btn');
    const file = imageInput.files[0];

    if (!file) {
        showAlert("Please upload a photo of the produce.", "error");
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> Listing...`;

    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

        const response = await fetch(CLOUDINARY_URL, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error("Cloudinary upload failed");

        const cloudinaryData = await response.json();
        const secureUrl = cloudinaryData.secure_url;

        await addDoc(collection(db, "products"), {
            sellerId: auth.currentUser.uid,
            businessName: currentSellerData?.businessName || "Unknown Seller",
            sellerState: currentSellerData?.state || "N/A",
            name: addProductForm.pName.value,
            category: addProductForm.pCategory.value,
            price: Number(addProductForm.pPrice.value),
            unit: addProductForm.pUnit.value,
            description: addProductForm.pDesc.value,
            imageUrl: secureUrl,
            status: "available",
            createdAt: serverTimestamp()
        });

        showAlert("Produce listed successfully!");
        
        // Wait a moment for the user to see the alert before closing modal
        setTimeout(() => {
            toggleModal();
        }, 1500);

    } catch (error) {
        console.error("Upload Error:", error);
        showAlert("Error: " + error.message, "error");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "List Product Now";
    }
});

// --- LOGOUT ---
logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => {
        window.location.href = "auth.html";
    });
});