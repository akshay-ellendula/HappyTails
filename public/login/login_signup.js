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
        name: this.querySelector("input[type='text']").value,
        email: this.querySelector("input[type='email']").value,
        password: this.querySelector("input[type='password']").value,
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
        email: this.querySelector("input[type='email']").value,
        password: this.querySelector("input[type='password']").value,
    };

    try {
        const response = await fetch("http://localhost:3000/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
        });

        // ✅ First, check if response is JSON (to avoid parsing HTML)
        const text = await response.text();
        try {
            const data = JSON.parse(text); // ✅ Safely parse JSON
            if (response.ok) {
                alert("Login Successful!");
                window.location.href = data.redirect; // ✅ Redirect from JSON
            } else {
                alert(data.message || "Login failed!");
            }
        } catch (err) {
            console.error("Server returned non-JSON response:", text); // Log the unexpected response
        }
    } catch (error) {
        console.error("Login Error:", error);
    }
});

