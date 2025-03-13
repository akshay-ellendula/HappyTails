
function toggleInclusions() {
    var inclusions = document.getElementById("inclusionsSection");
    var btn = document.getElementById("seeMoreBtn");
    var arrow = document.getElementById("arrowIcon");
  
    if (inclusions.classList.contains("active")) {
      inclusions.classList.remove("active");
      btn.innerHTML = 'Show more <span id="arrowIcon">▾</span>'; 
    } else {
      inclusions.classList.add("active");
      btn.innerHTML = 'Show less <span id="arrowIcon">▴</span>';
    }
  }
  
  function openGoogleMaps() {
      window.open("https://www.google.com/maps?q=LastHouse+Coffee,+Durgam+Cheruvu+Road,+Madhapur,+Hyderabad", "_blank");
    }
  
  function toggleTerms() {
      var content = document.querySelector(".terms-content");
      var button = document.querySelector(".terms-toggle");
  
      if (content.style.display === "block") {
          content.style.display = "none";
          button.innerHTML = "Terms & Conditions &#9660;";
      } else {
          content.style.display = "block";
          button.innerHTML = "Terms & Conditions &#9650;";
      }
  }
  
  