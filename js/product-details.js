import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// --- GET PRODUCT ID FROM URL ---
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');

if (!productId) {
    window.location.href = 'index.html';
}

// --- DOM ELEMENTS ---
const elements = {
    image: document.getElementById('main-product-image'),
    name: document.getElementById('product-name'),
    price: document.getElementById('product-price'),
    unit: document.getElementById('product-unit'),
    moq: document.getElementById('product-moq'),
    sales: document.getElementById('product-sales'),
    description: document.getElementById('product-description'),
    category: document.getElementById('product-category'),
    state: document.getElementById('display-state'),
    unitLabels: document.querySelectorAll('.unit-label')
};

const buyBtns = [document.getElementById('buy-now-btn'), document.getElementById('mobile-buy')];
const negBtns = [document.getElementById('negotiate-btn'), document.getElementById('mobile-negotiate')];

// --- LOAD PRODUCT DATA ---
async function loadProductDetails() {
    try {
        const docRef = doc(db, "products", productId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const product = docSnap.data();

            // Populate UI
            elements.image.src = product.imageUrl || 'https://via.placeholder.com/600x600?text=Amano+Produce';
            elements.name.textContent = product.name;
            elements.price.textContent = product.price.toLocaleString();
            elements.unit.textContent = product.unit;
            elements.moq.textContent = product.moq || '1';
            elements.sales.textContent = product.salesCount || '0';
            elements.description.textContent = product.description || "No description provided by the seller.";
            elements.category.textContent = product.category || "General";

            // State Tag Logic
            const locationStr = product.location || 'Nigeria';
            elements.state.textContent = locationStr.split(',')[0].trim().toUpperCase();

            // Update all unit labels (e.g., "Bags", "Tons")
            elements.unitLabels.forEach(el => el.textContent = product.unit + "s");

            // Setup Buttons with Seller Context
            setupActionButtons(product.sellerId, productId);

        } else {
            alert("Product not found!");
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error("Error fetching product:", error);
    }
}

// --- BUTTON LOGIC & AUTH INTERCEPT ---
function setupActionButtons(sellerId, prodId) {
    const handleAction = (actionType) => {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                if (actionType === 'buy') {
                    window.location.href = `checkout.html?id=${prodId}`;
                } else {
                    // Redirect to messages with context
                    window.location.href = `messages.html?seller=${sellerId}&product=${prodId}`;
                }
            } else {
                // Save intent to session storage so they return here after login
                sessionStorage.setItem('pendingAction', actionType);
                sessionStorage.setItem('pendingProduct', prodId);
                window.location.href = 'auth.html';
            }
        });
    };

    buyBtns.forEach(btn => btn?.addEventListener('click', () => handleAction('buy')));
    negBtns.forEach(btn => btn?.addEventListener('click', () => handleAction('negotiate')));
}

loadProductDetails();