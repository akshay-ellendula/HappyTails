const signUpToggle = document.getElementById('signUpToggle');
const signInToggle = document.getElementById('signInToggle');
const container = document.getElementById('container');
const signInForm = document.getElementById('signInForm');
const signUpForm = document.getElementById('signUpForm');

signUpToggle.addEventListener('click', () => {
    signUpForm.classList.remove('hidden-form');
    signUpForm.classList.add('active-form');
    signInForm.classList.remove('active-form');
    signInForm.classList.add('hidden-form');
    signUpToggle.classList.add('active');
    signInToggle.classList.remove('active');
    document.body.style.backgroundColor = "#1a1a1a"; 
    const badge = document.getElementsByClassName("badge");
    badge[0].style.color = "#effe8b";    
});

signInToggle.addEventListener('click', () => {
    signInForm.classList.remove('hidden-form');
    signInForm.classList.add('active-form');
    signUpForm.classList.remove('active-form');
    signUpForm.classList.add('hidden-form');
    signInToggle.classList.add('active');
    signUpToggle.classList.remove('active');
    document.body.style.backgroundColor = "#effe8b";
    const badge = document.getElementsByClassName("badge");
    badge[0].style.color = "#1a1a1a";
});


document.getElementById("signInForm").addEventListener("submit", async (e) => {
    e.preventDefault();

  

    const formData = new FormData(signInForm);
    const userData = Object.fromEntries(formData.entries());
    const response = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
    });
    const result = await response.json();
    if (response.ok) {
        window.location.href = result.redirect; // Redirect to home on successful login
    } 
    else {
        alert(result.message);
    }

});

document.getElementById("signUpForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(signUpForm);
    const userData = Object.fromEntries(formData.entries());
    const response = await fetch("/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
    });

    const result = await response.json();
    alert(result.message);
    if (response.ok) {
        signInToggle.click(); // Switch to login form after successful signup
    }
});