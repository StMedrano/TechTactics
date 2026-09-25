import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { assetPath } from '../../utils/assets'
import { scrollToSection } from '../../utils/scrollToSection'

const inquiryHref =
  'mailto:customercare@mytechtactics.com?subject=TechTactics%20Website%20Project%20Inquiry'

export default function MarketingLayout({ children }) {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const goToSection = (sectionId, onDone) => (event) => {
    if (location.pathname === '/') {
      scrollToSection(sectionId, onDone)(event)
      return
    }
    event.preventDefault()
    navigate('/')
    window.setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      if (typeof onDone === 'function') onDone()
    }, 50)
  }

  return (
    <div className="marketing-shell">
      <header className="marketing-header">
        <div className="container nav-row">
          <Link className="brand" to="/">
            <img src={assetPath('assets/techtactics-logo.png')} alt="TechTactics" />
          </Link>

          <nav className="desktop-nav">
            <a href="#services" onClick={goToSection('services')}>Services</a>
            <a href="#packages" onClick={goToSection('packages')}>Packages</a>
            <a href="#process" onClick={goToSection('process')}>Our Process</a>
            <a href="#reviews" onClick={goToSection('reviews')}>Work</a>
            <a href="#contact" onClick={goToSection('contact')}>Contact</a>
            <Link to="/terms">Terms</Link>
          </nav>

          <div className="header-actions">
            <a className="btn btn-primary" href={inquiryHref}>Start a Project</a>
            <button className="menu-button" type="button" onClick={() => setOpen((value) => !value)}>
              Menu
            </button>
          </div>
        </div>

        {open && (
          <div className="mobile-drawer">
            <a href="#services" onClick={goToSection('services', () => setOpen(false))}>Services</a>
            <a href="#packages" onClick={goToSection('packages', () => setOpen(false))}>Packages</a>
            <a href="#process" onClick={goToSection('process', () => setOpen(false))}>Our Process</a>
            <a href="#reviews" onClick={goToSection('reviews', () => setOpen(false))}>Work</a>
            <a href="#contact" onClick={goToSection('contact', () => setOpen(false))}>Contact</a>
            <Link to="/terms" onClick={() => setOpen(false)}>Terms</Link>
            <a href={inquiryHref} onClick={() => setOpen(false)}>Start a Project</a>
          </div>
        )}
      </header>

      <main>{children}</main>

      <footer className="marketing-footer">
        <div className="container footer-row">
          <div>(c) 2026 TechTactics Websites - SMART SOLUTIONS. SECURE CONNECTIONS.</div>
          <div className="footer-links">
            <a href="#services" onClick={goToSection('services')}>Services</a>
            <a href="#packages" onClick={goToSection('packages')}>Packages</a>
            <a href="#contact" onClick={goToSection('contact')}>Contact</a>
            <Link to="/terms">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
