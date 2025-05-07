// Navigation and menu functionality
document.addEventListener('DOMContentLoaded', function() {
    // ===== MOBILE MENU TOGGLE =====
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');

    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', function(e) {
            e.stopPropagation(); // Stop click from immediately closing the menu
            mobileMenu.classList.toggle('hidden');
            
            // Toggle aria-expanded attribute for accessibility
            const expanded = mobileMenuButton.getAttribute('aria-expanded') === 'true' || false;
            mobileMenuButton.setAttribute('aria-expanded', !expanded);
        });
    }

    // ===== MOBILE TECH CONTENT SUBMENU =====
    const mobileTechContentButton = document.getElementById('mobile-tech-content-button');
    const mobileTechContentSubmenu = document.getElementById('mobile-tech-content-submenu');

    if (mobileTechContentButton && mobileTechContentSubmenu) {
        mobileTechContentButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            mobileTechContentSubmenu.classList.toggle('hidden');
        });
    }

    // ===== MOBILE CONSULTING SUBMENU (if exists) =====
    const mobileConsultingButton = document.getElementById('mobile-consulting-button');
    const mobileConsultingSubmenu = document.getElementById('mobile-consulting-submenu');

    if (mobileConsultingButton && mobileConsultingSubmenu) {
        mobileConsultingButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            mobileConsultingSubmenu.classList.toggle('hidden');
        });
    }

    // ===== DESKTOP DROPDOWNS =====
    // Tech Content dropdown
    const techContentButton = document.getElementById('tech-content-button');
    const techContentDropdown = document.getElementById('tech-content-dropdown');
    
    if (techContentButton && techContentDropdown) {
        techContentButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            techContentDropdown.classList.toggle('hidden');
        });

        // Prevent dropdown from closing when clicking inside it
        techContentDropdown.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }
    
    // Consulting dropdown (if exists)
    const consultingButton = document.getElementById('consulting-button');
    const consultingDropdown = document.getElementById('consulting-dropdown');
    
    if (consultingButton && consultingDropdown) {
        consultingButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            consultingDropdown.classList.toggle('hidden');
        });

        // Prevent dropdown from closing when clicking inside it
        consultingDropdown.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }

    // ===== CLOSE DROPDOWNS WHEN CLICKING OUTSIDE =====
    document.addEventListener('click', function(e) {
        // Close desktop dropdowns
        if (techContentDropdown && !techContentButton.contains(e.target)) {
            techContentDropdown.classList.add('hidden');
        }
        
        if (consultingDropdown && !consultingButton.contains(e.target)) {
            consultingDropdown.classList.add('hidden');
        }
        
        // Don't close mobile menu when clicking inside it
        if (mobileMenu && !mobileMenu.contains(e.target) && !mobileMenuButton.contains(e.target)) {
            mobileMenu.classList.add('hidden');
        }
    });

    // ===== SMOOTH SCROLLING FOR ANCHOR LINKS =====
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');

            if (targetId !== '#') {
                e.preventDefault();

                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth'
                    });
                }
            }
        });
    });
});

// Add class to header on scroll for a fixed header with shadow
window.addEventListener('scroll', function() {
    const header = document.querySelector('header');
    if (header) {
        if (window.scrollY > 10) {
            header.classList.add('shadow-md');
        } else {
            header.classList.remove('shadow-md');
        }
    }
});
