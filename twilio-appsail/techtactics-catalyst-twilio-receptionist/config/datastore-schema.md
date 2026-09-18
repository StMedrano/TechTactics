# Catalyst Data Store Table

Create a table named `ReceptionistLeads` with these columns:

| Column | Type | Notes |
|---|---|---|
| CallSid | Text | Twilio call SID |
| CallerPhone | Text | Caller phone number |
| Transcript | Text / Large Text | Speech text or DTMF marker |
| Category | Text | emergency, new_install, repair, service_removal, billing, general |
| Priority | Text | emergency, high, normal, low |
| Summary | Text / Large Text | AI or fallback summary |
| Status | Text | new, details_collected, forwarded_emergency |
| ParentLeadId | Text | Optional linked row ID |
| CreatedAt | Text | ISO timestamp |

Catalyst automatically includes row metadata such as ROWID and CREATEDTIME.

## Portal Tables Used By Voice Intake

The Twillio AppSail also writes into the main portal tables when a caller provides details:

| Table | Purpose |
|---|---|
| `Users` | Creates or updates a customer record with name, email, phone, and address. No password is collected from the caller; a locked random password hash is stored so the row can exist safely. |
| `Tickets` | Creates a `pending_approval` service ticket assigned to an available admin/employee review queue user. |

Set these environment variables if your table names differ:

```env
CATALYST_TABLE_USERS=Users
CATALYST_TABLE_TICKETS=Tickets
```

Zoho Books contacts are created through the Catalyst connection named `books` by default:

```env
ZOHO_BOOKS_CONNECTION_LINK_NAME=books
ZOHO_ORGANIZATION_ID=
```
