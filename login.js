/**
 * @file login.js
 * @description Handles logic for the login page using a custom backend with JWT.
 * @version 4.0.0 - Migrated from Firebase to MongoDB/JWT backend.
 */

// Alamat base URL dari backend server Anda
const API_BASE_URL = 'http://backend-kpi.148.230.97.197.sslip.io/api';

// SVG Icons for password toggle
const eyeIconSVG = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
    </svg>`;

const eyeOffIconSVG = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
        <line x1="1" y1="1" x2="23" y2="23"></line>
    </svg>`;

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const errorMessageDiv = document.getElementById('errorMessage');
    const passwordInput = document.getElementById('password');
    const togglePassword = document.getElementById('togglePassword');

    if (togglePassword) {
        togglePassword.innerHTML = eyeIconSVG;
        togglePassword.addEventListener('click', function () {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.innerHTML = type === 'password' ? eyeIconSVG : eyeOffIconSVG;
        });
    }

    // Cek apakah pengguna sudah login dari localStorage
    const token = localStorage.getItem('token');
    if (token) {
        const user = JSON.parse(localStorage.getItem('currentUser'));
        if (user) {
            // Arahkan berdasarkan peran
            if (user.role === 'management') {
                window.location.href = 'dashboard-manajemen.html';
            } else {
                window.location.href = 'dashboard.html';
            }
        }
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const submitButton = loginForm.querySelector('button[type="submit"]');

        submitButton.textContent = 'Mencoba Login...';
        submitButton.disabled = true;
        errorMessageDiv.style.display = 'none';

        try {
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Gagal login.');
            }

            // Simpan token dan data pengguna ke localStorage
            localStorage.setItem('token', data.token);
            localStorage.setItem('currentUser', JSON.stringify(data.user));

            // Arahkan ke dashboard yang sesuai
            if (data.user.role === 'management') {
                window.location.href = 'dashboard-manajemen.html';
            } else {
                window.location.href = 'dashboard.html';
            }

        } catch (error) {
            errorMessageDiv.textContent = error.message;
            errorMessageDiv.style.display = 'block';
            submitButton.textContent = 'Login';
            submitButton.disabled = false;
        }
    });
});
