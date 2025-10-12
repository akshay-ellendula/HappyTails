document.getElementById('menuIcon').addEventListener('click', function() {
          document.getElementById('sideNavbar').classList.toggle('open');
      });

      document.getElementById('closeBtn').addEventListener('click', function() {
          document.getElementById('sideNavbar').classList.remove('open');
      });

      document.querySelectorAll('.side-navbar a:not(.close-btn)').forEach(link => {
          link.addEventListener('click', () => {
              document.getElementById('sideNavbar').classList.remove('open');
          });
      });

      document.getElementById('city').addEventListener('change', () => {
          document.getElementById('noEvents').style.display = 'none';
          document.getElementById('loading').style.display = 'block';
          setTimeout(() => {
              document.getElementById('loading').style.display = 'none';
              document.getElementById('noEvents').style.display = 'block';
          }, 1000);
      });