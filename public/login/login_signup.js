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