import MarketingLayout from '../../components/layout/MarketingLayout'

const sections = [
  {
    title: 'Service Scope',
    body:
      'TechTactics provides smart home, security, networking, audio/video, troubleshooting, and related support services described on this site and in customer quotes.',
  },
  {
    title: 'Scheduling And Access',
    body:
      'Customers are responsible for providing accurate site details, safe access to the property, and any required owner or business approval before installation or service begins.',
  },
  {
    title: 'Equipment And Compatibility',
    body:
      'Customer-supplied devices and existing wiring may affect scope, timing, and compatibility. Additional labor or replacement hardware may be required if field conditions differ from the original request.',
  },
  {
    title: 'Invoices And Recurring Services',
    body:
      'One-time work may be billed after approval or completion. Ongoing support, monitoring, or maintenance plans may recur monthly or by service term as listed in the portal or invoice.',
  },
  {
    title: 'Cancellations And Changes',
    body:
      'Project dates, requested equipment, and service scope may change based on availability, site readiness, or customer direction. Late cancellations may result in rescheduling or trip charges.',
  },
  {
    title: 'Warranty And Support',
    body:
      'TechTactics will stand behind completed workmanship within the service scope provided. Manufacturer warranties, software availability, and third-party cloud services remain subject to their own terms.',
  },
]

export default function TermsPage() {
  return (
    <MarketingLayout>
      <section className="section">
        <div className="container stack-lg">
          <div className="section-head">
            <div>
              <h2>Terms of Service</h2>
              <p>Plain-language service terms for TechTactics portal, installs, support, and recurring service plans.</p>
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
              This page is a practical draft for your hosted site and portal. For a final legal review, especially if
              you plan to offer monitoring, subscriptions, commercial installs, or financing, it should be reviewed by
              counsel in your state.
            </p>
          </div>
        </div>
      </section>
    </MarketingLayout>
  )
}
