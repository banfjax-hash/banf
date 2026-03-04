// Site Constants and Configuration
// Import in pages: import { SITE_CONFIG, COLORS } from 'public/constants.js';

export const SITE_CONFIG = {
    name: 'Bengal Association of North Florida',
    shortName: 'BANF',
    tagline: 'Celebrating Bengali Culture in Jacksonville',
    founded: 1990,
    
    contact: {
        email: 'info@banfjax.org',
        phone: '(904) XXX-XXXX',
        address: 'Jacksonville, FL'
    },
    
    social: {
        facebook: 'https://facebook.com/banfofficial',
        instagram: 'https://instagram.com/banf_jax',
        youtube: 'https://youtube.com/banfjax',
        twitter: 'https://twitter.com/banfjax'
    },
    
    features: {
        events: true,
        membership: true,
        magazine: true,
        radio: true,
        gallery: true,
        sponsors: true,
        volunteers: true,
        donations: true
    }
};

export const COLORS = {
    primary: '#FF6B35',      // BANF Orange
    secondary: '#2E86AB',    // Blue
    accent: '#F7C59F',       // Light Orange
    success: '#28A745',
    warning: '#FFC107',
    danger: '#DC3545',
    dark: '#343A40',
    light: '#F8F9FA',
    white: '#FFFFFF'
};

export const MEMBERSHIP_TYPES = [
    { value: 'individual', label: 'Individual', price: 50 },
    { value: 'family', label: 'Family', price: 75 },
    { value: 'student', label: 'Student', price: 25 },
    { value: 'senior', label: 'Senior', price: 35 },
    { value: 'lifetime', label: 'Lifetime', price: 500 }
];

export const EVENT_CATEGORIES = [
    { value: 'cultural', label: 'Cultural Event' },
    { value: 'religious', label: 'Religious/Puja' },
    { value: 'social', label: 'Social Gathering' },
    { value: 'sports', label: 'Sports' },
    { value: 'education', label: 'Educational' },
    { value: 'fundraiser', label: 'Fundraiser' },
    { value: 'other', label: 'Other' }
];

export const SPONSOR_TIERS = [
    { value: 'platinum', label: 'Platinum', minAmount: 5000 },
    { value: 'gold', label: 'Gold', minAmount: 2500 },
    { value: 'silver', label: 'Silver', minAmount: 1000 },
    { value: 'bronze', label: 'Bronze', minAmount: 500 }
];

export const VOLUNTEER_CATEGORIES = [
    'Event Setup',
    'Event Coordination',
    'Food Service',
    'Photography',
    'Technical Support',
    'Transportation',
    'Registration',
    'Decoration',
    'Cleanup',
    'Other'
];

export const US_STATES = [
    { value: 'FL', label: 'Florida' },
    { value: 'GA', label: 'Georgia' },
    { value: 'AL', label: 'Alabama' },
    { value: 'SC', label: 'South Carolina' },
    // Add more as needed
];
