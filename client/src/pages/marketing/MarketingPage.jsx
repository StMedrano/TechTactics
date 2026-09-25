import { useEffect, useState } from 'react'
import MarketingLayout from '../../components/layout/MarketingLayout'
import { marketingData } from '../../data/mockData'
import { scrollToSection } from '../../utils/scrollToSection'
import { publicService } from '../../services/publicService'

const inquiryHref =
  'mailto:customercare@mytechtactics.com?subject=TechTactics%20Website%20Project%20Inquiry&body=Business%20name%3A%0ACurrent%20website%20(if%20any)%3A%0AWhat%20do%20you%20want%20the%20website%20to%20help%20you%20do%3F%0A'

export default function MarketingPage() {
  const [reviews, setReviews] = useState([])

  useEffect(() => {
    publicService
      .getPublishedReviews()
      .then((payload) => {
        const published = Array.isArray(payload) ? payload : []
        const websiteReviews = published.filter((review) => {
          const context = [review.division, review.category, review.serviceCategory, review.serviceTitle]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
          return /website|web design|web development/.test(context)
        })
        setReviews(websiteReviews)
      })
      .catch(() => {
        setReviews([])
      })
  }, [])

  return (
    <MarketingLayout>
      <section className="hero-section website-hero">
        <div className="hero-overlay" />
        <div className="container hero-grid">
          <div>
            <div className="kicker">{marketingData.hero.kicker}</div>
            <h1>
              {marketingData.hero.title[0]}
              <br />
              {marketingData.hero.title[1]}
            </h1>
            <p>{marketingData.hero.text}</p>
            <div className="hero-actions">
              <a className="btn btn-primary" href={inquiryHref}>Request a Website Review</a>
              <a className="btn btn-secondary" href="#packages" onClick={scrollToSection('packages')}>View Website Packages</a>
            </div>
            <div className="tag-row">
              <span>Mobile-first</span>
              <span>Local SEO foundations</span>
              <span>Lead capture</span>
              <span>Booking & forms</span>
              <span>Business integrations</span>
            </div>
          </div>

          <div className="hero-panel">
            <div className="kicker">Website Opportunity Review</div>
            <h3>Not sure what your business website needs?</h3>
            <p>
              Send us your business name and current website, if you have one. We will identify the biggest opportunities
              around mobile usability, messaging, lead capture, local visibility, and conversion.
            </p>
            <div className="stack gap-sm">
              <a className="btn btn-primary" href={inquiryHref}>Start My Review</a>
              <a className="btn btn-secondary" href="tel:+12252109890">Call 225-210-9890</a>
            </div>
          </div>
        </div>
      </section>

      <section id="services" className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <h2>Website Services</h2>
              <p>Focused on helping local businesses look credible, get found, and turn visitors into customers.</p>
            </div>
            <a className="btn btn-secondary" href={inquiryHref}>Start a Project</a>
          </div>

          <div className="grid grid-4">
            {marketingData.services.map((item) => (
              <article className="info-card" key={item.title}>
                <div className="service-eyebrow">{item.eyebrow}</div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="packages" className="section alt-section">
        <div className="container">
          <div className="section-head">
            <div>
              <h2>Website Packages</h2>
              <p>Clear starting points that can be adjusted to fit the business.</p>
            </div>
          </div>

          <div className="grid grid-3">
            {marketingData.packages.map((pkg) => (
              <article className="info-card package-card" key={pkg.name}>
                <div className="kicker">{pkg.label}</div>
                <h3>{pkg.name}</h3>
                <p>{pkg.summary}</p>
                <ul className="clean-list">
                  {pkg.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <a className="btn btn-secondary w-full" href={inquiryHref}>Ask About {pkg.name}</a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="solutions" className="section">
        <div className="container">
          <h2>Common problems we solve</h2>
          <p className="section-copy">
            A business does not need a complicated website. It needs the right website for the next customer.
          </p>
          <div className="grid grid-4">
            {marketingData.problems.map((item) => (
              <div className="info-card" key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="process" className="section alt-section">
        <div className="container">
          <h2>Our Process</h2>
          <div className="grid grid-3">
            {marketingData.process.map((step) => (
              <div className="info-card" key={step.title}>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="reviews" className="section">
        <div className="container">
          <h2>Client Feedback</h2>
          {reviews.length ? (
            <div className="grid grid-2">
              {reviews.map((review) => (
                <div className="info-card" key={review.id}>
                  <p>"{review.quote}"</p>
                  <small>- {review.customerName}</small>
                  <div className="sub-cell">{review.serviceTitle}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="info-card">
              <p>Website project case studies and client feedback will appear here as projects launch.</p>
            </div>
          )}
        </div>
      </section>

      <section id="contact" className="section alt-section">
        <div className="container">
          <div className="cta-panel">
            <div>
              <h2>Ready for a website that works harder for your business?</h2>
              <p>
                Tell us what you do, where you serve customers, and what you want the website to accomplish.
              </p>
            </div>
            <div className="stack gap-sm">
              <a className="btn btn-primary" href={inquiryHref}>Request a Website Review</a>
              <div className="contact-lines">
                <div>customercare@mytechtactics.com</div>
                <div>225-210-9890</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  )
}
