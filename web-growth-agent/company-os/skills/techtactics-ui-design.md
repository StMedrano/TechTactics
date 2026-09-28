# TechTactics UI Design

Skill name: `techtactics-ui-design`

## Goal

Create purpose-built, accessible, responsive, conversion-focused interfaces without generic AI design patterns or fabricated business information.

## Required Inputs

Before designing, gather:

- verified business name
- verified business category when known
- verified market or location when known
- verified contact details
- verified website audit evidence
- approved demo copy inputs
- current brand assets when available

Unknown information must remain unknown.

## Surface Routing

### Persuade

Use for:

- marketing websites
- service websites
- landing pages
- pricing pages
- local-business websites

Priorities:

- clear value proposition
- strong CTA hierarchy
- customer trust
- local conversion paths
- useful service presentation
- readable copy
- purposeful visual hierarchy

### Operate

Use for:

- dashboards
- portals
- SaaS applications
- administrative interfaces
- CRM workflows
- settings
- forms

Priorities:

- scanability
- task completion
- realistic workflow states
- calm information density
- role boundaries
- keyboard accessibility
- useful empty, loading, error, and success states

### Read

Use for:

- documentation
- reports
- guides
- knowledge bases
- long-form content

Priorities:

- comprehension
- semantic hierarchy
- readable line length
- navigation
- findability
- content structure

### Experience

Use for:

- portfolios
- interactive demos
- showcases
- visual stories
- presentation experiences

Priorities:

- expressive visual direction
- purposeful interaction
- spatial continuity
- usability
- reduced-motion support

## Brand and Context Recovery

Before styling:

1. Determine the surface type.
2. Identify the intended audience.
3. Review verified business information.
4. Review existing brand assets if provided.
5. Determine content density.
6. Determine accessibility needs.
7. Establish information architecture before decoration.

For TechTactics-owned interfaces:

- existing TechTactics assets are authoritative
- preserve the tagline exactly when applicable:
  `SMART SOLUTIONS. SECURE CONNECTIONS.`

For client previews:

- never imply TechTactics branding belongs to the prospect
- never present the concept as an official client website

## Information Architecture

Design content structure before visual decoration.

A local-business website should normally answer:

1. Who is this business?
2. What does it provide?
3. Why should a customer continue reading?
4. How can the customer contact the business?
5. What verified information supports trust?

Do not add sections simply to make the page longer.

## Design System Foundation

Establish semantic tokens for:

- colors
- typography
- spacing
- radii
- elevation
- breakpoints
- grid
- icons
- focus treatment
- motion treatment
- component states

Avoid random one-off styling.

## Local Business Website Rules

For local-business concepts:

- make the business purpose understandable quickly
- make contacting the business obvious
- keep CTA wording direct
- optimize for mobile and phone use
- make services easy to scan
- use verified contact/location facts only
- avoid filler sections that do not improve comprehension or conversion

## Component States

Interactive components should account for:

- default
- hover
- active
- focus
- disabled
- loading
- empty
- error
- success

Use semantic HTML before reconstructing native behavior with ARIA.

Forms must use visible labels.

## Emil Interaction Craft

Motion must support:

- hierarchy
- feedback
- state changes
- spatial continuity
- explanation

Prefer:

- transform
- opacity
- short transitions
- ease-out entering/exiting behavior
- immediate press feedback

Avoid:

- scale-from-zero entrances
- decorative animation without purpose
- animation that slows frequent actions
- excessive motion

Respect `prefers-reduced-motion`.

## Accessibility Floor

Target WCAG 2.2 AA.

Require:

- sufficient contrast
- keyboard reachability
- logical focus order
- visible focus indicators
- semantic headings
- accessible names for controls
- meaningful image alternatives
- errors not communicated by color alone
- usable touch targets
- support for 200% zoom
- reduced-motion support
- responsive layouts

## Responsive Rules

Every design must behave intentionally on:

- desktop
- tablet
- mobile

Do not merely shrink desktop columns.

Mobile layouts must preserve:

- readable typography
- clear content order
- usable CTAs
- accessible touch targets
- useful navigation

## Content Integrity

Never fabricate or invent:

- services
- testimonials
- review counts
- ratings
- awards
- certifications
- logos
- employees
- owners
- customer counts
- company history
- business metrics
- addresses
- URLs

If service details are unknown, use clearly generic category-level wording.

Client concept previews must never imply that the concept is the client's official website.

## Anti-Generic Design Rules

Avoid defaulting to:

- AI-purple gradients
- mesh gradients without purpose
- glassmorphism everywhere
- three identical generic feature cards
- excessive rounded containers
- oversized empty whitespace
- tiny interface text
- decorative charts without a data story
- arbitrary gradients
- identical layouts across unrelated businesses

The interface should look purpose-built for the business and surface type.

## Marketing Website Rules

For persuasive surfaces:

- keep the hero concise
- establish a clear primary CTA
- avoid multiple CTAs with identical intent
- vary section composition when useful
- prioritize trust and comprehension
- avoid fabricated metrics or customer evidence
- define mobile navigation explicitly

## Dashboard and Portal Rules

For operational surfaces:

- every KPI must answer a real question
- use tables only when tabular data improves comprehension
- align numerical values consistently
- use color meaningfully
- provide useful empty states
- preserve permission boundaries
- avoid decorative dashboard cards

## Final Quality Gate

Before handoff verify:

- hierarchy
- focal point
- typography
- spacing
- alignment
- contrast
- responsive behavior
- mobile readability
- focus states
- accessibility
- realistic content wrapping
- reduced motion
- empty/error/loading states where relevant
- consistency
- whether the interface looks purpose-built rather than generic

## Failure Handling

If verified information is missing, do not invent it.

If this skill cannot be loaded, Designer generation must stop with a configuration error.

Do not silently continue with an ungoverned design.

## Required Output

The Designer must output only the approved structured `WebsiteDesignSpec`.

The Designer must not output executable:

- HTML
- CSS
- JavaScript
- shell commands
- filesystem paths
- credentials
- secrets
- arbitrary URLs

for direct execution.
