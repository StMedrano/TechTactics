import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import MarketingLayout from '../../components/layout/MarketingLayout'
import { marketingData } from '../../data/mockData'
import { assetPath } from '../../utils/assets'
import { scrollToSection } from '../../utils/scrollToSection'
import { publicService } from '../../services/publicService'

export default function MarketingPage() {
  const [reviews, setReviews] = useState([])

  useEffect(() => {
    publicService
      .getPublishedReviews()
      .then((payload) => {
        setReviews(Array.isArray(payload) ? payload : [])
      })
      .catch(() => {
        setReviews([])
      })
  }, [])

  return (
    <MarketingLayout>
      <section className="hero-section">
        <video autoPlay muted loop playsInline poster={assetPath('assets/hero-smarthome-poster.png')}>
          <source src={assetPath('assets/hero-smarthome.mp4')} type="video/mp4" />
        </video>
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
              <a className="btn btn-primary" href="#contact" onClick={scrollToSection('contact')}>Schedule a Consultation</a>
              <a className="btn btn-secondary" href="#services" onClick={scrollToSection('services')}>Explore Services</a>
            </div>
            <div className="tag-row">
              <span>Alarm Systems</span>
              <span>Smart Thermostats</span>
              <span>Whole-Home Audio</span>
              <span>Smart Switches</span>
              <span>Wi-Fi / Networking</span>
            </div>
          </div>

          <div className="hero-panel">
            <h3>Need service?</h3>
            <p>Request help, review quotes, schedule work, and pay invoices from your secure customer portal.</p>
            <div className="stack gap-sm">
              <Link className="btn btn-primary" to="/login">Portal Login</Link>
              <Link className="btn btn-secondary" to="/login?mode=register">Create Account</Link>
            </div>
          </div>
        </div>
      </section>

      <section id="services" className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <h2>Services</h2>
              <p>Installations, upgrades, repairs, and ongoing support.</p>
            </div>
            <a className="btn btn-secondary" href="#contact" onClick={scrollToSection('contact')}>Get a Quote</a>
          </div>
          <div className="grid grid-4">
            {marketingData.services.map((item) => (
              <article className="service-card" key={item.title}>
                <img src={item.image} alt={item.title} />
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="solutions" className="section alt-section">
        <div className="container">
          <h2>Solutions that scale</h2>
          <p className="section-copy">From a single device install to full-home automation.</p>
          <div className="grid grid-4">
            {[
              ['New Install', 'Plan, install, label, test, and walk-through.'],
              ['Repair / Troubleshoot', 'Dead zones, offline devices, wiring issues, camera alignment, and more.'],
              ['Upgrade', 'Modernize older setups without ripping everything out.'],
              ['Ongoing Support', 'Help when you need it: updates, tuning, and device changes.'],
            ].map(([title, text]) => (
              <div className="info-card" key={title}>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="process" className="section">
        <div className="container">
          <h2>Our Process</h2>
          <div className="grid grid-3">
            {[
              ['1) Consult', 'We learn your goals, devices, space, and budget.'],
              ['2) Design', 'We recommend equipment and a clean install plan.'],
              ['3) Install & Support', 'We install, test, train, and stay available for support.'],
            ].map(([title, text]) => (
              <div className="info-card" key={title}>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="reviews" className="section alt-section">
        <div className="container">
          <h2>Reviews</h2>
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
              <p>Customer reviews will appear here soon.</p>
            </div>
          )}
        </div>
      </section>

      <section id="contact" className="section">
        <div className="container">
          <div className="cta-panel">
            <div>
              <h2>Schedule a consultation</h2>
              <p>Ready to upgrade your home? Use the portal to request service, or contact us for a quote.</p>
            </div>
            <div className="stack gap-sm">
              <Link className="btn btn-primary" to="/login">Portal Login</Link>
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
