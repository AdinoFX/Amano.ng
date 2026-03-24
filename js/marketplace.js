import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { 
    collection, query, onSnapshot, orderBy 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// --- DOM ELEMENTS ---
const productGrid = document.getElementById('marketplace-grid');
const authLinksDesktop = document.getElementById('auth-links-desktop');
// Selection for the mobile Account link in the bottom nav
const mobileAccountLink = document.querySelector('nav.md\\:hidden a[href="auth.html"]');

const globalSearchDesktop = document.getElementById('global-search-desktop');
const globalSearchMobile = document.getElementById('global-search-mobile');
const categoryFilter = document.getElementById('category-filter');

let allProducts = []; 

// --- AUTH UI ADAPTATION ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Update Desktop View
        if (authLinksDesktop) {
            authLinksDesktop.innerHTML = `
                <a href="seller-dashboard.html" class="flex items-center text-primary font-bold group">
                    <span class="mr-2 group-hover:text-secondary transition-colors">Dashboard</span>
                    <i class="fas fa-th-large text-lg"></i>
                </a>
            `;
        }
        // Update Mobile Bottom Nav "Account" -> "Dashboard"
        if (mobileAccountLink) {
            mobileAccountLink.href = "seller-dashboard.html";
            mobileAccountLink.innerHTML = `
                <i class="fas fa-th-large text-lg mb-1 text-secondary"></i>
                <span class="text-[9px] font-bold uppercase text-secondary">Admin</span>
            `;
        }
    }
});

// --- RENDER PRODUCTS ---
function renderProducts(products) {
    productGrid.innerHTML = "";

    if (products.length === 0) {
        productGrid.innerHTML = `
            <div class="col-span-full py-20 text-center opacity-50">
                <i class="fas fa-box-open text-5xl mb-4"></i>
                <p class="font-bold uppercase tracking-widest text-xs">No produce found in this category</p>
            </div>
        `;
        return;
    }

    products.forEach((product) => {
        const card = document.createElement('div');
        card.className = "bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 product-card cursor-pointer flex flex-col h-full";
        card.onclick = () => location.href = `product-details.html?id=${product.id}`;

        const locationStr = product.location || 'Nigeria';
        const stateName = locationStr.split(',')[0].trim().toUpperCase();

        card.innerHTML = `
            <div class="relative h-32 md:h-52 overflow-hidden">
                <img src="${product.imageUrl || 'https://via.placeholder.com/400x300?text=Produce'}" 
                     class="w-full h-full object-cover" loading="lazy">
                
                <div class="absolute top-2 left-2 md:top-4 md:left-4 bg-white/95 backdrop-blur-sm px-2 py-1 md:px-3 md:py-1.5 rounded-lg text-[8px] md:text-[10px] font-black uppercase text-primary shadow-sm flex items-center">
                    <i class="fas fa-map-marker-alt text-secondary mr-1 md:mr-1.5"></i> ${stateName}
                </div>
            </div>

            <div class="p-3 md:p-5 flex-1 flex flex-col">
                <div class="mb-auto">
                    <h3 class="font-extrabold text-primary truncate mb-1 uppercase text-[11px] md:text-sm tracking-tight">
                        ${product.name}
                    </h3>
                    <div class="flex items-baseline space-x-1 mb-2 md:mb-4">
                        <span class="text-sm md:text-xl font-black text-primary">₦${product.price.toLocaleString()}</span>
                        <span class="text-[8px] md:text-[11px] text-gray-400 uppercase font-bold">/ ${product.unit}</span>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-2 pt-3 border-t border-gray-50 mt-auto">
                    <div>
                        <p class="text-[7px] md:text-[9px] text-gray-400 font-bold uppercase tracking-tighter">MOQ</p>
                        <p class="text-[9px] md:text-xs font-black text-gray-700 uppercase leading-none">
                            ${product.moq || '1'} ${product.unit}
                        </p>
                    </div>
                    <div class="text-right border-l border-gray-50 pl-1">
                        <p class="text-[7px] md:text-[9px] text-gray-400 font-bold uppercase tracking-tighter">Sold</p>
                        <p class="text-[9px] md:text-xs font-black text-green-600 uppercase leading-none">
                            ${product.salesCount || '0'}
                        </p>
                    </div>
                </div>
            </div>
        `;
        productGrid.appendChild(card);
    });
}

function initMarketplace() {
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));

    onSnapshot(q, (snapshot) => {
        allProducts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        filterAndSearch();
    });
}

function filterAndSearch() {
    const desktopSearch = globalSearchDesktop ? globalSearchDesktop.value : "";
    const mobileSearch = globalSearchMobile ? globalSearchMobile.value : "";
    const searchTerm = (desktopSearch || mobileSearch).toLowerCase().trim();
    
    const selectedCategory = categoryFilter.value.toLowerCase();

    const filtered = allProducts.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm) || 
                              (product.location && product.location.toLowerCase().includes(searchTerm));
        
        const matchesCategory = selectedCategory === 'all' || 
                                (product.category && product.category.toLowerCase() === selectedCategory);

        return matchesSearch && matchesCategory;
    });

    renderProducts(filtered);
}

if (globalSearchDesktop) globalSearchDesktop.addEventListener('input', filterAndSearch);
if (globalSearchMobile) globalSearchMobile.addEventListener('input', filterAndSearch);
categoryFilter.addEventListener('change', filterAndSearch);

document.querySelectorAll('.md\\:hidden button').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.md\\:hidden button').forEach(b => {
            b.classList.replace('bg-primary', 'bg-gray-100');
            b.classList.replace('text-white', 'text-gray-600');
        });
        btn.classList.replace('bg-gray-100', 'bg-primary');
        btn.classList.replace('text-gray-600', 'text-white');
        
        const cat = btn.textContent.toLowerCase();
        categoryFilter.value = cat === 'all' ? 'all' : cat;
        filterAndSearch();
    });
});

initMarketplace();