import MarketingLayout from '../../components/layout/MarketingLayout'

const sections = [
  {
    title: 'Project Scope',
    body:
      'Website work is based on the pages, features, integrations, content responsibilities, revision limits, and deliverables listed in the approved proposal or statement of work.',
  },
  {
    title: 'Client Content And Access',
    body:
      'Clients are responsible for providing requested logos, copy, images, account access, domain or DNS access, and approvals needed to complete the project. Delays in client materials or access may move the launch date.',
  },
  {
    title: 'Domains, Hosting, And Third-Party Services',
    body:
      'Domains, hosting, email, payment processors, booking systems, analytics tools, plugins, and other third-party services may have separate fees and terms. TechTactics will identify these items when they are part of the project.',
  },
  {
    title: 'Approvals And Revisions',
    body:
      'Milestones may require client approval before work moves forward. Revisions outside the agreed scope may require a change request, additional fee, or revised delivery schedule.',
  },
  {
    title: 'Invoices And Payment',
    body:
      'Deposits, milestone payments, final balances, subscriptions, maintenance, or hosting charges will be listed in the proposal or invoice. Final files, launch, or ownership transfer may depend on payment of amounts due.',
  },
  {
    title: 'Launch, Maintenance, And Support',
    body:
      'After launch, maintenance, content updates, monitoring, backups, security work, SEO work, and ongoing support are included only when listed in the selected package or recurring service agreement.',
  },
  {
    title: 'Client Responsibilities',
    body:
      'Clients are responsible for the accuracy and legal right to use content they provide, including text, images, trademarks, product information, privacy disclosures, and claims made on the website.',
  },
  {
    title: 'Future TechTactics Services',
    body:
      'The current public offering focuses on website design, development, and related digital services. Other TechTactics service lines may be offered separately under their own scope and terms in the future.',
  },
]

export default function TermsPage() {
  return (
    <MarketingLayout>
      <section className="section">
        <div className="container stack-lg">
          <div className="section-head">
            <div>
              <h2>Website Services Terms</h2>
              <p>Plain-language project terms for TechTactics website design, development, integrations, and support.</p>
            </div>
          </div>

          <div className="grid grid-2">
            {sections.map((section) => (
              <article className="info-card" key={section.title}>
                <h3>{section.title}</h3>
                <p>{section.body}</p>
              </article>
            ))}
          </div>

          <div className="info-card">
            <h3>Important Note</h3>
            <p>
              This page is a practical operating draft and is not legal advice. Before relying on it as final customer
              terms, TechTactics should have the terms reviewed for the jurisdictions, payment model, subscriptions, data
              handling, and services it actually offers.
            </p>
          </div>
        </div>
      </section>
    </MarketingLayout>
  )
}
