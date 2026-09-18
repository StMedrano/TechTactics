import { Link } from 'react-router-dom'
import { useState } from 'react'
import { assetPath } from '../../utils/assets'
import { scrollToSection } from '../../utils/scrollToSection'

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
            <a href="#solutions" onClick={scrollToSection('solutions')}>Solutions</a>
            <a href="#process" onClick={scrollToSection('process')}>Our Process</a>
            <a href="#reviews" onClick={scrollToSection('reviews')}>Reviews</a>
            <a href="#contact" onClick={scrollToSection('contact')}>Contact</a>
            <Link to="/terms">Terms</Link>
          </nav>

          <div className="header-actions">
            <Link className="btn btn-primary" to="/login">Portal Login</Link>
            <button className="menu-button" type="button" onClick={() => setOpen((value) => !value)}>
              Menu
            </button>
          </div>
        </div>

        {open && (
          <div className="mobile-drawer">
            <a href="#services" onClick={scrollToSection('services', () => setOpen(false))}>Services</a>
            <a href="#solutions" onClick={scrollToSection('solutions', () => setOpen(false))}>Solutions</a>
            <a href="#process" onClick={scrollToSection('process', () => setOpen(false))}>Our Process</a>
            <a href="#reviews" onClick={scrollToSection('reviews', () => setOpen(false))}>Reviews</a>
            <a href="#contact" onClick={scrollToSection('contact', () => setOpen(false))}>Contact</a>
            <Link to="/terms" onClick={() => setOpen(false)}>Terms</Link>
            <Link to="/login" onClick={() => setOpen(false)}>Portal Login</Link>
          </div>
        )}
      </header>

      <main>{children}</main>

      <footer className="marketing-footer">
        <div className="container footer-row">
          <div>(c) 2026 TechTactics - SMART SOLUTIONS. SECURE CONNECTIONS.</div>
          <div className="footer-links">
            <a href="#services" onClick={scrollToSection('services')}>Services</a>
            <a href="#contact" onClick={scrollToSection('contact')}>Contact</a>
            <Link to="/terms">Terms of Service</Link>
            <Link to="/login">Portal Login</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
