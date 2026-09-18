# Catalyst Tables For Business Agents

Create these tables in Catalyst Data Store before turning on `APP_MODE=catalyst`.

## Agent_Tasks

- `agent_key` text
- `task_type` text
- `status` text
- `priority_level` text
- `assigned_to` text
- `related_table` text
- `related_record_id` text
- `summary` text
- `details_json` text area
- `due_at` text
- `approval_required` text
- `created_at` text
- `updated_at` text

## Agent_Activity_Log

- `agent_key` text
- `action` text
- `status` text
- `related_table` text
- `related_record_id` text
- `details_json` text area
- `created_at` text
- `updated_at` text

## Leads

- `name` text
- `email` text
- `phone` text
- `address` text
- `source` text
- `service_interest` text
- `urgency` text
- `notes` text area
- `status` text
- `score` number
- `score_label` text
- `assigned_to` text
- `last_contacted_at` text
- `created_at` text
- `updated_at` text

## Campaigns

- `name` text
- `channel` text
- `status` text
- `budget` number
- `start_date` text
- `end_date` text
- `goal` text
- `target_service` text
- `notes` text area
- `created_at` text
- `updated_at` text

## Campaign_Assets

- `campaign_id` text
- `asset_type` text
- `headline` text
- `body` text area
- `image_url` text
- `approval_status` text
- `created_at` text
- `updated_at` text

## Lead_Followups

- `lead_id` text
- `channel` text
- `scheduled_at` text
- `sent_at` text
- `status` text
- `template_key` text
- `created_at` text
- `updated_at` text

## Reviews

- `ticket_id` text
- `customer_id` text
- `rating` number
- `review_text` text area
- `approval_status` text
- `published_at` text
- `created_at` text
- `updated_at` text

## Notes

- Avoid reserved column names like `key` or `priority`; use names like `key1` and `priority_level`.
- The AppSail has fallback handling for extra columns, but the tables above give the agents enough structure to operate cleanly.
