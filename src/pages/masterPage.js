/**
 * BANF Master Page - Responsive Navigation
 * =========================================
 * This code goes in the page code section of the master page
 * Provides unified navigation for both mobile and web
 */

import wixWindow from 'wix-window';
import wixLocation from 'wix-location';
import wixUsers from 'wix-users';
// CORRECTED: Using actual backend module names
import { isAdmin } from 'backend/admin.jsw';

// Navigation menu items
const NAV_ITEMS = {
    public: [
        { label: 'Home', url: '/home' },
        { label: 'Events', url: '/events' },
        { label: 'Magazine', url: '/magazine' },
        { label: 'Jacksonville Guide', url: '/guide' },
        { label: 'Radio', url: '/radio' },
        { label: 'About Us', url: '/about' }
    ],
    member: [
        { label: 'My Dashboard', url: '/member/dashboard' },
        { label: 'My Events', url: '/member/events' },
        { label: 'Surveys', url: '/member/surveys' },
        { label: 'Submit Article', url: '/member/submit-article' },
        { label: 'Profile', url: '/member/profile' }
    ],
    admin: [
        { label: 'Admin Dashboard', url: '/admin/dashboard' },
        { label: 'Members', url: '/admin/members' },
        { label: 'Events', url: '/admin/events' },
        { label: 'Sponsors', url: '/admin/sponsors' },
        { label: 'Vendors', url: '/admin/vendors' },
        { label: 'Finance', url: '/admin/finance' },
        { label: 'Documents', url: '/admin/documents' },
        { label: 'Surveys', url: '/admin/surveys' },
        { label: 'Complaints', url: '/admin/complaints' },
        { label: 'Magazine', url: '/admin/magazine' },
        { label: 'Radio', url: '/admin/radio' },
        { label: 'Reports', url: '/admin/reports' }
    ]
};

$w.onReady(async function () {
    // Initialize responsive behavior
    initResponsive();
    
    // Setup navigation
    await setupNavigation();
    
    // Setup mobile menu
    setupMobileMenu();
    
    // Handle window resize
    wixWindow.onResize(() => {
        initResponsive();
    });
});

/**
 * Initialize responsive layout based on viewport
 */
function initResponsive() {
    const viewportWidth = wixWindow.formFactor;
    const isMobile = viewportWidth === 'Mobile';
    const isTablet = viewportWidth === 'Tablet';
    
    // Show/hide appropriate navigation elements
    if (isMobile || isTablet) {
        $w('#desktopNav').hide();
        $w('#mobileMenuButton').show();
        $w('#mobileNav').collapse();
    } else {
        $w('#desktopNav').show();
        $w('#mobileMenuButton').hide();
        $w('#mobileNav').collapse();
    }
    
    // Adjust container widths
    if (isMobile) {
        $w('#mainContainer').style = { width: '100%', padding: '10px' };
    } else if (isTablet) {
        $w('#mainContainer').style = { width: '95%', padding: '15px' };
    } else {
        $w('#mainContainer').style = { width: '90%', maxWidth: '1200px', padding: '20px' };
    }
}

/**
 * Setup navigation based on user role
 */
async function setupNavigation() {
    const user = wixUsers.currentUser;
    let navItems = [...NAV_ITEMS.public];
    
    if (user.loggedIn) {
        try {
            // Add member menu items for logged in users
            navItems = navItems.concat(NAV_ITEMS.member);
            
            // CORRECTED: Use isAdmin() which checks current user internally
            const adminStatus = await isAdmin();
            if (adminStatus) {
                navItems = navItems.concat(NAV_ITEMS.admin);
            }
            
            // Update login button to show logout
            $w('#loginButton').label = 'Logout';
            $w('#loginButton').onClick(() => {
                wixUsers.logout().then(() => {
                    wixLocation.to('/home');
                });
            });
            
        } catch (error) {
            console.error('Error setting up navigation:', error);
        }
    } else {
        // Show login button
        $w('#loginButton').label = 'Login';
        $w('#loginButton').onClick(() => {
            wixUsers.promptLogin().then((user) => {
                wixLocation.to('/member/dashboard');
            });
        });
    }
    
    // Build desktop navigation
    buildDesktopNav(navItems);
    
    // Build mobile navigation
    buildMobileNav(navItems);
}

/**
 * Build desktop navigation menu
 */
function buildDesktopNav(items) {
    const menuRepeater = $w('#desktopMenuRepeater');
    
    menuRepeater.data = items.map((item, index) => ({
        _id: `nav-${index}`,
        label: item.label,
        url: item.url
    }));
    
    menuRepeater.onItemReady(($item, itemData) => {
        $item('#navLink').label = itemData.label;
        $item('#navLink').link = itemData.url;
        
        // Highlight current page
        if (wixLocation.path[0] === itemData.url.split('/')[1]) {
            $item('#navLink').style.fontWeight = 'bold';
            $item('#navLink').style.borderBottom = '2px solid #FF6B35';
        }
    });
}

/**
 * Build mobile navigation menu
 */
function buildMobileNav(items) {
    const mobileMenuRepeater = $w('#mobileMenuRepeater');
    
    mobileMenuRepeater.data = items.map((item, index) => ({
        _id: `mobile-nav-${index}`,
        label: item.label,
        url: item.url
    }));
    
    mobileMenuRepeater.onItemReady(($item, itemData) => {
        $item('#mobileNavLink').label = itemData.label;
        $item('#mobileNavLink').onClick(() => {
            wixLocation.to(itemData.url);
            $w('#mobileNav').collapse();
        });
        
        // Highlight current page
        if (wixLocation.path[0] === itemData.url.split('/')[1]) {
            $item('#mobileNavLink').style.backgroundColor = '#FFF3E0';
        }
    });
}

/**
 * Setup mobile menu toggle
 */
function setupMobileMenu() {
    $w('#mobileMenuButton').onClick(() => {
        if ($w('#mobileNav').collapsed) {
            $w('#mobileNav').expand();
        } else {
            $w('#mobileNav').collapse();
        }
    });
    
    // Close menu when clicking outside
    $w('#pageBackground').onClick(() => {
        if (!$w('#mobileNav').collapsed) {
            $w('#mobileNav').collapse();
        }
    });
}

/**
 * Show notification toast
 */
export function showToast(message, type = 'info') {
    const toast = $w('#toastNotification');
    const toastText = $w('#toastText');
    
    toastText.text = message;
    
    // Set color based on type
    const colors = {
        success: '#4CAF50',
        error: '#f44336',
        warning: '#FF9800',
        info: '#2196F3'
    };
    
    toast.style.backgroundColor = colors[type] || colors.info;
    toast.show('fade', { duration: 300 });
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        toast.hide('fade', { duration: 300 });
    }, 3000);
}

/**
 * Show loading spinner
 */
export function showLoading() {
    $w('#loadingSpinner').show();
}

/**
 * Hide loading spinner
 */
export function hideLoading() {
    $w('#loadingSpinner').hide();
}
