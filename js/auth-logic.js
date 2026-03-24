import { auth, db } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const authAlert = document.getElementById('auth-alert');

/**
 * Updates the #auth-alert div in the DOM
 */
function displayAlert(message, type) {
    authAlert.innerText = message;
    authAlert.classList.remove('hidden');

    if (type === 'success') {
        authAlert.className = "mb-6 p-4 rounded-lg text-sm font-medium fade-in bg-green-100 text-green-700 border border-green-200";
    } else {
        authAlert.className = "mb-6 p-4 rounded-lg text-sm font-medium fade-in bg-red-100 text-red-700 border border-red-200";
    }
}

// --- SIGN UP LOGIC ---
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = signupForm.email.value;
    const password = signupForm.password.value;
    const fullName = signupForm.fullName.value;
    const role = signupForm.role.value; 
    const state = signupForm.state.value;
    
    const businessName = signupForm.businessName ? signupForm.businessName.value : "";
    const phone = signupForm.phone ? signupForm.phone.value : "";

    try {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCred.user;

        const userData = {
            name: fullName,
            email: email,
            role: role, 
            state: state,
            businessName: role === "seller" ? businessName : "",
            phone: phone,
            verified: false,
            createdAt: new Date()
        };

        await setDoc(doc(db, "users", user.uid), userData);

        displayAlert(`Welcome to Amano.ng, ${fullName}! Account created.`, "success");
        
        setTimeout(() => {
            // FIXED: Changed seller.html to seller-dashboard.html
            window.location.href = role === "seller" ? "seller-dashboard.html" : "index.html";
        }, 1500);

    } catch (error) {
        console.error("Signup Error:", error);
        let msg = error.message;
        if (error.code === 'auth/email-already-in-use') msg = "This email is already registered.";
        if (error.code === 'auth/weak-password') msg = "Password should be at least 6 characters.";
        
        displayAlert(msg, "error");
    }
});

// --- LOGIN LOGIC ---
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = loginForm.email.value;
    const password = loginForm.password.value;

    try {
        const userCred = await signInWithEmailAndPassword(auth, email, password);
        const user = userCred.user;

        // Fetch user role from Firestore to redirect correctly
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();

        displayAlert("Login successful! Redirecting...", "success");
        
        setTimeout(() => {
            if (userData && userData.role === 'seller') {
                window.location.href = "seller-dashboard.html";
            } else {
                window.location.href = "index.html";
            }
        }, 1200);
    } catch (error) {
        console.error("Login Error:", error);
        let msg = "Invalid email or password.";
        if (error.code === 'auth/invalid-credential') msg = "Invalid email or password.";
        if (error.code === 'auth/user-not-found') msg = "No account found with this email.";
        
        displayAlert(msg, "error");
    }
});