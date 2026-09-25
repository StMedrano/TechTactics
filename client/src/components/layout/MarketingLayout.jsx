import { Link } from 'react-router-dom'
import { useState } from 'react'
import { assetPath } from '../../utils/assets'
import { scrollToSection } from '../../utils/scrollToSection'

const inquiryHref =
  'mailto:customercare@mytechtactics.com?subject=TechTactics%20Website%20Project%20Inquiry'

export default function MarketingLayout({ children }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="marketing-shell">
      <header className="marketing-header">
        <div className="container nav-row">
          <Link className="brand" to="/">
            <img src={assetPath('assets/techtactics-logo.png')} alt="TechTactics" />
          </Link>

          <nav className="desktop-nav">
            <a href="#services" onClick={scrollToSection('services')}>Services</a>
            <a href="#packages" onClick={scrollToSection('packages')}>Packages</a>
            <a href="#process" onClick={scrollToSection('process')}>Our Process</a>
            <a href="#reviews" onClick={scrollToSection('reviews')}>Work</a>
            <a href="#contact" onClick={scrollToSection('contact')}>Contact</a>
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
            <a href="#services" onClick={scrollToSection('services', () => setOpen(false))}>Services</a>
            <a href="#packages" onClick={scrollToSection('packages', () => setOpen(false))}>Packages</a>
            <a href="#process" onClick={scrollToSection('process', () => setOpen(false))}>Our Process</a>
            <a href="#reviews" onClick={scrollToSection('reviews', () => setOpen(false))}>Work</a>
            <a href="#contact" onClick={scrollToSection('contact', () => setOpen(false))}>Contact</a>
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
            <a href="#services" onClick={scrollToSection('services')}>Services</a>
            <a href="#packages" onClick={scrollToSection('packages')}>Packages</a>
            <a href="#contact" onClick={scrollToSection('contact')}>Contact</a>
            <Link to="/terms">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
