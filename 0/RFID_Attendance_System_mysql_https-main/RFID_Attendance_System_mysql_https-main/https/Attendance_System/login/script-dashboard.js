// script-dashboard.js

document.addEventListener('DOMContentLoaded', function () {
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    
    // Load saved theme from localStorage (if any)
    if (localStorage.getItem('darkMode') === 'enabled') {
        document.body.classList.add('dark-mode');
        darkModeToggle.checked = true;
    }

    // Toggle dark mode
    darkModeToggle.addEventListener('change', function () {
        if (darkModeToggle.checked) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('darkMode', 'enabled');  // Save preference
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('darkMode', 'disabled'); // Save preference
        }
    });
});
