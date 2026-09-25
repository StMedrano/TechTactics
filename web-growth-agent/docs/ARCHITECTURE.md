# Architecture

## System loop
1. **Scout** calls Google Places Text Search using an explicit field mask.
2. **Store** deduplicates businesses using the provider place ID.
3. **Auditor** requests the business website and records deterministic evidence.
4. **Scorer** assigns points only to recorded evidence.
5. **Qualifier** promotes audited leads above the configured threshold.
6. **AI agent** creates a summary, outreach draft, proposal draft, and demo copy. If no OpenAI key exists, deterministic fallback assets keep the workflow testable.
7. **Site generator** writes a private static concept.
8. **Human approval** is required before the lead can enter the contacted stage.
9. **Dashboard/report** exposes the pipeline and projected build value.
10. Wins/losses can later feed category/market learning.

## Trust boundary
AI text is never considered audit evidence. The source-of-truth evidence is generated before the AI step and supplied to the model as a factual record.

## Persistence
V1 uses an intentionally simple JSON store so the workflow is portable. A production deployment can replace `LeadStore` with PostgreSQL/Supabase without changing the domain model.

## Future integrations
- CRM/contact history
- Gmail draft creation after human approval
- Client intake and contracts
- Hosted private demo environments
- Payment/invoice integration
- Closed-loop conversion analytics
