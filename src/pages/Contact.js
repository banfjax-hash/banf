// Contact.js
// BANF Contact Page

import wixWindow from 'wix-window';
import { submitContactForm } from 'backend/email.jsw';

$w.onReady(function () {
    console.log("📬 Contact page loading...");

    const isMobile = wixWindow.formFactor === 'Mobile';
    try { applyMobileLayout(isMobile); } catch (_) {}

    try { $w('#btnSendMessage').onClick(async () => {
        // Validate inputs
        const name = $w('#inputName').value;
        const email = $w('#inputEmail').value;
        const subject = $w('#inputSubject').value;
        const message = $w('#inputMessage').value;

        if (!name || !email || !message) {
            showContactError('Please fill in all required fields.');
            return;
        }
        if (!email.includes('@')) {
            showContactError('Please enter a valid email address.');
            return;
        }

        try {
            $w('#btnSendMessage').disable();
            $w('#btnSendMessage').label = 'Sending...';
            try { $w('#textContactStatus').text = 'Sending your message...'; $w('#textContactStatus').show(); } catch (_) {}

            await submitContactForm({ name, email, subject, message });

            // Clear form
            $w('#inputName').value = '';
            $w('#inputEmail').value = '';
            $w('#inputSubject').value = '';
            $w('#inputMessage').value = '';

            try {
                $w('#textContactStatus').text = '✅ Thank you! Your message has been sent. We will reply to ' + email + ' within 2 business days.';
            } catch (_) {}

            // Fallback: open lightbox if available
            try {
                wixWindow.openLightbox('SuccessLightbox', { message: 'Thank you! Your message has been sent.' });
            } catch (_) {}

        } catch (err) {
            console.error("Contact form error:", err);
            showContactError('Failed to send message. Please try emailing us directly at banfjax@gmail.com');
        } finally {
            $w('#btnSendMessage').enable();
            $w('#btnSendMessage').label = 'Send Message';
        }
    }); } catch (_) {}
});

function applyMobileLayout(isMobile) {
    // Ensure contact content is visible regardless of editor defaults
    try { $w('#contactColumns').expand();    $w('#contactColumns').show();    } catch (_) {}
    try { $w('#mapElement').expand();        $w('#mapElement').show();        } catch (_) {}

    if (!isMobile) return;

    // Stack contact info and form vertically on mobile
    try { $w('#contactColumns').collapse(); } catch (_) {}
    try { $w('#contactMobileStack').expand(); } catch (_) {}

    // Increase textarea height for easier mobile typing
    try { $w('#inputMessage').style.minHeight = '120px'; } catch (_) {}

    // Full-width submit button — 48px height for Apple HIG 44px min
    try {
        $w('#btnSendMessage').style.width = '100%';
        $w('#btnSendMessage').style.height = '48px';
        $w('#btnSendMessage').style.fontSize = '16px';
    } catch (_) {}

    // Input type hints for correct virtual keyboard
    try { $w('#inputName').inputType    = 'text';  }  catch (_) {}
    try { $w('#inputEmail').inputType   = 'email'; }  catch (_) {}
    try { $w('#inputSubject').inputType = 'text';  }  catch (_) {}

    // Ensure readable font size (prevent iOS auto-zoom)
    ['#inputName', '#inputEmail', '#inputSubject', '#inputMessage'].forEach(id => {
        try { $w(id).style.fontSize = '16px'; } catch (_) {}
    });

    // Hide map on mobile (show address text instead)
    try { $w('#mapElement').collapse(); } catch (_) {}
    try { $w('#textMapAddress').expand(); } catch (_) {}
}

function showContactError(msg) {
    try {
        $w('#textContactStatus').text = '⚠️ ' + msg;
        $w('#textContactStatus').show();
    } catch (_) {
        try { wixWindow.openLightbox('ErrorLightbox', { message: msg }); } catch (_) {}
    }
}
