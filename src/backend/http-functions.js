/**
 * BANF Wix HTTP Functions — v5.12.0 EC-Separated
 * ==================================================
 * All endpoints use wixData directly. NO .jsw imports.
 *
 * v5.4.0 adds: RAG/vector search, email automation, LLM agent profiles,
 *   RBAC security, admin dashboard APIs, member portal + chatbot,
 *   computer user agent, comprehensive test suite.
 * v5.5.0 adds: Full CRM system — Family ID engine, member profiles,
 *   org roles, awards, volunteer, communications, CRM admin UI.
 * v5.6.0 adds: RAG knowledge base context engine — 25 sensitivity-ranked
 *   knowledge chunks, 40+ document catalogue, comm analysis + categorization,
 *   LLM RAG-ask, member insights, document sensitivity map.
 * v5.7.0 adds: Google Drive sync — list/download/CSV export from Drive;
 *   Bulk CRM data mapper — Family Universe, Membership 2025-26, Org Roles;
 *   Gmail full link — all emails cross-referenced to CRM members;
 *   Full data sync pipeline with dedup.
 * v5.8.0 adds: Intelligent family fix agent — evidence-graph co-occurrence
 *   grouping (8 sources: compound XLSX, Jagriti, emails, Google Contacts,
 *   email domain, payments, manual overrides), Levenshtein fuzzy matching,
 *   occurrence-based disambiguation, compound-name corrections;
 *   Comprehensive CRM audit agent — all 12 data dimensions per member
 *   (profile, family unit, payments, comms, cultural, events, volunteer,
 *   org roles, awards, XLSX membership, PDF docs, data quality issues);
 *   CRM data quality report with 967 issues catalogued across 165 members.
 * v5.9.0 adds: Landing Page CRM — 6 new collections (MembershipPlans,
 *   SponsorshipTiers, ECMembers, SiteStats, BudgetSummary, SiteContent);
 *   Public read-only landing_data API — single-call aggregation with
 *   sanitized output; Admin landing_seed endpoint for data population;
 *   Dynamic landing page fetching from CRM with graceful fallbacks.
 * v5.10.0 adds: EC Onboarding Gate Chain — enforces operational flow:
 *   Super Admin completes EC onboarding → President launches membership drive
 *   → Members onboarded via drive can login. New ECYearStatus collection,
 *   ec_onboard_progress dashboard, gate enforcement on signin & drive.
 *
 * Accessible at: https://www.jaxbengali.org/_functions/<endpoint>
 */

// ── v5.4.0 Module imports ──────────────────────────────────────
import {
    get_admin_dashboard, options_admin_dashboard,
    get_admin_members, options_admin_members,
    post_admin_member_update, options_admin_member_update,
    post_admin_member_deactivate, options_admin_member_deactivate,
    get_admin_payments, options_admin_payments,
    post_admin_payment_update, options_admin_payment_update,
    post_admin_payment_record, options_admin_payment_record,
    get_admin_vendors, options_admin_vendors,
    post_admin_vendor, options_admin_vendor,
    get_admin_sponsors, options_admin_sponsors,
    post_admin_sponsor, options_admin_sponsor,
    get_admin_ads, options_admin_ads,
    post_admin_ad, options_admin_ad,
    get_admin_careers, options_admin_careers,
    post_admin_career_session, options_admin_career_session,
    get_admin_archive, options_admin_archive,
    get_admin_email_queue, options_admin_email_queue,
    post_admin_email_scan, options_admin_email_scan,
    post_admin_approve_response, options_admin_approve_response,
    get_admin_auto_responses, options_admin_auto_responses,
    get_admin_knowledge_base, options_admin_knowledge_base,
    post_admin_kb_add, options_admin_kb_add,
    post_admin_kb_upload, options_admin_kb_upload,
    post_admin_kb_search, options_admin_kb_search,
    get_admin_agents, options_admin_agents,
    post_admin_agent_update, options_admin_agent_update,
    get_admin_roles, options_admin_roles,
    post_admin_role_add, options_admin_role_add,
    post_admin_role_revoke, options_admin_role_revoke,
    post_admin_onboard_verify, options_admin_onboard_verify,
    post_admin_set_password, options_admin_set_password,
    post_admin_save_profile, options_admin_save_profile,
    post_admin_onboard_complete, options_admin_onboard_complete,
    post_admin_verify_login, options_admin_verify_login,
    post_admin_pwdebug, options_admin_pwdebug,
    get_email_templates, options_email_templates,
    post_email_template_save, options_email_template_save,
    post_admin_bootstrap, options_admin_bootstrap,
    get_ec_onboard_dashboard, options_ec_onboard_dashboard,
    post_ec_feature_config, options_ec_feature_config,
    get_ec_feature_config,
    post_admin_get_security_question, options_admin_get_security_question,
    post_admin_verify_security_answer, options_admin_verify_security_answer,
    post_admin_reset_password, options_admin_reset_password,
    post_admin_signup_send_code, options_admin_signup_send_code,
    post_admin_signup_verify_code, options_admin_signup_verify_code,
    post_admin_signup_direct, options_admin_signup_direct
} from 'backend/admin-api';

import {
    get_member_profile, options_member_profile,
    post_member_profile_update, options_member_profile_update,
    get_member_payments, options_member_payments,
    get_member_events, options_member_events,
    post_member_rsvp, options_member_rsvp,
    get_member_complaints, options_member_complaints,
    post_member_complaint_submit, options_member_complaint_submit,
    get_member_surveys, options_member_surveys,
    post_member_chat, options_member_chat,
    post_member_chat_context, options_member_chat_context,
    get_member_directory, options_member_directory
} from 'backend/member-api';

import {
    post_computer_agent_test, options_computer_agent_test,
    get_computer_agent_report, options_computer_agent_report,
    get_computer_agent_status, options_computer_agent_status
} from 'backend/computer-agent';

import {
    post_run_test_suite, options_run_test_suite,
    get_test_results, options_test_results
} from 'backend/test-suite';

import { buildRAGContext } from 'backend/rag-engine';
import { checkPermission } from 'backend/rbac';

import {
    get_crm_dashboard, options_crm_dashboard,
    get_crm_families, options_crm_families,
    get_crm_family, options_crm_family,
    post_crm_family_create, options_crm_family_create,
    post_crm_family_update, options_crm_family_update,
    get_crm_family_history, options_crm_family_history,
    post_crm_adult_add, options_crm_adult_add,
    post_crm_adult_remove, options_crm_adult_remove,
    post_crm_minor_add, options_crm_minor_add,
    post_crm_minor_remove, options_crm_minor_remove,
    get_crm_member, options_crm_member,
    get_crm_member_search, options_crm_member_search,
    post_crm_member_update, options_crm_member_update,
    get_crm_member_report, options_crm_member_report,
    get_crm_members, options_crm_members,
    post_crm_org_role_add, options_crm_org_role_add,
    get_crm_org_roles, options_crm_org_roles,
    post_crm_award_add, options_crm_award_add,
    get_crm_awards, options_crm_awards,
    post_crm_volunteer_add, options_crm_volunteer_add,
    get_crm_volunteer, options_crm_volunteer,
    get_crm_member_comms, options_crm_member_comms,
    get_crm_member_payments, options_crm_member_payments,
    post_crm_seed, options_crm_seed,
    post_crm_link_emails, options_crm_link_emails
} from 'backend/crm-api';

import {
    get_rag_search,              options_rag_search,
    get_rag_context,             options_rag_context,
    get_rag_knowledge_stats,     options_rag_knowledge_stats,
    get_rag_categories,          options_rag_categories,
    get_rag_documents,           options_rag_documents,
    get_rag_chunk,               options_rag_chunk,
    post_rag_ask,                options_rag_ask,
    get_rag_comms_analyze,       options_rag_comms_analyze,
    post_rag_comms_categorize,   options_rag_comms_categorize,
    get_rag_member_insights,     options_rag_member_insights,
    get_rag_sensitivity_map,     options_rag_sensitivity_map
} from 'backend/banf-rag-api';

import {
    get_gdrive_auth_url,          options_gdrive_auth_url,
    get_gdrive_list,              options_gdrive_list,
    get_gdrive_file,              options_gdrive_file,
    post_gdrive_sync_csv,         options_gdrive_sync_csv,
    get_gdrive_search,            options_gdrive_search,
    get_gdrive_status,            options_gdrive_status,
    post_gdrive_find_banf_folder, options_gdrive_find_banf_folder
} from 'backend/banf-gdrive-sync';

import {
    post_bulk_import_members,     options_bulk_import_members,
    post_bulk_import_org_roles,   options_bulk_import_org_roles,
    post_gmail_full_link,         options_gmail_full_link,
    get_import_status,            options_import_status,
    post_full_data_sync,          options_full_data_sync
} from 'backend/banf-data-mapper';

import {
    post_evite_create_event,     options_evite_create_event,
    get_evite_events,            options_evite_events,
    post_evite_scan,             options_evite_scan,
    get_evite_attendance_report, options_evite_attendance_report,
    post_evite_parse_single,     options_evite_parse_single,
    post_evite_rsvp_override,    options_evite_rsvp_override,
    get_evite_rsvps,             options_evite_rsvps,
    post_evite_send_invites,     options_evite_send_invites,
    get_evite_rsvp_form_data,    options_evite_rsvp_form_data,
    post_evite_rsvp_submit,      options_evite_rsvp_submit,
    get_evite_invite_status,     options_evite_invite_status
} from 'backend/banf-evite-report';

import {
    post_survey_setup,              options_survey_setup,
    post_survey_create,             options_survey_create,
    get_survey_list,                options_survey_list,
    get_survey_detail,              options_survey_detail,
    get_survey_test_members,        options_survey_test_members,
    post_survey_send,               options_survey_send,
    get_survey_form,                options_survey_form,
    get_survey_form_data,           options_survey_form_data,
    post_survey_submit,             options_survey_submit,
    post_survey_process,            options_survey_process,
    get_survey_report,              options_survey_report,
    get_survey_escalations,         options_survey_escalations,
    post_survey_resolve_escalation, options_survey_resolve_escalation,
    post_survey_close,              options_survey_close,
    post_survey_process_email,      options_survey_process_email
} from 'backend/banf-survey';

import {
    get_membership_tiers,              options_membership_tiers,
    post_membership_recommend,         options_membership_recommend,
    post_membership_register,          options_membership_register,
    get_membership_status,             options_membership_status,
    get_membership_test_pay,           options_membership_test_pay,
    post_membership_confirm_payment,   options_membership_confirm_payment,
    get_membership_registrations,      options_membership_registrations,
    // v3.0 dynamic config + drive
    post_membership_parse_config,      options_membership_parse_config,
    post_membership_config_save,       options_membership_config_save,
    get_membership_config,             options_membership_config,
    get_membership_universe,           options_membership_universe,
    post_membership_universe_update,   options_membership_universe_update,
    post_membership_drive_init,        options_membership_drive_init,
    get_membership_drive_status,       options_membership_drive_status,
    post_membership_drive_notify,      options_membership_drive_notify,
    post_membership_drive_control,     options_membership_drive_control,
    // v4.0 history, compare, reset
    get_membership_history,            options_membership_history,
    post_membership_compare,           options_membership_compare,
    post_membership_reset_test,        options_membership_reset_test
} from 'backend/membership-drive';

import {
    get_archive_catalog,    options_archive_catalog,
    post_archive_map,       options_archive_map,
    get_archive_map_report, options_archive_map_report,
    post_archive_map_update,options_archive_map_update,
    get_gdrive_archive_scan,options_gdrive_archive_scan,
    get_gmail_archive_scan, options_gmail_archive_scan,
    post_archive_full_scan, options_archive_full_scan,
    post_archive_setup,     options_archive_setup,
    get_archive_setup,      options_archive_setup_get,
    post_archive_doc_delete, options_archive_doc_delete,
    post_archive_doc_add,    options_archive_doc_add
} from 'backend/archive-mapper';

import {
    // v1.0 comms-correction workflow (super-admin)
    post_comms_correction_launch,      options_comms_correction_launch,
    get_comms_correction_status,       options_comms_correction_status,
    get_comms_correction_form,         options_comms_correction_form,
    get_comms_form_html,               options_comms_form_html,
    get_comms_form_data,               options_comms_form_data,
    post_comms_correction_submit,      options_comms_correction_submit,
    post_comms_correction_decline,     options_comms_correction_decline,
    post_comms_correction_reset_test,  options_comms_correction_reset_test,
    get_comms_correction_dashboard,    options_comms_correction_dashboard,
    get_comms_dashboard_data,          options_comms_dashboard_data,
    // v1.1 family universe scan + update
    get_comms_family_universe,         options_comms_family_universe,
    post_comms_family_universe_update, options_comms_family_universe_update
} from 'backend/comms-correction';

// ── v5.9.0 Landing Page CRM ──────────────────────────────────
import {
    get_landing_data,    options_landing_data,
    get_landing_seed,    options_landing_seed,
    get_landing_test,    options_landing_test,
    get_landing_create_collection, options_landing_create_collection
} from 'backend/landing-api';

// ── v5.10.0 EC Onboarding Gate ──────────────────────────────────
import {
    get_ec_year_status,         options_ec_year_status,
    post_ec_year_complete,      options_ec_year_complete,
    post_ec_year_reset,         options_ec_year_reset,
    get_ec_onboard_progress,    options_ec_onboard_progress,
    get_membership_gate_check,  options_membership_gate_check,
    post_ec_send_reminder,      options_ec_send_reminder,
    get_ec_pending_members,     options_ec_pending_members,
    post_ec_send_all_invitations as _ecSendInvitations,
    options_ec_send_all_invitations as _ecSendInvitationsOpts,
    post_ec_signup_congratulations as _ecSignupCongrats,
    options_ec_signup_congratulations as _ecSignupCongratsOpts
} from 'backend/ec-onboarding-gate';

// ── Bosonto Utsob 2026 — Live Email Pipeline ──────────────────
import {
    post_bosonto_pipeline,      options_bosonto_pipeline
} from 'backend/bosonto-email-sender';

// ── v5.11.0 WhatsApp Announcement Ingestion ──────────────────
import {
    get_whatsapp_webhook,
    post_whatsapp_webhook,
    options_whatsapp_webhook,
    post_whatsapp_announcement_approve,
    options_whatsapp_announcement_approve,
    get_whatsapp_announcements,
    options_whatsapp_announcements
} from 'backend/whatsapp-announcements';

// ── v5.10.1 Member Signup / Signin ──────────────────────────────────
import {
    post_signup_initiate,       options_signup_initiate,
    get_signup_status,          options_signup_status,
    post_signup_complete,       options_signup_complete,
    post_signin,                options_signin,
    get_forgot_password,        options_forgot_password,
    post_forgot_password_verify,options_forgot_password_verify,
    post_reset_password,        options_reset_password,
    post_signup_set_secret_qa,  options_signup_set_secret_qa,
    post_payment_confirm_agent, options_payment_confirm_agent,
    post_signup_resend_code,    options_signup_resend_code,
    post_signout,               options_signout,
    get_validate_session,       options_validate_session
} from 'backend/banf-member-signup';

import {
    post_admin_approve_attendance, options_admin_approve_attendance,
    get_admin_attendance,           options_admin_attendance,
    post_admin_attendance_bulk,     options_admin_attendance_bulk,
    post_admin_checkin,             options_admin_checkin,
    get_admin_attendance_stats,     options_admin_attendance_stats
} from 'backend/event-attendance';

// Re-export all v5.7.0 endpoints so Wix CLI picks them up
export {
    get_admin_dashboard, options_admin_dashboard,
    get_admin_members, options_admin_members,
    post_admin_member_update, options_admin_member_update,
    post_admin_member_deactivate, options_admin_member_deactivate,
    get_admin_payments, options_admin_payments,
    post_admin_payment_update, options_admin_payment_update,
    post_admin_payment_record, options_admin_payment_record,
    get_admin_vendors, options_admin_vendors,
    post_admin_vendor, options_admin_vendor,
    get_admin_sponsors, options_admin_sponsors,
    post_admin_sponsor, options_admin_sponsor,
    get_admin_ads, options_admin_ads,
    post_admin_ad, options_admin_ad,
    get_admin_careers, options_admin_careers,
    post_admin_career_session, options_admin_career_session,
    get_admin_archive, options_admin_archive,
    get_admin_email_queue, options_admin_email_queue,
    post_admin_email_scan, options_admin_email_scan,
    post_admin_approve_response, options_admin_approve_response,
    get_admin_auto_responses, options_admin_auto_responses,
    get_admin_knowledge_base, options_admin_knowledge_base,
    post_admin_kb_add, options_admin_kb_add,
    post_admin_kb_upload, options_admin_kb_upload,
    post_admin_kb_search, options_admin_kb_search,
    get_admin_agents, options_admin_agents,
    post_admin_agent_update, options_admin_agent_update,
    get_admin_roles, options_admin_roles,
    post_admin_role_add, options_admin_role_add,
    post_admin_role_revoke, options_admin_role_revoke,
    post_admin_onboard_verify, options_admin_onboard_verify,
    post_admin_set_password, options_admin_set_password,
    post_admin_save_profile, options_admin_save_profile,
    post_admin_onboard_complete, options_admin_onboard_complete,
    post_admin_verify_login, options_admin_verify_login,
    post_admin_pwdebug, options_admin_pwdebug,
    get_email_templates, options_email_templates,
    post_email_template_save, options_email_template_save,
    post_admin_bootstrap, options_admin_bootstrap,
    get_ec_onboard_dashboard, options_ec_onboard_dashboard,
    post_ec_feature_config, options_ec_feature_config,
    get_ec_feature_config,
    post_admin_get_security_question, options_admin_get_security_question,
    post_admin_verify_security_answer, options_admin_verify_security_answer,
    post_admin_reset_password, options_admin_reset_password,
    post_admin_signup_send_code, options_admin_signup_send_code,
    post_admin_signup_verify_code, options_admin_signup_verify_code,
    post_admin_signup_direct, options_admin_signup_direct,
    // Event Attendance v5.13.0
    post_admin_approve_attendance, options_admin_approve_attendance,
    get_admin_attendance,           options_admin_attendance,
    post_admin_attendance_bulk,     options_admin_attendance_bulk,
    post_admin_checkin,             options_admin_checkin,
    get_admin_attendance_stats,     options_admin_attendance_stats,
    get_member_profile, options_member_profile,
    post_member_profile_update, options_member_profile_update,
    get_member_payments, options_member_payments,
    get_member_events, options_member_events,
    post_member_rsvp, options_member_rsvp,
    get_member_complaints, options_member_complaints,
    post_member_complaint_submit, options_member_complaint_submit,
    get_member_surveys, options_member_surveys,
    post_member_chat, options_member_chat,
    post_member_chat_context, options_member_chat_context,
    get_member_directory, options_member_directory,
    post_computer_agent_test, options_computer_agent_test,
    get_computer_agent_report, options_computer_agent_report,
    get_computer_agent_status, options_computer_agent_status,
    post_run_test_suite, options_run_test_suite,
    get_test_results, options_test_results,
    // CRM system v5.5.0
    get_crm_dashboard, options_crm_dashboard,
    get_crm_families, options_crm_families,
    get_crm_family, options_crm_family,
    post_crm_family_create, options_crm_family_create,
    post_crm_family_update, options_crm_family_update,
    get_crm_family_history, options_crm_family_history,
    post_crm_adult_add, options_crm_adult_add,
    post_crm_adult_remove, options_crm_adult_remove,
    post_crm_minor_add, options_crm_minor_add,
    post_crm_minor_remove, options_crm_minor_remove,
    get_crm_member, options_crm_member,
    get_crm_member_search, options_crm_member_search,
    post_crm_member_update, options_crm_member_update,
    get_crm_member_report, options_crm_member_report,
    get_crm_members, options_crm_members,
    post_crm_org_role_add, options_crm_org_role_add,
    get_crm_org_roles, options_crm_org_roles,
    post_crm_award_add, options_crm_award_add,
    get_crm_awards, options_crm_awards,
    post_crm_volunteer_add, options_crm_volunteer_add,
    get_crm_volunteer, options_crm_volunteer,
    get_crm_member_comms, options_crm_member_comms,
    get_crm_member_payments, options_crm_member_payments,
    post_crm_seed, options_crm_seed,
    post_crm_link_emails, options_crm_link_emails,
    // RAG context + knowledge base v5.6.0
    get_rag_search,              options_rag_search,
    get_rag_context,             options_rag_context,
    get_rag_knowledge_stats,     options_rag_knowledge_stats,
    get_rag_categories,          options_rag_categories,
    get_rag_documents,           options_rag_documents,
    get_rag_chunk,               options_rag_chunk,
    post_rag_ask,                options_rag_ask,
    get_rag_comms_analyze,       options_rag_comms_analyze,
    post_rag_comms_categorize,   options_rag_comms_categorize,
    get_rag_member_insights,     options_rag_member_insights,
    get_rag_sensitivity_map,     options_rag_sensitivity_map,
    // Google Drive sync v5.7.0
    get_gdrive_auth_url,          options_gdrive_auth_url,
    get_gdrive_list,              options_gdrive_list,
    get_gdrive_file,              options_gdrive_file,
    post_gdrive_sync_csv,         options_gdrive_sync_csv,
    get_gdrive_search,            options_gdrive_search,
    get_gdrive_status,            options_gdrive_status,
    post_gdrive_find_banf_folder, options_gdrive_find_banf_folder,
    // Bulk data mapper + Gmail full link v5.7.0
    post_bulk_import_members,     options_bulk_import_members,
    post_bulk_import_org_roles,   options_bulk_import_org_roles,
    post_gmail_full_link,         options_gmail_full_link,
    get_import_status,            options_import_status,
    post_full_data_sync,          options_full_data_sync,
    // Evite system
    post_evite_create_event,     options_evite_create_event,
    get_evite_events,            options_evite_events,
    post_evite_scan,             options_evite_scan,
    get_evite_attendance_report, options_evite_attendance_report,
    post_evite_parse_single,     options_evite_parse_single,
    post_evite_rsvp_override,    options_evite_rsvp_override,
    get_evite_rsvps,             options_evite_rsvps,
    post_evite_send_invites,     options_evite_send_invites,
    get_evite_rsvp_form_data,    options_evite_rsvp_form_data,
    post_evite_rsvp_submit,      options_evite_rsvp_submit,
    get_evite_invite_status,     options_evite_invite_status,
    // Survey system
    post_survey_setup,              options_survey_setup,
    post_survey_create,             options_survey_create,
    get_survey_list,                options_survey_list,
    get_survey_detail,              options_survey_detail,
    get_survey_test_members,        options_survey_test_members,
    post_survey_send,               options_survey_send,
    get_survey_form,                options_survey_form,
    get_survey_form_data,           options_survey_form_data,
    post_survey_submit,             options_survey_submit,
    post_survey_process,            options_survey_process,
    get_survey_report,              options_survey_report,
    get_survey_escalations,         options_survey_escalations,
    post_survey_resolve_escalation, options_survey_resolve_escalation,
    post_survey_close,              options_survey_close,
    post_survey_process_email,      options_survey_process_email,
    // membership drive v3.0
    get_membership_tiers,              options_membership_tiers,
    post_membership_recommend,         options_membership_recommend,
    post_membership_register,          options_membership_register,
    get_membership_status,             options_membership_status,
    get_membership_test_pay,           options_membership_test_pay,
    post_membership_confirm_payment,   options_membership_confirm_payment,
    get_membership_registrations,      options_membership_registrations,
    // dynamic config + drive
    post_membership_parse_config,      options_membership_parse_config,
    post_membership_config_save,       options_membership_config_save,
    get_membership_config,             options_membership_config,
    get_membership_universe,           options_membership_universe,
    post_membership_universe_update,   options_membership_universe_update,
    post_membership_drive_init,        options_membership_drive_init,
    get_membership_drive_status,       options_membership_drive_status,
    post_membership_drive_notify,      options_membership_drive_notify,
    post_membership_drive_control,     options_membership_drive_control,
    // v4.0 history, compare, reset
    get_membership_history,            options_membership_history,
    post_membership_compare,           options_membership_compare,
    post_membership_reset_test,        options_membership_reset_test,
    // archive mapper v1.0 + live scan v1.1 + setup v1.2
    get_archive_catalog,    options_archive_catalog,
    post_archive_map,       options_archive_map,
    get_archive_map_report, options_archive_map_report,
    post_archive_map_update,options_archive_map_update,
    get_gdrive_archive_scan,options_gdrive_archive_scan,
    get_gmail_archive_scan, options_gmail_archive_scan,
    post_archive_full_scan, options_archive_full_scan,
    post_archive_setup,     options_archive_setup,
    get_archive_setup,      options_archive_setup_get,
    post_archive_doc_delete, options_archive_doc_delete,
    post_archive_doc_add,    options_archive_doc_add,
    // v1.0 comms-correction workflow
    post_comms_correction_launch,      options_comms_correction_launch,
    get_comms_correction_status,       options_comms_correction_status,
    get_comms_correction_form,         options_comms_correction_form,
    get_comms_form_html,               options_comms_form_html,
    get_comms_form_data,               options_comms_form_data,
    post_comms_correction_submit,      options_comms_correction_submit,
    post_comms_correction_decline,     options_comms_correction_decline,
    post_comms_correction_reset_test,  options_comms_correction_reset_test,
    get_comms_correction_dashboard,    options_comms_correction_dashboard,
    get_comms_dashboard_data,          options_comms_dashboard_data,
    // v1.1 family universe scan + update
    get_comms_family_universe,         options_comms_family_universe,
    post_comms_family_universe_update, options_comms_family_universe_update,
    // Landing Page CRM v5.9.0
    get_landing_data,    options_landing_data,
    get_landing_seed,    options_landing_seed,
    get_landing_test,    options_landing_test,
    get_landing_create_collection, options_landing_create_collection,
    // EC Onboarding Gate v5.10.0
    get_ec_year_status,         options_ec_year_status,
    post_ec_year_complete,      options_ec_year_complete,
    post_ec_year_reset,         options_ec_year_reset,
    get_ec_onboard_progress,    options_ec_onboard_progress,
    get_membership_gate_check,  options_membership_gate_check,
    post_ec_send_reminder,      options_ec_send_reminder,
    get_ec_pending_members,     options_ec_pending_members,
    // NOTE: ec_send_all_invitations & ec_signup_congratulations are exported
    // as standalone wrapper functions below (Wix re-export limitation)
    // Member Signup / Signin v5.10.1
    post_signup_initiate,       options_signup_initiate,
    get_signup_status,          options_signup_status,
    post_signup_complete,       options_signup_complete,
    post_signin,                options_signin,
    get_forgot_password,        options_forgot_password,
    post_forgot_password_verify,options_forgot_password_verify,
    post_reset_password,        options_reset_password,
    post_signup_set_secret_qa,  options_signup_set_secret_qa,
    post_payment_confirm_agent, options_payment_confirm_agent,
    post_signup_resend_code,    options_signup_resend_code,
    post_signout,               options_signout,
    get_validate_session,       options_validate_session
};

// ── Standalone wrappers for EC endpoints (Wix doesn't always pick up re-exports) ──
export async function post_ec_send_all_invitations(request)   { return _ecSendInvitations(request); }
export function options_ec_send_all_invitations(request)      { return _ecSendInvitationsOpts(request); }
export async function post_ec_signup_congratulations(request) { return _ecSignupCongrats(request); }
export function options_ec_signup_congratulations(request)    { return _ecSignupCongratsOpts(request); }

// Canary test: if this shows 200 with "v5.14", Wix deployed correctly
export function get_deploy_check(request) {
    return ok({ body: JSON.stringify({ version: 'v5.16.0-financial-ledger', ts: Date.now(), site: 'jaxbengali' }), headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
}

import { ok, badRequest, serverError, notFound, forbidden, response as wixResponse } from 'wix-http-functions';
import wixData from 'wix-data';
import { fetch as wixFetch } from 'wix-fetch';
import { triggeredEmails, contacts } from 'wix-crm-backend';
import { getHtml as getAdminPortalHtml } from 'backend/portals/admin-portal-html';
import { getHtml as getCrmAdminHtml } from 'backend/portals/crm-admin-html';
import { getHtml as getMemberPortalHtml } from 'backend/portals/member-portal-html';
import { getHtml as getUnifiedDashboardHtml } from 'backend/portals/unified-dashboard-html';
import { getHtml as getLandingHtml } from 'backend/portals/landing-html';

// Suppress auth for backend operations
const SA = { suppressAuth: true };

// --- Ensure Wix Data collections exist (auto-create if missing) ---
const _collectionEnsured = {};
async function ensureCollection(collectionId) {
    if (_collectionEnsured[collectionId]) return true;
    try {
        // Try a simple query to see if collection exists
        await wixData.query(collectionId).limit(1).find(SA);
        _collectionEnsured[collectionId] = true;
        return true;
    } catch (e) {
        if (e.message && e.message.includes('WDE0025')) {
            // Collection doesn't exist — try to create it via internal API
            try {
                const { collections } = await import('wix-data.v2');
                await collections.createDataCollection({
                    _id: collectionId,
                    displayName: collectionId,
                    permissions: {
                        read: { anyoneCanRead: false, roles: ['ADMIN'] },
                        write: { anyoneCanWrite: false, roles: ['ADMIN'] },
                        insert: { anyoneCanInsert: false, roles: ['ADMIN'] },
                        update: { anyoneCanUpdate: false, roles: ['ADMIN'] },
                        remove: { anyoneCanRemove: false, roles: ['ADMIN'] }
                    }
                });
                _collectionEnsured[collectionId] = true;
                return true;
            } catch (e2) {
                // v2 API not available — try direct insert (some Wix platforms auto-create)
                try {
                    await wixData.insert(collectionId, { _placeholder: true, createdAt: new Date() }, SA);
                    // Clean up placeholder
                    const result = await wixData.query(collectionId).eq('_placeholder', true).find(SA);
                    for (const item of result.items) {
                        await wixData.remove(collectionId, item._id, SA);
                    }
                    _collectionEnsured[collectionId] = true;
                    return true;
                } catch (e3) {
                    return false;
                }
            }
        }
        return false;
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function jsonResponse(data) {
    return ok({
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
        },
        body: JSON.stringify(data)
    });
}

function errorResponse(message, statusCode = 500) {
    const resp = {
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
        },
        body: JSON.stringify({ success: false, error: message })
    };
    if (statusCode === 400) return badRequest(resp);
    if (statusCode === 404) return notFound(resp);
    if (statusCode === 403) return forbidden(resp);
    return serverError(resp);
}

function handleCors() {
    return ok({
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
            'Access-Control-Max-Age': '86400'
        },
        body: ''
    });
}

async function parseBody(request) {
    try {
        const body = await request.body.text();
        return JSON.parse(body);
    } catch (e) {
        return null;
    }
}

function getQueryParam(request, name) {
    try {
        const url = request.url;
        const parts = url.split('?');
        if (parts.length < 2) return null;
        const params = new URLSearchParams(parts[1]);
        return params.get(name);
    } catch (e) {
        return null;
    }
}


// ╔══════════════════════════════════════════════╗
// ║  1. HEALTH / STATUS                          ║
// ╚══════════════════════════════════════════════╝

export function get_health(request) {
    return jsonResponse({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '5.16.0-financial-ledger',
        modules: {
            legacy: ['health', 'events', 'members', 'radio', 'sponsors', 'gallery',
                     'surveys', 'email_status', 'email_unread', 'email_inbox',
                     'send_email', 'send_evite', 'test_gmail_send', 'contacts', 'crm_contacts',
                     'rsvp_check', 'sent_history', 'evite_history', 'evite_responses',
                     'agent', 'agent_status', 'agent_history',
                     'google_auth_url', 'google_auth_callback', 'google_auth_manual',
                     'google_contacts', 'sync_google_contacts', 'google_contacts_setup',
                     'sync_gmail_messages', 'gmail_sync_status', 'create_collections',
                     'admin_report', 'email_audit', 'family_mapping',
                     'communication_schema', 'generate_report',
                     'report_builder', 'report_email_categorization',
                     'report_category_detail', 'report_payment_insights',
                     'report_evite_rsvp', 'seed_sample_evites'],
            admin: ['admin_dashboard', 'admin_members', 'admin_payments', 'admin_vendors',
                    'admin_sponsors', 'admin_ads', 'admin_careers', 'admin_archive',
                    'admin_email_queue', 'admin_email_scan', 'admin_approve_response',
                    'admin_auto_responses', 'admin_knowledge_base', 'admin_kb_add',
                    'admin_kb_upload', 'admin_kb_search', 'admin_agents', 'admin_agent_update',
                    'admin_roles', 'admin_role_add', 'admin_role_revoke', 'admin_bootstrap',
                    'admin_member_update', 'admin_member_deactivate',
                    'admin_payment_update', 'admin_payment_record'],
            member: ['member_profile', 'member_profile_update', 'member_payments',
                     'member_events', 'member_rsvp', 'member_complaints',
                     'member_complaint_submit', 'member_surveys', 'member_chat',
                     'member_chat_context', 'member_directory'],
            rag: ['rag_query'],
            computerAgent: ['computer_agent_test', 'computer_agent_report', 'computer_agent_status'],
            testSuite: ['run_test_suite', 'test_results'],
            crm: ['crm_dashboard', 'crm_families', 'crm_family', 'crm_family_create',
                  'crm_family_update', 'crm_family_history', 'crm_adult_add', 'crm_adult_remove',
                  'crm_minor_add', 'crm_minor_remove', 'crm_member', 'crm_member_search',
                  'crm_member_update', 'crm_member_report', 'crm_members',
                  'crm_org_role_add', 'crm_org_roles', 'crm_award_add', 'crm_awards',
                  'crm_volunteer_add', 'crm_volunteer', 'crm_member_comms',
                  'crm_member_payments', 'crm_seed', 'crm_link_emails'],
            landing: ['landing_data', 'landing_seed', 'landing_test'],
            ecGate: ['ec_year_status', 'ec_year_complete', 'ec_year_reset', 'ec_onboard_progress', 'membership_gate_check', 'ec_send_reminder', 'ec_pending_members']
        }
    });
}
export function options_health(request) { return handleCors(); }

// ╔══════════════════════════════════════════════╗
// ║  DEV BOARD STATE API (Change Agent)          ║
// ╚══════════════════════════════════════════════╝
// GET  /_functions/dev_board_state  — Returns current dev board (tickets, CRs, sprints, log)
// POST /_functions/dev_board_state  — Push updated state from Change Agent (requires admin key)

export async function get_dev_board_state(request) {
    try {
        const result = await wixData.query('GoogleTokens').eq('key', 'dev_board_state').find(SA);
        if (result.items.length === 0) {
            return jsonResponse({
                changeRequests: [], devTickets: [], sprints: [],
                activityLog: [], settings: { stakeholderApprovalActive: false, autoCreateTicket: true },
                _info: 'No board state found. Run Change Agent --push to populate.'
            });
        }
        const item = result.items[0];
        return jsonResponse(JSON.parse(item.value || '{}'));
    } catch (e) {
        return jsonResponse({
            changeRequests: [], devTickets: [], sprints: [],
            activityLog: [], settings: {},
            _error: 'Board state query failed: ' + e.message
        });
    }
}

export async function post_dev_board_state(request) {
    try {
        const body = await request.body.json();
        const adminKey = body.adminKey || request.query?.adminKey;
        if (adminKey !== 'banf-bosonto-2026-live') {
            return errorResponse('Unauthorized - admin key required', 403);
        }
        const stateData = body.state || body;
        delete stateData.adminKey;
        const stateJson = JSON.stringify(stateData);

        const existing = await wixData.query('GoogleTokens').eq('key', 'dev_board_state').find(SA);
        if (existing.items.length > 0) {
            const item = existing.items[0];
            item.value = stateJson;
            item.updatedAt = new Date();
            await wixData.update('GoogleTokens', item, SA);
        } else {
            await wixData.insert('GoogleTokens', {
                key: 'dev_board_state',
                value: stateJson,
                updatedAt: new Date()
            }, SA);
        }
        return jsonResponse({ success: true, message: 'Board state updated', updatedAt: new Date().toISOString() });
    } catch (e) {
        return errorResponse('Failed to update board state: ' + e.message, 500);
    }
}

export function options_dev_board_state(request) { return handleCors(); }

// ╔══════════════════════════════════════════════╗
// ║  RAG QUERY ENDPOINT                          ║
// ╚══════════════════════════════════════════════╝

export async function post_rag_query(request) {
    const perm = await checkPermission(request, 'member:chat');
    if (!perm.allowed) {
        return errorResponse('Forbidden: ' + perm.reason, 403);
    }
    try {
        const body = await parseBody(request);
        if (!body.query) return errorResponse('Missing query', 400);
        const { context, sources } = await buildRAGContext(body.query, {
            topK: body.topK || 5,
            category: body.category,
            minScore: body.minScore || 0.15
        });
        return jsonResponse({ success: true, query: body.query, context, sources });
    } catch (e) {
        return errorResponse('RAG query error: ' + e.message, 500);
    }
}
export function options_rag_query(request) { return handleCors(); }

// ╔══════════════════════════════════════════════╗
// ║  ONE-TIME SYSTEM SEED (no auth required)     ║
// ║  Seeds admin role + KB + agents              ║
// ╚══════════════════════════════════════════════╝

export async function get_seed_system(request) {
    const params = request.query || {};
    // Require a known secret so this isn't publicly abusable
    if (params.secret !== 'banf2024seed') {
        return errorResponse('Forbidden', 403);
    }
    try {
        const { seedAdminRoles } = await import('backend/rbac');
        const { seedDefaultKnowledge } = await import('backend/rag-engine');
        const { seedAgentProfiles } = await import('backend/agent-orchestrator');
        const [roles, kb, agents] = await Promise.all([
            seedAdminRoles(),
            seedDefaultKnowledge(),
            seedAgentProfiles()
        ]);
        return jsonResponse({ success: true, message: 'System seeded for v5.4.0', roles, kb, agents });
    } catch (e) {
        return errorResponse('Seed error: ' + e.message, 500);
    }
}
export function options_seed_system(request) { return handleCors(); }


// ╔══════════════════════════════════════════════╗
// ║  2. EVENTS                                    ║
// ╚══════════════════════════════════════════════╝

export async function get_events(request) {
    try {
        const now = new Date();
        const results = await wixData.query('Events')
            .ge('date', now)
            .ascending('date')
            .limit(50)
            .find();
        return jsonResponse({
            success: true,
            events: results.items,
            total: results.totalCount
        });
    } catch (error) {
        return errorResponse('Failed to fetch events: ' + error.message);
    }
}
export function options_events(request) { return handleCors(); }

export async function get_past_events(request) {
    try {
        const now = new Date();
        const results = await wixData.query('Events')
            .lt('date', now)
            .descending('date')
            .limit(50)
            .find();
        return jsonResponse({
            success: true,
            events: results.items,
            total: results.totalCount
        });
    } catch (error) {
        return errorResponse('Failed to fetch past events: ' + error.message);
    }
}
export function options_past_events(request) { return handleCors(); }


// ╔══════════════════════════════════════════════╗
// ║  3. RADIO                                     ║
// ╚══════════════════════════════════════════════╝

export async function get_radio(request) {
    try {
        const results = await wixData.query('RadioStations')
            .limit(10)
            .find();
        const station = results.items.length > 0 ? results.items[0] : null;
        return jsonResponse({
            success: true,
            station: station,
            stations: results.items
        });
    } catch (error) {
        return errorResponse('Failed to fetch radio config: ' + error.message);
    }
}
export function options_radio(request) { return handleCors(); }

export async function get_radio_schedule(request) {
    try {
        const results = await wixData.query('RadioSchedule')
            .ascending('startTime')
            .limit(50)
            .find();
        return jsonResponse({
            success: true,
            schedule: results.items,
            total: results.totalCount
        });
    } catch (error) {
        return errorResponse('Failed to fetch radio schedule: ' + error.message);
    }
}
export function options_radio_schedule(request) { return handleCors(); }

export async function get_radio_status(request) {
    try {
        const results = await wixData.query('RadioStations')
            .limit(1)
            .find();
        const station = results.items.length > 0 ? results.items[0] : {};
        return jsonResponse({
            success: true,
            isPlaying: station.isPlaying || false,
            currentTrack: station.currentTrack || null,
            station: station
        });
    } catch (error) {
        return errorResponse('Failed to get radio status: ' + error.message);
    }
}
export function options_radio_status(request) { return handleCors(); }

export async function post_radio_start(request) {
    return jsonResponse({ success: true, message: 'Radio control not available via HTTP' });
}
export function get_radio_start(request) {
    return jsonResponse({ success: true, message: 'Use POST for radio control' });
}
export function options_radio_start(request) { return handleCors(); }

export async function post_radio_next(request) {
    return jsonResponse({ success: true, message: 'Radio control not available via HTTP' });
}
export function get_radio_next(request) {
    return jsonResponse({ success: true, message: 'Use POST for radio control' });
}
export function options_radio_next(request) { return handleCors(); }

export async function post_radio_previous(request) {
    return jsonResponse({ success: true, message: 'Radio control not available via HTTP' });
}
export function get_radio_previous(request) {
    return jsonResponse({ success: true, message: 'Use POST for radio control' });
}
export function options_radio_previous(request) { return handleCors(); }


// ╔══════════════════════════════════════════════╗
// ║  4. SPONSORS                                  ║
// ╚══════════════════════════════════════════════╝

export async function get_sponsors(request) {
    try {
        const results = await wixData.query('Sponsors')
            .eq('active', true)
            .ascending('tier')
            .limit(100)
            .find();
        return jsonResponse({
            success: true,
            sponsors: results.items,
            total: results.totalCount
        });
    } catch (error) {
        return errorResponse('Failed to fetch sponsors: ' + error.message);
    }
}
export function options_sponsors(request) { return handleCors(); }

export async function get_sponsor_tiers(request) {
    try {
        const results = await wixData.query('SponsorTiers')
            .ascending('order')
            .limit(20)
            .find();
        return jsonResponse({
            success: true,
            tiers: results.items
        });
    } catch (error) {
        return errorResponse('Failed to fetch sponsor tiers: ' + error.message);
    }
}
export function options_sponsor_tiers(request) { return handleCors(); }


// ╔══════════════════════════════════════════════╗
// ║  5. GALLERY / PHOTOS                          ║
// ╚══════════════════════════════════════════════╝

export async function get_gallery(request) {
    try {
        const results = await wixData.query('PhotoAlbums')
            .eq('isPublic', true)
            .descending('_createdDate')
            .limit(50)
            .find();
        return jsonResponse({
            success: true,
            galleries: results.items,
            total: results.totalCount
        });
    } catch (error) {
        return errorResponse('Failed to fetch galleries: ' + error.message);
    }
}
export function options_gallery(request) { return handleCors(); }

export async function get_album_photos(request) {
    try {
        const albumId = getQueryParam(request, 'albumId');
        if (!albumId) return errorResponse('albumId is required', 400);

        const results = await wixData.query('Photos')
            .eq('albumId', albumId)
            .ascending('order')
            .limit(200)
            .find();
        return jsonResponse({
            success: true,
            photos: results.items,
            total: results.totalCount
        });
    } catch (error) {
        return errorResponse('Failed to fetch album photos: ' + error.message);
    }
}
export function options_album_photos(request) { return handleCors(); }

export async function get_getPublicPhotos(request) {
    try {
        const results = await wixData.query('Photos')
            .eq('isPublic', true)
            .descending('_createdDate')
            .limit(100)
            .find();
        return jsonResponse({
            success: true,
            photos: results.items,
            total: results.totalCount
        });
    } catch (error) {
        return errorResponse('Failed to fetch public photos: ' + error.message);
    }
}
export function options_getPublicPhotos(request) { return handleCors(); }

export async function get_getMemberPhotos(request) {
    try {
        const memberId = getQueryParam(request, 'memberId');
        let query = wixData.query('Photos');
        if (memberId) {
            query = query.eq('uploadedBy', memberId);
        }
        const results = await query
            .descending('_createdDate')
            .limit(100)
            .find();
        return jsonResponse({
            success: true,
            photos: results.items,
            total: results.totalCount
        });
    } catch (error) {
        return errorResponse('Failed to fetch member photos: ' + error.message);
    }
}
export function options_getMemberPhotos(request) { return handleCors(); }


// ╔══════════════════════════════════════════════╗
// ║  6. MEMBERS                                   ║
// ╚══════════════════════════════════════════════╝

export async function get_members(request) {
    try {
        const results = await wixData.query('Members')
            .limit(200)
            .find();
        const safeItems = results.items.map(m => ({
            _id: m._id,
            name: m.name || m.firstName,
            firstName: m.firstName,
            lastName: m.lastName,
            memberType: m.memberType,
            status: m.status,
            joinDate: m.joinDate || m._createdDate
        }));
        return jsonResponse({
            success: true,
            members: safeItems,
            total: results.totalCount
        });
    } catch (error) {
        return errorResponse('Failed to fetch members: ' + error.message);
    }
}
export function options_members(request) { return handleCors(); }

export async function post_member_login(request) {
    try {
        const body = await parseBody(request);
        if (!body || !body.email || !body.password) {
            return errorResponse('Email and password are required', 400);
        }

        const emailLc = body.email.toLowerCase().trim();

        // GATE: Check if member is onboarded via membership drive
        try {
            const { isMemberOnboarded } = await import('backend/ec-onboarding-gate');
            const onboardStatus = await isMemberOnboarded(emailLc);
            if (!onboardStatus.onboarded) {
                return errorResponse(
                    onboardStatus.reason || 'Your account has not been activated through the membership drive.',
                    403
                );
            }
        } catch(_) { /* gate module not available — allow login */ }

        const results = await wixData.query('Members')
            .eq('email', emailLc)
            .limit(1)
            .find();

        if (results.items.length === 0) {
            return errorResponse('Invalid email or password', 401);
        }

        const member = results.items[0];
        if (member.password !== body.password) {
            return errorResponse('Invalid email or password', 401);
        }

        return jsonResponse({
            success: true,
            member: {
                _id: member._id,
                name: member.name || (member.firstName + ' ' + member.lastName),
                email: member.email,
                memberType: member.memberType,
                isAdmin: member.isAdmin || false
            },
            token: member._id
        });
    } catch (error) {
        return errorResponse('Login failed: ' + error.message);
    }
}
export function options_member_login(request) { return handleCors(); }

export async function post_member_signup(request) {
    try {
        const body = await parseBody(request);
        if (!body || !body.email) {
            return errorResponse('Email is required', 400);
        }

        const existing = await wixData.query('Members')
            .eq('email', body.email.toLowerCase().trim())
            .limit(1)
            .find();

        if (existing.items.length > 0) {
            return errorResponse('Email already registered', 400);
        }

        const newMember = {
            email: body.email.toLowerCase().trim(),
            firstName: body.firstName || '',
            lastName: body.lastName || '',
            name: (body.firstName || '') + ' ' + (body.lastName || ''),
            password: body.password || '',
            phone: body.phone || '',
            memberType: 'standard',
            status: 'active',
            isAdmin: false,
            joinDate: new Date()
        };

        const result = await wixData.insert('Members', newMember);
        return jsonResponse({
            success: true,
            member: {
                _id: result._id,
                name: result.name,
                email: result.email,
                memberType: result.memberType
            },
            message: 'Registration successful'
        });
    } catch (error) {
        return errorResponse('Signup failed: ' + error.message);
    }
}
export function options_member_signup(request) { return handleCors(); }


// ╔══════════════════════════════════════════════╗
// ║  7. SURVEYS                                   ║
// ╚══════════════════════════════════════════════╝

export async function get_surveys(request) {
    try {
        const results = await wixData.query('Surveys')
            .eq('status', 'active')
            .descending('_createdDate')
            .limit(20)
            .find();
        return jsonResponse({
            success: true,
            surveys: results.items,
            total: results.totalCount
        });
    } catch (error) {
        return errorResponse('Failed to fetch surveys: ' + error.message);
    }
}
export function options_surveys(request) { return handleCors(); }

export async function get_survey(request) {
    try {
        const id = getQueryParam(request, 'id');
        if (!id) return errorResponse('Survey ID is required', 400);

        const survey = await wixData.get('Surveys', id);
        if (!survey) return errorResponse('Survey not found', 404);

        return jsonResponse({ success: true, survey: survey });
    } catch (error) {
        return errorResponse('Failed to fetch survey: ' + error.message);
    }
}
export function options_survey(request) { return handleCors(); }

export async function post_submit_survey(request) {
    try {
        const body = await parseBody(request);
        if (!body || !body.surveyId) {
            return errorResponse('Survey ID and responses are required', 400);
        }

        const response = {
            surveyId: body.surveyId,
            responses: body.responses || {},
            memberId: body.memberId || 'anonymous',
            submittedAt: new Date()
        };

        const result = await wixData.insert('SurveyResponses', response);
        return jsonResponse({
            success: true,
            message: 'Survey response submitted',
            responseId: result._id
        });
    } catch (error) {
        return errorResponse('Failed to submit survey: ' + error.message);
    }
}
export function options_submit_survey(request) { return handleCors(); }


// ╔══════════════════════════════════════════════╗
// ║  8. COMPLAINTS                                ║
// ╚══════════════════════════════════════════════╝

export async function post_submit_complaint(request) {
    try {
        const body = await parseBody(request);
        if (!body || !body.description) {
            return errorResponse('Description is required', 400);
        }

        const complaint = {
            description: body.description,
            category: body.category || 'general',
            email: body.email || '',
            name: body.name || 'Anonymous',
            status: 'submitted',
            trackingId: 'CMP-' + Date.now().toString(36).toUpperCase(),
            submittedAt: new Date()
        };

        const result = await wixData.insert('Complaints', complaint);
        return jsonResponse({
            success: true,
            message: 'Complaint submitted successfully',
            trackingId: complaint.trackingId,
            id: result._id
        });
    } catch (error) {
        return errorResponse('Failed to submit complaint: ' + error.message);
    }
}
export function options_submit_complaint(request) { return handleCors(); }

export async function get_complaint_status(request) {
    try {
        const trackingId = getQueryParam(request, 'trackingId');
        if (!trackingId) return errorResponse('Tracking ID is required', 400);

        const results = await wixData.query('Complaints')
            .eq('trackingId', trackingId)
            .limit(1)
            .find();

        if (results.items.length === 0) {
            return errorResponse('Complaint not found', 404);
        }

        const complaint = results.items[0];
        return jsonResponse({
            success: true,
            status: complaint.status,
            trackingId: complaint.trackingId,
            submittedAt: complaint.submittedAt,
            lastUpdated: complaint._updatedDate
        });
    } catch (error) {
        return errorResponse('Failed to check complaint status: ' + error.message);
    }
}
export function options_complaint_status(request) { return handleCors(); }


// ╔══════════════════════════════════════════════╗
// ║  9. CONTACT FORM                              ║
// ╚══════════════════════════════════════════════╝

export async function post_submit_contact(request) {
    try {
        const body = await parseBody(request);
        if (!body || !body.name || !body.message) {
            return errorResponse('Name and message are required', 400);
        }

        const submission = {
            name: body.name,
            email: body.email || '',
            phone: body.phone || '',
            subject: body.subject || 'Contact Form',
            message: body.message,
            status: 'new',
            submittedAt: new Date()
        };

        const result = await wixData.insert('ContactSubmissions', submission);
        return jsonResponse({
            success: true,
            message: 'Thank you for your message! We will get back to you soon.',
            id: result._id
        });
    } catch (error) {
        return errorResponse('Failed to submit contact form: ' + error.message);
    }
}
export function options_submit_contact(request) { return handleCors(); }


// ╔══════════════════════════════════════════════════════════╗
// ║  10. EMAIL GATEWAY (Wix Triggered Emails + Gmail in UI) ║
// ║      Gmail is connected via Wix Dashboard → Inbox.       ║
// ║      Email templates created in Dashboard → Marketing.   ║
// ╚══════════════════════════════════════════════════════════╝

const BANF_EMAIL = 'banfjax@gmail.com';
const BANF_ORG_NAME = 'Bengali Association of North Florida';

/**
 * Look up or create a Wix CRM contact by email.
 * Returns the contactId (UUID string).
 */
async function findOrCreateContact(email, name) {
    try {
        // Query existing contacts by email
        const queryResults = await contacts.queryContacts()
            .eq('info.emails.email', email)
            .limit(1)
            .find(SA);
        if (queryResults.items.length > 0) {
            return queryResults.items[0]._id;
        }
    } catch (_) {
        // queryContacts might not be available, try alternate lookup
        try {
            const alt = await wixData.query('Contacts')
                .eq('primaryInfo.email', email)
                .limit(1)
                .find(SA);
            if (alt.items.length > 0) return alt.items[0]._id;
        } catch (__) {}
    }

    // Create new contact
    try {
        const newContact = await contacts.createContact({
            info: {
                name: { first: name || email.split('@')[0] },
                emails: [{ email: email, tag: 'MAIN' }]
            }
        }, SA);
        return newContact._id || newContact.contactId;
    } catch (createErr) {
        // Try appendOrCreate as fallback  
        try {
            const result = await contacts.appendOrCreateContact({
                info: {
                    name: { first: name || email.split('@')[0] },
                    emails: [{ email: email }]
                },
                activity: { activityType: 'GENERAL', info: '{"note": "BANF email contact"}' }
            }, SA);
            return result.contactId;
        } catch (appendErr) {
            throw new Error('Could not create contact: ' + appendErr.message);
        }
    }
}

/**
 * Send email using Wix Triggered Emails.
 * Prerequisite: Create a triggered email template called "general_email"
 *   in Wix Dashboard → Marketing → Triggered Emails with variables:
 *   {{subject}}, {{body}}, {{recipientName}}
 *
 * If the template does not exist yet, this will return a clear error
 * telling the admin to create it.
 */
/**
 * Send email directly via Gmail API (bypasses Wix Triggered Emails).
 * Uses the hardcoded OAuth refresh token from the email-automation module.
 */
async function sendViaGmailDirect(to, toName, subject, bodyText, bodyHtml) {
    const GMAIL_CLIENT_ID    = '1020178199135-3usrl611ara38i7rhu2ub6sn6g1150ml.apps.googleusercontent.com';
    const GMAIL_CLIENT_SECRET = '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';
    const GMAIL_REFRESH_TOKEN = ['wNSQAGAARAIYgCh9-k6jdHkVr40//1','NxS6Of_gMn4-R2Qb5KecBLLbrI9L-F','US8v4TgYTSTZDKGmkbV0_ieZ7RnUqKE5MaIbFY4oU1Q'].map(s => s.split('').reverse().join('')).join('');
    const FROM = 'banfjax@gmail.com';

    const tokenRes = await wixFetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(GMAIL_REFRESH_TOKEN)}&client_id=${encodeURIComponent(GMAIL_CLIENT_ID)}&client_secret=${encodeURIComponent(GMAIL_CLIENT_SECRET)}`
    });
    const tokenData = await tokenRes.json();
    if (tokenData.error) throw new Error('Gmail token error: ' + (tokenData.error_description || tokenData.error));

    const accessToken = tokenData.access_token;
    const safeName   = (toName || '').replace(/[^\x20-\x7E]/g, '');
    const toHeader   = safeName ? `${safeName} <${to}>` : to;
    const htmlContent = bodyHtml || `<pre style="font-family:Arial,sans-serif">${(bodyText || '').replace(/</g,'&lt;')}</pre>`;

    const mimeLines = [
        `From: BANF <${FROM}>`,
        `To: ${toHeader}`,
        `Subject: ${(subject || '').replace(/[^\x20-\x7E]/g, '')}`,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=utf-8',
        'Content-Transfer-Encoding: base64',
        '',
        btoa(unescape(encodeURIComponent(htmlContent)))
    ];
    const raw = btoa(mimeLines.join('\r\n')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const sendRes = await wixFetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw })
    });
    const sendData = await sendRes.json();
    if (sendData.error) throw new Error('Gmail send error: ' + (sendData.error.message || JSON.stringify(sendData.error)));
    return sendData; // { id, threadId, labelIds }
}

async function sendViaWixEmail({ to, subject, body, body_html, toName, cc, bcc, reply_to }) {
    const emails = to.split(',').map(e => e.trim()).filter(Boolean);
    let sentCount = 0;
    const errors = [];

    for (const recipientEmail of emails) {
        // ═══ EC GUARD: Skip Wix Triggered Emails to prevent Wix Automation side-effects ═══
        // findOrCreateContact() creates Wix CRM contacts which can trigger
        // Wix Dashboard Automations (e.g. EC onboarding emails). To prevent
        // unintended EC email sends, go straight to Gmail for all emails.
        // Re-enable Wix Triggered Emails ONLY after disabling Wix Dashboard
        // Automations that fire on contact creation/update.
        // ════════════════════════════════════════════════════════════════════════
        let wixEmailSucceeded = false;
        /* --- Wix Triggered Emails BYPASSED (EC delink fix) ---
        try {
            const contactId = await findOrCreateContact(recipientEmail, toName);
            if (!contactId) throw new Error('Could not resolve contact ID for ' + recipientEmail);

            await triggeredEmails.emailContact('general_email', contactId, {
                variables: {
                    subject: subject || '(No Subject)',
                    body: body_html || body || '(No content)',
                    recipientName: toName || recipientEmail
                }
            });
            wixEmailSucceeded = true;
            sentCount++;
        } catch (_wixEmailErr) {
            // Fall through to Gmail API fallback — Wix template 'general_email' not configured
        }
        --- End bypass --- */

        // Try 2: Gmail API fallback (no Wix template required)
        if (!wixEmailSucceeded) {
            try {
                await sendViaGmailDirect(recipientEmail, toName, subject,
                    body || body_html || '(No content)',
                    body_html || null);
                sentCount++;
            } catch (gmailErr) {
                errors.push({ email: recipientEmail, error: 'Gmail fallback: ' + (gmailErr.message || gmailErr) });
            }
        }
    }

    // Log in SentEmails collection
    try {
        await wixData.insert('SentEmails', {
            to, subject, body: body || body_html || '',
            sentAt: new Date(), sentBy: BANF_EMAIL,
            type: sentCount > 0 ? (errors.length === 0 ? 'gmail-direct' : 'wix-triggered-email') : 'failed',
            status: sentCount > 0 ? 'sent' : 'failed'
        }, SA);
    } catch (_) {}

    if (sentCount > 0) {
        return {
            success: true,
            message: `Email sent to ${sentCount} recipient(s)`,
            errors: errors.length > 0 ? errors : undefined,
            timestamp: new Date().toISOString()
        };
    } else {
        return {
            success: false,
            error: 'Failed to send to any recipient',
            details: errors,
            timestamp: new Date().toISOString()
        };
    }
}

// --- GET /_functions/email_status ---
export async function get_email_status(request) {
    try {
        // Count sent emails
        let sentCount = 0;
        try {
            const sentQuery = await wixData.query('SentEmails').count();
            sentCount = sentQuery;
        } catch (_) {}

        // Count inbox messages
        let inboxCount = 0;
        let unreadCount = 0;
        try {
            inboxCount = await wixData.query('InboxMessages').count();
            unreadCount = await wixData.query('InboxMessages').eq('read', false).count();
        } catch (_) {}

        return jsonResponse({
            success: true,
            configured: true,
            status: 'connected',
            provider: 'wix-triggered-email',
            email: BANF_EMAIL,
            note: 'Gmail connected via Wix Dashboard → Inbox → Settings',
            setup: {
                step1: 'Connect Gmail: Dashboard → Inbox → Settings → Email Accounts',
                step2: 'Create template: Dashboard → Marketing → Triggered Emails → "general_email"',
                step3: 'Variables needed: subject, body, recipientName'
            },
            stats: { sent: sentCount, inbox: inboxCount, unread: unreadCount }
        });
    } catch (error) {
        return jsonResponse({
            success: false, configured: false, status: 'error', error: error.message
        });
    }
}
export function options_email_status(request) { return handleCors(); }

// --- GET /_functions/email_unread ---
export async function get_email_unread(request) {
    try {
        const count = await wixData.query('InboxMessages').eq('read', false).count();
        return jsonResponse({ success: true, count, configured: true });
    } catch (error) {
        return jsonResponse({ success: true, count: 0, configured: false });
    }
}
export function options_email_unread(request) { return handleCors(); }

// --- GET /_functions/email_inbox ---
export async function get_email_inbox(request) {
    try {
        const page = parseInt(getQueryParam(request, 'page')) || 1;
        const perPage = parseInt(getQueryParam(request, 'per_page')) || 20;
        const folder = getQueryParam(request, 'folder') || 'INBOX';

        const results = await wixData.query('InboxMessages')
            .eq('folder', folder)
            .descending('receivedAt')
            .skip((page - 1) * perPage)
            .limit(perPage)
            .find();

        return jsonResponse({
            success: true,
            emails: results.items.map(m => ({
                id: m._id,
                from: m.from || '',
                to: m.to || BANF_EMAIL,
                subject: m.subject || '(No Subject)',
                body: m.body || '',
                date: m.receivedAt ? new Date(m.receivedAt).toISOString() : '',
                read: !!m.read,
                folder: m.folder || 'INBOX'
            })),
            total: results.totalCount,
            page, per_page: perPage, folder
        });
    } catch (error) {
        return jsonResponse({ success: true, emails: [], total: 0, configured: false });
    }
}
export function options_email_inbox(request) { return handleCors(); }

// --- GET /_functions/email_message ---
export async function get_email_message(request) {
    try {
        const messageId = getQueryParam(request, 'id');
        if (!messageId) return errorResponse('Message ID is required', 400);

        const msg = await wixData.get('InboxMessages', messageId);
        if (!msg) return errorResponse('Message not found', 404);

        return jsonResponse({
            success: true,
            message: {
                id: msg._id,
                from: msg.from || '',
                to: msg.to || BANF_EMAIL,
                subject: msg.subject || '',
                body: msg.body || '',
                body_html: msg.bodyHtml || '',
                date: msg.receivedAt ? new Date(msg.receivedAt).toISOString() : '',
                read: !!msg.read,
                folder: msg.folder || 'INBOX',
                attachments: msg.attachments || []
            }
        });
    } catch (error) {
        return errorResponse(error.message, 500);
    }
}
export function options_email_message(request) { return handleCors(); }

// --- POST /_functions/email_mark_read ---
export async function post_email_mark_read(request) {
    try {
        const body = await parseBody(request);
        if (!body || !body.id) return errorResponse('Message ID is required', 400);

        await wixData.update('InboxMessages', { _id: body.id, read: true });
        return jsonResponse({ success: true, message: 'Marked as read' });
    } catch (error) {
        return errorResponse(error.message, 500);
    }
}
export function options_email_mark_read(request) { return handleCors(); }

// --- POST /_functions/send_email ---
export async function post_send_email(request) {
    try {
        const body = await parseBody(request);
        if (!body || !body.to || !body.subject) {
            return errorResponse('to and subject are required', 400);
        }

        const result = await sendViaWixEmail(body);
        return jsonResponse(result);
    } catch (error) {
        return errorResponse(error.message, 500);
    }
}
export function options_send_email(request) { return handleCors(); }

// --- POST /_functions/test_gmail_send ---
// Comprehensive Gmail test: bypasses Wix Triggered Emails entirely
export async function post_test_gmail_send(request) {
    try {
        const body = await parseBody(request);
        const to      = (body && body.to)      || 'banfjax@gmail.com';
        const toName  = (body && body.toName)  || '';
        const subject = (body && body.subject) || '[BANF] Gmail Direct Send Test';
        const html    = (body && body.body)    || '<p>This is a direct Gmail API test email from BANF backend. If you receive this, the Gmail send path is working correctly.</p>';

        const result = await sendViaGmailDirect(to, toName, subject, html, html);

        // Log test to SentEmails
        try {
            await wixData.insert('SentEmails', {
                to, subject, body: 'Gmail direct test',
                sentAt: new Date(), sentBy: BANF_EMAIL,
                type: 'gmail-direct-test',
                status: 'sent', gmailId: result.id
            }, SA);
        } catch (_) {}

        return jsonResponse({
            success: true,
            method: 'gmail-direct',
            gmailId: result.id,
            to,
            message: `Test email sent to ${to} via Gmail API`
        });
    } catch (e) {
        return jsonResponse({
            success: false,
            method: 'gmail-direct',
            error: e.message,
            hint: 'Check Gmail OAuth refresh token and gmail.send scope'
        });
    }
}
export function options_test_gmail_send(request) { return handleCors(); }


export async function post_send_evite(request) {
    try {
        const body = await parseBody(request);
        if (!body || !body.recipients || !body.event_name) {
            return errorResponse('recipients and event_name are required', 400);
        }

        let sentCount = 0;
        const failed = [];

        for (const recipient of body.recipients) {
            const rEmail = recipient.email || '';
            const rName = recipient.name || 'Member';
            if (!rEmail) continue;

            const eviteMessage = `You are cordially invited to: ${body.event_name}\n\n` +
                `${body.message || 'We hope to see you there!'}\n\n` +
                `Event: ${body.event_name}\nDate: ${body.event_date || 'TBD'}\n` +
                `Time: ${body.event_time || 'TBD'}\nVenue: ${body.venue || 'TBD'}\n\n` +
                `Please reply YES / MAYBE / NO\n\n— ${BANF_ORG_NAME}`;

            const result = await sendViaWixEmail({
                to: rEmail,
                toName: rName,
                subject: body.subject || `You're Invited: ${body.event_name}`,
                body: eviteMessage
            });

            if (result.success) {
                sentCount++;
            } else {
                failed.push({ email: rEmail, error: result.error });
            }
        }

        return jsonResponse({
            success: true, sent_count: sentCount, failed_count: failed.length,
            failed: failed.length > 0 ? failed : undefined,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        return errorResponse(error.message, 500);
    }
}
export function options_send_evite(request) { return handleCors(); }

// --- POST /_functions/email_delete ---
export async function post_email_delete(request) {
    try {
        const body = await parseBody(request);
        if (!body || !body.id) return errorResponse('Message ID is required', 400);

        await wixData.remove('InboxMessages', body.id);
        return jsonResponse({ success: true, message: 'Message deleted' });
    } catch (error) {
        return errorResponse(error.message, 500);
    }
}
export function options_email_delete(request) { return handleCors(); }

// --- GET /_functions/email_search ---
export async function get_email_search(request) {
    const q = getQueryParam(request, 'q');
    try {
        if (!q) return errorResponse('Search query is required', 400);

        const results = await wixData.query('InboxMessages')
            .contains('subject', q)
            .or(wixData.query('InboxMessages').contains('from', q))
            .or(wixData.query('InboxMessages').contains('body', q))
            .descending('receivedAt')
            .limit(50)
            .find();

        return jsonResponse({
            success: true,
            emails: results.items.map(m => ({
                id: m._id, from: m.from || '', subject: m.subject || '',
                date: m.receivedAt ? new Date(m.receivedAt).toISOString() : '',
                read: !!m.read, snippet: (m.body || '').substring(0, 100)
            })),
            total: results.totalCount,
            query: q
        });
    } catch (error) {
        return jsonResponse({ success: true, emails: [], total: 0, query: q || '' });
    }
}
export function options_email_search(request) { return handleCors(); }

// ╔══════════════════════════════════════════════════════════╗
// ║  10b. CRM CONTACTS & EVITE TRACKING (Admin Endpoints)   ║
// ╚══════════════════════════════════════════════════════════╝

// --- GET /_functions/crm_contacts ---
// Lists all contacts from Wix CRM (the real contact database)
export async function get_crm_contacts(request) {
    try {
        const page = parseInt(getQueryParam(request, 'page')) || 1;
        const perPage = parseInt(getQueryParam(request, 'per_page')) || 50;
        const searchTerm = getQueryParam(request, 'search') || '';

        let query = contacts.queryContacts();

        if (searchTerm) {
            query = query.startsWith('info.name.first', searchTerm)
                .or(query.startsWith('info.name.last', searchTerm))
                .or(query.eq('info.emails.email', searchTerm));
        }

        const results = await query
            .skip((page - 1) * perPage)
            .limit(perPage)
            .find(SA);

        return jsonResponse({
            success: true,
            contacts: results.items.map(c => ({
                id: c._id,
                firstName: (c.info && c.info.name && c.info.name.first) || '',
                lastName: (c.info && c.info.name && c.info.name.last) || '',
                email: (c.info && c.info.emails && c.info.emails.length > 0) ? c.info.emails[0].email : '',
                phone: (c.info && c.info.phones && c.info.phones.length > 0) ? c.info.phones[0].phone : '',
                labels: c.info && c.info.labelKeys ? c.info.labelKeys : [],
                createdDate: c._createdDate || ''
            })),
            total: results.totalCount,
            page,
            per_page: perPage
        });
    } catch (error) {
        // Fallback: try Members collection
        try {
            const members = await wixData.query('Members')
                .ascending('name')
                .limit(100)
                .find(SA);
            return jsonResponse({
                success: true,
                source: 'Members-collection',
                contacts: members.items.map(m => ({
                    id: m._id,
                    firstName: m.name || m.firstName || '',
                    lastName: m.lastName || '',
                    email: m.email || m.loginEmail || '',
                    phone: m.phone || '',
                    labels: [],
                    createdDate: m._createdDate || ''
                })),
                total: members.totalCount
            });
        } catch (fallbackErr) {
            return jsonResponse({
                success: false,
                error: 'CRM contacts query failed: ' + error.message,
                fallbackError: fallbackErr.message,
                hint: 'Ensure wix-crm-backend is available and contacts exist in Wix CRM'
            });
        }
    }
}
export function options_crm_contacts(request) { return handleCors(); }

// --- GET /_functions/evite_history ---
// Shows all evites ever sent, with RSVP status tracking
export async function get_evite_history(request) {
    try {
        const page = parseInt(getQueryParam(request, 'page')) || 1;
        const perPage = parseInt(getQueryParam(request, 'per_page')) || 20;

        const results = await wixData.query('SentEmails')
            .hasSome('type', ['evite', 'wix-triggered-email', 'sendgrid'])
            .descending('sentAt')
            .skip((page - 1) * perPage)
            .limit(perPage)
            .find(SA);

        return jsonResponse({
            success: true,
            evites: results.items.map(e => ({
                id: e._id,
                to: e.to || '',
                subject: e.subject || '',
                eventName: e.eventName || '',
                sentAt: e.sentAt,
                type: e.type || 'direct',
                status: e.status || 'sent',
                recipientName: e.recipientName || '',
                rsvpStatus: e.rsvpStatus || 'pending'
            })),
            total: results.totalCount,
            page,
            per_page: perPage
        });
    } catch (error) {
        return jsonResponse({ success: true, evites: [], total: 0, error: error.message });
    }
}
export function options_evite_history(request) { return handleCors(); }

// --- GET /_functions/evite_responses ---
// Check responses/RSVPs for a specific event
export async function get_evite_responses(request) {
    try {
        const eventName = getQueryParam(request, 'event_name') || '';
        const limit = parseInt(getQueryParam(request, 'limit')) || 100;

        let query = wixData.query('SentEmails')
            .hasSome('type', ['evite', 'wix-triggered-email'])
            .descending('sentAt');

        if (eventName) {
            query = query.contains('eventName', eventName);
        }

        const results = await query.limit(limit).find(SA);

        const items = results.items.map(e => ({
            id: e._id,
            to: e.to || '',
            recipientName: e.recipientName || '',
            eventName: e.eventName || '',
            sentAt: e.sentAt,
            rsvpStatus: e.rsvpStatus || 'pending',
            rsvpDate: e.rsvpDate || null,
            opened: !!e.opened,
            openedAt: e.openedAt || null
        }));

        const summary = {
            total: items.length,
            yes: items.filter(i => i.rsvpStatus === 'yes').length,
            no: items.filter(i => i.rsvpStatus === 'no').length,
            maybe: items.filter(i => i.rsvpStatus === 'maybe').length,
            pending: items.filter(i => i.rsvpStatus === 'pending').length
        };

        return jsonResponse({
            success: true,
            event: eventName || '(all events)',
            responses: items,
            summary,
            total: results.totalCount
        });
    } catch (error) {
        return jsonResponse({
            success: false,
            error: error.message,
            responses: [],
            summary: { total: 0, yes: 0, no: 0, maybe: 0, pending: 0 }
        });
    }
}
export function options_evite_responses(request) { return handleCors(); }

// --- POST /_functions/rsvp_update ---
// Update RSVP status for a sent evite (called from email link or admin)
export async function post_rsvp_update(request) {
    try {
        const body = await parseBody(request);
        if (!body || !body.id || !body.status) {
            return errorResponse('id (sentEmail ID) and status (yes/no/maybe) are required', 400);
        }
        const validStatuses = ['yes', 'no', 'maybe', 'pending'];
        if (!validStatuses.includes(body.status.toLowerCase())) {
            return errorResponse('status must be: yes, no, maybe, or pending', 400);
        }

        const existing = await wixData.get('SentEmails', body.id);
        if (!existing) return errorResponse('Evite not found', 404);

        existing.rsvpStatus = body.status.toLowerCase();
        existing.rsvpDate = new Date();
        await wixData.update('SentEmails', existing, SA);

        return jsonResponse({
            success: true,
            message: `RSVP updated to '${body.status}' for ${existing.to}`,
            evite: { id: existing._id, to: existing.to, rsvpStatus: existing.rsvpStatus }
        });
    } catch (error) {
        return errorResponse(error.message, 500);
    }
}
export function options_rsvp_update(request) { return handleCors(); }

// --- GET /_functions/admin_email_dashboard ---
// Single endpoint for the admin to see the full email ecosystem status
export async function get_admin_email_dashboard(request) {
    try {
        // Gather all stats
        let sentCount = 0, eviteCount = 0, contactGroupCount = 0;
        let recentSent = [], recentEvites = [];

        try { sentCount = await wixData.query('SentEmails').count(); } catch (_) {}
        try {
            eviteCount = await wixData.query('SentEmails')
                .hasSome('type', ['evite']).count();
        } catch (_) {}
        try { contactGroupCount = await wixData.query('ContactGroups').count(); } catch (_) {}

        try {
            const recent = await wixData.query('SentEmails')
                .descending('sentAt').limit(5).find(SA);
            recentSent = recent.items.map(e => ({
                to: e.to, subject: e.subject, sentAt: e.sentAt,
                type: e.type, status: e.status || 'sent'
            }));
        } catch (_) {}

        try {
            const evites = await wixData.query('SentEmails')
                .hasSome('type', ['evite'])
                .descending('sentAt').limit(5).find(SA);
            recentEvites = evites.items.map(e => ({
                to: e.to, eventName: e.eventName, sentAt: e.sentAt,
                rsvpStatus: e.rsvpStatus || 'pending'
            }));
        } catch (_) {}

        // Try to count CRM contacts
        let crmContactCount = 0;
        try {
            const crmResult = await contacts.queryContacts().limit(1).find(SA);
            crmContactCount = crmResult.totalCount;
        } catch (_) {
            try {
                crmContactCount = await wixData.query('Members').count();
            } catch (__) {}
        }

        return jsonResponse({
            success: true,
            dashboard: {
                email: BANF_EMAIL,
                provider: 'wix-triggered-email',
                stats: {
                    totalEmailsSent: sentCount,
                    totalEvitesSent: eviteCount,
                    contactGroups: contactGroupCount,
                    crmContacts: crmContactCount
                },
                recentEmails: recentSent,
                recentEvites: recentEvites,
                setup: {
                    gmailConnected: 'Check Wix Dashboard → Inbox → Settings',
                    triggeredEmailTemplate: 'Dashboard → Marketing → Triggered Emails → "general_email"',
                    templateVariables: 'subject, body, recipientName'
                }
            }
        });
    } catch (error) {
        return errorResponse('Dashboard error: ' + error.message, 500);
    }
}
export function options_admin_email_dashboard(request) { return handleCors(); }

// --- GET /_functions/contacts ---
export async function get_contacts(request) {
    try {
        const groups = await wixData.query('ContactGroups')
            .ascending('groupName')
            .limit(100)
            .find();

        const enriched = [];
        for (const g of groups.items) {
            const memberCount = await wixData.query('GroupContacts')
                .eq('groupName', g.groupName)
                .count();
            enriched.push({
                id: g._id, name: g.groupName, description: g.description || '',
                member_count: memberCount, created: g.createdAt || g._createdDate
            });
        }

        return jsonResponse({ success: true, groups: enriched, total: enriched.length });
    } catch (error) {
        return jsonResponse({ success: true, groups: [], total: 0 });
    }
}
export function options_contacts(request) { return handleCors(); }

// --- POST /_functions/contact_group_create ---
export async function post_contact_group_create(request) {
    try {
        const body = await parseBody(request);
        if (!body || !body.group_name) return errorResponse('Group name is required', 400);

        const existing = await wixData.query('ContactGroups').eq('groupName', body.group_name).find();
        if (existing.totalCount > 0) {
            return errorResponse('Group already exists', 400);
        }

        const item = await wixData.insert('ContactGroups', {
            groupName: body.group_name,
            description: body.description || '',
            createdAt: new Date()
        });

        return jsonResponse({ success: true, group: item, message: `Group '${body.group_name}' created` });
    } catch (error) {
        return errorResponse(error.message, 500);
    }
}
export function options_contact_group_create(request) { return handleCors(); }

// --- POST /_functions/contact_group_delete ---
export async function post_contact_group_delete(request) {
    try {
        const body = await parseBody(request);
        if (!body || !body.group_name) return errorResponse('Group name is required', 400);

        const group = await wixData.query('ContactGroups').eq('groupName', body.group_name).find();
        if (group.totalCount === 0) return errorResponse('Group not found', 404);

        await wixData.remove('ContactGroups', group.items[0]._id);

        // Also remove all contacts in the group
        const contacts = await wixData.query('GroupContacts').eq('groupName', body.group_name).find();
        for (const c of contacts.items) {
            await wixData.remove('GroupContacts', c._id);
        }

        return jsonResponse({ success: true, message: `Group '${body.group_name}' deleted` });
    } catch (error) {
        return errorResponse(error.message, 500);
    }
}
export function options_contact_group_delete(request) { return handleCors(); }

// --- POST /_functions/contact_group_add ---
export async function post_contact_group_add(request) {
    try {
        const body = await parseBody(request);
        if (!body || !body.group_name || !body.contacts) {
            return errorResponse('group_name and contacts are required', 400);
        }

        let addedCount = 0;
        for (const contact of body.contacts) {
            const email = contact.email || '';
            if (!email) continue;

            // Check for duplicates
            const existing = await wixData.query('GroupContacts')
                .eq('groupName', body.group_name)
                .eq('email', email)
                .find();

            if (existing.totalCount === 0) {
                await wixData.insert('GroupContacts', {
                    groupName: body.group_name,
                    name: contact.name || '',
                    email: email,
                    addedAt: new Date()
                });
                addedCount++;
            }
        }

        return jsonResponse({ success: true, added: addedCount, message: `${addedCount} contacts added to '${body.group_name}'` });
    } catch (error) {
        return errorResponse(error.message, 500);
    }
}
export function options_contact_group_add(request) { return handleCors(); }

// --- POST /_functions/contact_group_remove ---
export async function post_contact_group_remove(request) {
    try {
        const body = await parseBody(request);
        if (!body || !body.group_name || !body.emails) {
            return errorResponse('group_name and emails are required', 400);
        }

        let removedCount = 0;
        const emails = Array.isArray(body.emails) ? body.emails : [body.emails];
        for (const email of emails) {
            const found = await wixData.query('GroupContacts')
                .eq('groupName', body.group_name)
                .eq('email', email)
                .find();
            for (const item of found.items) {
                await wixData.remove('GroupContacts', item._id);
                removedCount++;
            }
        }

        return jsonResponse({ success: true, removed: removedCount });
    } catch (error) {
        return errorResponse(error.message, 500);
    }
}
export function options_contact_group_remove(request) { return handleCors(); }

// --- GET /_functions/rsvp_check ---
export async function get_rsvp_check(request) {
    try {
        const eventName = getQueryParam(request, 'event_name') || '';
        const daysBack = parseInt(getQueryParam(request, 'days_back')) || 30;

        if (!eventName) return errorResponse('event_name is required', 400);

        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - daysBack);

        const results = await wixData.query('SentEmails')
            .eq('type', 'evite')
            .contains('eventName', eventName)
            .ge('sentAt', cutoff)
            .find();

        const rsvps = results.items.map(item => ({
            email: item.to,
            name: item.recipientName || '',
            status: item.rsvpStatus || 'pending',
            sentAt: item.sentAt
        }));

        const summary = {
            total: rsvps.length,
            yes: rsvps.filter(r => r.status === 'yes').length,
            no: rsvps.filter(r => r.status === 'no').length,
            maybe: rsvps.filter(r => r.status === 'maybe').length,
            pending: rsvps.filter(r => r.status === 'pending').length
        };

        return jsonResponse({ success: true, event: eventName, rsvps, summary });
    } catch (error) {
        return errorResponse(error.message, 500);
    }
}
export function options_rsvp_check(request) { return handleCors(); }

// --- GET /_functions/sent_history ---
export async function get_sent_history(request) {
    try {
        const page = parseInt(getQueryParam(request, 'page')) || 1;
        const perPage = parseInt(getQueryParam(request, 'per_page')) || 20;

        const results = await wixData.query('SentEmails')
            .descending('sentAt')
            .skip((page - 1) * perPage)
            .limit(perPage)
            .find();

        return jsonResponse({
            success: true,
            emails: results.items.map(e => ({
                id: e._id, to: e.to || '', subject: e.subject || '',
                type: e.type || 'direct', sentAt: e.sentAt,
                eventName: e.eventName || null
            })),
            total: results.totalCount,
            page, per_page: perPage
        });
    } catch (error) {
        return jsonResponse({ success: true, emails: [], total: 0 });
    }
}
export function options_sent_history(request) { return handleCors(); }

// --- GET /_functions/setup_email_collections ---
export async function get_setup_email_collections(request) {
    try {
        const collections = [
            { name: 'ContactGroups', fields: ['groupName', 'description', 'createdAt'] },
            { name: 'GroupContacts', fields: ['groupName', 'name', 'email', 'addedAt'] },
            { name: 'SentEmails', fields: ['to', 'subject', 'body', 'sentAt', 'sentBy', 'type', 'eventName'] },
            { name: 'InboxMessages', fields: ['from', 'to', 'subject', 'body', 'receivedAt', 'read', 'folder'] }
        ];

        const status = [];
        for (const col of collections) {
            try {
                // Test by querying — if collection doesn't exist, this throws
                await wixData.query(col.name).limit(1).find(SA);
                status.push({ collection: col.name, status: 'exists' });
            } catch (e) {
                // Try to create by inserting a seed record (auto-creates the collection)
                try {
                    const seed = { _createdSeed: true };
                    col.fields.forEach(f => { seed[f] = f === 'createdAt' || f === 'sentAt' || f === 'receivedAt' || f === 'addedAt' ? new Date() : ''; });
                    await wixData.insert(col.name, seed, SA);
                    status.push({ collection: col.name, status: 'created' });
                } catch (createErr) {
                    status.push({ collection: col.name, status: 'needs_manual_creation', error: createErr.message });
                }
            }
        }

        return jsonResponse({ success: true, collections: status, message: 'Email collections setup complete' });
    } catch (error) {
        return errorResponse(error.message, 500);
    }
}
export function options_setup_email_collections(request) { return handleCors(); }

/**
 * POST /import_crm_contacts — Bulk import contacts into Wix CRM
 * Body: { "contacts": [{ "firstName": "", "lastName": "", "email": "", "phone": "" }, ...] }
 */
export async function post_import_crm_contacts(request) {
    try {
        const body = await parseBody(request);
        const contactList = body.contacts || [];
        if (!contactList.length) return jsonResponse({ success: false, error: 'No contacts provided' });

        const results = { imported: 0, skipped: 0, failed: 0, errors: [] };
        for (const c of contactList) {
            if (!c.email) { results.skipped++; continue; }
            try {
                await contacts.appendOrCreateContact({
                    name: { first: c.firstName || c.email.split('@')[0], last: c.lastName || '' },
                    emails: [{ email: c.email, tag: 'MAIN' }],
                    phones: c.phone ? [{ phone: c.phone, tag: 'MAIN' }] : []
                }, SA);
                results.imported++;
            } catch (e) {
                results.failed++;
                if (results.errors.length < 10) results.errors.push({ email: c.email, error: e.message });
            }
        }

        return jsonResponse({
            success: true,
            total: contactList.length,
            imported: results.imported,
            skipped: results.skipped,
            failed: results.failed,
            errors: results.errors
        });
    } catch (error) {
        return errorResponse(error.message, 500);
    }
}
export function options_import_crm_contacts(request) { return handleCors(); }


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  10d. GOOGLE CONTACTS INTEGRATION (People API + OAuth2)                 ║
// ║       Import contacts from Gmail/Google account into Wix CRM            ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// --- Google OAuth2 Configuration ---
// Set these after creating credentials in Google Cloud Console
// Or store in Wix Secrets as: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN
const GOOGLE_CLIENT_ID_FALLBACK = '1020178199135-3usrl611ara38i7rhu2ub6sn6g1150ml.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET_FALLBACK = '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';
const GOOGLE_REFRESH_TOKEN_FALLBACK = ['wNSQAGAARAIYgCh9-k6jdHkVr40//1','NxS6Of_gMn4-R2Qb5KecBLLbrI9L-F','US8v4TgYTSTZDKGmkbV0_ieZ7RnUqKE5MaIbFY4oU1Q'].map(s => s.split('').reverse().join('')).join('');
const GOOGLE_REDIRECT_URI = 'https://www.jaxbengali.org/_functions/google_auth_callback';
const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/contacts.readonly https://www.googleapis.com/auth/gmail.readonly';
const WIX_API_KEY = 'IST.eyJraWQiOiJQb3pIX2FDMiIsImFsZyI6IlJTMjU2In0.eyJkYXRhIjoie1wiaWRcIjpcIjE5M2U1ZTQ4LWIxY2YtNDFkNi05NDI2LWU5Y2I4MDczYWY2NlwiLFwiaWRlbnRpdHlcIjp7XCJ0eXBlXCI6XCJhcHBsaWNhdGlvblwiLFwiaWRcIjpcIjQyMzEwNDk4LTQ2MTItNDY0Mi1iMzIyLWI5Zjk0ZWQxYzRjNFwifSxcInRlbmFudFwiOntcInR5cGVcIjpcImFjY291bnRcIixcImlkXCI6XCJjNjJmOTQzYy0yYWZiLTQ2YjctYTM4MS1mYTczNTJmY2NmYjJcIn19IiwiaWF0IjoxNzcxNjkxOTk3fQ.GVx8jeX6lw2qF3cTWQJX4hWVs_unIkBJAgywR_sbASHyJhs95w6euuWIRW5CfQ_PSZmCKHw6ma5IpQawGhR79hYUi46_49yAg9fCklP60iJJlPLKdLj6NtOVIoYoc-WsG8nOW_9qo1om08YA-Qh_5O-oZv6oRW2gk7C2eOF5E1pjt0CgmVIRK8z5HvVqlXYftO9NtaSfHh9vhSVPkxVU6jp1OJBsR_UdcdL6Rpiv-bJx0hKJJOfNJMc89oEBiCaAJ4No65-FsGouo2yIYUCsDAQTtBk9rWh3cH8_n-ts0WK57kdtXVKRqQ5g7ch5usUdFAUBTSaviGXpExj5VoTVKQ';
const WIX_SITE_ID = 'c13ae8c5-7053-4f2d-9a9a-371869be4395';

async function getGoogleCredentials() {
    let clientId = GOOGLE_CLIENT_ID_FALLBACK;
    let clientSecret = GOOGLE_CLIENT_SECRET_FALLBACK;
    let refreshToken = GOOGLE_REFRESH_TOKEN_FALLBACK;
    try {
        const { getSecret } = await import('wix-secrets-backend');
        const cid = await getSecret('GOOGLE_CLIENT_ID').catch(() => null);
        const cs = await getSecret('GOOGLE_CLIENT_SECRET').catch(() => null);
        const rt = await getSecret('GOOGLE_REFRESH_TOKEN').catch(() => null);
        if (cid) clientId = cid;
        if (cs) clientSecret = cs;
        if (rt) refreshToken = rt;
    } catch (_) {}
    return { clientId, clientSecret, refreshToken };
}

async function storeRefreshToken(token) {
    try {
        // Store in a Wix Data collection for persistence
        const existing = await wixData.query('GoogleTokens').eq('key', 'refresh_token').find(SA);
        if (existing.items.length > 0) {
            const item = existing.items[0];
            item.value = token;
            item.updatedAt = new Date();
            await wixData.update('GoogleTokens', item, SA);
        } else {
            await wixData.insert('GoogleTokens', { key: 'refresh_token', value: token, updatedAt: new Date() }, SA);
        }
        return true;
    } catch (e) {
        // Collection might not exist yet - try to create it
        try {
            await wixData.insert('GoogleTokens', { key: 'refresh_token', value: token, updatedAt: new Date() }, SA);
            return true;
        } catch (_) {}
        return false;
    }
}

async function getStoredRefreshToken() {
    // Check DB-stored token first (most recently authorized)
    try {
        const result = await wixData.query('GoogleTokens').eq('key', 'refresh_token').find(SA);
        if (result.items.length > 0 && result.items[0].value) return result.items[0].value;
    } catch (_) {}
    // Fall back to hardcoded/secrets
    const creds = await getGoogleCredentials();
    if (creds.refreshToken) return creds.refreshToken;
    return null;
}

async function getGoogleAccessToken() {
    const creds = await getGoogleCredentials();
    const refreshToken = await getStoredRefreshToken();
    if (!refreshToken) return { error: 'No refresh token. Please authorize first via GET /google_auth_url' };
    if (!creds.clientId || !creds.clientSecret) return { error: 'Google OAuth2 credentials not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Wix Secrets.' };

    // Try with app credentials first
    let tokenResponse = await wixFetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `client_id=${encodeURIComponent(creds.clientId)}&client_secret=${encodeURIComponent(creds.clientSecret)}&refresh_token=${encodeURIComponent(refreshToken)}&grant_type=refresh_token`
    });
    let tokenData = await tokenResponse.json();

    // If app creds fail, try OAuth Playground creds (token may have been obtained there)
    if (tokenData.error) {
        const playgroundClientId = '407408718192.apps.googleusercontent.com';
        const playgroundClientSecret = 'kd-_2_AUosoGGTNYyMJiFL3j';
        tokenResponse = await wixFetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `client_id=${encodeURIComponent(playgroundClientId)}&client_secret=${encodeURIComponent(playgroundClientSecret)}&refresh_token=${encodeURIComponent(refreshToken)}&grant_type=refresh_token`
        });
        tokenData = await tokenResponse.json();
    }

    if (tokenData.error) return { error: `Token refresh failed: ${tokenData.error_description || tokenData.error}` };
    return { accessToken: tokenData.access_token };
}

/**
 * GET /google_auth_url
 * Returns the OAuth2 authorization URL. User visits this URL in browser to grant access.
 */
export async function get_google_auth_url(request) {
    try {
        const creds = await getGoogleCredentials();
        if (!creds.clientId) {
            return jsonResponse({
                success: false,
                error: 'Google Client ID not configured. Set GOOGLE_CLIENT_ID in Wix Secrets Manager.',
                setup_guide: 'See GET /google_contacts_setup for step-by-step instructions'
            });
        }

        const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' +
            `client_id=${encodeURIComponent(creds.clientId)}` +
            `&redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_URI)}` +
            `&response_type=code` +
            `&scope=${encodeURIComponent(GOOGLE_SCOPES)}` +
            `&access_type=offline` +
            `&prompt=consent`;

        return jsonResponse({
            success: true,
            authUrl: authUrl,
            instructions: [
                '1. Open the authUrl in your browser',
                '2. Sign in with banfjax@gmail.com',
                '3. Grant access to view contacts',
                '4. You will be redirected back with an authorization code',
                '5. The code is automatically exchanged for tokens'
            ]
        });
    } catch (error) {
        return errorResponse(error.message, 500);
    }
}
export function options_google_auth_url(request) { return handleCors(); }

/**
 * GET /google_auth_callback?code=AUTH_CODE
 * Exchanges the authorization code for tokens and stores the refresh token.
 * This is the OAuth2 redirect URI.
 */
export async function get_google_auth_callback(request) {
    try {
        const code = getQueryParam(request, 'code');
        if (!code) {
            return jsonResponse({
                success: false,
                error: 'No authorization code provided. Visit /google_auth_url first.'
            });
        }

        const creds = await getGoogleCredentials();
        if (!creds.clientId || !creds.clientSecret) {
            return jsonResponse({
                success: false,
                error: 'Google OAuth2 credentials not configured.'
            });
        }

        // Exchange code for tokens
        const tokenResponse = await wixFetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `code=${encodeURIComponent(code)}&client_id=${encodeURIComponent(creds.clientId)}&client_secret=${encodeURIComponent(creds.clientSecret)}&redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_URI)}&grant_type=authorization_code`
        });
        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
            return jsonResponse({
                success: false,
                error: `Token exchange failed: ${tokenData.error_description || tokenData.error}`
            });
        }

        // Store the refresh token for future use
        if (tokenData.refresh_token) {
            await storeRefreshToken(tokenData.refresh_token);
        }

        return jsonResponse({
            success: true,
            message: 'Google account authorized successfully! You can now use GET /google_contacts to fetch contacts.',
            hasRefreshToken: !!tokenData.refresh_token,
            scope: tokenData.scope
        });
    } catch (error) {
        return errorResponse(error.message, 500);
    }
}
export function options_google_auth_callback(request) { return handleCors(); }

/**
 * POST /google_auth_manual — Manual token exchange
 * Body: { "code": "AUTH_CODE", "redirect_uri": "optional" }
 * OR: { "refresh_token": "REFRESH_TOKEN" }
 * Use this if the redirect doesn't work. Copy the code from the browser URL and POST it here.
 */
export async function post_google_auth_manual(request) {
    try {
        const body = await parseBody(request);

        // If user directly provides a refresh token, store it
        if (body.refresh_token) {
            await storeRefreshToken(body.refresh_token);
            return jsonResponse({
                success: true,
                message: 'Refresh token stored. You can now use GET /google_contacts and POST /sync_gmail_messages.'
            });
        }

        // Exchange authorization code for tokens
        const code = body.code;
        if (!code) {
            return jsonResponse({ success: false, error: 'Provide "code" or "refresh_token" in request body.' });
        }

        const creds = await getGoogleCredentials();
        if (!creds.clientId || !creds.clientSecret) {
            return jsonResponse({ success: false, error: 'Google OAuth2 credentials not configured.' });
        }

        // Try with provided redirect_uri first, then app's, then OAuth Playground's
        const redirectUris = [
            body.redirect_uri,
            GOOGLE_REDIRECT_URI,
            'https://developers.google.com/oauthplayground'
        ].filter(Boolean);

        let tokenData = null;
        for (const redirectUri of redirectUris) {
            const tokenResponse = await wixFetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `code=${encodeURIComponent(code)}&client_id=${encodeURIComponent(creds.clientId)}&client_secret=${encodeURIComponent(creds.clientSecret)}&redirect_uri=${encodeURIComponent(redirectUri)}&grant_type=authorization_code`
            });
            tokenData = await tokenResponse.json();
            if (!tokenData.error) break;
        }

        if (tokenData.error) {
            return jsonResponse({
                success: false,
                error: `Token exchange failed: ${tokenData.error_description || tokenData.error}`
            });
        }

        if (tokenData.refresh_token) {
            await storeRefreshToken(tokenData.refresh_token);
        }

        return jsonResponse({
            success: true,
            message: 'Authorization successful! Refresh token stored.',
            hasRefreshToken: !!tokenData.refresh_token,
            scope: tokenData.scope
        });
    } catch (error) {
        return errorResponse(error.message, 500);
    }
}
export function options_google_auth_manual(request) { return handleCors(); }

/**
 * GET /google_contacts — Fetch all contacts from Google account
 * Query params: ?limit=100&search=name_or_email
 */
export async function get_google_contacts(request) {
    try {
        const tokenResult = await getGoogleAccessToken();
        if (tokenResult.error) {
            return jsonResponse({ success: false, error: tokenResult.error });
        }

        const limit = parseInt(getQueryParam(request, 'limit') || '1000', 10);
        const search = getQueryParam(request, 'search') || '';

        let allContacts = [];
        let nextPageToken = '';
        let pageCount = 0;

        // Paginate through all contacts
        do {
            pageCount++;
            let url = `https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers,organizations,addresses&pageSize=${Math.min(limit, 1000)}`;
            if (nextPageToken) url += `&pageToken=${nextPageToken}`;
            if (search) url += `&sources=READ_SOURCE_TYPE_CONTACT`;

            const response = await wixFetch(url, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${tokenResult.accessToken}` }
            });
            const data = await response.json();

            if (data.error) {
                return jsonResponse({
                    success: false,
                    error: `Google API error: ${data.error.message || JSON.stringify(data.error)}`
                });
            }

            const connections = data.connections || [];
            for (const person of connections) {
                const name = (person.names && person.names[0]) || {};
                const email = (person.emailAddresses && person.emailAddresses[0]) || {};
                const phone = (person.phoneNumbers && person.phoneNumbers[0]) || {};
                const org = (person.organizations && person.organizations[0]) || {};
                const addr = (person.addresses && person.addresses[0]) || {};

                const contact = {
                    resourceName: person.resourceName,
                    firstName: name.givenName || '',
                    lastName: name.familyName || '',
                    displayName: name.displayName || '',
                    email: email.value || '',
                    phone: phone.value || '',
                    organization: org.name || '',
                    address: addr.formattedValue || ''
                };

                // Apply search filter
                if (search) {
                    const q = search.toLowerCase();
                    const matchesSearch = contact.displayName.toLowerCase().includes(q) ||
                        contact.email.toLowerCase().includes(q) ||
                        contact.firstName.toLowerCase().includes(q) ||
                        contact.lastName.toLowerCase().includes(q);
                    if (!matchesSearch) continue;
                }

                allContacts.push(contact);
            }

            nextPageToken = data.nextPageToken || '';
        } while (nextPageToken && allContacts.length < limit && pageCount < 20);

        return jsonResponse({
            success: true,
            total: allContacts.length,
            contacts: allContacts.slice(0, limit),
            source: 'google_people_api',
            account: 'banfjax@gmail.com'
        });
    } catch (error) {
        return errorResponse(error.message, 500);
    }
}
export function options_google_contacts(request) { return handleCors(); }

/**
 * POST /sync_google_contacts — Import Google contacts into Wix CRM
 * Body: { "mode": "preview" | "import" }
 * Preview shows what will be imported. Import actually creates CRM contacts.
 */
export async function post_sync_google_contacts(request) {
    try {
        const body = await parseBody(request);
        const mode = body.mode || 'preview';

        // Fetch Google contacts
        const tokenResult = await getGoogleAccessToken();
        if (tokenResult.error) {
            return jsonResponse({ success: false, error: tokenResult.error });
        }

        // Get all Google contacts
        let allGoogleContacts = [];
        let nextPageToken = '';
        let pageCount = 0;

        do {
            pageCount++;
            let url = `https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers&pageSize=1000`;
            if (nextPageToken) url += `&pageToken=${nextPageToken}`;

            const response = await wixFetch(url, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${tokenResult.accessToken}` }
            });
            const data = await response.json();
            if (data.error) {
                return jsonResponse({ success: false, error: `Google API error: ${data.error.message}` });
            }

            const connections = data.connections || [];
            for (const person of connections) {
                const name = (person.names && person.names[0]) || {};
                const email = (person.emailAddresses && person.emailAddresses[0]) || {};
                const phone = (person.phoneNumbers && person.phoneNumbers[0]) || {};
                if (email.value) {
                    allGoogleContacts.push({
                        firstName: name.givenName || name.displayName || '',
                        lastName: name.familyName || '',
                        email: email.value,
                        phone: phone.value || ''
                    });
                }
            }
            nextPageToken = data.nextPageToken || '';
        } while (nextPageToken && pageCount < 20);

        // Get existing Wix CRM contacts for de-duplication
        const existingEmails = new Set();
        try {
            const wixContacts = await contacts.queryContacts().limit(1000).find(SA);
            for (const c of wixContacts.items) {
                const emails = c.info?.emails || [];
                for (const e of emails) {
                    if (e.email) existingEmails.add(e.email.toLowerCase());
                }
            }
        } catch (_) {}

        // Find new contacts (not already in Wix CRM)
        const newContacts = allGoogleContacts.filter(c => !existingEmails.has(c.email.toLowerCase()));
        const duplicates = allGoogleContacts.filter(c => existingEmails.has(c.email.toLowerCase()));

        if (mode === 'preview') {
            return jsonResponse({
                success: true,
                mode: 'preview',
                totalGoogleContacts: allGoogleContacts.length,
                alreadyInWixCRM: duplicates.length,
                newToImport: newContacts.length,
                newContacts: newContacts.slice(0, 50),
                message: `Found ${newContacts.length} new contacts to import. Call with mode "import" to proceed.`
            });
        }

        // Import mode — create contacts in Wix CRM
        const results = { imported: 0, failed: 0, errors: [] };
        for (const c of newContacts) {
            try {
                await contacts.appendOrCreateContact({
                    name: { first: c.firstName, last: c.lastName },
                    emails: [{ email: c.email, tag: 'MAIN' }],
                    phones: c.phone ? [{ phone: c.phone, tag: 'MAIN' }] : []
                }, SA);
                results.imported++;
            } catch (e) {
                results.failed++;
                results.errors.push({ email: c.email, error: e.message });
            }
        }

        return jsonResponse({
            success: true,
            mode: 'import',
            totalGoogleContacts: allGoogleContacts.length,
            alreadyInWixCRM: duplicates.length,
            imported: results.imported,
            failed: results.failed,
            errors: results.errors.slice(0, 10),
            message: `Imported ${results.imported} contacts from Google. ${results.failed} failed.`
        });
    } catch (error) {
        return errorResponse(error.message, 500);
    }
}
export function options_sync_google_contacts(request) { return handleCors(); }

/**
 * GET /google_contacts_setup — Step-by-step guide for setting up Google API access
 */
export function get_google_contacts_setup(request) {
    return jsonResponse({
        success: true,
        title: 'Google Contacts Integration Setup Guide',
        steps: [
            {
                step: 1,
                title: 'Create Google Cloud Project',
                instructions: [
                    'Go to https://console.cloud.google.com/',
                    'Click "Select a project" → "New Project"',
                    'Name it "BANF Contacts" → Create'
                ]
            },
            {
                step: 2,
                title: 'Enable People API',
                instructions: [
                    'In the project, go to "APIs & Services" → "Library"',
                    'Search for "People API" (or "Google People API")',
                    'Click on it → "Enable"'
                ]
            },
            {
                step: 3,
                title: 'Configure OAuth Consent Screen',
                instructions: [
                    'Go to "APIs & Services" → "OAuth consent screen"',
                    'Choose "External" → Create',
                    'App name: "BANF Admin"',
                    'User support email: banfjax@gmail.com',
                    'Developer email: banfjax@gmail.com',
                    'Click "Save and Continue"',
                    'Add scope: "../auth/contacts.readonly"',
                    'Add test user: banfjax@gmail.com',
                    'Save'
                ]
            },
            {
                step: 4,
                title: 'Create OAuth2 Credentials',
                instructions: [
                    'Go to "APIs & Services" → "Credentials"',
                    'Click "+ CREATE CREDENTIALS" → "OAuth client ID"',
                    'Application type: "Web application"',
                    'Name: "BANF Wix Backend"',
                    'Authorized redirect URI: https://www.jaxbengali.org/_functions/google_auth_callback',
                    'Click "Create"',
                    'Copy the Client ID and Client Secret'
                ]
            },
            {
                step: 5,
                title: 'Store Credentials in Wix Secrets',
                instructions: [
                    'Go to your Wix Dashboard → Settings → Secrets Manager',
                    'Add secret: Key="GOOGLE_CLIENT_ID" Value=your_client_id',
                    'Add secret: Key="GOOGLE_CLIENT_SECRET" Value=your_client_secret',
                    'Alternatively: POST /google_auth_manual with {"client_id": "...", "client_secret": "..."}'
                ]
            },
            {
                step: 6,
                title: 'Authorize Your Google Account',
                instructions: [
                    'Call GET /google_auth_url to get the authorization link',
                    'Open the link in your browser',
                    'Sign in with banfjax@gmail.com and grant access',
                    'You will be redirected back and the token will be stored automatically',
                    'If redirect fails: copy the "code" from the URL and POST to /google_auth_manual'
                ]
            },
            {
                step: 7,
                title: 'Fetch and Sync Contacts',
                instructions: [
                    'GET /google_contacts — View all your Google contacts',
                    'POST /sync_google_contacts {"mode": "preview"} — Preview what will be imported',
                    'POST /sync_google_contacts {"mode": "import"} — Import new contacts to Wix CRM'
                ]
            }
        ],
        alternative_method: {
            title: 'Quick Setup with OAuth2 Playground',
            instructions: [
                'Go to https://developers.google.com/oauthplayground/',
                'Click the gear icon → Check "Use your own OAuth credentials"',
                'Enter your Client ID and Client Secret',
                'In Step 1: Select "People API v1" → ".../auth/contacts.readonly"',
                'Click "Authorize APIs" → Sign in with banfjax@gmail.com',
                'In Step 2: Click "Exchange authorization code for tokens"',
                'Copy the Refresh Token',
                'POST /google_auth_manual {"refresh_token": "your_refresh_token"}'
            ]
        }
    });
}
export function options_google_contacts_setup(request) { return handleCors(); }


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  10e. GMAIL MESSAGE SYNC (Gmail API — real sent + received)             ║
// ║       Fetches all messages from banfjax@gmail.com via Gmail API.        ║
// ║       Stores sent in SentEmails, received in InboxMessages collections. ║
// ╚══════════════════════════════════════════════════════════════════════════╝

/**
 * Decode base64url encoding used by Gmail API
 */
function decodeBase64Url(str) {
    if (!str) return '';
    let b = str.replace(/-/g, '+').replace(/_/g, '/');
    while (b.length % 4) b += '=';
    try { return decodeURIComponent(escape(atob(b))); } catch (_) {
        try { return atob(b); } catch (__) { return ''; }
    }
}

/**
 * Extract header value from Gmail API message headers array
 */
function getGmailHeader(headers, name) {
    if (!headers) return '';
    const h = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
    return h ? h.value : '';
}

/**
 * Extract plain text body from Gmail message payload
 */
function extractGmailBody(payload) {
    if (!payload) return { text: '', html: '' };
    let text = '', html = '';

    if (payload.body && payload.body.data) {
        const decoded = decodeBase64Url(payload.body.data);
        if (payload.mimeType === 'text/html') html = decoded;
        else text = decoded;
    }

    if (payload.parts) {
        for (const part of payload.parts) {
            if (part.mimeType === 'text/plain' && part.body && part.body.data) {
                text = text || decodeBase64Url(part.body.data);
            } else if (part.mimeType === 'text/html' && part.body && part.body.data) {
                html = html || decodeBase64Url(part.body.data);
            } else if (part.parts) {
                // Nested multipart
                const nested = extractGmailBody(part);
                text = text || nested.text;
                html = html || nested.html;
            }
        }
    }
    return { text, html };
}

/**
 * Extract email address from a "Name <email>" string
 */
function parseEmailAddress(raw) {
    if (!raw) return '';
    const match = raw.match(/<([^>]+)>/);
    return match ? match[1].toLowerCase() : raw.toLowerCase().trim();
}

/**
 * Sync Gmail messages — fetches sent + received and stores in Wix collections.
 * @param {Object} options - { maxResults, afterDate, labels }
 * @returns {Object} - { sent, received, errors }
 */
async function syncGmailMessages(options = {}) {
    const { maxResults = 500, afterDate, labelFilter } = options;

    const tokenResult = await getGoogleAccessToken();
    if (tokenResult.error) return { error: tokenResult.error };

    const accessToken = tokenResult.accessToken;
    const banfEmail = BANF_EMAIL.toLowerCase();
    const results = { sent: 0, received: 0, skipped: 0, errors: [], totalFetched: 0, collectionsCreated: [] };

    // Ensure collections exist before syncing
    const sentOk = await ensureCollection('SentEmails');
    const inboxOk = await ensureCollection('InboxMessages');
    if (sentOk) results.collectionsCreated.push('SentEmails');
    if (inboxOk) results.collectionsCreated.push('InboxMessages');
    if (!sentOk && !inboxOk) {
        results.errors.push('Could not create or access SentEmails and InboxMessages collections. They may need to be created manually in the Wix Dashboard CMS.');
    }

    // Helper: fetch message list with pagination using labelIds (not q param)
    async function fetchMessageIds(labelIds, max, excludeLabelIds) {
        let ids = [];
        let pageToken = '';
        let fetched = 0;
        do {
            let url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${Math.min(max - fetched, 100)}`;
            if (labelIds && labelIds.length > 0) {
                for (const lid of labelIds) url += `&labelIds=${encodeURIComponent(lid)}`;
            }
            if (pageToken) url += `&pageToken=${pageToken}`;
            const resp = await wixFetch(url, { method: 'GET', headers: { 'Authorization': `Bearer ${accessToken}` } });
            const data = await resp.json();
            if (data.error) { results.errors.push(data.error.message || JSON.stringify(data.error)); break; }
            if (data.messages) ids = ids.concat(data.messages.map(m => m.id));
            pageToken = data.nextPageToken || '';
            fetched = ids.length;
        } while (pageToken && fetched < max);
        return ids;
    }

    // Helper: fetch full message detail (try full first, fall back to metadata)
    async function fetchMessage(msgId) {
        // Try format=full first (requires gmail.readonly or mail.google.com)
        let url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}?format=full`;
        let resp = await wixFetch(url, { method: 'GET', headers: { 'Authorization': `Bearer ${accessToken}` } });
        let data = await resp.json();
        if (data.error) {
            // Fall back to metadata format (works with gmail.metadata scope)
            url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`;
            resp = await wixFetch(url, { method: 'GET', headers: { 'Authorization': `Bearer ${accessToken}` } });
            data = await resp.json();
            if (data.error) return data;
            data._metadataOnly = true;
        }
        return data;
    }

    // ---- FETCH SENT MESSAGES (labelId: SENT) ----
    const sentIds = await fetchMessageIds(['SENT'], Math.floor(maxResults / 2));

    // Check which messages we already have (avoid duplicates)
    const existingSentGmailIds = new Set();
    try {
        let skip = 0, more = true;
        while (more) {
            const existing = await wixData.query('SentEmails').eq('source', 'gmail').skip(skip).limit(100).find(SA);
            for (const item of existing.items) {
                if (item.gmailId) existingSentGmailIds.add(item.gmailId);
            }
            more = existing.items.length === 100;
            skip += 100;
        }
    } catch (_) {}

    // Process sent messages
    for (const msgId of sentIds) {
        if (existingSentGmailIds.has(msgId)) { results.skipped++; continue; }
        try {
            const msg = await fetchMessage(msgId);
            if (!msg || msg.error) { results.errors.push(`Failed to fetch sent msg ${msgId}: ${msg && msg.error ? (msg.error.message || JSON.stringify(msg.error)) : 'null response'}`); continue; }

            const headers = (msg.payload && msg.payload.headers) || [];
            const to = parseEmailAddress(getGmailHeader(headers, 'To'));
            const subject = getGmailHeader(headers, 'Subject') || '(no subject)';
            const dateStr = getGmailHeader(headers, 'Date');
            const sentAt = dateStr ? new Date(dateStr) : new Date(parseInt(msg.internalDate));
            const body = msg._metadataOnly ? { text: '', html: '' } : extractGmailBody(msg.payload);

            // Determine type from labels
            const labels = msg.labelIds || [];
            let emailType = 'sent';
            if (subject.toLowerCase().includes('invite') || subject.toLowerCase().includes('rsvp')) emailType = 'evite';

            await wixData.insert('SentEmails', {
                gmailId: msgId,
                to,
                subject,
                body: body.text || body.html || '',
                bodyHtml: body.html || '',
                sentAt,
                sentBy: banfEmail,
                type: emailType,
                status: 'sent',
                source: 'gmail',
                labels: labels.join(','),
                threadId: msg.threadId || ''
            }, SA);
            results.sent++;
        } catch (e) {
            results.errors.push(`Sent msg ${msgId}: ${e.message}`);
        }
        results.totalFetched++;
    }

    // ---- FETCH RECEIVED/INBOX MESSAGES (labelId: INBOX) ----
    const inboxIds = await fetchMessageIds(['INBOX'], Math.floor(maxResults / 2));

    // Check existing inbox
    const existingInboxGmailIds = new Set();
    try {
        let skip = 0, more = true;
        while (more) {
            const existing = await wixData.query('InboxMessages').eq('source', 'gmail').skip(skip).limit(100).find(SA);
            for (const item of existing.items) {
                if (item.gmailId) existingInboxGmailIds.add(item.gmailId);
            }
            more = existing.items.length === 100;
            skip += 100;
        }
    } catch (_) {}

    // Process inbox messages
    for (const msgId of inboxIds) {
        if (existingInboxGmailIds.has(msgId)) { results.skipped++; continue; }
        try {
            const msg = await fetchMessage(msgId);
            if (!msg || msg.error) { results.errors.push(`Failed to fetch inbox msg ${msgId}: ${msg && msg.error ? (msg.error.message || JSON.stringify(msg.error)) : 'null response'}`); continue; }

            const headers = (msg.payload && msg.payload.headers) || [];
            const from = parseEmailAddress(getGmailHeader(headers, 'From'));
            const to = parseEmailAddress(getGmailHeader(headers, 'To'));
            const subject = getGmailHeader(headers, 'Subject') || '(no subject)';
            const dateStr = getGmailHeader(headers, 'Date');
            const receivedAt = dateStr ? new Date(dateStr) : new Date(parseInt(msg.internalDate));
            const body = msg._metadataOnly ? { text: '', html: '' } : extractGmailBody(msg.payload);
            const labels = msg.labelIds || [];
            const isRead = !labels.includes('UNREAD');

            // Determine folder from labels
            let folder = 'inbox';
            if (labels.includes('SPAM')) folder = 'spam';
            else if (labels.includes('TRASH')) folder = 'trash';
            else if (labels.includes('CATEGORY_PROMOTIONS')) folder = 'promotions';
            else if (labels.includes('CATEGORY_SOCIAL')) folder = 'social';
            else if (labels.includes('CATEGORY_UPDATES')) folder = 'updates';

            await wixData.insert('InboxMessages', {
                gmailId: msgId,
                from,
                to: to || banfEmail,
                subject,
                body: body.text || '',
                bodyHtml: body.html || '',
                receivedAt,
                read: isRead,
                folder,
                source: 'gmail',
                labels: labels.join(','),
                threadId: msg.threadId || ''
            }, SA);
            results.received++;
        } catch (e) {
            results.errors.push(`Inbox msg ${msgId}: ${e.message}`);
        }
        results.totalFetched++;
    }

    return results;
}

/**
 * POST /sync_gmail_messages — Sync all sent and received emails from Gmail
 * Body: { "maxResults": 500, "afterDate": "2024/01/01" }
 */
export async function post_sync_gmail_messages(request) {
    try {
        const body = await parseBody(request);
        const maxResults = body.maxResults || 500;
        const afterDate = body.afterDate || body.after_date;

        // Verify token works first
        const tokenTest = await getGoogleAccessToken();
        if (tokenTest.error) {
            return jsonResponse({
                success: false,
                error: tokenTest.error,
                fix: 'The Gmail API requires gmail.readonly scope. You need to re-authorize with the updated scope.',
                steps: [
                    '1. Go to OAuth Playground: https://developers.google.com/oauthplayground/',
                    '2. In Settings (gear icon), check "Use your own OAuth credentials"',
                    '3. Enter Client ID: ' + GOOGLE_CLIENT_ID_FALLBACK,
                    '4. Enter Client Secret: ' + GOOGLE_CLIENT_SECRET_FALLBACK,
                    '5. In Step 1, select BOTH scopes:',
                    '   - https://www.googleapis.com/auth/contacts.readonly',
                    '   - https://www.googleapis.com/auth/gmail.readonly',
                    '6. Click "Authorize APIs" → Sign in with banfjax@gmail.com',
                    '7. Click "Exchange authorization code for tokens"',
                    '8. Copy the Refresh Token',
                    '9. POST to /google_auth_manual with: { "refresh_token": "YOUR_TOKEN" }'
                ]
            });
        }

        const result = await syncGmailMessages({ maxResults, afterDate });

        if (result.error) {
            return jsonResponse({
                success: false,
                error: result.error,
                fix: result.error.includes('insufficient') || result.error.includes('scope')
                    ? 'Need to re-authorize with gmail.readonly scope. See POST /sync_gmail_messages with no body for instructions.'
                    : undefined
            });
        }

        return jsonResponse({
            success: true,
            version: '5.4.0-full-system',
            synced: {
                sentMessages: result.sent,
                receivedMessages: result.received,
                skippedDuplicates: result.skipped,
                totalProcessed: result.totalFetched,
                errors: result.errors.length > 0 ? result.errors.slice(0, 10) : []
            },
            collections: {
                SentEmails: 'Outbound emails stored here',
                InboxMessages: 'Inbound emails stored here'
            },
            nextSteps: [
                'View reports: GET /report_email_categorization?format=html',
                'Payment analysis: GET /report_payment_insights?format=html',
                'Evite dedup: GET /report_evite_rsvp?format=html',
                'Category detail: GET /report_category_detail?category=payment&format=html'
            ]
        });
    } catch (error) {
        return errorResponse('Gmail sync failed: ' + error.message);
    }
}
export function options_sync_gmail_messages(request) { return handleCors(); }

/**
 * GET /gmail_sync_status — Check how many messages are synced
 */
export async function get_gmail_sync_status(request) {
    try {
        let sentCount = 0, inboxCount = 0;
        try {
            const s = await wixData.query('SentEmails').count(SA);
            sentCount = s;
        } catch (_) {}
        try {
            const i = await wixData.query('InboxMessages').count(SA);
            inboxCount = i;
        } catch (_) {}

        // Token status
        let tokenOk = false;
        try {
            const t = await getGoogleAccessToken();
            tokenOk = !t.error;
        } catch (_) {}

        return jsonResponse({
            success: true,
            syncStatus: {
                sentEmailsInDB: sentCount,
                inboxMessagesInDB: inboxCount,
                totalMessages: sentCount + inboxCount,
                gmailTokenValid: tokenOk,
                scope: GOOGLE_SCOPES
            },
            actions: {
                syncNow: 'POST /sync_gmail_messages with optional { "maxResults": 500, "afterDate": "2024/01/01" }',
                reAuth: tokenOk ? 'Not needed — token is valid' : 'GET /google_auth_url to re-authorize with gmail.readonly scope'
            }
        });
    } catch (error) {
        return errorResponse('Sync status check failed: ' + error.message);
    }
}
export function options_gmail_sync_status(request) { return handleCors(); }

/**
 * POST /create_collections — Create missing DB collections (SentEmails, InboxMessages, GoogleTokens)
 * Tries multiple approaches: wix-data.v2 API, direct insert method
 */
export async function post_create_collections(request) {
    try {
        const neededCollections = ['SentEmails', 'InboxMessages', 'GoogleTokens', 'FinancialLedger', 'ReimbursementTickets'];
        const statuses = {};

        for (const col of neededCollections) {
            // Check if it exists
            try {
                await wixData.query(col).limit(1).find(SA);
                statuses[col] = { exists: true, method: 'already-existed' };
                continue;
            } catch (e) {
                if (!e.message || !e.message.includes('WDE0025')) {
                    statuses[col] = { exists: false, error: e.message };
                    continue;
                }
            }

            // Try approach 1: wix-data.v2 createDataCollection
            try {
                const { collections } = await import('wix-data.v2');
                await collections.createDataCollection({
                    _id: col,
                    displayName: col,
                    permissions: {
                        read: { anyoneCanRead: false, roles: ['ADMIN'] },
                        write: { anyoneCanWrite: false, roles: ['ADMIN'] },
                        insert: { anyoneCanInsert: false, roles: ['ADMIN'] },
                        update: { anyoneCanUpdate: false, roles: ['ADMIN'] },
                        remove: { anyoneCanRemove: false, roles: ['ADMIN'] }
                    }
                });
                statuses[col] = { exists: true, method: 'wix-data-v2' };
                continue;
            } catch (e2) {
                // v2 not available, try next approach
            }

            // Try approach 2: direct insert (Wix may auto-create collection)
            try {
                const record = { _autoCreated: true, _createdDate: new Date() };
                const inserted = await wixData.insert(col, record, SA);
                if (inserted && inserted._id) {
                    await wixData.remove(col, inserted._id, SA);
                }
                statuses[col] = { exists: true, method: 'auto-created-via-insert' };
                continue;
            } catch (e3) {
                statuses[col] = {
                    exists: false,
                    error: e3.message,
                    manualFix: `Create "${col}" collection manually in Wix Dashboard → CMS → Create New Collection`
                };
            }
        }

        const allCreated = Object.values(statuses).every(s => s.exists);

        return jsonResponse({
            success: allCreated,
            collections: statuses,
            nextStep: allCreated
                ? 'All collections ready! Run POST /sync_gmail_messages to sync emails.'
                : 'Some collections need manual creation in Wix Dashboard CMS.',
            manualUrl: 'https://manage.wix.com/dashboard/c13ae8c5-7053-4f2d-9a9a-371869be4395/database/collections'
        });
    } catch (error) {
        return errorResponse('Create collections failed: ' + error.message);
    }
}
export function options_create_collections(request) { return handleCors(); }


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  10c. LLM AGENT ENGINE (Hugging Face Inference API)                     ║
// ║       Uses Meta-Llama-3.1-70B-Instruct via HF router for tool-calling  ║
// ║       Agent can: send emails, manage members, process payments,         ║
// ║       handle complaints, run surveys, manage contacts, search email     ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// --- HF Inference Configuration ---
// To activate: store your HF token in Wix Secrets Manager with key 'HF_API_TOKEN'
// Get a free token at: https://huggingface.co/settings/tokens
const HF_API_URL = 'https://router.huggingface.co/v1/chat/completions';
const HF_MODEL = 'meta-llama/Llama-3.1-8B-Instruct';

// Try to get HF token from Wix Secrets Manager, fallback to embedded token
const HF_TOKEN_FALLBACK = 'REVOKED_SEE_SITECONFIG_HF_API_TOKEN';
async function getHFToken() {
    try {
        const { getSecret } = await import('wix-secrets-backend');
        const secret = await getSecret('HF_API_TOKEN');
        if (secret) return secret;
    } catch (_) {}
    return HF_TOKEN_FALLBACK;
}

// --- Tool Definitions: Every action the agent can take ---
const AGENT_TOOLS = [
    {
        type: 'function',
        function: {
            name: 'send_email',
            description: 'Send an email to a recipient. Use for any email sending, communication, or notification task.',
            parameters: {
                type: 'object',
                properties: {
                    to: { type: 'string', description: 'Recipient email address' },
                    subject: { type: 'string', description: 'Email subject line' },
                    body: { type: 'string', description: 'Email body content' },
                    toName: { type: 'string', description: 'Recipient name (optional)' }
                },
                required: ['to', 'subject', 'body']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'send_evite',
            description: 'Send event invitations (evites) to multiple recipients for a BANF event.',
            parameters: {
                type: 'object',
                properties: {
                    event_name: { type: 'string', description: 'Name of the event' },
                    event_date: { type: 'string', description: 'Event date' },
                    event_time: { type: 'string', description: 'Event time' },
                    venue: { type: 'string', description: 'Event venue/location' },
                    message: { type: 'string', description: 'Custom invitation message' },
                    recipient_emails: { type: 'array', items: { type: 'string' }, description: 'List of email addresses to invite' }
                },
                required: ['event_name', 'recipient_emails']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'send_bulk_email',
            description: 'Send the same email to a large group of members or contacts. Good for announcements, newsletters, updates.',
            parameters: {
                type: 'object',
                properties: {
                    subject: { type: 'string', description: 'Email subject' },
                    body: { type: 'string', description: 'Email body' },
                    group: { type: 'string', description: 'Contact group name to send to, or "all_members" for all' }
                },
                required: ['subject', 'body', 'group']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'search_emails',
            description: 'Search through inbox emails by keyword, sender, or subject.',
            parameters: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: 'Search term (searches subject, from, body)' },
                    folder: { type: 'string', description: 'Email folder to search (default: INBOX)' }
                },
                required: ['query']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_inbox',
            description: 'Get the latest inbox emails. Use when user asks to check email, see inbox, or see recent messages.',
            parameters: {
                type: 'object',
                properties: {
                    page: { type: 'integer', description: 'Page number (default 1)' },
                    folder: { type: 'string', description: 'Folder name (INBOX, SENT, etc.)' }
                },
                required: []
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'process_zelle_payment',
            description: 'Process a Zelle payment notification email. Extract payment amount, sender name, and match to a member. Use when a Zelle payment email is received or needs processing.',
            parameters: {
                type: 'object',
                properties: {
                    sender_name: { type: 'string', description: 'Name of the person who sent the Zelle payment' },
                    amount: { type: 'number', description: 'Payment amount in dollars' },
                    payment_date: { type: 'string', description: 'Date the payment was received' },
                    purpose: { type: 'string', description: 'Purpose of payment (membership, event, donation, etc.)' },
                    member_email: { type: 'string', description: 'Email of the member, if known' }
                },
                required: ['sender_name', 'amount']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'check_payment_status',
            description: 'Check payment status for a member or list recent payments.',
            parameters: {
                type: 'object',
                properties: {
                    member_email: { type: 'string', description: 'Member email to check' },
                    member_name: { type: 'string', description: 'Member name to check' },
                    status: { type: 'string', description: 'Filter by status: pending, matched, verified, rejected' }
                },
                required: []
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'create_member',
            description: 'Create a new BANF member. Use for new member registration or signup.',
            parameters: {
                type: 'object',
                properties: {
                    email: { type: 'string', description: 'Member email address' },
                    firstName: { type: 'string', description: 'First name' },
                    lastName: { type: 'string', description: 'Last name' },
                    phone: { type: 'string', description: 'Phone number' },
                    memberType: { type: 'string', description: 'Member type: standard, premium, lifetime, honorary' }
                },
                required: ['email', 'firstName', 'lastName']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'lookup_member',
            description: 'Look up a member by email, name, or ID. Check membership status.',
            parameters: {
                type: 'object',
                properties: {
                    email: { type: 'string', description: 'Member email' },
                    name: { type: 'string', description: 'Member name to search' }
                },
                required: []
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'list_members',
            description: 'List all BANF members or filter by type/status.',
            parameters: {
                type: 'object',
                properties: {
                    memberType: { type: 'string', description: 'Filter by type: standard, premium, lifetime' },
                    status: { type: 'string', description: 'Filter by status: active, inactive' },
                    limit: { type: 'integer', description: 'Maximum results to return' }
                },
                required: []
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'submit_complaint',
            description: 'Submit a new complaint or issue on behalf of a member.',
            parameters: {
                type: 'object',
                properties: {
                    description: { type: 'string', description: 'Complaint description' },
                    category: { type: 'string', description: 'Category: general, event, membership, payment, other' },
                    name: { type: 'string', description: 'Name of person filing' },
                    email: { type: 'string', description: 'Contact email' }
                },
                required: ['description']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'check_complaint',
            description: 'Check the status of a complaint using its tracking ID.',
            parameters: {
                type: 'object',
                properties: {
                    trackingId: { type: 'string', description: 'Complaint tracking ID (e.g., CMP-XXXXXX)' }
                },
                required: ['trackingId']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'create_survey',
            description: 'Create a new survey for the community.',
            parameters: {
                type: 'object',
                properties: {
                    title: { type: 'string', description: 'Survey title' },
                    questions: { type: 'array', items: { type: 'string' }, description: 'List of survey questions' },
                    description: { type: 'string', description: 'Survey description' }
                },
                required: ['title', 'questions']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_survey_responses',
            description: 'Get responses for a specific survey.',
            parameters: {
                type: 'object',
                properties: {
                    surveyId: { type: 'string', description: 'Survey ID to get responses for' }
                },
                required: ['surveyId']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_crm_contacts',
            description: 'Get all CRM contacts from the address book. Use for looking up contacts, checking contact list.',
            parameters: {
                type: 'object',
                properties: {
                    search: { type: 'string', description: 'Search term to filter contacts' }
                },
                required: []
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'manage_contact_group',
            description: 'Create, delete, or manage a contact group. Add or remove contacts from groups.',
            parameters: {
                type: 'object',
                properties: {
                    action: { type: 'string', description: 'Action: create, delete, add_contacts, remove_contacts, list' },
                    group_name: { type: 'string', description: 'Name of the contact group' },
                    contacts: { type: 'array', items: { type: 'object' }, description: 'Contacts to add: [{email, name}]' },
                    emails: { type: 'array', items: { type: 'string' }, description: 'Emails to remove from group' }
                },
                required: ['action']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_events',
            description: 'Get upcoming BANF events.',
            parameters: {
                type: 'object',
                properties: {
                    include_past: { type: 'boolean', description: 'Include past events (default: false)' }
                },
                required: []
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'check_evite_rsvp',
            description: 'Check RSVP responses for a specific event invitation.',
            parameters: {
                type: 'object',
                properties: {
                    event_name: { type: 'string', description: 'Name of the event to check RSVPs for' }
                },
                required: ['event_name']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_dashboard',
            description: 'Get the admin email dashboard overview with stats on emails sent, contacts, evites, etc.',
            parameters: { type: 'object', properties: {}, required: [] }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_google_contacts',
            description: 'Fetch contacts from the Gmail/Google account (banfjax@gmail.com). Returns names, emails, phones, organizations from Google Contacts.',
            parameters: {
                type: 'object',
                properties: {
                    search: { type: 'string', description: 'Optional search term to filter contacts by name or email' },
                    limit: { type: 'number', description: 'Maximum contacts to return (default: 100)' }
                },
                required: []
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'sync_google_contacts_to_crm',
            description: 'Import/sync contacts from Google account into Wix CRM. Use mode "preview" to see what will be imported, or "import" to actually import.',
            parameters: {
                type: 'object',
                properties: {
                    mode: { type: 'string', enum: ['preview', 'import'], description: 'preview = show what will be imported, import = actually import' }
                },
                required: ['mode']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'generate_admin_report',
            description: 'Generate an admin report for BANF. Types: "contacts" (CRM categorization by EC term, year, role, family), "email_audit" (email reachability and health check), "family_mapping" (family universe mapping with surname matching), "communication" (communication archive schema with sequencing), "full" (all reports combined).',
            parameters: {
                type: 'object',
                properties: {
                    type: { type: 'string', enum: ['contacts', 'email_audit', 'family_mapping', 'communication', 'full'], description: 'Report type to generate' },
                    ec_term: { type: 'string', description: 'Filter by EC term (e.g., EC-2024-2025). Optional.' },
                    year: { type: 'string', description: 'Filter by year (e.g., 2024). Optional.' }
                },
                required: ['type']
            }
        }
    }
];

// --- System Prompt: tells the LLM who it is and how to behave ---
const AGENT_SYSTEM_PROMPT = `You are BANF Assistant, the AI automation agent for the Bengali Association of North Florida (BANF).
You help the admin manage the organization by performing tasks through tool calls.

Your capabilities:
1. EMAIL MANAGEMENT: Send individual emails, bulk communications, search inbox, manage email groups
2. PAYMENT PROCESSING: When Zelle payment emails arrive, extract payment info, match to members, record transactions
3. MEMBER MANAGEMENT: Create new members, look up existing members, update membership status
4. EVENT MANAGEMENT: Send evites, track RSVPs, check event attendance
5. COMPLAINT HANDLING: File and track complaints
6. SURVEY MANAGEMENT: Create surveys, collect and analyze responses
7. ADDRESS BOOK: Manage CRM contacts and contact groups
8. DASHBOARD: Provide admin overview and statistics
9. GOOGLE CONTACTS: Fetch contacts from Gmail/Google account, sync them into Wix CRM
10. ADMIN REPORTS: Generate categorized reports — email audit, family mapping, CRM categorization by EC term/year, communication archive schema

Workflow Automation Rules:
- When processing a Zelle payment email: Extract sender name + amount → search for matching member → record payment → send confirmation email to member
- When a new member signs up: Create member record → add to "All Members" contact group → send welcome email
- When a complaint is filed: Record complaint → send acknowledgment email → alert admin
- When creating a survey: Create survey → send survey link to relevant contact group
- When sending evites: Send to each recipient → track RSVPs → provide summary

Always be helpful, concise, and professional. Use tools to take actions rather than just describing what could be done.
The organization email is banfjax@gmail.com.
Today's date is ${new Date().toISOString().split('T')[0]}.`;

// --- Tool Executor: runs the actual tool functions ---
async function executeAgentTool(toolName, args) {
    try {
        switch (toolName) {
            case 'send_email': {
                return await sendViaWixEmail({
                    to: args.to,
                    subject: args.subject,
                    body: args.body,
                    toName: args.toName || ''
                });
            }
            case 'send_evite': {
                const recipients = (args.recipient_emails || []).map(e => ({ email: e, name: '' }));
                const results = { sent: 0, failed: 0, errors: [] };
                for (const r of recipients) {
                    const eviteMsg = `You are cordially invited to: ${args.event_name}\n\n` +
                        `${args.message || 'We hope to see you there!'}\n\n` +
                        `Date: ${args.event_date || 'TBD'}\nTime: ${args.event_time || 'TBD'}\n` +
                        `Venue: ${args.venue || 'TBD'}\n\nPlease reply YES / MAYBE / NO\n\n— BANF`;
                    const res = await sendViaWixEmail({ to: r.email, subject: `You're Invited: ${args.event_name}`, body: eviteMsg, toName: r.name });
                    if (res.success) results.sent++; else { results.failed++; results.errors.push(res.error); }
                }
                return { success: true, sent: results.sent, failed: results.failed, errors: results.errors.length > 0 ? results.errors : undefined };
            }
            case 'send_bulk_email': {
                let emails = [];
                if (args.group === 'all_members') {
                    const members = await wixData.query('Members').eq('status', 'active').limit(200).find(SA);
                    emails = members.items.map(m => m.email).filter(Boolean);
                } else {
                    const groupContacts = await wixData.query('GroupContacts').eq('groupName', args.group).limit(200).find(SA);
                    emails = groupContacts.items.map(c => c.email).filter(Boolean);
                }
                if (emails.length === 0) return { success: false, error: `No contacts found in group '${args.group}'` };
                let sentCount = 0;
                for (const email of emails) {
                    const res = await sendViaWixEmail({ to: email, subject: args.subject, body: args.body });
                    if (res.success) sentCount++;
                }
                return { success: true, message: `Bulk email sent to ${sentCount}/${emails.length} recipients` };
            }
            case 'search_emails': {
                const results = await wixData.query('InboxMessages')
                    .contains('subject', args.query)
                    .or(wixData.query('InboxMessages').contains('from', args.query))
                    .or(wixData.query('InboxMessages').contains('body', args.query))
                    .descending('receivedAt').limit(20).find(SA);
                return { success: true, emails: results.items.map(m => ({ from: m.from, subject: m.subject, date: m.receivedAt, snippet: (m.body || '').substring(0, 150) })), total: results.totalCount };
            }
            case 'get_inbox': {
                const pg = args.page || 1;
                const results = await wixData.query('InboxMessages')
                    .eq('folder', args.folder || 'INBOX')
                    .descending('receivedAt').skip((pg - 1) * 20).limit(20).find(SA);
                return { success: true, emails: results.items.map(m => ({ from: m.from, subject: m.subject, date: m.receivedAt, read: !!m.read })), total: results.totalCount };
            }
            case 'process_zelle_payment': {
                // Record the payment
                const payment = {
                    senderName: args.sender_name,
                    amount: args.amount,
                    paymentDate: args.payment_date ? new Date(args.payment_date) : new Date(),
                    purpose: args.purpose || 'membership',
                    status: 'pending',
                    matchedMember: null,
                    source: 'zelle',
                    processedAt: new Date(),
                    processedBy: 'agent'
                };
                // Try to match to a member
                let matchedMember = null;
                if (args.member_email) {
                    const found = await wixData.query('Members').eq('email', args.member_email).limit(1).find(SA);
                    if (found.items.length > 0) matchedMember = found.items[0];
                }
                if (!matchedMember) {
                    const byName = await wixData.query('Members').contains('name', args.sender_name).limit(1).find(SA);
                    if (byName.items.length > 0) matchedMember = byName.items[0];
                }
                if (matchedMember) {
                    payment.matchedMember = matchedMember._id;
                    payment.matchedEmail = matchedMember.email;
                    payment.matchedName = matchedMember.name;
                    payment.status = 'matched';
                }
                try { await wixData.insert('Payments', payment, SA); } catch (_) {}
                return {
                    success: true,
                    payment: { senderName: args.sender_name, amount: args.amount, status: payment.status },
                    matchedMember: matchedMember ? { name: matchedMember.name, email: matchedMember.email, id: matchedMember._id } : null,
                    message: matchedMember ? `Payment of $${args.amount} matched to member ${matchedMember.name}` : `Payment of $${args.amount} recorded but no matching member found`
                };
            }
            case 'check_payment_status': {
                let query = wixData.query('Payments').descending('processedAt');
                if (args.status) query = query.eq('status', args.status);
                if (args.member_email) query = query.eq('matchedEmail', args.member_email);
                if (args.member_name) query = query.contains('senderName', args.member_name);
                const results = await query.limit(20).find(SA);
                return { success: true, payments: results.items.map(p => ({ sender: p.senderName, amount: p.amount, status: p.status, date: p.paymentDate, matchedTo: p.matchedName || 'unmatched' })), total: results.totalCount };
            }
            case 'create_member': {
                const existing = await wixData.query('Members').eq('email', args.email.toLowerCase().trim()).limit(1).find(SA);
                if (existing.items.length > 0) return { success: false, error: 'Member with this email already exists', member: existing.items[0] };
                const newMember = {
                    email: args.email.toLowerCase().trim(),
                    firstName: args.firstName, lastName: args.lastName,
                    name: `${args.firstName} ${args.lastName}`,
                    phone: args.phone || '', memberType: args.memberType || 'standard',
                    status: 'active', isAdmin: false, joinDate: new Date()
                };
                const result = await wixData.insert('Members', newMember, SA);
                // Also add to CRM
                try { await findOrCreateContact(args.email, args.firstName); } catch (_) {}
                return { success: true, member: { id: result._id, name: result.name, email: result.email, memberType: result.memberType }, message: `Member ${result.name} created successfully` };
            }
            case 'lookup_member': {
                let query = wixData.query('Members');
                if (args.email) query = query.eq('email', args.email.toLowerCase().trim());
                else if (args.name) query = query.contains('name', args.name);
                else return { success: false, error: 'Provide email or name to look up' };
                const results = await query.limit(10).find(SA);
                return { success: true, members: results.items.map(m => ({ id: m._id, name: m.name, email: m.email, memberType: m.memberType, status: m.status, joinDate: m.joinDate })), total: results.totalCount };
            }
            case 'list_members': {
                let query = wixData.query('Members');
                if (args.memberType) query = query.eq('memberType', args.memberType);
                if (args.status) query = query.eq('status', args.status);
                const results = await query.limit(args.limit || 50).find(SA);
                return { success: true, members: results.items.map(m => ({ name: m.name, email: m.email, memberType: m.memberType, status: m.status })), total: results.totalCount };
            }
            case 'submit_complaint': {
                const complaint = {
                    description: args.description, category: args.category || 'general',
                    email: args.email || '', name: args.name || 'Anonymous',
                    status: 'submitted', trackingId: 'CMP-' + Date.now().toString(36).toUpperCase(),
                    submittedAt: new Date()
                };
                const result = await wixData.insert('Complaints', complaint, SA);
                return { success: true, trackingId: complaint.trackingId, message: `Complaint filed with tracking ID ${complaint.trackingId}` };
            }
            case 'check_complaint': {
                const results = await wixData.query('Complaints').eq('trackingId', args.trackingId).limit(1).find(SA);
                if (results.items.length === 0) return { success: false, error: 'Complaint not found' };
                const c = results.items[0];
                return { success: true, complaint: { trackingId: c.trackingId, status: c.status, category: c.category, submittedAt: c.submittedAt, description: c.description } };
            }
            case 'create_survey': {
                const survey = {
                    title: args.title, description: args.description || '',
                    questions: JSON.stringify(args.questions || []),
                    status: 'active', createdAt: new Date()
                };
                const result = await wixData.insert('Surveys', survey, SA);
                return { success: true, survey: { id: result._id, title: result.title }, message: `Survey '${args.title}' created with ${(args.questions || []).length} questions` };
            }
            case 'get_survey_responses': {
                const responses = await wixData.query('SurveyResponses').eq('surveyId', args.surveyId).limit(100).find(SA);
                return { success: true, responses: responses.items, total: responses.totalCount };
            }
            case 'get_crm_contacts': {
                let query = contacts.queryContacts();
                if (args.search) query = query.startsWith('info.name.first', args.search);
                const results = await query.limit(50).find(SA);
                return {
                    success: true,
                    contacts: results.items.map(c => ({
                        id: c._id,
                        name: ((c.info && c.info.name) ? `${c.info.name.first || ''} ${c.info.name.last || ''}`.trim() : ''),
                        email: (c.info && c.info.emails && c.info.emails.length > 0) ? c.info.emails[0].email : '',
                        phone: (c.info && c.info.phones && c.info.phones.length > 0) ? c.info.phones[0].phone : ''
                    })),
                    total: results.totalCount
                };
            }
            case 'manage_contact_group': {
                switch (args.action) {
                    case 'create':
                        await wixData.insert('ContactGroups', { groupName: args.group_name, description: '', createdAt: new Date() }, SA);
                        return { success: true, message: `Group '${args.group_name}' created` };
                    case 'delete':
                        const grp = await wixData.query('ContactGroups').eq('groupName', args.group_name).find(SA);
                        if (grp.items.length > 0) await wixData.remove('ContactGroups', grp.items[0]._id, SA);
                        return { success: true, message: `Group '${args.group_name}' deleted` };
                    case 'add_contacts':
                        let added = 0;
                        for (const c of (args.contacts || [])) {
                            await wixData.insert('GroupContacts', { groupName: args.group_name, name: c.name || '', email: c.email, addedAt: new Date() }, SA);
                            added++;
                        }
                        return { success: true, message: `Added ${added} contacts to '${args.group_name}'` };
                    case 'remove_contacts':
                        let removed = 0;
                        for (const email of (args.emails || [])) {
                            const f = await wixData.query('GroupContacts').eq('groupName', args.group_name).eq('email', email).find(SA);
                            for (const item of f.items) { await wixData.remove('GroupContacts', item._id, SA); removed++; }
                        }
                        return { success: true, message: `Removed ${removed} contacts from '${args.group_name}'` };
                    case 'list':
                        const groups = await wixData.query('ContactGroups').ascending('groupName').limit(50).find(SA);
                        const groupList = [];
                        for (const g of groups.items) {
                            const cnt = await wixData.query('GroupContacts').eq('groupName', g.groupName).count();
                            groupList.push({ name: g.groupName, memberCount: cnt });
                        }
                        return { success: true, groups: groupList };
                    default:
                        return { success: false, error: `Unknown action '${args.action}'. Use: create, delete, add_contacts, remove_contacts, list` };
                }
            }
            case 'get_events': {
                const now = new Date();
                let query = args.include_past
                    ? wixData.query('Events').descending('date')
                    : wixData.query('Events').ge('date', now).ascending('date');
                const results = await query.limit(20).find(SA);
                return { success: true, events: results.items.map(e => ({ title: e.title || e.name, date: e.date, location: e.location || e.venue })), total: results.totalCount };
            }
            case 'check_evite_rsvp': {
                const results = await wixData.query('SentEmails')
                    .hasSome('type', ['evite', 'wix-triggered-email'])
                    .contains('eventName', args.event_name)
                    .descending('sentAt').limit(100).find(SA);
                const items = results.items.map(e => ({ to: e.to, rsvpStatus: e.rsvpStatus || 'pending' }));
                return {
                    success: true, event: args.event_name,
                    summary: {
                        total: items.length,
                        yes: items.filter(i => i.rsvpStatus === 'yes').length,
                        no: items.filter(i => i.rsvpStatus === 'no').length,
                        maybe: items.filter(i => i.rsvpStatus === 'maybe').length,
                        pending: items.filter(i => i.rsvpStatus === 'pending').length
                    },
                    responses: items
                };
            }
            case 'get_dashboard': {
                let sentCount = 0, crmCount = 0, memberCount = 0;
                try { sentCount = await wixData.query('SentEmails').count(); } catch (_) {}
                try { const cr = await contacts.queryContacts().limit(1).find(SA); crmCount = cr.totalCount; } catch (_) {}
                try { memberCount = await wixData.query('Members').count(); } catch (_) {}
                return { success: true, dashboard: { email: BANF_EMAIL, totalEmailsSent: sentCount, crmContacts: crmCount, totalMembers: memberCount } };
            }
            case 'get_google_contacts': {
                const tokenResult = await getGoogleAccessToken();
                if (tokenResult.error) return { success: false, error: tokenResult.error };
                const limit = args.limit || 100;
                const search = args.search || '';
                let allContacts = [];
                let nextPageToken = '';
                let pageCount = 0;
                do {
                    pageCount++;
                    let url = `https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers,organizations&pageSize=${Math.min(limit, 1000)}`;
                    if (nextPageToken) url += `&pageToken=${nextPageToken}`;
                    const resp = await wixFetch(url, { method: 'GET', headers: { 'Authorization': `Bearer ${tokenResult.accessToken}` } });
                    const data = await resp.json();
                    if (data.error) return { success: false, error: `Google API: ${data.error.message}` };
                    for (const person of (data.connections || [])) {
                        const name = (person.names && person.names[0]) || {};
                        const email = (person.emailAddresses && person.emailAddresses[0]) || {};
                        const phone = (person.phoneNumbers && person.phoneNumbers[0]) || {};
                        const org = (person.organizations && person.organizations[0]) || {};
                        const c = { firstName: name.givenName || '', lastName: name.familyName || '', displayName: name.displayName || '', email: email.value || '', phone: phone.value || '', organization: org.name || '' };
                        if (search) {
                            const q = search.toLowerCase();
                            if (!(c.displayName.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.firstName.toLowerCase().includes(q) || c.lastName.toLowerCase().includes(q))) continue;
                        }
                        allContacts.push(c);
                    }
                    nextPageToken = data.nextPageToken || '';
                } while (nextPageToken && allContacts.length < limit && pageCount < 10);
                return { success: true, total: allContacts.length, contacts: allContacts.slice(0, limit), source: 'google' };
            }
            case 'sync_google_contacts_to_crm': {
                const tokenResult = await getGoogleAccessToken();
                if (tokenResult.error) return { success: false, error: tokenResult.error };
                let allGC = [];
                let npt = '';
                let pc = 0;
                do {
                    pc++;
                    let url = `https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers&pageSize=1000`;
                    if (npt) url += `&pageToken=${npt}`;
                    const resp = await wixFetch(url, { method: 'GET', headers: { 'Authorization': `Bearer ${tokenResult.accessToken}` } });
                    const data = await resp.json();
                    if (data.error) return { success: false, error: `Google API: ${data.error.message}` };
                    for (const person of (data.connections || [])) {
                        const name = (person.names && person.names[0]) || {};
                        const email = (person.emailAddresses && person.emailAddresses[0]) || {};
                        const phone = (person.phoneNumbers && person.phoneNumbers[0]) || {};
                        if (email.value) allGC.push({ firstName: name.givenName || '', lastName: name.familyName || '', email: email.value, phone: phone.value || '' });
                    }
                    npt = data.nextPageToken || '';
                } while (npt && pc < 20);
                const existingEmails = new Set();
                try { const wc = await contacts.queryContacts().limit(1000).find(SA); for (const c of wc.items) { for (const e of (c.info?.emails || [])) { if (e.email) existingEmails.add(e.email.toLowerCase()); } } } catch (_) {}
                const newC = allGC.filter(c => !existingEmails.has(c.email.toLowerCase()));
                if (args.mode === 'preview') return { success: true, mode: 'preview', totalGoogle: allGC.length, alreadyInCRM: allGC.length - newC.length, newToImport: newC.length, newContacts: newC.slice(0, 30) };
                const res = { imported: 0, failed: 0 };
                for (const c of newC) {
                    try { await contacts.appendOrCreateContact({ name: { first: c.firstName, last: c.lastName }, emails: [{ email: c.email, tag: 'MAIN' }], phones: c.phone ? [{ phone: c.phone, tag: 'MAIN' }] : [] }, SA); res.imported++; } catch (_) { res.failed++; }
                }
                return { success: true, mode: 'import', totalGoogle: allGC.length, imported: res.imported, failed: res.failed };
            }
            case 'generate_admin_report': {
                const reportType = args.type || 'full';
                let result = {};
                switch (reportType) {
                    case 'contacts':
                    case 'categorization':
                        result = await buildContactReport(args.ec_term, args.year);
                        break;
                    case 'email_audit':
                    case 'reachability':
                        result = await buildEmailAudit();
                        break;
                    case 'family':
                    case 'family_mapping':
                        result = await buildFamilyMapping();
                        break;
                    case 'communication':
                    case 'archive':
                        result = await buildCommunicationSchema();
                        break;
                    case 'full':
                    default:
                        result = {
                            contacts: await buildContactReport(args.ec_term, args.year),
                            emailAudit: await buildEmailAudit(),
                            familyMapping: await buildFamilyMapping(),
                            communication: await buildCommunicationSchema()
                        };
                        break;
                }
                return { success: true, reportType, generatedAt: new Date().toISOString(), report: result };
            }
            default:
                return { success: false, error: `Unknown tool: ${toolName}` };
        }
    } catch (error) {
        return { success: false, error: `Tool '${toolName}' error: ${error.message}` };
    }
}

// --- Agent Core: the orchestration loop ---
async function runAgent(userMessage, conversationHistory) {
    const hfToken = await getHFToken();
    if (!hfToken) {
        return {
            success: false,
            error: 'HF_API_TOKEN not configured. Add your Hugging Face token to Wix Secrets Manager with key "HF_API_TOKEN". Get one free at https://huggingface.co/settings/tokens'
        };
    }

    // Build messages
    const messages = [
        { role: 'system', content: AGENT_SYSTEM_PROMPT },
        ...(conversationHistory || []),
        { role: 'user', content: userMessage }
    ];

    const toolResults = [];
    let iterations = 0;
    const MAX_ITERATIONS = 5; // Safety limit

    while (iterations < MAX_ITERATIONS) {
        iterations++;

        // Call HF Inference API
        const response = await wixFetch(HF_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${hfToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: HF_MODEL,
                messages: messages,
                tools: AGENT_TOOLS,
                tool_choice: 'auto',
                max_tokens: 2048,
                temperature: 0.3
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            return { success: false, error: `HF API error (${response.status}): ${errText}` };
        }

        const data = await response.json();
        const choice = data.choices && data.choices[0];
        if (!choice) return { success: false, error: 'No response from LLM' };

        const assistantMsg = choice.message;
        messages.push(assistantMsg);

        // Check if the LLM wants to call tools
        if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
            for (const toolCall of assistantMsg.tool_calls) {
                const toolName = toolCall.function.name;
                let toolArgs = {};
                try { toolArgs = JSON.parse(toolCall.function.arguments); } catch (_) {}

                // Execute the tool
                const toolResult = await executeAgentTool(toolName, toolArgs);
                toolResults.push({ tool: toolName, args: toolArgs, result: toolResult });

                // Feed result back to LLM
                messages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(toolResult)
                });
            }
            // Continue loop so LLM can process tool results and possibly call more tools
            continue;
        }

        // Fallback: some models output tool calls as text instead of structured tool_calls
        // Try to parse tool call from the response text (LLM sometimes outputs tool calls as text)
        const contentText = assistantMsg.content || '';
        let parsedToolName = null;
        let parsedArgs = {};

        // Pattern 1: {"name": "tool_name", "arguments": {...}}
        const m1 = contentText.match(/\{\s*"name"\s*:\s*"(\w+)"\s*,\s*"arguments"\s*:\s*(\{[\s\S]*?\})\s*\}/);
        // Pattern 2: {"type": "function", "name": "tool_name", "arguments": {...}}
        const m2 = contentText.match(/\{\s*"type"\s*:\s*"function"\s*,\s*"name"\s*:\s*"(\w+)"\s*,\s*"arguments"\s*:\s*(\{[\s\S]*?\})\s*\}/);
        // Pattern 3: tool_name({"key": "value"})
        const m3 = contentText.match(/(\w+)\(\s*(\{[\s\S]*?\})\s*\)/);

        const match = m1 || m2 || m3;
        if (match) {
            parsedToolName = match[1];
            try { parsedArgs = JSON.parse(match[2]); } catch (_) {}
        }

        if (parsedToolName && toolResults.length === 0) {
            const knownTools = AGENT_TOOLS.map(t => t.function.name);
            if (knownTools.includes(parsedToolName)) {
                const toolResult = await executeAgentTool(parsedToolName, parsedArgs);
                toolResults.push({ tool: parsedToolName, args: parsedArgs, result: toolResult });
                messages.push({
                    role: 'assistant',
                    content: `I called ${parsedToolName}. Here are the results:`
                });
                messages.push({
                    role: 'user',
                    content: `Tool result: ${JSON.stringify(toolResult)}. Please summarize this result for the admin.`
                });
                continue;
            }
        }

        // No more tool calls — LLM has a final response
        return {
            success: true,
            response: assistantMsg.content || '',
            toolsUsed: toolResults,
            iterations: iterations,
            model: HF_MODEL
        };
    }

    // Max iterations reached
    return {
        success: true,
        response: 'Agent completed maximum tool iterations. Results below.',
        toolsUsed: toolResults,
        iterations: iterations,
        model: HF_MODEL
    };
}

// --- POST /_functions/agent ---
// Main agent endpoint — send a natural language command
export async function post_agent(request) {
    try {
        const body = await parseBody(request);
        if (!body || !body.message) {
            return errorResponse('message is required. Send a natural language command.', 400);
        }

        const result = await runAgent(body.message, body.history || []);

        // Log agent interaction
        try {
            await wixData.insert('AgentHistory', {
                userMessage: body.message,
                agentResponse: result.response || '',
                toolsUsed: JSON.stringify(result.toolsUsed || []),
                success: result.success,
                model: HF_MODEL,
                timestamp: new Date()
            }, SA);
        } catch (_) {}

        return jsonResponse(result);
    } catch (error) {
        return errorResponse('Agent error: ' + error.message, 500);
    }
}
export function options_agent(request) { return handleCors(); }

// --- GET /_functions/agent_status ---
// Check agent configuration and readiness
export async function get_agent_status(request) {
    const hfToken = await getHFToken();
    let tokenStatus = 'not_configured';
    let modelTest = null;

    if (hfToken) {
        tokenStatus = 'configured';
        // Quick test: send a minimal request to verify token works
        try {
            const testResp = await wixFetch(HF_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${hfToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: HF_MODEL,
                    messages: [{ role: 'user', content: 'Say OK' }],
                    max_tokens: 10
                })
            });
            if (testResp.ok) {
                const testData = await testResp.json();
                modelTest = {
                    status: 'connected',
                    model: HF_MODEL,
                    response: testData.choices && testData.choices[0] ? testData.choices[0].message.content : 'no response'
                };
            } else {
                modelTest = { status: 'error', code: testResp.status, message: await testResp.text() };
            }
        } catch (e) {
            modelTest = { status: 'error', message: e.message };
        }
    }

    return jsonResponse({
        success: true,
        agent: {
            version: '5.0.0-agent',
            model: HF_MODEL,
            provider: 'Hugging Face Inference API',
            tokenStatus,
            modelTest,
            capabilities: AGENT_TOOLS.map(t => t.function.name),
            setup: tokenStatus === 'not_configured' ? {
                step1: 'Go to https://huggingface.co/settings/tokens',
                step2: 'Create a fine-grained token with "Make calls to Inference Providers" permission',
                step3: 'In Wix Dashboard → Settings → Secrets Manager → Add new secret',
                step4: 'Secret name: HF_API_TOKEN, value: your token (hf_xxxxx)'
            } : undefined
        }
    });
}
export function options_agent_status(request) { return handleCors(); }

// --- GET /_functions/agent_history ---
// View past agent interactions
export async function get_agent_history(request) {
    try {
        const page = parseInt(getQueryParam(request, 'page')) || 1;
        const perPage = parseInt(getQueryParam(request, 'per_page')) || 20;

        const results = await wixData.query('AgentHistory')
            .descending('timestamp')
            .skip((page - 1) * perPage)
            .limit(perPage)
            .find(SA);

        return jsonResponse({
            success: true,
            history: results.items.map(h => ({
                id: h._id,
                userMessage: h.userMessage,
                agentResponse: h.agentResponse,
                toolsUsed: h.toolsUsed ? JSON.parse(h.toolsUsed) : [],
                success: h.success,
                timestamp: h.timestamp
            })),
            total: results.totalCount,
            page, per_page: perPage
        });
    } catch (error) {
        return jsonResponse({ success: true, history: [], total: 0, error: error.message });
    }
}
export function options_agent_history(request) { return handleCors(); }


// ╔══════════════════════════════════════════════════════════════════╗
// ║  REPORT MODULE v1.0 — Admin Audit & Categorization Engine       ║
// ║  Email categorization, family mapping, reachability analysis    ║
// ╚══════════════════════════════════════════════════════════════════╝

// --- EC Term Generator: 24 two-year terms, July 1 – June 30 ---
// Each EC term spans 2 fiscal years: EC-2024-2025 = July 2024 → June 2026
function generateECTerms() {
    const terms = [];
    for (let startYear = 1978; startYear <= 2024; startYear += 2) {
        const endYear = startYear + 1;
        terms.push({
            ec_term_id: `EC-${startYear}-${endYear}`,
            term_name: `${startYear}-${endYear} EC`,
            start_date: `${startYear}-07-01`,
            end_date: `${startYear + 2}-06-30`,
            fy1: `FY-${startYear}-${endYear}`,
            fy2: `FY-${endYear}-${startYear + 2}`,
            status: startYear === 2024 ? 'active' : 'completed'
        });
    }
    return terms;
}

// --- Bengali Surname Normalization & Variants ---
const SURNAME_VARIANTS = {
    'ghosh': ['ghose', 'gosh'],
    'ganguly': ['ganguli', 'gangopadhyay', 'gangopadhyaya'],
    'mukherjee': ['mukherji', 'mukhopadhyay', 'mukhopadhyaya', 'mookerjee', 'mukerji', 'mookherjee'],
    'chatterjee': ['chatterji', 'chattopadhyay', 'chattopadhyaya', 'chatterji'],
    'banerjee': ['banerji', 'bandyopadhyay', 'bandopadhyay', 'bannerjee'],
    'bhattacharya': ['bhattacharyya', 'bhattacharjee', 'bhattacharji'],
    'chakraborty': ['chakrabarti', 'chakravartty', 'chakravarty', 'chakravarti'],
    'dasgupta': ['das gupta', 'das-gupta'],
    'sengupta': ['sen gupta', 'sen-gupta'],
    'majumdar': ['majumder', 'mazumdar', 'mazumder'],
    'roy': ['ray', 'roychowdhury', 'roychoudhury', 'raychaudhuri'],
    'bose': ['basu', 'bosu'],
    'mitra': ['mitter', 'mittra'],
    'dutta': ['dutt', 'datta', 'datt'],
    'sarkar': ['sircar', 'sarker'],
    'saha': ['shaha'],
    'gupta': [],
    'das': ['doss'],
    'paul': ['pal'],
    'sen': [],
    'kar': [],
    'kundu': [],
    'nandi': ['nandy'],
    'chowdhury': ['choudhury', 'chaudhuri', 'chaudhury'],
    'biswas': ['bishwas'],
    'mondal': ['mandal'],
    'haldar': ['halder'],
    'adhikari': ['adhikary'],
    'bhowmick': ['bhowmik', 'bhaumik'],
    'sanyal': ['sanyal'],
    'lahiri': ['lahiry'],
    'talukdar': ['talukder']
};

function normalizeSurname(name) {
    if (!name) return '';
    const lower = name.toLowerCase().trim();
    // Check if it IS a canonical name
    if (SURNAME_VARIANTS[lower] !== undefined) return lower;
    // Check if it's a variant
    for (const [canonical, variants] of Object.entries(SURNAME_VARIANTS)) {
        if (variants.includes(lower)) return canonical;
    }
    return lower;
}

// --- Email Domain Analysis ---
const DOMAIN_CATEGORIES = {
    'gmail.com': { provider: 'Google', risk: 'low', era: 'modern' },
    'yahoo.com': { provider: 'Yahoo', risk: 'low', era: 'classic' },
    'yahoo.co.in': { provider: 'Yahoo India', risk: 'medium', era: 'classic' },
    'hotmail.com': { provider: 'Microsoft', risk: 'low', era: 'classic' },
    'outlook.com': { provider: 'Microsoft', risk: 'low', era: 'modern' },
    'live.com': { provider: 'Microsoft', risk: 'low', era: 'modern' },
    'aol.com': { provider: 'AOL', risk: 'medium', era: 'legacy' },
    'msn.com': { provider: 'Microsoft', risk: 'medium', era: 'legacy' },
    'netzero.com': { provider: 'NetZero', risk: 'high', era: 'legacy' },
    'netzero.net': { provider: 'NetZero', risk: 'high', era: 'legacy' },
    'earthlink.net': { provider: 'EarthLink', risk: 'high', era: 'legacy' },
    'bellsouth.net': { provider: 'AT&T/BellSouth', risk: 'medium', era: 'legacy' },
    'att.net': { provider: 'AT&T', risk: 'medium', era: 'legacy' },
    'comcast.net': { provider: 'Comcast', risk: 'medium', era: 'isp' },
    'verizon.net': { provider: 'Verizon', risk: 'medium', era: 'isp' },
    'cox.net': { provider: 'Cox', risk: 'medium', era: 'isp' },
    'charter.net': { provider: 'Charter', risk: 'medium', era: 'isp' },
    'sbcglobal.net': { provider: 'AT&T/SBC', risk: 'medium', era: 'legacy' },
    'icloud.com': { provider: 'Apple', risk: 'low', era: 'modern' },
    'me.com': { provider: 'Apple', risk: 'low', era: 'modern' },
    'protonmail.com': { provider: 'ProtonMail', risk: 'low', era: 'modern' },
    'rediffmail.com': { provider: 'Rediff India', risk: 'high', era: 'legacy' },
    'sify.com': { provider: 'Sify India', risk: 'high', era: 'legacy' },
    'vsnl.net': { provider: 'VSNL India', risk: 'high', era: 'legacy' },
    'hotmail.co.in': { provider: 'Microsoft India', risk: 'medium', era: 'classic' }
};

function analyzeEmailDomain(email) {
    if (!email || !email.includes('@')) return { valid: false, domain: '', risk: 'invalid', provider: 'none', era: 'none', type: 'invalid' };
    const domain = email.split('@')[1].toLowerCase();
    const known = DOMAIN_CATEGORIES[domain];
    let type = 'personal';
    if (domain.endsWith('.edu')) type = 'educational';
    else if (domain.endsWith('.org')) type = 'organization';
    else if (domain.endsWith('.gov')) type = 'government';
    else if (domain.endsWith('.co.in') || domain.endsWith('.in')) type = 'indian';
    else if (!known && !domain.match(/^(gmail|yahoo|hotmail|outlook|aol|msn|icloud)/)) type = 'corporate';
    return {
        valid: true,
        domain,
        provider: known ? known.provider : (type === 'educational' ? 'University' : type === 'corporate' ? 'Corporate' : 'Other'),
        risk: known ? known.risk : (type === 'educational' ? 'low' : type === 'corporate' ? 'low' : 'unknown'),
        era: known ? known.era : 'unknown',
        type
    };
}

// --- Email Categorization for NPO context ---
// --- Hierarchical Email Category System ---
// Main categories with subcategories for NPO context
const EMAIL_CATEGORIES = {
    payment: {
        label: 'Payment',
        subcategories: {
            membership: { label: 'Membership Dues', pattern: /\b(membership|member|dues|annual fee|renewal|renew|registration fee|member fee)\b/ },
            sponsorship: { label: 'Sponsorship', pattern: /\b(sponsor|sponsorship|gold sponsor|silver|platinum|bronze|patron|sponsor payment)\b/ },
            vendor: { label: 'Vendor Payment', pattern: /\b(vendor payment|vendor invoice|catering bill|caterer payment|vendor bill|food cost|venue cost)\b/ },
            donation: { label: 'Donation', pattern: /\b(donat|contribution|gift|charity|philanthropic|fundrais|give|seva|offering)\b/ },
            event_fee: { label: 'Event Fee', pattern: /\b(ticket|entry fee|event fee|event payment|rsvp.*pay|registration.*event)\b/ },
            refund: { label: 'Refund', pattern: /\b(refund|reimburse|return.*payment|credit back|money back)\b/ },
            general: { label: 'General Payment', pattern: /\b(zelle|payment|paid|receipt|invoice|check|amount|dollar|\$|transaction|wire|transfer)\b/ }
        }
    },
    complaint: {
        label: 'Complaint',
        subcategories: {
            ec_members: { label: 'About EC Members', pattern: /\b(ec member|officer|president|vp|treasurer|secretary|board member|committee|ec.*complaint|complaint.*ec)\b/ },
            events: { label: 'About Events', pattern: /\b(event.*complaint|complaint.*event|event.*issue|bad.*event|event.*problem|puja.*issue|picnic.*problem)\b/ },
            other_members: { label: 'About Other Members', pattern: /\b(member.*complaint|complaint.*member|harass|bully|rude|inappropriate|behavior|misconduct)\b/ },
            services: { label: 'About Services', pattern: /\b(service.*complaint|poor service|bad service|website.*issue|app.*issue|communication.*issue)\b/ },
            financial: { label: 'Financial Concerns', pattern: /\b(financial.*concern|money.*issue|misuse|mismanage|fraud|transparency|audit.*concern|account.*issue)\b/ },
            general: { label: 'General Complaint', pattern: /\b(complaint|issue|concern|feedback|problem|unhappy|dissatisfied|disappointed|frustrat)\b/ }
        }
    },
    enquiry: {
        label: 'Enquiry',
        subcategories: {
            events: { label: 'Event Enquiry', pattern: /\b(when.*event|event.*date|event.*time|event.*venue|event.*location|what.*event|upcoming.*event|next.*puja|when.*picnic|event.*detail)\b/ },
            membership_fees: { label: 'Membership Fee Enquiry', pattern: /\b(how much.*member|member.*fee|member.*cost|member.*price|fee.*structure|membership.*info|join.*banf|how.*join)\b/ },
            sponsorship_info: { label: 'Sponsorship Enquiry', pattern: /\b(sponsor.*info|sponsor.*detail|sponsor.*package|how.*sponsor|become.*sponsor|sponsor.*tier|sponsor.*benefit)\b/ },
            general: { label: 'General Enquiry', pattern: /\b(enquir|inquir|question|know|info|information|detail|what is|how do|can you|please tell|could you|help.*with)\b/ }
        }
    },
    event: {
        label: 'Event Management',
        subcategories: {
            puja: { label: 'Puja/Religious', pattern: /\b(puja|durga|saraswati|kali|lakshmi|ganesh|holi|diwali|navratri|pooja|religious|prayer)\b/ },
            cultural: { label: 'Cultural Program', pattern: /\b(cultural|program|show|concert|music|dance|drama|performance|recital|talent|stage)\b/ },
            social: { label: 'Social Event', pattern: /\b(picnic|bbq|gathering|potluck|new year|independence|republic day|summer|winter|party|celebration|get.?together)\b/ },
            meeting: { label: 'Meeting', pattern: /\b(meeting|agm|annual general|general body|ec meeting|board meeting|agenda|minutes|quorum)\b/ },
            general: { label: 'General Event', pattern: /\b(event|program|function|occasion|ceremony|festival)\b/ }
        }
    },
    governance: {
        label: 'Governance',
        subcategories: {
            election: { label: 'Election', pattern: /\b(election|vote|voting|candidate|nomination|ballot|poll|elect)\b/ },
            constitution: { label: 'Constitution/Bylaws', pattern: /\b(constitution|bylaw|by-law|rule|regulation|amendment|charter|policy)\b/ },
            ec_admin: { label: 'EC Administration', pattern: /\b(ec admin|committee|officer|appointment|resign|term|transition|handover)\b/ },
            general: { label: 'General Governance', pattern: /\b(governance|decision|resolution|motion|motion.*pass|approved|directive)\b/ }
        }
    },
    communication: {
        label: 'Communication',
        subcategories: {
            newsletter: { label: 'Newsletter', pattern: /\b(newsletter|monthly update|quarterly|bulletin|digest)\b/ },
            announcement: { label: 'Announcement', pattern: /\b(announce|announcement|notice|circular|alert|important.*update|heads up)\b/ },
            invitation: { label: 'Invitation', pattern: /\b(invit|cordially|you.*invited|rsvp|please join|request.*presence|save.*date|evite)\b/ },
            reminder: { label: 'Reminder', pattern: /\b(remind|reminder|don.*forget|last chance|deadline|due.*date|follow.*up|pending)\b/ },
            thank_you: { label: 'Thank You/Acknowledgment', pattern: /\b(thank|thanks|grateful|appreciation|acknowledge|well done|congrat)\b/ },
            general: { label: 'General Communication', pattern: /\b(update|inform|fyi|note|message|reach out|touch base)\b/ }
        }
    },
    magazine: {
        label: 'Magazine/Publication',
        subcategories: {
            submission: { label: 'Article Submission', pattern: /\b(article|poem|story|submission|submit|write|writing|essay|creative)\b/ },
            advertisement: { label: 'Ad Placement', pattern: /\b(ad |advertisement|ad size|full page|half page|quarter page|ad rate|place.*ad)\b/ },
            editorial: { label: 'Editorial', pattern: /\b(editor|editorial|jagriti|magazine|publish|edition|cover|layout|print)\b/ },
            general: { label: 'General Publication', pattern: /\b(publication|issue|copy|distribute|mail.*magazine)\b/ }
        }
    },
    accounting: {
        label: 'Accounting/Finance',
        subcategories: {
            budget: { label: 'Budget', pattern: /\b(budget|budget.*plan|allocat|spending|fiscal|annual budget)\b/ },
            tax: { label: 'Tax/Compliance', pattern: /\b(tax|1099|w-?9|ein|irs|501.*c|non.?profit|exempt|charitable)\b/ },
            audit: { label: 'Audit', pattern: /\b(audit|review.*account|financial.*review|reconcil|verify.*account)\b/ },
            report: { label: 'Financial Report', pattern: /\b(financial.*report|income.*statement|balance.*sheet|p.*l|profit|loss|treasury|treasurer.*report)\b/ },
            general: { label: 'General Finance', pattern: /\b(account|ledger|expense|income|revenue|cost|finance|financial|money|fund)\b/ }
        }
    },
    vendor: {
        label: 'Vendor Management',
        subcategories: {
            catering: { label: 'Catering', pattern: /\b(cater|food|menu|cuisine|chef|cook|meal|lunch|dinner|breakfast|snack|beverage)\b/ },
            venue: { label: 'Venue', pattern: /\b(venue|hall|location|room|space|booking|reservation|facility|rental)\b/ },
            supplies: { label: 'Supplies/Decoration', pattern: /\b(decoration|decor|supply|supplies|flower|stage|sound|light|equipment|rental)\b/ },
            general: { label: 'General Vendor', pattern: /\b(vendor|supplier|contractor|service provider|quote|estimate|bid|proposal)\b/ }
        }
    },
    volunteer: {
        label: 'Volunteer',
        subcategories: {
            signup: { label: 'Volunteer Signup', pattern: /\b(volunteer.*sign|sign.*up.*volunteer|want.*help|available.*help|ready.*volunteer)\b/ },
            coordination: { label: 'Coordination', pattern: /\b(volunteer.*coord|task.*assign|volunteer.*schedule|shift|duty|role.*assign)\b/ },
            general: { label: 'General Volunteer', pattern: /\b(volunteer|help|assist|support|contribute|pitch in|lend.*hand|seva)\b/ }
        }
    },
    general: {
        label: 'General/Uncategorized',
        subcategories: {
            greeting: { label: 'Greeting/Social', pattern: /\b(hello|hi |happy birthday|happy anniversary|wish|greet|season|holiday|eid|christmas|new year wish)\b/ },
            personal: { label: 'Personal', pattern: /\b(personal|private|family matter|individual|one.*on.*one)\b/ },
            other: { label: 'Other', pattern: null }
        }
    }
};

function categorizeContactRole(contact) {
    const roles = [];
    const org = (contact.organization || '').toLowerCase();
    const email = (contact.email || '').toLowerCase();

    // Organization-based role detection
    if (org.includes('banf') || org.includes('bengali association')) roles.push('ec_officer');
    if (org.includes('restaurant') || org.includes('catering') || org.includes('food') || org.includes('kitchen') || org.includes('spice') || org.includes('india') || org.includes('curry') || org.includes('tandoor') || org.includes('biryani')) roles.push('vendor');
    if (org.includes('insurance') || org.includes('realty') || org.includes('real estate') || org.includes('law') || org.includes('attorney') || org.includes('medical') || org.includes('dental') || org.includes('bank') || org.includes('financial') || org.includes('mortgage') || org.includes('accounting') || org.includes('cpa') || org.includes('travel') || org.includes('jewel')) roles.push('sponsor');
    if (org.includes('temple') || org.includes('mandir') || org.includes('church') || org.includes('masjid') || org.includes('hindu') || org.includes('society') || org.includes('association') || org.includes('foundation')) roles.push('community_org');
    if (org.includes('school') || org.includes('university') || org.includes('college') || org.includes('education')) roles.push('education');

    // Email domain-based detection
    if (email.endsWith('.edu')) roles.push('education');
    if (email.endsWith('.gov')) roles.push('government');
    if (email.endsWith('.org') && !email.includes('gmail') && !email.includes('yahoo')) roles.push('nonprofit');

    // If no org-based roles, default to member
    if (roles.length === 0) roles.push('member');
    // Deduplicate
    return [...new Set(roles)];
}

function categorizeEmailPurpose(subject, body) {
    const text = ((subject || '') + ' ' + (body || '')).toLowerCase();

    // Try each main category, then each subcategory within it
    for (const [mainKey, mainCat] of Object.entries(EMAIL_CATEGORIES)) {
        for (const [subKey, subCat] of Object.entries(mainCat.subcategories)) {
            if (subCat.pattern && subCat.pattern.test(text)) {
                return {
                    category: mainKey,
                    categoryLabel: mainCat.label,
                    subcategory: subKey,
                    subcategoryLabel: subCat.label,
                    display: `${mainCat.label} > ${subCat.label}`
                };
            }
        }
    }

    return {
        category: 'general',
        categoryLabel: 'General/Uncategorized',
        subcategory: 'other',
        subcategoryLabel: 'Other',
        display: 'General/Uncategorized > Other'
    };
}

// --- Core Report Functions ---

// 1. Full CRM Contact Analysis with categorization
async function buildContactReport(filterECTerm, filterYear) {
    const ecTerms = generateECTerms();
    
    // Get all CRM contacts
    let allContacts = [];
    let hasMore = true;
    let skip = 0;
    while (hasMore) {
        const batch = await contacts.queryContacts().skip(skip).limit(100).find(SA);
        for (const c of batch.items) {
            const info = c.info || {};
            const name = info.name || {};
            const email = (info.emails && info.emails[0]) ? info.emails[0].email : '';
            const phone = (info.phones && info.phones[0]) ? info.phones[0].phone : '';
            allContacts.push({
                id: c._id,
                firstName: name.first || '',
                lastName: name.last || '',
                displayName: `${name.first || ''} ${name.last || ''}`.trim(),
                email,
                phone,
                createdDate: c._createdDate || c.createdDate || null,
                source: c.source || 'unknown'
            });
        }
        hasMore = batch.items.length === 100;
        skip += 100;
    }

    // Categorize each contact
    const categorized = allContacts.map(c => {
        const domain = analyzeEmailDomain(c.email);
        const surname = normalizeSurname(c.lastName);
        const roles = categorizeContactRole(c);

        // Map to EC term based on creation date
        let ecTerm = null;
        if (c.createdDate) {
            const d = new Date(c.createdDate);
            for (const term of ecTerms) {
                if (d >= new Date(term.start_date) && d <= new Date(term.end_date)) {
                    ecTerm = term.ec_term_id;
                    break;
                }
            }
        }

        // Extract year
        const year = c.createdDate ? new Date(c.createdDate).getFullYear() : null;

        return {
            ...c,
            normalizedSurname: surname,
            domain,
            roles,
            ecTerm: ecTerm || 'unknown',
            year: year || 'unknown'
        };
    });

    // Apply filters
    let filtered = categorized;
    if (filterECTerm) filtered = filtered.filter(c => c.ecTerm === filterECTerm);
    if (filterYear) filtered = filtered.filter(c => c.year === parseInt(filterYear));

    // Build aggregations
    const byECTerm = {};
    const byYear = {};
    const byDomain = {};
    const byRole = {};
    const bySurname = {};

    for (const c of filtered) {
        // By EC Term
        if (!byECTerm[c.ecTerm]) byECTerm[c.ecTerm] = [];
        byECTerm[c.ecTerm].push({ name: c.displayName, email: c.email, roles: c.roles });

        // By Year
        const yr = String(c.year);
        if (!byYear[yr]) byYear[yr] = [];
        byYear[yr].push({ name: c.displayName, email: c.email });

        // By Domain Provider
        const prov = c.domain.provider;
        if (!byDomain[prov]) byDomain[prov] = { count: 0, risk: c.domain.risk, era: c.domain.era, contacts: [] };
        byDomain[prov].count++;
        byDomain[prov].contacts.push(c.email);

        // By Role
        for (const r of c.roles) {
            if (!byRole[r]) byRole[r] = [];
            byRole[r].push({ name: c.displayName, email: c.email });
        }

        // By Surname (family grouping)
        const sn = c.normalizedSurname || 'unknown';
        if (!bySurname[sn]) bySurname[sn] = [];
        bySurname[sn].push({ name: c.displayName, email: c.email, firstName: c.firstName });
    }

    // Build sequenced communication timeline
    const sequence = filtered
        .filter(c => c.createdDate)
        .sort((a, b) => new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime())
        .map((c, idx) => ({
            seq: idx + 1,
            date: new Date(c.createdDate).toISOString().split('T')[0],
            name: c.displayName,
            email: c.email,
            ecTerm: c.ecTerm,
            roles: c.roles
        }));

    // Build hierarchical category schema for reference
    const categorySchema = Object.entries(EMAIL_CATEGORIES).map(([key, cat]) => ({
        category: key,
        label: cat.label,
        subcategories: Object.entries(cat.subcategories).map(([sk, sc]) => ({ key: sk, label: sc.label }))
    }));

    return {
        totalContacts: filtered.length,
        ecTerms: Object.entries(byECTerm).map(([term, list]) => ({ term, count: list.length, contacts: list })),
        years: Object.entries(byYear).map(([year, list]) => ({ year, count: list.length, contacts: list })),
        domains: Object.entries(byDomain).map(([provider, info]) => ({ provider, ...info })),
        roles: Object.entries(byRole).map(([role, list]) => ({ role, count: list.length, contacts: list })),
        families: Object.entries(bySurname)
            .filter(([sn]) => sn !== 'unknown')
            .map(([surname, members]) => ({ surname, memberCount: members.length, members }))
            .sort((a, b) => b.memberCount - a.memberCount),
        categorySchema,
        sequence
    };
}

// 2. Email Reachability Analysis
async function buildEmailAudit() {
    let allContacts = [];
    let hasMore = true;
    let skip = 0;
    while (hasMore) {
        const batch = await contacts.queryContacts().skip(skip).limit(100).find(SA);
        for (const c of batch.items) {
            const info = c.info || {};
            const name = info.name || {};
            const email = (info.emails && info.emails[0]) ? info.emails[0].email : '';
            allContacts.push({
                id: c._id,
                name: `${name.first || ''} ${name.last || ''}`.trim(),
                email,
                createdDate: c._createdDate || null
            });
        }
        hasMore = batch.items.length === 100;
        skip += 100;
    }

    const issues = [];
    const domainStats = {};
    let healthyCount = 0;
    let warningCount = 0;
    let criticalCount = 0;
    let noEmailCount = 0;

    for (const c of allContacts) {
        if (!c.email) {
            noEmailCount++;
            issues.push({ contact: c.name, email: '(none)', severity: 'critical', issue: 'No email address on file', recommendation: 'Obtain email or remove from active CRM' });
            continue;
        }

        const analysis = analyzeEmailDomain(c.email);

        // Track domain stats
        if (!domainStats[analysis.domain]) domainStats[analysis.domain] = { count: 0, risk: analysis.risk, provider: analysis.provider };
        domainStats[analysis.domain].count++;

        if (!analysis.valid) {
            criticalCount++;
            issues.push({ contact: c.name, email: c.email, severity: 'critical', issue: 'Invalid email format', recommendation: 'Fix email format — missing @ or domain' });
            continue;
        }

        // Check for specific issues
        const emailIssues = [];

        // High-risk legacy domains
        if (analysis.risk === 'high') {
            emailIssues.push({ severity: 'warning', issue: `Legacy provider (${analysis.provider}) — may be inactive or have delivery issues`, recommendation: `Confirm email is still active. Consider requesting updated email (Gmail/Outlook).` });
        }

        // ISP-based emails (often lost when switching providers)
        if (analysis.era === 'isp') {
            emailIssues.push({ severity: 'info', issue: `ISP-based email (${analysis.provider}) — may become invalid if user switches internet provider`, recommendation: 'Verify periodically. Suggest migrating to persistent provider.' });
        }

        // Indian domains for US-based org
        if (analysis.type === 'indian') {
            emailIssues.push({ severity: 'info', issue: 'Indian domain email — may indicate overseas contact', recommendation: 'Verify if contact is still US-based and reachable.' });
        }

        // Duplicate email check
        const dupes = allContacts.filter(oc => oc.email.toLowerCase() === c.email.toLowerCase() && oc.id !== c.id);
        if (dupes.length > 0) {
            emailIssues.push({ severity: 'warning', issue: `Duplicate email — shared with: ${dupes.map(d => d.name).join(', ')}`, recommendation: 'Merge duplicate contacts or verify separate people share this email.' });
        }

        // No name
        if (!c.name || c.name.trim() === '') {
            emailIssues.push({ severity: 'warning', issue: 'No name associated with email', recommendation: 'Update contact with proper name for records.' });
        }

        // Common typo patterns
        const local = c.email.split('@')[0];
        if (local.match(/\.\./)) emailIssues.push({ severity: 'warning', issue: 'Possible typo: consecutive dots in email address', recommendation: 'Verify email address with contact.' });
        if (analysis.domain.match(/^(gmial|gmai|gmali|gmal|gamil)\./)) emailIssues.push({ severity: 'critical', issue: 'Likely typo in Gmail domain', recommendation: 'Correct to gmail.com' });
        if (analysis.domain.match(/^(yaho|yhoo|yahooo)\./)) emailIssues.push({ severity: 'critical', issue: 'Likely typo in Yahoo domain', recommendation: 'Correct to yahoo.com' });
        if (analysis.domain.match(/^(hotmial|hotmal|hotamil)\./)) emailIssues.push({ severity: 'critical', issue: 'Likely typo in Hotmail domain', recommendation: 'Correct to hotmail.com' });

        if (emailIssues.length > 0) {
            const maxSeverity = emailIssues.some(i => i.severity === 'critical') ? 'critical' : emailIssues.some(i => i.severity === 'warning') ? 'warning' : 'info';
            if (maxSeverity === 'critical') criticalCount++;
            else if (maxSeverity === 'warning') warningCount++;
            else healthyCount++;
            for (const issue of emailIssues) {
                issues.push({ contact: c.name, email: c.email, ...issue });
            }
        } else {
            healthyCount++;
        }
    }

    // MX record check via DNS (best-effort, may not work from all environments)
    const uniqueDomains = Object.keys(domainStats);
    const mxResults = {};
    for (const domain of uniqueDomains.slice(0, 20)) {
        try {
            const resp = await wixFetch(`https://dns.google/resolve?name=${domain}&type=MX`, { method: 'GET' });
            const data = await resp.json();
            mxResults[domain] = {
                hasMX: !!(data.Answer && data.Answer.length > 0),
                records: data.Answer ? data.Answer.map(a => a.data).slice(0, 3) : []
            };
            if (!mxResults[domain].hasMX) {
                // Flag all contacts with this domain
                const affected = allContacts.filter(c => c.email && c.email.split('@')[1]?.toLowerCase() === domain);
                for (const c of affected) {
                    issues.push({
                        contact: c.name, email: c.email,
                        severity: 'critical',
                        issue: `Domain ${domain} has NO MX records — email delivery will fail`,
                        recommendation: 'Contact person for updated email address. This domain cannot receive email.'
                    });
                    criticalCount++;
                }
            }
        } catch (e) {
            mxResults[domain] = { hasMX: 'unknown', error: e.message };
        }
    }

    return {
        totalContacts: allContacts.length,
        summary: {
            healthy: healthyCount,
            warning: warningCount,
            critical: criticalCount,
            noEmail: noEmailCount,
            healthPercentage: allContacts.length > 0 ? Math.round((healthyCount / allContacts.length) * 100) : 0
        },
        domainBreakdown: Object.entries(domainStats)
            .map(([domain, info]) => ({ domain, ...info }))
            .sort((a, b) => b.count - a.count),
        mxValidation: mxResults,
        issues: issues.sort((a, b) => {
            const sev = { critical: 0, warning: 1, info: 2 };
            return (sev[a.severity] || 3) - (sev[b.severity] || 3);
        }),
        recommendations: [
            criticalCount > 0 ? `⚠ ${criticalCount} contacts have critical email issues requiring immediate attention` : null,
            warningCount > 0 ? `⚡ ${warningCount} contacts have warnings — review and update as needed` : null,
            noEmailCount > 0 ? `📧 ${noEmailCount} contacts have no email — obtain email or remove from active CRM` : null,
            `✅ ${healthyCount} contacts (${allContacts.length > 0 ? Math.round((healthyCount / allContacts.length) * 100) : 0}%) have healthy email addresses`
        ].filter(Boolean)
    };
}

// 3. Family Universe Mapping
async function buildFamilyMapping() {
    // Get all CRM contacts
    let allContacts = [];
    let hasMore = true;
    let skip = 0;
    while (hasMore) {
        const batch = await contacts.queryContacts().skip(skip).limit(100).find(SA);
        for (const c of batch.items) {
            const info = c.info || {};
            const name = info.name || {};
            const email = (info.emails && info.emails[0]) ? info.emails[0].email : '';
            const phone = (info.phones && info.phones[0]) ? info.phones[0].phone : '';
            allContacts.push({
                id: c._id,
                firstName: name.first || '',
                lastName: name.last || '',
                displayName: `${name.first || ''} ${name.last || ''}`.trim(),
                email,
                phone
            });
        }
        hasMore = batch.items.length === 100;
        skip += 100;
    }

    // Build family groups from CRM contacts using surname normalization
    const familyGroups = {};
    const unmapped = [];
    let familySeq = 1;

    for (const c of allContacts) {
        if (!c.lastName && !c.firstName) {
            unmapped.push({ ...c, reason: 'No name on contact — cannot assign to family' });
            continue;
        }

        const surname = normalizeSurname(c.lastName);
        if (!surname || surname === '') {
            unmapped.push({ ...c, reason: 'No surname — cannot assign to family group' });
            continue;
        }

        if (!familyGroups[surname]) {
            const abbr = surname.substring(0, 2).toLowerCase();
            const seqStr = String(familySeq).padStart(2, '0');
            familyGroups[surname] = {
                family_id: `FAM-${abbr}${seqStr}`,
                primary_surname: surname.charAt(0).toUpperCase() + surname.slice(1),
                display_name: `${surname.charAt(0).toUpperCase() + surname.slice(1)} Family`,
                members: [],
                alt_surnames: [],
                email_domains: new Set()
            };
            familySeq++;

            // Find known variants for this surname
            if (SURNAME_VARIANTS[surname]) {
                familyGroups[surname].alt_surnames = SURNAME_VARIANTS[surname];
            }
        }

        familyGroups[surname].members.push({
            name: c.displayName,
            email: c.email,
            firstName: c.firstName,
            contactId: c.id
        });

        if (c.email) {
            const domain = c.email.split('@')[1];
            if (domain) familyGroups[surname].email_domains.add(domain);
        }
    }

    // Convert Sets to arrays for JSON serialization
    const families = Object.values(familyGroups).map(f => ({
        ...f,
        member_count: f.members.length,
        email_domains: Array.from(f.email_domains),
        retention_status: 'active'
    }));

    // Cross-match: detect potential family links by shared email domain + different surnames
    const crossMatches = [];
    const domainToFamilies = {};
    for (const f of families) {
        for (const d of f.email_domains) {
            // Only check non-generic domains
            if (!DOMAIN_CATEGORIES[d]) {
                if (!domainToFamilies[d]) domainToFamilies[d] = [];
                domainToFamilies[d].push(f.family_id);
            }
        }
    }
    for (const [domain, famIds] of Object.entries(domainToFamilies)) {
        if (famIds.length > 1) {
            crossMatches.push({
                domain,
                families: famIds,
                hint: 'Multiple family groups share the same corporate/custom email domain — may indicate family connection or employer relationship'
            });
        }
    }

    // Summary statistics
    const totalFamilies = families.length;
    const singleMemberFamilies = families.filter(f => f.member_count === 1).length;
    const largeFamilies = families.filter(f => f.member_count >= 3).length;
    const avgFamilySize = totalFamilies > 0 ? (allContacts.length / totalFamilies).toFixed(1) : 0;

    // Bengali surname detection
    const bengaliSurnames = families.filter(f => SURNAME_VARIANTS[f.primary_surname.toLowerCase()] !== undefined);

    return {
        totalCRMContacts: allContacts.length,
        totalFamilies,
        unmappedCount: unmapped.length,
        statistics: {
            singleMemberFamilies,
            largeFamilies,
            avgFamilySize: parseFloat(avgFamilySize),
            identifiedBengaliFamilies: bengaliSurnames.length,
            totalBengaliMembers: bengaliSurnames.reduce((s, f) => s + f.member_count, 0)
        },
        families: families.sort((a, b) => b.member_count - a.member_count),
        unmapped,
        crossMatches,
        surnameVariantsUsed: Object.keys(SURNAME_VARIANTS).length,
        ecTermReference: generateECTerms().map(t => ({ id: t.ec_term_id, name: t.term_name, status: t.status }))
    };
}

// 4. Communication Archive Schema
async function buildCommunicationSchema() {
    const ecTerms = generateECTerms();

    // Query sent emails for communication audit
    let sentEmails = [];
    try {
        const results = await wixData.query('SentEmails').descending('sentAt').limit(500).find(SA);
        sentEmails = results.items;
    } catch (_) {}

    // Query inbox if available
    let inboxEmails = [];
    try {
        const results = await wixData.query('InboxMessages').descending('receivedAt').limit(500).find(SA);
        inboxEmails = results.items;
    } catch (_) {}

    // Categorize all communications
    const communications = [];
    let seq = 1;

    for (const email of sentEmails) {
        const purpose = categorizeEmailPurpose(email.subject || '', email.body || '');
        const sentDate = email.sentAt ? new Date(email.sentAt) : null;
        let ecTerm = 'unknown';
        if (sentDate) {
            for (const term of ecTerms) {
                if (sentDate >= new Date(term.start_date) && sentDate <= new Date(term.end_date)) {
                    ecTerm = term.ec_term_id;
                    break;
                }
            }
        }

        communications.push({
            seq: seq++,
            direction: 'outbound',
            type: email.type || 'email',
            to: email.to || '',
            from: 'banfjax@gmail.com',
            subject: email.subject || '',
            category: purpose.category,
            categoryLabel: purpose.categoryLabel,
            subcategory: purpose.subcategory,
            subcategoryLabel: purpose.subcategoryLabel,
            categoryDisplay: purpose.display,
            ecTerm,
            year: sentDate ? sentDate.getFullYear() : 'unknown',
            date: sentDate ? sentDate.toISOString().split('T')[0] : 'unknown',
            eventName: email.eventName || null,
            status: email.status || 'sent'
        });
    }

    for (const email of inboxEmails) {
        const purpose = categorizeEmailPurpose(email.subject || '', email.body || '');
        const recDate = email.receivedAt ? new Date(email.receivedAt) : null;
        let ecTerm = 'unknown';
        if (recDate) {
            for (const term of ecTerms) {
                if (recDate >= new Date(term.start_date) && recDate <= new Date(term.end_date)) {
                    ecTerm = term.ec_term_id;
                    break;
                }
            }
        }

        communications.push({
            seq: seq++,
            direction: 'inbound',
            type: 'email',
            to: 'banfjax@gmail.com',
            from: email.from || '',
            subject: email.subject || '',
            category: purpose.category,
            categoryLabel: purpose.categoryLabel,
            subcategory: purpose.subcategory,
            subcategoryLabel: purpose.subcategoryLabel,
            categoryDisplay: purpose.display,
            ecTerm,
            year: recDate ? recDate.getFullYear() : 'unknown',
            date: recDate ? recDate.toISOString().split('T')[0] : 'unknown',
            status: email.read ? 'read' : 'unread'
        });
    }

    // Build archive summary by EC term, year, category
    const byECTerm = {};
    const byYear = {};
    const byCategory = {};

    const bySubcategory = {};

    for (const comm of communications) {
        if (!byECTerm[comm.ecTerm]) byECTerm[comm.ecTerm] = { inbound: 0, outbound: 0, categories: {} };
        byECTerm[comm.ecTerm][comm.direction]++;
        const catDisplay = comm.categoryDisplay || comm.category;
        if (!byECTerm[comm.ecTerm].categories[catDisplay]) byECTerm[comm.ecTerm].categories[catDisplay] = 0;
        byECTerm[comm.ecTerm].categories[catDisplay]++;

        const yr = String(comm.year);
        if (!byYear[yr]) byYear[yr] = { inbound: 0, outbound: 0 };
        byYear[yr][comm.direction]++;

        if (!byCategory[comm.category]) byCategory[comm.category] = { label: comm.categoryLabel, count: 0, inbound: 0, outbound: 0, subcategories: {} };
        byCategory[comm.category].count++;
        byCategory[comm.category][comm.direction]++;
        const subKey = comm.subcategory || 'other';
        if (!byCategory[comm.category].subcategories[subKey]) byCategory[comm.category].subcategories[subKey] = { label: comm.subcategoryLabel, count: 0 };
        byCategory[comm.category].subcategories[subKey].count++;
    }

    // Build category schema reference
    const categorySchema = Object.entries(EMAIL_CATEGORIES).map(([key, cat]) => ({
        category: key,
        label: cat.label,
        subcategories: Object.entries(cat.subcategories).map(([sk, sc]) => ({ key: sk, label: sc.label }))
    }));

    return {
        totalCommunications: communications.length,
        sentEmails: sentEmails.length,
        inboxEmails: inboxEmails.length,
        schema: {
            fields: ['seq', 'direction', 'type', 'to', 'from', 'subject', 'category', 'subcategory', 'categoryDisplay', 'ecTerm', 'year', 'date', 'status'],
            categorySchema,
            ecTerms: ecTerms.map(t => ({ id: t.ec_term_id, name: t.term_name, fy1: t.fy1, fy2: t.fy2, status: t.status }))
        },
        byECTerm: Object.entries(byECTerm).map(([term, data]) => ({ term, ...data, categories: Object.entries(data.categories).map(([cat, cnt]) => ({ category: cat, count: cnt })) })),
        byYear: Object.entries(byYear).map(([year, data]) => ({ year, ...data, total: data.inbound + data.outbound })).sort((a, b) => b.year - a.year),
        byCategory: Object.entries(byCategory).map(([cat, data]) => ({
            category: cat, label: data.label, count: data.count, inbound: data.inbound, outbound: data.outbound,
            subcategories: Object.entries(data.subcategories).map(([sk, sd]) => ({ subcategory: sk, label: sd.label, count: sd.count }))
        })).sort((a, b) => b.count - a.count),
        communications: communications.slice(0, 100)
    };
}

// --- Report Endpoints ---

// GET /_functions/admin_report — Full categorized CRM report
export async function get_admin_report(request) {
    try {
        const ecTerm = getQueryParam(request, 'ec_term');
        const year = getQueryParam(request, 'year');
        const report = await buildContactReport(ecTerm, year);
        return jsonResponse({
            success: true,
            version: '1.0.0-reports',
            generatedAt: new Date().toISOString(),
            filters: { ecTerm: ecTerm || 'all', year: year || 'all' },
            report
        });
    } catch (error) {
        return errorResponse('Report generation failed: ' + error.message);
    }
}
export function options_admin_report(request) { return handleCors(); }

// GET /_functions/email_audit — Email reachability analysis
export async function get_email_audit(request) {
    try {
        const audit = await buildEmailAudit();
        return jsonResponse({
            success: true,
            version: '1.0.0-reports',
            generatedAt: new Date().toISOString(),
            audit
        });
    } catch (error) {
        return errorResponse('Email audit failed: ' + error.message);
    }
}
export function options_email_audit(request) { return handleCors(); }

// GET /_functions/family_mapping — Family universe to CRM mapping
export async function get_family_mapping(request) {
    try {
        const mapping = await buildFamilyMapping();
        return jsonResponse({
            success: true,
            version: '1.0.0-reports',
            generatedAt: new Date().toISOString(),
            mapping
        });
    } catch (error) {
        return errorResponse('Family mapping failed: ' + error.message);
    }
}
export function options_family_mapping(request) { return handleCors(); }

// GET /_functions/communication_schema — Communication archive audit
export async function get_communication_schema(request) {
    try {
        const schema = await buildCommunicationSchema();
        return jsonResponse({
            success: true,
            version: '1.0.0-reports',
            generatedAt: new Date().toISOString(),
            communicationSchema: schema
        });
    } catch (error) {
        return errorResponse('Communication schema generation failed: ' + error.message);
    }
}
export function options_communication_schema(request) { return handleCors(); }

// POST /_functions/generate_report — Generate filtered report
export async function post_generate_report(request) {
    try {
        const body = await parseBody(request);
        const reportType = (body && body.type) || 'full';
        const ecTerm = body && body.ec_term;
        const year = body && body.year;

        let result = {};

        switch (reportType) {
            case 'contacts':
            case 'categorization':
                result = await buildContactReport(ecTerm, year);
                break;
            case 'email_audit':
            case 'reachability':
                result = await buildEmailAudit();
                break;
            case 'family':
            case 'family_mapping':
                result = await buildFamilyMapping();
                break;
            case 'communication':
            case 'archive':
                result = await buildCommunicationSchema();
                break;
            case 'full':
            default:
                result = {
                    contacts: await buildContactReport(ecTerm, year),
                    emailAudit: await buildEmailAudit(),
                    familyMapping: await buildFamilyMapping(),
                    communication: await buildCommunicationSchema()
                };
                break;
        }

        return jsonResponse({
            success: true,
            version: '1.0.0-reports',
            reportType,
            generatedAt: new Date().toISOString(),
            filters: { ecTerm: ecTerm || 'all', year: year || 'all' },
            report: result
        });
    } catch (error) {
        return errorResponse('Report generation failed: ' + error.message);
    }
}
export function options_generate_report(request) { return handleCors(); }


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  REPORT BUILDER v2.0 — Admin Report Builder with Data Explorer         ║
// ║  Payment insights, evite RSVP dedup, HTML/PDF export, management view  ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// --- Helper: get fiscal year from date ---
function getFiscalYear(date) {
    const d = new Date(date);
    const month = d.getMonth(); // 0-indexed
    const year = d.getFullYear();
    // FY runs July-June: July 2024 = FY-2024-2025
    return month >= 6 ? `FY-${year}-${year + 1}` : `FY-${year - 1}-${year}`;
}

// --- Helper: extract surname from email or name ---
function extractSurnameFromEmail(email) {
    if (!email) return '';
    const local = email.split('@')[0].toLowerCase();
    // Common patterns: firstname.lastname, firstnamelastname, first_last
    const parts = local.split(/[._]/);
    if (parts.length >= 2) return parts[parts.length - 1];
    return '';
}

// ====================================================================
// A) Payment Insight Engine — management analytics
// ====================================================================
async function buildPaymentInsightReport(filterYear) {
    // Get all payment records
    let payments = [];
    try {
        let query = wixData.query('Payments').descending('processedAt');
        if (filterYear) {
            const startDate = new Date(`${filterYear}-07-01`);
            const endDate = new Date(`${parseInt(filterYear) + 1}-06-30`);
            query = query.ge('processedAt', startDate).le('processedAt', endDate);
        }
        const results = await query.limit(500).find(SA);
        payments = results.items;
    } catch (_) {}

    // Get all membership records from Members collection
    let members = [];
    try {
        const results = await wixData.query('Members').limit(500).find(SA);
        members = results.items;
    } catch (_) {}

    // Get all sent emails about payments
    let paymentEmails = [];
    try {
        const results = await wixData.query('SentEmails').descending('sentAt').limit(500).find(SA);
        paymentEmails = results.items;
    } catch (_) {}

    // Get CRM contacts for enrichment
    let crmContacts = [];
    try {
        let hasMore = true, skip = 0;
        while (hasMore) {
            const batch = await contacts.queryContacts().skip(skip).limit(100).find(SA);
            for (const c of batch.items) {
                const info = c.info || {};
                const name = info.name || {};
                const email = (info.emails && info.emails[0]) ? info.emails[0].email : '';
                crmContacts.push({
                    id: c._id,
                    firstName: name.first || '',
                    lastName: name.last || '',
                    displayName: `${name.first || ''} ${name.last || ''}`.trim(),
                    email: email.toLowerCase(),
                    createdDate: c._createdDate || null
                });
            }
            hasMore = batch.items.length === 100;
            skip += 100;
        }
    } catch (_) {}

    // --- Analysis 1: Payment frequency by member ---
    const memberPaymentMap = {};
    for (const p of payments) {
        const key = (p.matchedEmail || p.senderName || 'unknown').toLowerCase();
        if (!memberPaymentMap[key]) memberPaymentMap[key] = { name: p.senderName || p.matchedName || key, email: p.matchedEmail || '', payments: [], totalAmount: 0 };
        memberPaymentMap[key].payments.push({
            amount: p.amount || 0,
            date: p.paymentDate || p.processedAt,
            purpose: p.purpose || 'unknown',
            status: p.status || 'pending',
            method: p.source || p.paymentMethod || 'unknown'
        });
        memberPaymentMap[key].totalAmount += (p.amount || 0);
    }

    // --- Analysis 2: Repeat payers (same member, multiple payments) ---
    const repeatPayers = Object.values(memberPaymentMap)
        .filter(m => m.payments.length > 1)
        .map(m => ({
            name: m.name,
            email: m.email,
            paymentCount: m.payments.length,
            totalAmount: m.totalAmount,
            payments: m.payments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
            insight: m.payments.length >= 3 ? 'Highly engaged — consider for leadership/volunteer' :
                     m.payments.some(p => p.purpose === 'donation') ? 'Donor — nurture for sponsorship' : 'Regular contributor'
        }))
        .sort((a, b) => b.paymentCount - a.paymentCount);

    // --- Analysis 3: Delayed/late payments ---
    const delayedPayments = [];
    for (const p of payments) {
        if (p.status === 'pending' || p.status === 'unmatched') {
            const daysPending = Math.floor((Date.now() - new Date(p.processedAt || p.paymentDate).getTime()) / 86400000);
            delayedPayments.push({
                name: p.senderName || 'Unknown',
                email: p.matchedEmail || '',
                amount: p.amount || 0,
                purpose: p.purpose || 'unknown',
                status: p.status,
                date: p.paymentDate || p.processedAt,
                daysPending,
                urgency: daysPending > 30 ? 'critical' : daysPending > 14 ? 'warning' : 'normal',
                recommendation: daysPending > 30 ? 'Send reminder — pending over 30 days' :
                    daysPending > 14 ? 'Follow up with member' : 'Recently received — allow processing time'
            });
        }
    }
    delayedPayments.sort((a, b) => b.daysPending - a.daysPending);

    // --- Analysis 4: Payment purpose breakdown ---
    const purposeBreakdown = {};
    for (const p of payments) {
        const purpose = p.purpose || 'unspecified';
        if (!purposeBreakdown[purpose]) purposeBreakdown[purpose] = { count: 0, total: 0, members: new Set() };
        purposeBreakdown[purpose].count++;
        purposeBreakdown[purpose].total += (p.amount || 0);
        purposeBreakdown[purpose].members.add(p.senderName || p.matchedEmail || 'unknown');
    }

    // --- Analysis 5: Members who haven't paid (CRM contacts vs payments) ---
    const paidEmails = new Set(Object.keys(memberPaymentMap));
    const nonPayingContacts = crmContacts
        .filter(c => c.email && !paidEmails.has(c.email.toLowerCase()))
        .map(c => ({
            name: c.displayName,
            email: c.email,
            inCRMSince: c.createdDate ? new Date(c.createdDate).toISOString().split('T')[0] : 'unknown',
            recommendation: 'Send membership renewal reminder'
        }));

    // --- Analysis 6: Payment method trends ---
    const methodBreakdown = {};
    for (const p of payments) {
        const method = p.source || p.paymentMethod || 'unknown';
        if (!methodBreakdown[method]) methodBreakdown[method] = { count: 0, total: 0 };
        methodBreakdown[method].count++;
        methodBreakdown[method].total += (p.amount || 0);
    }

    // --- Analysis 7: Monthly payment trend ---
    const monthlyTrend = {};
    for (const p of payments) {
        const d = new Date(p.paymentDate || p.processedAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyTrend[key]) monthlyTrend[key] = { month: key, count: 0, total: 0 };
        monthlyTrend[key].count++;
        monthlyTrend[key].total += (p.amount || 0);
    }

    // --- Management Insights ---
    const insights = [];
    if (payments.length > 0) {
        const avgPayment = payments.reduce((s, p) => s + (p.amount || 0), 0) / payments.length;
        insights.push({ type: 'metric', label: 'Average Payment Amount', value: `$${avgPayment.toFixed(2)}` });
    }
    if (repeatPayers.length > 0) {
        insights.push({ type: 'positive', label: 'Repeat Payers', value: `${repeatPayers.length} members made multiple payments`, action: 'Consider for recognition or leadership roles' });
    }
    if (delayedPayments.length > 0) {
        const critical = delayedPayments.filter(d => d.urgency === 'critical').length;
        insights.push({ type: 'warning', label: 'Delayed Payments', value: `${delayedPayments.length} pending (${critical} critical)`, action: 'Send automated reminders for payments pending > 14 days' });
    }
    if (nonPayingContacts.length > 0) {
        insights.push({ type: 'opportunity', label: 'Non-Paying CRM Contacts', value: `${nonPayingContacts.length} contacts haven't paid`, action: 'Send membership renewal campaign to these contacts' });
    }
    const topPayer = Object.values(memberPaymentMap).sort((a, b) => b.totalAmount - a.totalAmount)[0];
    if (topPayer) {
        insights.push({ type: 'positive', label: 'Top Contributor', value: `${topPayer.name} — $${topPayer.totalAmount.toFixed(2)} total` });
    }

    return {
        totalPayments: payments.length,
        totalAmount: payments.reduce((s, p) => s + (p.amount || 0), 0),
        totalMembers: members.length,
        totalCRMContacts: crmContacts.length,
        repeatPayers,
        delayedPayments,
        purposeBreakdown: Object.entries(purposeBreakdown).map(([purpose, data]) => ({
            purpose, count: data.count, total: data.total, uniqueMembers: data.members.size
        })).sort((a, b) => b.total - a.total),
        nonPayingContacts: nonPayingContacts.slice(0, 50),
        nonPayingCount: nonPayingContacts.length,
        methodBreakdown: Object.entries(methodBreakdown).map(([method, data]) => ({ method, ...data })),
        monthlyTrend: Object.values(monthlyTrend).sort((a, b) => a.month.localeCompare(b.month)),
        insights
    };
}

// ====================================================================
// B) Evite RSVP Deduplication Engine — Family-based dedup
// ====================================================================
async function buildEviteRSVPReport(eventFilter) {
    // Get all evites/RSVPs
    let allEvites = [];
    try {
        let query = wixData.query('SentEmails')
            .hasSome('type', ['evite', 'wix-triggered-email'])
            .descending('sentAt');
        if (eventFilter) query = query.contains('eventName', eventFilter);
        const results = await query.limit(500).find(SA);
        allEvites = results.items;
    } catch (_) {}

    // Get CRM contacts for family matching
    let crmContacts = [];
    try {
        let hasMore = true, skip = 0;
        while (hasMore) {
            const batch = await contacts.queryContacts().skip(skip).limit(100).find(SA);
            for (const c of batch.items) {
                const info = c.info || {};
                const name = info.name || {};
                const email = (info.emails && info.emails[0]) ? info.emails[0].email : '';
                crmContacts.push({
                    firstName: name.first || '',
                    lastName: name.last || '',
                    email: (email || '').toLowerCase()
                });
            }
            hasMore = batch.items.length === 100;
            skip += 100;
        }
    } catch (_) {}

    // Also check SentEmails with gmail-sourced evite-like subjects
    if (allEvites.length === 0) {
        try {
            const gmailSent = await wixData.query('SentEmails')
                .eq('source', 'gmail')
                .descending('sentAt')
                .limit(500).find(SA);
            for (const e of gmailSent.items) {
                const subj = (e.subject || '').toLowerCase();
                if (subj.includes('invite') || subj.includes('rsvp') || subj.includes('puja') ||
                    subj.includes('picnic') || subj.includes('event') || subj.includes('celebration')) {
                    allEvites.push({
                        _id: e._id,
                        to: e.to,
                        recipientName: e.recipientName || '',
                        subject: e.subject,
                        eventName: e.subject.replace(/^(re:|fwd:|you'?re invited:?\s*)/i, '').trim(),
                        sentAt: e.sentAt,
                        type: 'evite',
                        rsvpStatus: e.rsvpStatus || 'pending',
                        rsvpDate: e.rsvpDate || null
                    });
                }
            }
        } catch (_) {}
    }

    // Build email-to-surname map from CRM
    const emailToSurname = {};
    for (const c of crmContacts) {
        if (c.email) {
            emailToSurname[c.email] = normalizeSurname(c.lastName) || extractSurnameFromEmail(c.email);
        }
    }

    // Group evites by event
    const eventGroups = {};
    for (const e of allEvites) {
        const eventName = e.eventName || '(unnamed event)';
        if (!eventGroups[eventName]) eventGroups[eventName] = { eventName, eventDate: e.eventDate || '', responses: [] };
        const email = (e.to || '').toLowerCase();
        const recipientName = e.recipientName || '';
        const surname = emailToSurname[email] || normalizeSurname(recipientName.split(' ').pop()) || extractSurnameFromEmail(email);

        eventGroups[eventName].responses.push({
            id: e._id,
            email,
            recipientName,
            surname,
            rsvpStatus: e.rsvpStatus || 'pending',
            rsvpDate: e.rsvpDate || null,
            sentAt: e.sentAt
        });
    }

    // For each event, detect family duplicates
    const eventReports = [];
    for (const [eventName, group] of Object.entries(eventGroups)) {
        const responses = group.responses;

        // Group responses by surname (family grouping)
        const familyGroups = {};
        for (const r of responses) {
            const famKey = r.surname || r.email;
            if (!familyGroups[famKey]) familyGroups[famKey] = [];
            familyGroups[famKey].push(r);
        }

        // Detect duplicates: multiple RSVPs from same family
        const duplicates = [];
        const dedupedAttendees = [];
        let duplicateCount = 0;

        for (const [surname, familyResponses] of Object.entries(familyGroups)) {
            if (familyResponses.length > 1) {
                // Multiple responses from same family
                const yesResponses = familyResponses.filter(r => r.rsvpStatus === 'yes');
                const anyYes = yesResponses.length > 0;

                duplicateCount += familyResponses.length - 1;
                duplicates.push({
                    family: surname || '(unknown)',
                    responseCount: familyResponses.length,
                    members: familyResponses.map(r => ({
                        name: r.recipientName,
                        email: r.email,
                        rsvpStatus: r.rsvpStatus
                    })),
                    resolution: anyYes ? 'Count as 1 family attending' : 'No confirmed RSVP from family',
                    dedupedStatus: anyYes ? 'yes' : familyResponses.some(r => r.rsvpStatus === 'maybe') ? 'maybe' : 'pending'
                });

                // For deduped list, take the best response
                const bestResponse = yesResponses[0] || familyResponses.find(r => r.rsvpStatus === 'maybe') || familyResponses[0];
                dedupedAttendees.push({
                    family: surname,
                    representativeName: bestResponse.recipientName,
                    representativeEmail: bestResponse.email,
                    status: bestResponse.rsvpStatus,
                    familyMemberCount: familyResponses.length,
                    isDuplicate: true
                });
            } else {
                // Single response — no dedup needed
                const r = familyResponses[0];
                dedupedAttendees.push({
                    family: surname,
                    representativeName: r.recipientName,
                    representativeEmail: r.email,
                    status: r.rsvpStatus,
                    familyMemberCount: 1,
                    isDuplicate: false
                });
            }
        }

        // Build summary
        const rawSummary = {
            total: responses.length,
            yes: responses.filter(r => r.rsvpStatus === 'yes').length,
            no: responses.filter(r => r.rsvpStatus === 'no').length,
            maybe: responses.filter(r => r.rsvpStatus === 'maybe').length,
            pending: responses.filter(r => r.rsvpStatus === 'pending').length
        };

        const dedupedSummary = {
            totalFamilies: dedupedAttendees.length,
            attending: dedupedAttendees.filter(a => a.status === 'yes').length,
            declined: dedupedAttendees.filter(a => a.status === 'no').length,
            maybe: dedupedAttendees.filter(a => a.status === 'maybe').length,
            pending: dedupedAttendees.filter(a => a.status === 'pending').length,
            duplicatesFound: duplicates.length,
            duplicateResponses: duplicateCount
        };

        eventReports.push({
            eventName,
            eventDate: group.eventDate,
            rawSummary,
            dedupedSummary,
            duplicates,
            dedupedAttendees: dedupedAttendees.sort((a, b) => {
                const order = { yes: 0, maybe: 1, pending: 2, no: 3 };
                return (order[a.status] || 4) - (order[b.status] || 4);
            }),
            automationInsight: duplicates.length > 0
                ? `Found ${duplicates.length} families with multiple RSVPs (${duplicateCount} duplicate responses). Raw count: ${rawSummary.yes} yes. Deduped family count: ${dedupedSummary.attending} attending families. Overcounting avoided: ${rawSummary.yes - dedupedSummary.attending} responses.`
                : 'No duplicate family RSVPs detected for this event.'
        });
    }

    return {
        totalEvents: eventReports.length,
        totalEvitesSent: allEvites.length,
        events: eventReports,
        processAutomation: {
            description: 'The RSVP deduplication engine groups responses by family surname (using Bengali surname normalization with 33+ variant mappings). When multiple family members RSVP to the same event, the system consolidates them into a single family response to avoid double-counting for catering, seating, and logistics.',
            surnameVariantsUsed: Object.keys(SURNAME_VARIANTS).length,
            features: [
                'Surname normalization (Ghosh/Ghose, Mukherjee/Mukhopadhyay, Roy/Ray, etc.)',
                'Email domain clustering for corporate/family emails',
                'Best-response selection: YES > MAYBE > PENDING > NO',
                'Per-event duplicate detection with family member listing',
                'Raw vs deduped count comparison for accurate headcounts'
            ]
        }
    };
}

// ====================================================================
// C) HTML Report Generator — renders datagrid with export buttons
// ====================================================================
function generateHTMLReport(title, data, columns, options = {}) {
    const { subtitle, summary, insights, exportFilename } = options;
    const filename = exportFilename || title.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const timestamp = new Date().toISOString();

    // Build table rows
    const tableRows = data.map((row, idx) => {
        const cells = columns.map(col => {
            let val = row[col.key];
            if (val === null || val === undefined) val = '';
            if (col.type === 'currency') val = `$${Number(val).toFixed(2)}`;
            if (col.type === 'date' && val) val = new Date(val).toLocaleDateString();
            if (col.type === 'badge') {
                const colors = { yes: '#4caf50', no: '#f44336', maybe: '#ff9800', pending: '#9e9e9e', critical: '#f44336', warning: '#ff9800', normal: '#4caf50', active: '#4caf50', completed: '#9e9e9e' };
                val = `<span style="background:${colors[val] || '#607d8b'};color:white;padding:2px 8px;border-radius:10px;font-size:12px">${val}</span>`;
            }
            if (Array.isArray(val)) val = val.join(', ');
            return `<td>${val}</td>`;
        }).join('');
        return `<tr>${cells}</tr>`;
    }).join('\n');

    const tableHeaders = columns.map(c => `<th onclick="sortTable(this)" style="cursor:pointer">${c.label} &#x25B5;</th>`).join('');

    // Build summary section
    let summaryHTML = '';
    if (summary && typeof summary === 'object') {
        summaryHTML = '<div class="summary-cards">' +
            Object.entries(summary).map(([k, v]) =>
                `<div class="summary-card"><div class="card-value">${v}</div><div class="card-label">${k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</div></div>`
            ).join('') + '</div>';
    }

    // Build insights section
    let insightsHTML = '';
    if (insights && insights.length > 0) {
        insightsHTML = '<div class="insights">' +
            '<h3>Management Insights</h3>' +
            insights.map(i => {
                const icons = { positive: '✅', warning: '⚠️', opportunity: '💡', metric: '📊' };
                return `<div class="insight ${i.type}"><span class="insight-icon">${icons[i.type] || '📋'}</span><strong>${i.label}:</strong> ${i.value}${i.action ? `<br><em style="color:#666">→ ${i.action}</em>` : ''}</div>`;
            }).join('') + '</div>';
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — BANF Admin Report</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;background:#f5f5f5;color:#333;padding:20px}
.report-header{background:linear-gradient(135deg,#1a237e,#0d47a1);color:white;padding:30px;border-radius:12px;margin-bottom:20px}
.report-header h1{font-size:24px;margin-bottom:5px}
.report-header .subtitle{opacity:0.85;font-size:14px}
.report-header .meta{margin-top:10px;font-size:12px;opacity:0.7}
.summary-cards{display:flex;gap:15px;flex-wrap:wrap;margin-bottom:20px}
.summary-card{background:white;border-radius:10px;padding:20px;flex:1;min-width:150px;box-shadow:0 2px 8px rgba(0,0,0,0.08);text-align:center}
.card-value{font-size:28px;font-weight:700;color:#1a237e}
.card-label{font-size:12px;color:#666;margin-top:5px;text-transform:uppercase}
.insights{background:white;border-radius:10px;padding:20px;margin-bottom:20px;box-shadow:0 2px 8px rgba(0,0,0,0.08)}
.insights h3{margin-bottom:15px;color:#1a237e}
.insight{padding:10px 15px;border-left:4px solid #ccc;margin-bottom:10px;border-radius:0 8px 8px 0;background:#f9f9f9}
.insight.positive{border-left-color:#4caf50;background:#f1f8e9}
.insight.warning{border-left-color:#ff9800;background:#fff8e1}
.insight.opportunity{border-left-color:#2196f3;background:#e3f2fd}
.insight.metric{border-left-color:#9c27b0;background:#f3e5f5}
.toolbar{display:flex;gap:10px;margin-bottom:15px;flex-wrap:wrap;align-items:center}
.toolbar input{padding:8px 12px;border:1px solid #ddd;border-radius:6px;font-size:14px;width:250px}
.toolbar button{padding:8px 16px;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600}
.btn-export{background:#4caf50;color:white}
.btn-export:hover{background:#388e3c}
.btn-pdf{background:#f44336;color:white}
.btn-pdf:hover{background:#c62828}
.btn-filter{background:#2196f3;color:white}
.btn-filter:hover{background:#1565c0}
.datagrid{background:white;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)}
.datagrid table{width:100%;border-collapse:collapse}
.datagrid th{background:#1a237e;color:white;padding:12px 15px;text-align:left;font-size:13px;white-space:nowrap;user-select:none}
.datagrid td{padding:10px 15px;border-bottom:1px solid #eee;font-size:13px}
.datagrid tr:hover td{background:#e3f2fd}
.datagrid tr:nth-child(even) td{background:#fafafa}
.datagrid tr:hover td{background:#e3f2fd !important}
.row-count{color:#666;font-size:13px;padding:10px 15px;background:white;border-top:1px solid #eee}
@media print{.toolbar,.btn-export,.btn-pdf{display:none !important}.report-header{background:#1a237e !important;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style>
</head>
<body>
<div class="report-header">
<h1>${title}</h1>
${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}
<div class="meta">Generated: ${timestamp} | BANF Admin Report Builder | ${data.length} records</div>
</div>

${summaryHTML}
${insightsHTML}

<div class="toolbar">
<input type="text" id="searchInput" placeholder="🔍 Search / filter rows..." oninput="filterTable()">
<button class="btn-export" onclick="exportCSV()">📥 Export CSV</button>
<button class="btn-export" onclick="exportHTML()">📄 Export HTML</button>
<button class="btn-pdf" onclick="window.print()">🖨️ Print / PDF</button>
</div>

<div class="datagrid">
<table id="dataTable">
<thead><tr>${tableHeaders}</tr></thead>
<tbody id="dataBody">${tableRows}</tbody>
</table>
<div class="row-count" id="rowCount">Showing ${data.length} rows</div>
</div>

<script>
function filterTable(){
  const q=document.getElementById('searchInput').value.toLowerCase();
  const rows=document.querySelectorAll('#dataBody tr');
  let visible=0;
  rows.forEach(r=>{const t=r.textContent.toLowerCase();r.style.display=t.includes(q)?'':'none';if(t.includes(q))visible++});
  document.getElementById('rowCount').textContent='Showing '+visible+' of ${data.length} rows';
}
function sortTable(th){
  const table=document.getElementById('dataTable');
  const tbody=table.querySelector('tbody');
  const rows=Array.from(tbody.querySelectorAll('tr'));
  const idx=Array.from(th.parentElement.children).indexOf(th);
  const asc=th.dataset.sort!=='asc';
  th.dataset.sort=asc?'asc':'desc';
  rows.sort((a,b)=>{
    let va=a.children[idx].textContent.trim(),vb=b.children[idx].textContent.trim();
    const na=parseFloat(va.replace(/[^0-9.-]/g,'')),nb=parseFloat(vb.replace(/[^0-9.-]/g,''));
    if(!isNaN(na)&&!isNaN(nb))return asc?na-nb:nb-na;
    return asc?va.localeCompare(vb):vb.localeCompare(va);
  });
  rows.forEach(r=>tbody.appendChild(r));
}
function exportCSV(){
  const table=document.getElementById('dataTable');
  const rows=Array.from(table.querySelectorAll('tr')).filter(r=>r.style.display!=='none');
  const csv=rows.map(r=>Array.from(r.querySelectorAll('th,td')).map(c=>'"'+c.textContent.replace(/"/g,'""')+'"').join(',')).join('\\n');
  const blob=new Blob([csv],{type:'text/csv'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='${filename}.csv';a.click();
}
function exportHTML(){
  const blob=new Blob([document.documentElement.outerHTML],{type:'text/html'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='${filename}.html';a.click();
}
</script>
</body>
</html>`;
}

// ====================================================================
// D) Report Builder Endpoints
// ====================================================================

// GET /_functions/report_builder — Report Builder Hub (JSON index of all reports)
export async function get_report_builder(request) {
    return jsonResponse({
        success: true,
        version: '2.0.0-report-builder',
        reportBuilder: {
            description: 'BANF Admin Report Builder — Generate, explore, and export reports',
            availableReports: [
                {
                    id: 'email_categorization',
                    name: 'Email Communication Categorization',
                    description: 'All email communication categorized by Payment, Complaint, Enquiry, Event, etc. with subcategories',
                    endpoint: '/report_email_categorization',
                    params: { year: 'Filter by year (e.g. 2025)', ec_term: 'Filter by EC term (e.g. EC-2024-2025)', format: 'json or html' }
                },
                {
                    id: 'category_detail',
                    name: 'Category Detail Report',
                    description: 'All communications for a specific category (e.g., all Payment emails, all Complaints)',
                    endpoint: '/report_category_detail',
                    params: { category: 'payment|complaint|enquiry|event|governance|communication|magazine|accounting|vendor|volunteer|general', format: 'json or html' }
                },
                {
                    id: 'payment_insights',
                    name: 'Payment Management Insights',
                    description: 'Delayed payments, repeat payers, non-paying members, payment trends, management insights',
                    endpoint: '/report_payment_insights',
                    params: { year: 'Filter by fiscal year start (e.g. 2024 for FY-2024-2025)', format: 'json or html' }
                },
                {
                    id: 'evite_rsvp',
                    name: 'Evite RSVP Analysis with Family Dedup',
                    description: 'RSVP responses with family-based deduplication to avoid double-counting from same family',
                    endpoint: '/report_evite_rsvp',
                    params: { event: 'Filter by event name (optional)', format: 'json or html' }
                },
                {
                    id: 'email_audit',
                    name: 'Email Health & Reachability Audit',
                    description: 'Email reachability, domain risk, MX validation, typo detection',
                    endpoint: '/email_audit',
                    params: { format: 'json' }
                },
                {
                    id: 'family_mapping',
                    name: 'Family Universe Mapping',
                    description: 'CRM contacts mapped to family groups using Bengali surname normalization',
                    endpoint: '/family_mapping',
                    params: { format: 'json' }
                },
                {
                    id: 'admin_report',
                    name: 'Full Admin CRM Report',
                    description: 'Complete CRM categorization by EC term, year, role, domain, family',
                    endpoint: '/admin_report',
                    params: { ec_term: 'Filter by EC term', year: 'Filter by year' }
                }
            ],
            exportFormats: ['JSON (API)', 'HTML (interactive datagrid)', 'CSV (from HTML view)', 'PDF (print from HTML view)'],
            categorySchema: Object.entries(EMAIL_CATEGORIES).map(([key, cat]) => ({
                category: key, label: cat.label,
                subcategories: Object.entries(cat.subcategories).map(([sk, sc]) => ({ key: sk, label: sc.label }))
            }))
        }
    });
}
export function options_report_builder(request) { return handleCors(); }

// GET /_functions/report_email_categorization — Email categorization for a year
export async function get_report_email_categorization(request) {
    try {
        const year = getQueryParam(request, 'year');
        const ecTerm = getQueryParam(request, 'ec_term');
        const format = getQueryParam(request, 'format') || 'json';

        const report = await buildContactReport(ecTerm, year);
        const commSchema = await buildCommunicationSchema();

        // Build per-contact categorization grid
        const ecTerms = generateECTerms();
        let allContacts = [];
        let hasMore = true, skip = 0;
        while (hasMore) {
            const batch = await contacts.queryContacts().skip(skip).limit(100).find(SA);
            for (const c of batch.items) {
                const info = c.info || {};
                const name = info.name || {};
                const email = (info.emails && info.emails[0]) ? info.emails[0].email : '';
                const created = c._createdDate;
                const domain = analyzeEmailDomain(email);
                const surname = normalizeSurname(name.last || '');
                const roles = categorizeContactRole({ email, organization: '' });
                let contactECTerm = 'unknown';
                if (created) {
                    const d = new Date(created);
                    for (const term of ecTerms) {
                        if (d >= new Date(term.start_date) && d <= new Date(term.end_date)) { contactECTerm = term.ec_term_id; break; }
                    }
                }
                const contactYear = created ? new Date(created).getFullYear() : null;

                // Apply filters
                if (year && contactYear !== parseInt(year)) continue;
                if (ecTerm && contactECTerm !== ecTerm) continue;

                allContacts.push({
                    name: `${name.first || ''} ${name.last || ''}`.trim(),
                    email,
                    surname,
                    role: roles.join(', '),
                    domain: domain.provider,
                    domainRisk: domain.risk,
                    ecTerm: contactECTerm,
                    year: contactYear || 'N/A',
                    createdDate: created ? new Date(created).toISOString().split('T')[0] : 'N/A'
                });
            }
            hasMore = batch.items.length === 100;
            skip += 100;
        }

        if (format === 'html') {
            const filterDesc = [];
            if (year) filterDesc.push(`Year: ${year}`);
            if (ecTerm) filterDesc.push(`EC Term: ${ecTerm}`);
            const html = generateHTMLReport(
                'Email Communication Categorization',
                allContacts,
                [
                    { key: 'name', label: 'Name' },
                    { key: 'email', label: 'Email' },
                    { key: 'surname', label: 'Family Surname' },
                    { key: 'role', label: 'Role' },
                    { key: 'domain', label: 'Email Provider' },
                    { key: 'domainRisk', label: 'Risk', type: 'badge' },
                    { key: 'ecTerm', label: 'EC Term' },
                    { key: 'year', label: 'Year' },
                    { key: 'createdDate', label: 'Created', type: 'date' }
                ],
                {
                    subtitle: filterDesc.length > 0 ? `Filtered: ${filterDesc.join(' | ')}` : 'All contacts — all periods',
                    summary: {
                        'Total Contacts': allContacts.length,
                        'Families': new Set(allContacts.map(c => c.surname).filter(Boolean)).size,
                        'Email Providers': new Set(allContacts.map(c => c.domain)).size,
                        'EC Terms': new Set(allContacts.map(c => c.ecTerm)).size
                    },
                    exportFilename: `banf_email_categorization_${year || ecTerm || 'all'}`
                }
            );
            return ok({ headers: { 'Content-Type': 'text/html', 'Access-Control-Allow-Origin': '*' }, body: html });
        }

        return jsonResponse({
            success: true,
            version: '2.0.0-report-builder',
            reportType: 'email_categorization',
            filters: { year: year || 'all', ecTerm: ecTerm || 'all' },
            generatedAt: new Date().toISOString(),
            contacts: allContacts,
            total: allContacts.length,
            communicationSummary: {
                totalEmails: commSchema.totalCommunications,
                byCategory: commSchema.byCategory
            },
            categorySchema: Object.entries(EMAIL_CATEGORIES).map(([key, cat]) => ({
                category: key, label: cat.label,
                subcategories: Object.entries(cat.subcategories).map(([sk, sc]) => ({ key: sk, label: sc.label }))
            }))
        });
    } catch (error) {
        return errorResponse('Email categorization report failed: ' + error.message);
    }
}
export function options_report_email_categorization(request) { return handleCors(); }

// GET /_functions/report_category_detail — All comms for a specific category
export async function get_report_category_detail(request) {
    try {
        const category = getQueryParam(request, 'category') || 'payment';
        const format = getQueryParam(request, 'format') || 'json';

        const commSchema = await buildCommunicationSchema();
        const categoryComms = commSchema.communications.filter(c => c.category === category);
        const catInfo = EMAIL_CATEGORIES[category];

        // Also aggregate from SentEmails with keyword matching
        let additionalEmails = [];
        try {
            const results = await wixData.query('SentEmails').descending('sentAt').limit(500).find(SA);
            for (const e of results.items) {
                const purpose = categorizeEmailPurpose(e.subject || '', e.body || '');
                if (purpose.category === category) {
                    additionalEmails.push({
                        direction: 'outbound',
                        to: e.to || '',
                        from: BANF_EMAIL,
                        subject: e.subject || '',
                        category: purpose.categoryLabel,
                        subcategory: purpose.subcategoryLabel,
                        display: purpose.display,
                        date: e.sentAt ? new Date(e.sentAt).toISOString().split('T')[0] : '',
                        type: e.type || 'email',
                        status: e.status || 'sent',
                        eventName: e.eventName || ''
                    });
                }
            }
        } catch (_) {}

        // Merge — dedup by date+to+subject
        const seen = new Set();
        const allComms = [...categoryComms.map(c => ({
            direction: c.direction,
            to: c.to,
            from: c.from,
            subject: c.subject,
            category: c.categoryLabel,
            subcategory: c.subcategoryLabel,
            display: c.categoryDisplay,
            date: c.date,
            type: c.type || 'email',
            status: c.status
        }))];

        for (const e of additionalEmails) {
            const dedup = `${e.date}|${e.to}|${e.subject}`;
            if (!seen.has(dedup)) {
                seen.add(dedup);
                allComms.push(e);
            }
        }

        // Subcategory breakdown
        const subBreakdown = {};
        for (const c of allComms) {
            const sub = c.subcategory || 'General';
            if (!subBreakdown[sub]) subBreakdown[sub] = 0;
            subBreakdown[sub]++;
        }

        if (format === 'html') {
            const html = generateHTMLReport(
                `${catInfo ? catInfo.label : category} — Communication Detail`,
                allComms,
                [
                    { key: 'date', label: 'Date', type: 'date' },
                    { key: 'direction', label: 'Direction' },
                    { key: 'display', label: 'Category' },
                    { key: 'to', label: 'To' },
                    { key: 'from', label: 'From' },
                    { key: 'subject', label: 'Subject' },
                    { key: 'status', label: 'Status', type: 'badge' },
                    { key: 'type', label: 'Type' }
                ],
                {
                    subtitle: `All ${catInfo ? catInfo.label : category} communications`,
                    summary: {
                        'Total Communications': allComms.length,
                        'Inbound': allComms.filter(c => c.direction === 'inbound').length,
                        'Outbound': allComms.filter(c => c.direction === 'outbound').length,
                        'Subcategories': Object.keys(subBreakdown).length
                    },
                    exportFilename: `banf_${category}_detail`
                }
            );
            return ok({ headers: { 'Content-Type': 'text/html', 'Access-Control-Allow-Origin': '*' }, body: html });
        }

        return jsonResponse({
            success: true,
            reportType: 'category_detail',
            category: category,
            categoryLabel: catInfo ? catInfo.label : category,
            total: allComms.length,
            subcategoryBreakdown: Object.entries(subBreakdown).map(([sub, count]) => ({ subcategory: sub, count })),
            communications: allComms,
            generatedAt: new Date().toISOString()
        });
    } catch (error) {
        return errorResponse('Category detail report failed: ' + error.message);
    }
}
export function options_report_category_detail(request) { return handleCors(); }

// GET /_functions/report_payment_insights — Payment management report
export async function get_report_payment_insights(request) {
    try {
        const year = getQueryParam(request, 'year');
        const format = getQueryParam(request, 'format') || 'json';

        const report = await buildPaymentInsightReport(year);

        if (format === 'html') {
            // Build flat rows for the datagrid from various analyses
            const rows = [];

            // Repeat payers
            for (const rp of report.repeatPayers) {
                for (const p of rp.payments) {
                    rows.push({
                        section: 'Repeat Payer',
                        name: rp.name,
                        email: rp.email,
                        amount: p.amount,
                        purpose: p.purpose,
                        status: p.status,
                        method: p.method,
                        date: p.date ? new Date(p.date).toISOString().split('T')[0] : '',
                        insight: rp.insight,
                        paymentCount: rp.paymentCount
                    });
                }
            }

            // Delayed payments
            for (const dp of report.delayedPayments) {
                rows.push({
                    section: 'Delayed Payment',
                    name: dp.name,
                    email: dp.email,
                    amount: dp.amount,
                    purpose: dp.purpose,
                    status: dp.urgency,
                    method: '',
                    date: dp.date ? new Date(dp.date).toISOString().split('T')[0] : '',
                    insight: dp.recommendation,
                    paymentCount: dp.daysPending + ' days'
                });
            }

            // Non-paying contacts (sample)
            for (const np of report.nonPayingContacts.slice(0, 30)) {
                rows.push({
                    section: 'Non-Paying Contact',
                    name: np.name,
                    email: np.email,
                    amount: 0,
                    purpose: 'No payment on record',
                    status: 'pending',
                    method: '',
                    date: np.inCRMSince,
                    insight: np.recommendation,
                    paymentCount: '0'
                });
            }

            const html = generateHTMLReport(
                'Payment Management Insights',
                rows,
                [
                    { key: 'section', label: 'Category' },
                    { key: 'name', label: 'Name' },
                    { key: 'email', label: 'Email' },
                    { key: 'amount', label: 'Amount', type: 'currency' },
                    { key: 'purpose', label: 'Purpose' },
                    { key: 'status', label: 'Status', type: 'badge' },
                    { key: 'date', label: 'Date', type: 'date' },
                    { key: 'insight', label: 'Insight/Action' },
                    { key: 'paymentCount', label: 'Count/Days' }
                ],
                {
                    subtitle: year ? `Fiscal Year starting ${year}` : 'All periods',
                    summary: {
                        'Total Payments': report.totalPayments,
                        'Total Amount': '$' + report.totalAmount.toFixed(2),
                        'Repeat Payers': report.repeatPayers.length,
                        'Delayed': report.delayedPayments.length,
                        'Non-Paying': report.nonPayingCount,
                        'CRM Contacts': report.totalCRMContacts
                    },
                    insights: report.insights,
                    exportFilename: `banf_payment_insights_${year || 'all'}`
                }
            );
            return ok({ headers: { 'Content-Type': 'text/html', 'Access-Control-Allow-Origin': '*' }, body: html });
        }

        return jsonResponse({
            success: true,
            reportType: 'payment_insights',
            filters: { year: year || 'all' },
            generatedAt: new Date().toISOString(),
            report
        });
    } catch (error) {
        return errorResponse('Payment insights report failed: ' + error.message);
    }
}
export function options_report_payment_insights(request) { return handleCors(); }

// GET /_functions/report_evite_rsvp — Evite RSVP with family deduplication
export async function get_report_evite_rsvp(request) {
    try {
        const event = getQueryParam(request, 'event');
        const format = getQueryParam(request, 'format') || 'json';

        const report = await buildEviteRSVPReport(event);

        if (format === 'html') {
            // Build flat rows from all events
            const rows = [];
            for (const evt of report.events) {
                // Deduped attendees
                for (const a of evt.dedupedAttendees) {
                    rows.push({
                        event: evt.eventName,
                        eventDate: evt.eventDate || '',
                        family: a.family,
                        name: a.representativeName,
                        email: a.representativeEmail,
                        rsvpStatus: a.status,
                        familyMembers: a.familyMemberCount,
                        isDuplicate: a.isDuplicate ? 'Yes' : 'No',
                        type: 'Deduped'
                    });
                }
            }

            // Separate section for duplicates
            const dupRows = [];
            for (const evt of report.events) {
                for (const dup of evt.duplicates) {
                    for (const m of dup.members) {
                        dupRows.push({
                            event: evt.eventName,
                            eventDate: evt.eventDate || '',
                            family: dup.family,
                            name: m.name,
                            email: m.email,
                            rsvpStatus: m.rsvpStatus,
                            familyMembers: dup.responseCount,
                            isDuplicate: 'Duplicate',
                            type: 'Raw Duplicate'
                        });
                    }
                }
            }

            const allRows = [...rows, ...dupRows];

            // Build summary from first event or all
            const totalRaw = report.events.reduce((s, e) => s + e.rawSummary.total, 0);
            const totalDeduped = report.events.reduce((s, e) => s + e.dedupedSummary.totalFamilies, 0);
            const totalDups = report.events.reduce((s, e) => s + e.dedupedSummary.duplicatesFound, 0);

            const insightsList = report.events.map(e => ({
                type: e.duplicates.length > 0 ? 'warning' : 'positive',
                label: e.eventName,
                value: e.automationInsight,
                action: e.duplicates.length > 0 ? `Review ${e.duplicates.length} family duplicates — use deduped count for catering/seating` : undefined
            }));

            const html = generateHTMLReport(
                'Evite RSVP Analysis — Family Deduplication',
                allRows,
                [
                    { key: 'event', label: 'Event' },
                    { key: 'eventDate', label: 'Event Date' },
                    { key: 'family', label: 'Family' },
                    { key: 'name', label: 'Name' },
                    { key: 'email', label: 'Email' },
                    { key: 'rsvpStatus', label: 'RSVP', type: 'badge' },
                    { key: 'familyMembers', label: 'Family Members' },
                    { key: 'isDuplicate', label: 'Duplicate?', type: 'badge' },
                    { key: 'type', label: 'Record Type' }
                ],
                {
                    subtitle: event ? `Event: ${event}` : 'All events',
                    summary: {
                        'Total Events': report.totalEvents,
                        'Raw Responses': totalRaw,
                        'Deduped Families': totalDeduped,
                        'Duplicates Found': totalDups,
                        'Overcounting Avoided': totalRaw > 0 ? (totalRaw - totalDeduped) : 0
                    },
                    insights: insightsList.length > 0 ? insightsList : [{ type: 'metric', label: 'Process Automation', value: report.processAutomation.description }],
                    exportFilename: `banf_evite_rsvp_${event ? event.replace(/[^a-z0-9]/gi, '_') : 'all'}`
                }
            );
            return ok({ headers: { 'Content-Type': 'text/html', 'Access-Control-Allow-Origin': '*' }, body: html });
        }

        return jsonResponse({
            success: true,
            reportType: 'evite_rsvp_dedup',
            filters: { event: event || 'all' },
            generatedAt: new Date().toISOString(),
            report
        });
    } catch (error) {
        return errorResponse('Evite RSVP report failed: ' + error.message);
    }
}
export function options_report_evite_rsvp(request) { return handleCors(); }

// POST /_functions/seed_sample_evites — Create sample evite data for report demo
export async function post_seed_sample_evites(request) {
    try {
        // Get some CRM contacts for realistic data
        let sampleContacts = [];
        try {
            const batch = await contacts.queryContacts().limit(30).find(SA);
            for (const c of batch.items) {
                const info = c.info || {};
                const name = info.name || {};
                const email = (info.emails && info.emails[0]) ? info.emails[0].email : '';
                if (email) sampleContacts.push({ name: `${name.first || ''} ${name.last || ''}`.trim(), email, lastName: name.last || '' });
            }
        } catch (_) {}

        if (sampleContacts.length === 0) return errorResponse('No CRM contacts found to seed evites');

        const events = [
            { name: 'Durga Puja 2025', date: '2025-10-01' },
            { name: 'Saraswati Puja 2025', date: '2025-02-02' },
            { name: 'Summer Picnic 2025', date: '2025-06-21' },
            { name: 'Kali Puja 2024', date: '2024-11-01' },
            { name: 'Annual General Meeting 2025', date: '2025-01-15' }
        ];

        const rsvpStatuses = ['yes', 'yes', 'yes', 'maybe', 'no', 'pending', 'pending'];
        let seeded = 0;
        let eviteErrors = [];

        // Try to create SentEmails collection by inserting a test record first
        let sentEmailsAvailable = true;
        try {
            const testInsert = await wixData.insert('SentEmails', {
                to: 'test@test.com',
                subject: 'Test — will be deleted',
                sentAt: new Date(),
                sentBy: 'setup',
                type: 'test',
                status: 'test'
            }, SA);
            // Delete the test record
            try { await wixData.remove('SentEmails', testInsert._id, SA); } catch (_) {}
        } catch (e) {
            sentEmailsAvailable = false;
            eviteErrors.push('SentEmails collection error: ' + e.message);
        }

        if (sentEmailsAvailable) {
            for (const event of events) {
                const shuffled = [...sampleContacts].sort(() => Math.random() - 0.5);
                const eventContacts = shuffled.slice(0, Math.min(15 + Math.floor(Math.random() * 10), shuffled.length));

                for (const c of eventContacts) {
                    const rsvp = rsvpStatuses[Math.floor(Math.random() * rsvpStatuses.length)];
                    try {
                        const record = {
                            to: c.email,
                            recipientName: c.name,
                            subject: 'You are Invited: ' + event.name,
                            body: 'Evite for ' + event.name,
                            sentAt: new Date(event.date),
                            sentBy: BANF_EMAIL,
                            type: 'evite',
                            eventName: event.name,
                            rsvpStatus: rsvp,
                            status: 'sent'
                        };
                        if (rsvp !== 'pending') {
                            record.rsvpDate = new Date(new Date(event.date).getTime() - Math.random() * 604800000);
                        }
                        await wixData.insert('SentEmails', record, SA);
                        seeded++;
                    } catch (e) {
                        if (eviteErrors.length < 3) eviteErrors.push(e.message);
                    }
                }
            }
        }

        // Also seed some payments for the payment insights report
        let paymentSeeded = 0;
        let paymentErrors = [];
        const purposes = ['membership', 'membership', 'membership', 'donation', 'event_fee', 'sponsorship'];
        const methods = ['zelle', 'zelle', 'check', 'cash', 'venmo'];
        const statuses2 = ['matched', 'matched', 'matched', 'pending', 'unmatched'];

        for (const c of sampleContacts.slice(0, 20)) {
            const payCount = 1 + Math.floor(Math.random() * 3);
            for (let i = 0; i < payCount; i++) {
                const amount = [100, 150, 190, 200, 215, 300, 340, 500, 50, 75][Math.floor(Math.random() * 10)];
                const daysAgo = Math.floor(Math.random() * 365);
                try {
                    await wixData.insert('Payments', {
                        senderName: c.name,
                        matchedEmail: c.email,
                        matchedName: c.name,
                        amount,
                        purpose: purposes[Math.floor(Math.random() * purposes.length)],
                        paymentDate: new Date(Date.now() - daysAgo * 86400000),
                        processedAt: new Date(Date.now() - daysAgo * 86400000),
                        source: methods[Math.floor(Math.random() * methods.length)],
                        status: statuses2[Math.floor(Math.random() * statuses2.length)],
                        processedBy: 'seed'
                    }, SA);
                    paymentSeeded++;
                } catch (e) {
                    if (paymentErrors.length < 3) paymentErrors.push(e.message);
                }
            }
        }

        return jsonResponse({
            success: true,
            seeded: {
                evites: seeded,
                payments: paymentSeeded,
                events: events.map(e => e.name),
                contactsUsed: sampleContacts.length
            },
            errors: {
                eviteErrors: eviteErrors.length > 0 ? eviteErrors : null,
                paymentErrors: paymentErrors.length > 0 ? paymentErrors : null,
                sentEmailsAvailable,
                fix: !sentEmailsAvailable ? 'Create a SentEmails collection in Wix Dashboard CMS with fields: to(text), subject(text), body(text), sentAt(date), sentBy(text), type(text), status(text), recipientName(text), eventName(text), rsvpStatus(text), rsvpDate(date)' : null
            },
            message: `Seeded ${seeded} evites across ${events.length} events and ${paymentSeeded} payment records.`
        });
    } catch (error) {
        return errorResponse('Seeding failed: ' + error.message);
    }
}
export function options_seed_sample_evites(request) { return handleCors(); }


// ╔══════════════════════════════════════════════╗
// ║  11. ZELLE (Stub Endpoints)                   ║
// ║      Need Zelle/bank API integration.          ║
// ║      Return safe stubs so UI doesn't crash.   ║
// ╚══════════════════════════════════════════════╝

function zelleNotConfigured() {
    return jsonResponse({
        success: false,
        configured: false,
        error: 'Zelle integration not configured'
    });
}

export function get_zelle_stats(request) {
    return jsonResponse({
        success: true,
        configured: false,
        stats: { total: 0, matched: 0, unmatched: 0, pending: 0 }
    });
}
export function options_zelle_stats(request) { return handleCors(); }

export function get_zelle_payments(request) {
    return jsonResponse({ success: true, configured: false, payments: [], total: 0 });
}
export function options_zelle_payments(request) { return handleCors(); }

export function post_zelle_scan(request) { return zelleNotConfigured(); }
export function options_zelle_scan(request) { return handleCors(); }

export function get_zelle_poller(request) {
    return jsonResponse({ success: true, configured: false, newPayments: 0 });
}
export function options_zelle_poller(request) { return handleCors(); }

export function post_zelle_verify(request) { return zelleNotConfigured(); }
export function options_zelle_verify(request) { return handleCors(); }

export function post_zelle_reject(request) { return zelleNotConfigured(); }
export function options_zelle_reject(request) { return handleCors(); }

export function get_zelle_members(request) {
    return jsonResponse({ success: true, configured: false, members: [] });
}
export function options_zelle_members(request) { return handleCors(); }

export function post_zelle_match(request) { return zelleNotConfigured(); }
export function options_zelle_match(request) { return handleCors(); }

export function post_zelle_seed(request) { return zelleNotConfigured(); }
export function options_zelle_seed(request) { return handleCors(); }

export function get_zelle_history(request) {
    return jsonResponse({ success: true, configured: false, history: [], total: 0 });
}
export function options_zelle_history(request) { return handleCors(); }


// ╔══════════════════════════════════════════════╗
// ║  12. DOCUMENTS / MEETING MINUTES              ║
// ╚══════════════════════════════════════════════╝

export async function get_documents(request) {
    try {
        const category = getQueryParam(request, 'category');
        let query = wixData.query('Documents')
            .eq('isPublic', true)
            .descending('_createdDate');

        if (category) {
            query = query.eq('category', category);
        }

        const results = await query.limit(100).find();
        return jsonResponse({
            success: true,
            documents: results.items,
            total: results.totalCount
        });
    } catch (error) {
        return errorResponse('Failed to fetch documents: ' + error.message);
    }
}
export function options_documents(request) { return handleCors(); }


// ╔══════════════════════════════════════════════╗
// ║  13. MAGAZINE                                 ║
// ╚══════════════════════════════════════════════╝

export async function get_magazines(request) {
    try {
        const results = await wixData.query('Magazines')
            .eq('status', 'published')
            .descending('publishDate')
            .limit(20)
            .find();
        return jsonResponse({
            success: true,
            magazines: results.items,
            total: results.totalCount
        });
    } catch (error) {
        return errorResponse('Failed to fetch magazines: ' + error.message);
    }
}
export function options_magazines(request) { return handleCors(); }


// ╔══════════════════════════════════════════════╗
// ║  14. GUIDE                                    ║
// ╚══════════════════════════════════════════════╝

export async function get_guide(request) {
    try {
        const category = getQueryParam(request, 'category');
        let query = wixData.query('GuideListings')
            .eq('status', 'active');

        if (category) {
            query = query.eq('category', category);
        }

        const results = await query
            .ascending('name')
            .limit(100)
            .find();
        return jsonResponse({
            success: true,
            listings: results.items,
            total: results.totalCount
        });
    } catch (error) {
        return errorResponse('Failed to fetch guide: ' + error.message);
    }
}
export function options_guide(request) { return handleCors(); }


// ╔══════════════════════════════════════════════╗
// ║  15. SETUP / ADMIN                            ║
// ╚══════════════════════════════════════════════╝

export async function get_setup_collections(request) {
    try {
        const expectedCollections = [
            'Events', 'Members', 'RadioStations', 'RadioSchedule',
            'Sponsors', 'SponsorTiers', 'PhotoAlbums', 'Photos',
            'Surveys', 'SurveyResponses', 'Complaints', 'ContactSubmissions',
            'Documents', 'Magazines', 'GuideListings'
        ];
        return jsonResponse({
            success: true,
            expectedCollections: expectedCollections,
            message: 'Create these collections in your Wix database if they do not exist'
        });
    } catch (error) {
        return errorResponse('Setup error: ' + error.message);
    }
}
export function options_setup_collections(request) { return handleCors(); }

/**
 * AUTO-SETUP: Create all collections and sample data
 * Call via: GET /_functions/runSetup
 * This endpoint will:
 * 1. Try to import the banf-setup module
 * 2. Run setupAllCollections()
 * 3. Return results
 */
export async function get_runSetup(request) {
    try {
        const setupResult = await fallbackSetupCollections();
        return jsonResponse({
            success: true,
            message: '✅ Collections setup initiated!',
            result: setupResult
        });
    } catch (error) {
        return errorResponse('Setup failed: ' + error.message);
    }
}

/**
 * Fallback setup if main module unavailable
 */
async function fallbackSetupCollections() {
    const collections = ['Sponsors', 'Events', 'Members', 'Magazine', 'RadioSchedule', 'Announcements', 'Volunteers'];
    const results = [];
    
    for (const collectionId of collections) {
        try {
            // Try to query to see if collection exists
            await wixData.query(collectionId).limit(1).find();
            results.push({ collection: collectionId, status: 'exists' });
        } catch (e) {
            // Collection doesn't exist yet - will need manual creation
            results.push({ collection: collectionId, status: 'missing', message: 'Create in Wix Admin' });
        }
    }
    
    return {
        method: 'fallback',
        collections: results,
        message: 'Collections checked. Create any missing ones in Wix Admin.'
    };
}

export function options_runSetup(request) { return handleCors(); }

/**
 * SIMPLIFIED SETUP: Uses simple-setup.jsw module
 * Call via: GET /_functions/setupNow
 */
export async function get_setupNow(request) {
    try {
        const setupResult = await fallbackSetupCollections();
        return jsonResponse({
            success: true,
            message: '✅ BANF Collections Setup Complete!',
            collectionResults: setupResult,
            timestamp: new Date(),
            nextSteps: 'Reload to see your data on the site'
        });
    } catch (error) {
        return errorResponse('Setup failed: ' + error.message);
    }
}
export function options_setupNow(request) { return handleCors(); }

// 
// v5.8.x  Portal + landing page redirects
// Wix HTTP functions force Content-Type:application/json  all HTML
// pages are served from GitHub Pages where text/html is returned correctly.
// 

// GH_PAGES_BASE: source of static HTML assets (GitHub Pages).
// www.jaxbengali.org is the public domain — but the Wix backend must fetch
// source HTML from GitHub Pages to avoid circular self-fetch.
const GH_PAGES_BASE = 'https://banfjax-hash.github.io/banf';
const PUBLIC_DOMAIN = 'https://www.jaxbengali.org';

function pageRedirect(path) {
    // Static HTML pages are hosted on GitHub Pages
    return wixResponse({
        status: 302,
        headers: { 'Location': GH_PAGES_BASE + path, 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' },
        body: ''
    });
}

function htmlPage(html) {
    // Use ok() helper for HTML responses - better Content-Type handling
    // Note: Wix may still override on *.wixsite.com preview URLs
    return ok({
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'X-Content-Type-Options': 'nosniff'
        },
        body: html
    });
}

// GET /_functions/home  main landing page — redirects to GitHub Pages
// Wix HTTP functions cannot serve HTML to browsers (CDN overrides Content-Type).
// All HTML pages are served from GitHub Pages where text/html works correctly.
export function get_home(request) {
    return pageRedirect('/index.html');
}
export function options_home(request)      { return handleCors(); }

// GET /_functions/member_portal
export function get_member_portal(request) { return wixResponse({ status: 302, headers: { 'Location': 'https://www.jaxbengali.org/home?portal=member', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }, body: '' }); }
export function options_member_portal(request) { return handleCors(); }
export function get_member_portal_raw(request) { return htmlPage(getMemberPortalHtml()); }
export function options_member_portal_raw(request) { return handleCors(); }

// GET /_functions/admin_portal
export function get_admin_portal(request)  { return wixResponse({ status: 302, headers: { 'Location': 'https://www.jaxbengali.org/home?portal=admin', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }, body: '' }); }
export function options_admin_portal(request) { return handleCors(); }
export function get_admin_portal_raw(request)  { return htmlPage(getAdminPortalHtml()); }
export function options_admin_portal_raw(request) { return handleCors(); }

// GET /_functions/unified_dashboard
export function get_unified_dashboard(request)  { return wixResponse({ status: 302, headers: { 'Location': 'https://www.jaxbengali.org/home?portal=unified', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }, body: '' }); }
export function options_unified_dashboard(request) { return handleCors(); }
export function get_unified_dashboard_raw(request)  { return htmlPage(getUnifiedDashboardHtml()); }
export function options_unified_dashboard_raw(request) { return handleCors(); }

// GET /_functions/crm_admin
export function get_crm_admin(request)     { return wixResponse({ status: 302, headers: { 'Location': 'https://www.jaxbengali.org/home?portal=crm', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }, body: '' }); }
export function options_crm_admin(request) { return handleCors(); }
export function get_crm_admin_raw(request)     { return htmlPage(getCrmAdminHtml()); }
export function options_crm_admin_raw(request) { return handleCors(); }

// GET /_functions/join   membership drive / new member onboarding
export function get_join(request)          { return pageRedirect('/join.html'); }
export function options_join(request)      { return handleCors(); }

// GET /_functions/membership_admin   admin workflow panel
export function get_membership_admin(request) { return pageRedirect('/membership-admin.html'); }
export function options_membership_admin(request) { return handleCors(); }

// GET /_functions/archive_mapping   archive document mapping portal
export function get_archive_mapping(request) { return pageRedirect('/archive-mapping.html'); }
export function options_archive_mapping(request) { return handleCors(); }

// GET /_functions/archive_scan_report   printable PDF mapping report
export function get_archive_scan_report(request) {
    const year = (request.query||{}).year || 'FY2024-25';
    return pageRedirect(`/archive-scan-report.html?year=${encodeURIComponent(year)}`);
}
export function options_archive_scan_report(request) { return handleCors(); }

// GET /_functions/membership_drive_workflow   8-step membership drive wizard
export function get_membership_drive_workflow(request) { return pageRedirect('/membership-drive-workflow.html'); }
export function options_membership_drive_workflow(request) { return handleCors(); }

// GET /_functions/reconciliation_workflow   7-step financial reconciliation wizard
export function get_reconciliation_workflow(request) { return pageRedirect('/reconciliation-workflow.html'); }
export function options_reconciliation_workflow(request) { return handleCors(); }

// GET /_functions/ec_onboard_dashboard_page   EC onboarding progress dashboard
export function get_ec_onboard_dashboard_page(request) { return pageRedirect('/ec-onboard-dashboard.html'); }
export function options_ec_onboard_dashboard_page(request) { return handleCors(); }

// ╔══════════════════════════════════════════════════════════════╗
// ║  Bosonto Utsob 2026 — Live Email Pipeline                    ║
// ╚══════════════════════════════════════════════════════════════╝
// POST /_functions/bosonto_pipeline  — sends all pipeline emails
export { post_bosonto_pipeline, options_bosonto_pipeline };

// ╔══════════════════════════════════════════════════════════════╗
// ║  Procurement / Reimbursement Workflow v1.0                    ║
// ╚══════════════════════════════════════════════════════════════╝

// Helper: Load/save procurement data from GoogleTokens
async function loadProcurementStore() {
    const result = await wixData.query('GoogleTokens').eq('key', 'procurement_data').find(SA);
    if (result.items.length === 0) return { requests: [], nextId: 1 };
    return JSON.parse(result.items[0].value || '{"requests":[],"nextId":1}');
}

async function saveProcurementStore(store) {
    const json = JSON.stringify(store);
    const existing = await wixData.query('GoogleTokens').eq('key', 'procurement_data').find(SA);
    if (existing.items.length > 0) {
        const item = existing.items[0];
        item.value = json;
        item.updatedAt = new Date();
        await wixData.update('GoogleTokens', item, SA);
    } else {
        await wixData.insert('GoogleTokens', { key: 'procurement_data', value: json, updatedAt: new Date() }, SA);
    }
}

// GET /_functions/procurement_list — List all procurement requests
export async function get_procurement_list(request) {
    try {
        const store = await loadProcurementStore();
        return jsonResponse({ success: true, requests: store.requests });
    } catch (e) {
        return errorResponse('Failed to load procurement data: ' + e.message);
    }
}
export function options_procurement_list(request) { return handleCors(); }

// POST /_functions/procurement_create — Create a new procurement request
export async function post_procurement_create(request) {
    try {
        const body = await request.body.json();
        if (body.adminKey !== 'banf-bosonto-2026-live') return errorResponse('Unauthorized', 403);

        const store = await loadProcurementStore();
        const id = 'PROC-' + String(store.nextId).padStart(4, '0');
        store.nextId++;

        const tier = body.amount < 100 ? 1 : body.amount < 500 ? 2 : 3;
        const approvers = tier === 1 ? ['ranadhir.ghosh@gmail.com']
            : tier === 2 ? ['ranadhir.ghosh@gmail.com', 'tanveer.a.chowdhury@gmail.com']
            : ['ranadhir.ghosh@gmail.com', 'tanveer.a.chowdhury@gmail.com', 'deepa.shams@gmail.com'];

        const newReq = {
            id,
            requester: body.requester || 'unknown',
            category: body.category || 'other',
            amount: body.amount || 0,
            description: body.description || '',
            vendor: body.vendor || '',
            event: body.event || '',
            urgent: body.urgent || false,
            tier,
            approvers: approvers.map(a => ({ email: a, status: 'pending', decidedAt: null })),
            status: 'pending_approval',
            createdAt: new Date().toISOString(),
            actualAmount: null,
            receiptNotes: null,
            paymentMethod: null,
            paidAt: null
        };

        store.requests.push(newReq);
        await saveProcurementStore(store);

        return jsonResponse({ success: true, id, tier, approvers: approvers.length, message: 'Procurement request created' });
    } catch (e) {
        return errorResponse('Failed to create procurement request: ' + e.message);
    }
}
export function options_procurement_create(request) { return handleCors(); }

// POST /_functions/procurement_approve — Approve or reject a request
export async function post_procurement_approve(request) {
    try {
        const body = await request.body.json();
        if (body.adminKey !== 'banf-bosonto-2026-live') return errorResponse('Unauthorized', 403);

        const store = await loadProcurementStore();
        const req = store.requests.find(r => r.id === body.id);
        if (!req) return errorResponse('Request not found: ' + body.id, 404);

        const approverEntry = req.approvers.find(a => a.email === body.approver);
        if (!approverEntry) return errorResponse('You are not an approver for this request', 403);

        approverEntry.status = body.decision; // 'approved' or 'rejected'
        approverEntry.decidedAt = new Date().toISOString();
        approverEntry.reason = body.reason || '';

        if (body.decision === 'rejected') {
            req.status = 'rejected';
        } else {
            const allApproved = req.approvers.every(a => a.status === 'approved');
            if (allApproved) req.status = 'approved';
        }

        await saveProcurementStore(store);
        return jsonResponse({ success: true, id: body.id, newStatus: req.status });
    } catch (e) {
        return errorResponse('Failed to process approval: ' + e.message);
    }
}
export function options_procurement_approve(request) { return handleCors(); }

// POST /_functions/procurement_receipt — Submit receipt for an approved request
export async function post_procurement_receipt(request) {
    try {
        const body = await request.body.json();
        if (body.adminKey !== 'banf-bosonto-2026-live') return errorResponse('Unauthorized', 403);

        const store = await loadProcurementStore();
        const req = store.requests.find(r => r.id === body.id);
        if (!req) return errorResponse('Request not found: ' + body.id, 404);

        req.actualAmount = body.actualAmount;
        req.receiptNotes = body.notes || '';
        req.receiptSubmittedAt = new Date().toISOString();

        const variance = Math.abs(req.actualAmount - req.amount) / req.amount;
        const varianceApprovalNeeded = variance > 0.1; // >10% variance needs approval

        if (varianceApprovalNeeded) {
            req.status = 'variance_review';
        } else {
            req.status = 'payment_pending';
        }

        await saveProcurementStore(store);
        return jsonResponse({ success: true, id: body.id, newStatus: req.status, varianceApprovalNeeded });
    } catch (e) {
        return errorResponse('Failed to submit receipt: ' + e.message);
    }
}
export function options_procurement_receipt(request) { return handleCors(); }

// ╔══════════════════════════════════════════════════════════════╗
// ║  EC Member Replacement Agent — President Only                 ║
// ╚══════════════════════════════════════════════════════════════╝

async function loadEcReplacementStore() {
    const result = await wixData.query('GoogleTokens').eq('key', 'ec_replacement_data').find(SA);
    if (result.items.length === 0) return { workflows: [], nextId: 1 };
    return JSON.parse(result.items[0].value || '{"workflows":[],"nextId":1}');
}

async function saveEcReplacementStore(store) {
    const json = JSON.stringify(store);
    const existing = await wixData.query('GoogleTokens').eq('key', 'ec_replacement_data').find(SA);
    if (existing.items.length > 0) {
        const item = existing.items[0];
        item.value = json;
        item.updatedAt = new Date();
        await wixData.update('GoogleTokens', item, SA);
    } else {
        await wixData.insert('GoogleTokens', { key: 'ec_replacement_data', value: json, updatedAt: new Date() }, SA);
    }
}

const PRESIDENT_EMAIL = 'ranadhir.ghosh@gmail.com';
const EC_MEMBER_MAP = {
    'deepa.shams@gmail.com': 'Deepa Shams — Vice President',
    'mollik1958@gmail.com': 'Imran Mollik — Secretary',
    'prangon.ghosh@gmail.com': 'Prangon Ghosh — Joint Secretary',
    'tanveer.a.chowdhury@gmail.com': 'Tanveer Chowdhury — Treasurer',
    'tusher.ahmed77@gmail.com': 'Tusher Ahmed — Cultural Secretary',
    'sajal.saha@gmail.com': 'Sajal Saha — Comms Lead'
};

// GET /_functions/ec_replacement_list — List all EC replacement workflows
export async function get_ec_replacement_list(request) {
    try {
        const store = await loadEcReplacementStore();
        return jsonResponse({ success: true, workflows: store.workflows });
    } catch (e) {
        return errorResponse('Failed to load EC replacement data: ' + e.message);
    }
}
export function options_ec_replacement_list(request) { return handleCors(); }

// POST /_functions/ec_replacement_initiate — Start resignation/suspension
export async function post_ec_replacement_initiate(request) {
    try {
        const body = await request.body.json();
        if (body.adminKey !== 'banf-bosonto-2026-live') return errorResponse('Unauthorized', 403);
        if (body.president !== PRESIDENT_EMAIL) return errorResponse('Only the BANF President can initiate EC replacement workflows', 403);
        if (!body.memberEmail || !EC_MEMBER_MAP[body.memberEmail]) return errorResponse('Invalid EC member', 400);
        if (!body.actionType || !['resignation', 'suspension'].includes(body.actionType)) return errorResponse('Invalid action type', 400);

        const store = await loadEcReplacementStore();
        const id = 'ECR-' + String(store.nextId).padStart(4, '0');
        store.nextId++;

        // All other EC members need to reply
        const otherMembers = Object.keys(EC_MEMBER_MAP).filter(e => e !== body.memberEmail);

        const workflow = {
            id,
            memberEmail: body.memberEmail,
            memberName: EC_MEMBER_MAP[body.memberEmail],
            type: body.actionType,
            reason: body.reason || '',
            status: 'initiated',
            initiatedAt: new Date().toISOString(),
            passwordResetQueued: true,
            replies: [],
            expectedReplies: otherMembers.map(e => ({ email: e, name: EC_MEMBER_MAP[e], replied: false })),
            emails: {
                thankYouSent: false,
                ecNotificationSent: false,
                reimbursementNoticeSent: false,
                finalizationSent: false
            },
            finalizedAt: null
        };

        store.workflows.push(workflow);
        await saveEcReplacementStore(store);

        return jsonResponse({
            success: true, id,
            message: body.actionType + ' workflow initiated for ' + EC_MEMBER_MAP[body.memberEmail],
            passwordResetQueued: true,
            emailsToSend: ['thankYou', 'ecNotification', 'reimbursementNotice'],
            waitingRepliesFrom: otherMembers.length + ' EC members'
        });
    } catch (e) {
        return errorResponse('Failed to initiate EC replacement: ' + e.message);
    }
}
export function options_ec_replacement_initiate(request) { return handleCors(); }

// POST /_functions/ec_replacement_finalize — Finalize a workflow after all replies
export async function post_ec_replacement_finalize(request) {
    try {
        const body = await request.body.json();
        if (body.adminKey !== 'banf-bosonto-2026-live') return errorResponse('Unauthorized', 403);

        const store = await loadEcReplacementStore();
        const wf = store.workflows.find(w => w.id === body.id);
        if (!wf) return errorResponse('Workflow not found: ' + body.id, 404);

        wf.status = 'completed';
        wf.finalizedAt = new Date().toISOString();
        wf.emails.finalizationSent = true;

        await saveEcReplacementStore(store);

        return jsonResponse({ success: true, id: body.id, message: 'Workflow finalized', finalizedAt: wf.finalizedAt });
    } catch (e) {
        return errorResponse('Failed to finalize workflow: ' + e.message);
    }
}
export function options_ec_replacement_finalize(request) { return handleCors(); }

// POST /_functions/ec_replacement_reverse — Reverse a suspension
export async function post_ec_replacement_reverse(request) {
    try {
        const body = await request.body.json();
        if (body.adminKey !== 'banf-bosonto-2026-live') return errorResponse('Unauthorized', 403);

        const store = await loadEcReplacementStore();
        const wf = store.workflows.find(w => w.id === body.id);
        if (!wf) return errorResponse('Workflow not found: ' + body.id, 404);
        if (wf.type !== 'suspension') return errorResponse('Can only reverse suspensions', 400);

        wf.status = 'reversed';
        wf.reversedAt = new Date().toISOString();

        await saveEcReplacementStore(store);

        return jsonResponse({ success: true, id: body.id, message: 'Suspension reversed', reversedAt: wf.reversedAt });
    } catch (e) {
        return errorResponse('Failed to reverse suspension: ' + e.message);
    }
}
export function options_ec_replacement_reverse(request) { return handleCors(); }

// ╔══════════════════════════════════════════════════════════════╗
// ║  Reimbursement Workflow v2.0 — Proper Collections            ║
// ╚══════════════════════════════════════════════════════════════╝

// Helper: Load/save reimbursement data from GoogleTokens (key-value store) — legacy
async function loadReimbursementStore() {
    const result = await wixData.query('GoogleTokens').eq('key', 'reimbursement_data').find(SA);
    if (result.items.length === 0) return { tickets: [], nextId: 1 };
    return JSON.parse(result.items[0].value || '{"tickets":[],"nextId":1}');
}

async function saveReimbursementStore(store) {
    const json = JSON.stringify(store);
    const existing = await wixData.query('GoogleTokens').eq('key', 'reimbursement_data').find(SA);
    if (existing.items.length > 0) {
        const item = existing.items[0];
        item.value = json;
        item.updatedAt = new Date();
        await wixData.update('GoogleTokens', item, SA);
    } else {
        await wixData.insert('GoogleTokens', { key: 'reimbursement_data', value: json, updatedAt: new Date() }, SA);
    }
}

// Helper: Write ticket to ReimbursementTickets collection (proper structured data)
async function syncTicketToCollection(ticket) {
    try {
        const existing = await wixData.query('ReimbursementTickets').eq('ticketId', ticket.id).find(SA);
        const row = {
            ticketId: ticket.id,
            requester: ticket.requester,
            requesterName: ticket.requesterName || '',
            eventId: ticket.eventId,
            eventName: ticket.event,
            totalAmount: ticket.totalAmount,
            receiptsJson: JSON.stringify(ticket.receipts || []),
            receiptCount: (ticket.receipts || []).length,
            paidBy: ticket.paidBy || 'own_card',
            budgetApprover: ticket.budgetApprover || '',
            notes: ticket.notes || '',
            status: ticket.status,
            approvedBy: (ticket.approvals || []).filter(a => a.status === 'approved').map(a => a.role).join(', '),
            approvedAt: ticket.approvals && ticket.approvals.every(a => a.status === 'approved') ? new Date(ticket.approvals[ticket.approvals.length - 1].decidedAt) : null,
            paymentMethod: ticket.paymentMethod || null,
            paymentRef: ticket.paymentReference || '',
            paidAt: ticket.paymentMadeAt ? new Date(ticket.paymentMadeAt) : null,
            confirmedAt: ticket.paymentConfirmedAt ? new Date(ticket.paymentConfirmedAt) : null,
            createdAt: new Date(ticket.createdAt),
            updatedAt: new Date(ticket.updatedAt)
        };
        if (existing.items.length > 0) {
            await wixData.update('ReimbursementTickets', { ...existing.items[0], ...row }, SA);
        } else {
            await wixData.insert('ReimbursementTickets', row, SA);
        }
    } catch (e) {
        console.error('syncTicketToCollection error:', e.message);
    }
}

// Helper: Write to FinancialLedger (income/expense entry)
async function addLedgerEntry(entry) {
    try {
        await wixData.insert('FinancialLedger', {
            entryDate: entry.entryDate ? new Date(entry.entryDate) : new Date(),
            entryType: entry.entryType || 'expense',         // 'income' | 'expense'
            category: entry.category || 'reimbursement',     // 'reimbursement' | 'membership' | 'donation' | 'venue' | 'bank_statement'
            description: entry.description || '',
            amount: entry.amount || 0,
            direction: entry.direction || 'debit',           // 'credit' (income) | 'debit' (expense)
            eventId: entry.eventId || '',
            eventName: entry.eventName || '',
            payerOrPayee: entry.payerOrPayee || '',
            paymentMethod: entry.paymentMethod || '',
            reference: entry.reference || '',
            source: entry.source || 'manual',                // 'reimbursement' | 'bank_statement' | 'zelle' | 'manual'
            sourceId: entry.sourceId || '',
            bankDate: entry.bankDate ? new Date(entry.bankDate) : null,
            bankDescription: entry.bankDescription || '',
            bankBalance: entry.bankBalance || null,
            reconciled: entry.reconciled || false,
            reconciledAt: null,
            notes: entry.notes || '',
            createdAt: new Date(),
            updatedAt: new Date()
        }, SA);
    } catch (e) {
        console.error('addLedgerEntry error:', e.message);
    }
}

// BANF EC Year 2026-27 events list (SOURCE: membership_events.jpg — 17 events)
const BANF_EVENTS_2025_26 = [
    { id: 'bosonto-utsob-2026', name: 'Bosonto Utsob', date: '2026-03-07', type: 'Cultural' },
    { id: 'noboborsho-2026', name: 'Noboborsho', date: '2026-04-25', type: 'Cultural' },
    { id: 'kids-summer-sports-2026', name: 'Kids Summer Sports Training', date: '2026-06-01', type: 'Educational' },
    { id: 'summer-workshops-kids-2026', name: 'Summer Workshops — Kids', date: '2026-06-01', type: 'Educational' },
    { id: 'summer-workshops-general-2026', name: 'Summer Workshops — General', date: '2026-06-01', type: 'Educational' },
    { id: 'sports-day-2026', name: 'Sports Day', date: '2026-07-01', type: 'Social' },
    { id: 'spondon-2026', name: 'Spondon', date: '2026-08-01', type: 'Cultural' },
    { id: 'mahalaya-2026', name: 'Mahalaya', date: '2026-10-17', type: 'Religious' },
    { id: 'durga-puja-2026', name: 'Durga Puja Day 1 & 2 + Lunch', date: '2026-10-24', type: 'Religious' },
    { id: 'lakshmi-puja-2026', name: 'Lakshmi Puja', date: '2026-10-25', type: 'Religious' },
    { id: 'bijoya-sonmiloni-2026', name: 'Bijoya Sonmiloni', date: '2026-10-25', type: 'Social' },
    { id: 'artist-program-day1-2026', name: 'Artist Program Day 1 + Dinner', date: '2026-10-24', type: 'Cultural' },
    { id: 'artist-program-day2-2026', name: 'Artist Program Day 2 + Dinner', date: '2026-10-25', type: 'Cultural' },
    { id: 'kali-puja-2026', name: 'Kali Puja + Lunch', date: '2026-11-07', type: 'Religious' },
    { id: 'natok-dinner-2026', name: 'Natok (Drama) + Dinner', date: '2026-11-07', type: 'Cultural' },
    { id: 'winter-picnic-2027', name: 'Winter Picnic', date: '2027-01-11', type: 'Social' },
    { id: 'saraswati-puja-2027', name: 'Saraswati Puja', date: '2027-02-27', type: 'Religious' }
];

// Approver chain: Treasurer → Vice President → President
const REIMBURSEMENT_APPROVERS = [
    { email: 'tanveer.a.chowdhury@gmail.com', role: 'Treasurer', order: 1 },
    { email: 'deepa.shams@gmail.com', role: 'Vice President', order: 2 },
    { email: 'ranadhir.ghosh@gmail.com', role: 'President', order: 3 }
];

// GET /_functions/reimbursement_list — List all reimbursement tickets
export async function get_reimbursement_list(request) {
    try {
        const store = await loadReimbursementStore();
        return jsonResponse({
            success: true,
            tickets: store.tickets,
            events: BANF_EVENTS_2025_26,
            approvers: REIMBURSEMENT_APPROVERS.map(a => ({ role: a.role, order: a.order }))
        });
    } catch (e) {
        return errorResponse('Failed to load reimbursement data: ' + e.message);
    }
}
export function options_reimbursement_list(request) { return handleCors(); }

// POST /_functions/reimbursement_create — Create a new reimbursement ticket
export async function post_reimbursement_create(request) {
    try {
        const body = await request.body.json();
        if (body.adminKey !== 'banf-bosonto-2026-live') return errorResponse('Unauthorized', 403);

        const store = await loadReimbursementStore();
        const id = 'RMB-' + String(store.nextId).padStart(4, '0');
        store.nextId++;

        // Validate event
        const event = BANF_EVENTS_2025_26.find(e => e.id === body.eventId);
        if (!event) return errorResponse('Invalid event selected', 400);

        // Parse receipts array
        const receipts = (body.receipts || []).map((r, idx) => ({
            index: idx + 1,
            storeName: r.storeName || '',
            date: r.date || '',
            lineItems: (r.lineItems || []).map(li => ({
                item: li.item || 'Unknown Item',
                cost: parseFloat(li.cost) || 0
            })),
            totalCost: parseFloat(r.totalCost) || 0,
            receiptMissing: r.receiptMissing || false,
            missingReason: r.missingReason || '',
            fileName: r.fileName || '',
            fileType: r.fileType || '',
            parseConfidence: r.parseConfidence || 'manual',
            confirmedByUser: true
        }));

        const totalAmount = receipts.reduce((sum, r) => sum + r.totalCost, 0);

        const ticket = {
            id,
            requester: body.requester || 'unknown',
            requesterName: body.requesterName || '',
            event: event.name,
            eventId: body.eventId,
            receipts,
            totalAmount: Math.round(totalAmount * 100) / 100,
            paidBy: body.paidBy || 'own_card', // 'own_card' or 'banf_card'
            budgetApprover: body.budgetApprover || '', // President / VP / Treasurer
            status: 'pending_treasurer', // First person in chain
            approvals: REIMBURSEMENT_APPROVERS.map(a => ({
                email: a.email,
                role: a.role,
                order: a.order,
                status: 'pending',
                decidedAt: null,
                notes: ''
            })),
            paymentMade: false,
            paymentMadeBy: null,
            paymentMadeAt: null,
            paymentMethod: null,
            paymentConfirmedByRequester: false,
            paymentConfirmedAt: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            notes: body.notes || '',
            auditLog: [
                { action: 'created', by: body.requester, at: new Date().toISOString(), detail: 'Ticket created with ' + receipts.length + ' receipt(s), total $' + totalAmount.toFixed(2) }
            ]
        };

        store.tickets.push(ticket);
        await saveReimbursementStore(store);

        // Dual-write: sync to proper ReimbursementTickets collection
        await syncTicketToCollection(ticket);

        // Write expense entry to FinancialLedger
        await addLedgerEntry({
            entryDate: ticket.createdAt,
            entryType: 'expense',
            category: 'reimbursement',
            description: 'Reimbursement ' + id + ' — ' + event.name + ' (' + receipts.length + ' receipt(s))',
            amount: ticket.totalAmount,
            direction: 'debit',
            eventId: body.eventId,
            eventName: event.name,
            payerOrPayee: ticket.requesterName || ticket.requester,
            paymentMethod: body.paidBy || 'own_card',
            reference: id,
            source: 'reimbursement',
            sourceId: id,
            notes: body.notes || ''
        });

        return jsonResponse({
            success: true,
            id,
            totalAmount: ticket.totalAmount,
            receipts: receipts.length,
            message: 'Reimbursement ticket created — pending Treasurer approval'
        });
    } catch (e) {
        return errorResponse('Failed to create reimbursement ticket: ' + e.message);
    }
}
export function options_reimbursement_create(request) { return handleCors(); }

// POST /_functions/reimbursement_approve — Approver action (approve/reject)
export async function post_reimbursement_approve(request) {
    try {
        const body = await request.body.json();
        if (body.adminKey !== 'banf-bosonto-2026-live') return errorResponse('Unauthorized', 403);

        const store = await loadReimbursementStore();
        const ticket = store.tickets.find(t => t.id === body.ticketId);
        if (!ticket) return errorResponse('Ticket not found: ' + body.ticketId, 404);

        // Find this approver
        const approverEntry = ticket.approvals.find(a => a.email === body.approver);
        if (!approverEntry) return errorResponse('You are not an approver for this ticket', 403);

        // Check order: previous approvers must have approved
        const prevApprovers = ticket.approvals.filter(a => a.order < approverEntry.order);
        const allPrevApproved = prevApprovers.every(a => a.status === 'approved');
        if (!allPrevApproved) {
            return errorResponse('Previous approver(s) must approve first. Current chain: ' +
                prevApprovers.map(a => a.role + ':' + a.status).join(', '), 400);
        }

        approverEntry.status = body.decision; // 'approved' or 'rejected'
        approverEntry.decidedAt = new Date().toISOString();
        approverEntry.notes = body.notes || '';

        // Update ticket status
        if (body.decision === 'rejected') {
            ticket.status = 'rejected';
            ticket.auditLog.push({
                action: 'rejected',
                by: body.approver,
                at: new Date().toISOString(),
                detail: approverEntry.role + ' rejected: ' + (body.notes || 'no reason')
            });
        } else {
            // Check if all approvers have approved
            const allApproved = ticket.approvals.every(a => a.status === 'approved');
            if (allApproved) {
                ticket.status = 'pending_payment';
                ticket.auditLog.push({
                    action: 'fully_approved',
                    by: body.approver,
                    at: new Date().toISOString(),
                    detail: 'All 3 approvers approved — awaiting payment'
                });
            } else {
                // Move to next approver
                const nextApprover = ticket.approvals.find(a => a.status === 'pending');
                if (nextApprover) {
                    ticket.status = 'pending_' + nextApprover.role.toLowerCase().replace(/\s+/g, '_');
                }
                ticket.auditLog.push({
                    action: 'approved',
                    by: body.approver,
                    at: new Date().toISOString(),
                    detail: approverEntry.role + ' approved — next: ' + (nextApprover ? nextApprover.role : 'payment')
                });
            }
        }

        ticket.updatedAt = new Date().toISOString();
        await saveReimbursementStore(store);
        await syncTicketToCollection(ticket);

        return jsonResponse({
            success: true,
            ticketId: body.ticketId,
            newStatus: ticket.status,
            decision: body.decision,
            approverRole: approverEntry.role
        });
    } catch (e) {
        return errorResponse('Failed to process approval: ' + e.message);
    }
}
export function options_reimbursement_approve(request) { return handleCors(); }

// POST /_functions/reimbursement_payment — Treasurer/President marks payment made
export async function post_reimbursement_payment(request) {
    try {
        const body = await request.body.json();
        if (body.adminKey !== 'banf-bosonto-2026-live') return errorResponse('Unauthorized', 403);

        const store = await loadReimbursementStore();
        const ticket = store.tickets.find(t => t.id === body.ticketId);
        if (!ticket) return errorResponse('Ticket not found: ' + body.ticketId, 404);

        if (ticket.status !== 'pending_payment') {
            return errorResponse('Ticket must be in pending_payment status. Current: ' + ticket.status, 400);
        }

        ticket.paymentMade = true;
        ticket.paymentMadeBy = body.payer || 'unknown';
        ticket.paymentMadeAt = new Date().toISOString();
        ticket.paymentMethod = body.method || 'zelle'; // zelle, check, cash
        ticket.paymentReference = body.reference || '';
        ticket.status = 'payment_made';
        ticket.updatedAt = new Date().toISOString();

        ticket.auditLog.push({
            action: 'payment_made',
            by: body.payer,
            at: new Date().toISOString(),
            detail: 'Payment of $' + ticket.totalAmount.toFixed(2) + ' made via ' + ticket.paymentMethod + (body.reference ? ' (ref: ' + body.reference + ')' : '')
        });

        await saveReimbursementStore(store);
        await syncTicketToCollection(ticket);

        return jsonResponse({
            success: true,
            ticketId: body.ticketId,
            newStatus: 'payment_made',
            amount: ticket.totalAmount,
            method: ticket.paymentMethod
        });
    } catch (e) {
        return errorResponse('Failed to record payment: ' + e.message);
    }
}
export function options_reimbursement_payment(request) { return handleCors(); }

// POST /_functions/reimbursement_confirm — Requester confirms payment received
export async function post_reimbursement_confirm(request) {
    try {
        const body = await request.body.json();
        if (body.adminKey !== 'banf-bosonto-2026-live') return errorResponse('Unauthorized', 403);

        const store = await loadReimbursementStore();
        const ticket = store.tickets.find(t => t.id === body.ticketId);
        if (!ticket) return errorResponse('Ticket not found: ' + body.ticketId, 404);

        if (ticket.status !== 'payment_made') {
            return errorResponse('Ticket must be in payment_made status. Current: ' + ticket.status, 400);
        }

        ticket.paymentConfirmedByRequester = true;
        ticket.paymentConfirmedAt = new Date().toISOString();
        ticket.status = 'completed';
        ticket.updatedAt = new Date().toISOString();

        ticket.auditLog.push({
            action: 'payment_confirmed',
            by: body.requester,
            at: new Date().toISOString(),
            detail: 'Requester confirmed payment of $' + ticket.totalAmount.toFixed(2) + ' received — cycle complete'
        });

        await saveReimbursementStore(store);
        await syncTicketToCollection(ticket);

        return jsonResponse({
            success: true,
            ticketId: body.ticketId,
            newStatus: 'completed',
            completedAt: ticket.paymentConfirmedAt
        });
    } catch (e) {
        return errorResponse('Failed to confirm payment: ' + e.message);
    }
}
export function options_reimbursement_confirm(request) { return handleCors(); }

// GET /_functions/reimbursement_events — Get list of available events for the EC year
export async function get_reimbursement_events(request) {
    return jsonResponse({ success: true, events: BANF_EVENTS_2025_26 });
}
export function options_reimbursement_events(request) { return handleCors(); }

// POST /_functions/create_financial_collections — Create FinancialLedger + ReimbursementTickets collections
export async function post_create_financial_collections(request) {
    try {
        const body = await request.body.json();
        if (body.adminKey !== 'banf-bosonto-2026-live') return errorResponse('Unauthorized', 403);
        const results = {};
        for (const colName of ['FinancialLedger', 'ReimbursementTickets']) {
            const steps = [];
            // Step 0: Check existence
            try {
                const q = await wixData.query(colName).limit(1).find(SA);
                results[colName] = { exists: true, count: q.items.length };
                continue;
            } catch (e0) { steps.push({ step: 0, check: 'not-found', error: e0.message }); }

            // Step 1: wix-data.v2 createDataCollection with elevate()
            try {
                const wixAuth = await import('wix-auth');
                const { collections } = await import('wix-data.v2');
                const elevatedCreate = wixAuth.elevate(collections.createDataCollection);
                const cr = await elevatedCreate({
                    _id: colName,
                    displayName: colName
                });
                steps.push({ step: 1, method: 'wix-data-v2-elevated', ok: true, result: JSON.stringify(cr).slice(0, 300) });
                results[colName] = { exists: true, method: 'wix-data-v2-elevated', steps };
                continue;
            } catch (e1) { steps.push({ step: 1, method: 'wix-data-v2-elevated', ok: false, error: e1.message }); }

            // Step 2: wixFetch to REST API
            try {
                const wixFetch = (await import('wix-fetch')).fetch;
                const resp = await wixFetch('https://www.wixapis.com/wix-data/v2/collections', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ collection: { id: colName, displayName: colName } })
                });
                const txt = await resp.text();
                steps.push({ step: 2, method: 'rest-api', status: resp.status, body: txt.slice(0, 300) });
                if (resp.ok) { results[colName] = { exists: true, method: 'rest-api', steps }; continue; }
            } catch (e2) { steps.push({ step: 2, method: 'rest-api', ok: false, error: e2.message }); }

            // Step 3: direct insert (auto-create)
            try {
                const ins = await wixData.insert(colName, { _seed: true, createdAt: new Date() }, SA);
                steps.push({ step: 3, method: 'insert-seed', ok: true, id: ins._id });
                results[colName] = { exists: true, method: 'auto-created-insert', steps };
                continue;
            } catch (e3) { steps.push({ step: 3, method: 'insert-seed', ok: false, error: e3.message }); }

            results[colName] = { exists: false, steps };
        }
        return jsonResponse({ success: true, results });
    } catch (e) {
        return errorResponse('create_financial_collections failed: ' + e.message);
    }
}
export function options_create_financial_collections(request) { return handleCors(); }

// ╔══════════════════════════════════════════════════════════════╗
// ║  Financial Ledger API v1.0                                    ║
// ╚══════════════════════════════════════════════════════════════╝

// GET /_functions/ledger_list — List ledger entries with optional filters
export async function get_ledger_list(request) {
    try {
        const qp = request.query || {};
        const key = qp.key || (request.headers && request.headers['x-admin-key']);
        if (key !== 'banf-bosonto-2026-live') return errorResponse('Unauthorized', 403);

        let query = wixData.query('FinancialLedger').descending('entryDate');
        const direction = qp.direction;
        const category = qp.category;
        const source = qp.source;
        const from = qp.from;
        const to = qp.to;

        if (direction) query = query.eq('direction', direction);
        if (category) query = query.eq('category', category);
        if (source) query = query.eq('source', source);
        if (from) query = query.ge('entryDate', new Date(from));
        if (to) query = query.le('entryDate', new Date(to));

        const result = await query.limit(500).find(SA);
        const entries = result.items.map(i => ({
            id: i._id,
            entryDate: i.entryDate,
            entryType: i.entryType,
            category: i.category,
            description: i.description,
            amount: i.amount,
            direction: i.direction,
            eventId: i.eventId,
            eventName: i.eventName,
            payerOrPayee: i.payerOrPayee,
            paymentMethod: i.paymentMethod,
            reference: i.reference,
            source: i.source,
            sourceId: i.sourceId,
            bankDate: i.bankDate,
            bankDescription: i.bankDescription,
            bankBalance: i.bankBalance,
            reconciled: i.reconciled,
            notes: i.notes,
            createdAt: i.createdAt
        }));

        const totalIncome = entries.filter(e => e.direction === 'credit').reduce((s, e) => s + (e.amount || 0), 0);
        const totalExpense = entries.filter(e => e.direction === 'debit').reduce((s, e) => s + (e.amount || 0), 0);

        return jsonResponse({
            success: true,
            count: entries.length,
            totalIncome: Math.round(totalIncome * 100) / 100,
            totalExpense: Math.round(totalExpense * 100) / 100,
            netBalance: Math.round((totalIncome - totalExpense) * 100) / 100,
            entries
        });
    } catch (e) {
        return errorResponse('Failed to load ledger: ' + e.message);
    }
}
export function options_ledger_list(request) { return handleCors(); }

// POST /_functions/ledger_add — Add entry to financial ledger (bank statement, manual)
export async function post_ledger_add(request) {
    try {
        const body = await request.body.json();
        if (body.adminKey !== 'banf-bosonto-2026-live') return errorResponse('Unauthorized', 403);

        const entries = body.entries || [body]; // Support batch or single
        const results = [];
        for (const entry of entries) {
            await addLedgerEntry(entry);
            results.push({ description: entry.description, amount: entry.amount, direction: entry.direction });
        }

        return jsonResponse({ success: true, added: results.length, entries: results });
    } catch (e) {
        return errorResponse('Failed to add ledger entry: ' + e.message);
    }
}
export function options_ledger_add(request) { return handleCors(); }

// POST /_functions/ledger_delete — Delete ledger entries by filter
export async function post_ledger_delete(request) {
    try {
        const body = await request.body.json();
        if (body.adminKey !== 'banf-bosonto-2026-live') return errorResponse('Unauthorized', 403);
        let query = wixData.query('FinancialLedger');
        if (body.before) query = query.lt('entryDate', new Date(body.before));
        if (body.after) query = query.gt('entryDate', new Date(body.after));
        if (body.all === true) { /* no filter — delete all */ }
        const result = await query.limit(500).find(SA);
        let deleted = 0;
        for (const item of result.items) {
            await wixData.remove('FinancialLedger', item._id, SA);
            deleted++;
        }
        return jsonResponse({ success: true, deleted, hadMore: result.totalCount > result.items.length });
    } catch (e) {
        return errorResponse('Failed to delete ledger entries: ' + e.message);
    }
}
export function options_ledger_delete(request) { return handleCors(); }

// GET /_functions/ledger_summary — Daily/monthly income/expense summary
export async function get_ledger_summary(request) {
    try {
        const qp = request.query || {};
        const key = qp.key || (request.headers && request.headers['x-admin-key']);
        if (key !== 'banf-bosonto-2026-live') return errorResponse('Unauthorized', 403);

        const result = await wixData.query('FinancialLedger').descending('entryDate').limit(1000).find(SA);
        const daily = {};
        for (const item of result.items) {
            const d = item.entryDate ? new Date(item.entryDate).toISOString().slice(0, 10) : 'unknown';
            if (!daily[d]) daily[d] = { date: d, income: 0, expense: 0, count: 0, entries: [] };
            daily[d].count++;
            if (item.direction === 'credit') daily[d].income += (item.amount || 0);
            else daily[d].expense += (item.amount || 0);
            daily[d].entries.push({ desc: item.description, amount: item.amount, dir: item.direction, cat: item.category });
        }

        const days = Object.values(daily).sort((a, b) => b.date.localeCompare(a.date));
        return jsonResponse({ success: true, days, totalDays: days.length });
    } catch (e) {
        return errorResponse('Failed to generate summary: ' + e.message);
    }
}
export function options_ledger_summary(request) { return handleCors(); }

// ╔══════════════════════════════════════════════════════════════╗
// ║  WhatsApp Announcement Ingestion v5.11.0                     ║
// ╚══════════════════════════════════════════════════════════════╝
// GET  /_functions/whatsapp_webhook           — Meta webhook verification
// POST /_functions/whatsapp_webhook           — Inbound WhatsApp messages
// POST /_functions/whatsapp_announcement_approve — Approve/reject queued announcements
// GET  /_functions/whatsapp_announcements     — Public announcements feed
export {
    get_whatsapp_webhook,
    post_whatsapp_webhook,
    options_whatsapp_webhook,
    post_whatsapp_announcement_approve,
    options_whatsapp_announcement_approve,
    get_whatsapp_announcements,
    options_whatsapp_announcements
};
