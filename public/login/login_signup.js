const signUpButton = document.getElementById('signUp');
const signInButton = document.getElementById('signIn');
const container = document.getElementById('container');


signUpButton.addEventListener('click', () => {
	container.classList.add("right-panel-active");
    document.body.style.backgroundColor="#1a1a1a";
   const badge = document.getElementsByClassName("badge");
    badge[0].style.color = "#effe8b";
});

signInButton.addEventListener('click', () => {
	container.classList.remove("right-panel-active");
    document.body.style.backgroundColor="#effe8b";
    const badge1= document.getElementsByClassName("badge");
    badge1[0].style.color = "#1a1a1a";
});


document.getElementById("signupForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const formData = {
        user_name: this.querySelector("input[name='user_name']").value,
        user_email: this.querySelector("input[name='user_email']").value,
        user_password: this.querySelector("input[name='user_password']").value,
    };

    try {
        const response = await fetch("http://localhost:3000/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
        });

        const data = await response.json();
        alert(data.message);
    } catch (error) {
        console.error("Signup Error:", error);
    }
});

document.getElementById("loginForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const formData = {
        user_email: this.querySelector("input[name='user_email']").value,
        user_password: this.querySelector("input[name='user_password']").value,
    };

    try {
        const response = await fetch("http://localhost:3000/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
        });

        
        const data = await response.json();
        if(response.ok) {
            window.location.href = data.redirect;
        }
        else { 
            alert(data.message || "Invalid credentials. Please try again.");
        }
        
    } catch (error) {
        console.error("Login Error:", error);
    }
});

