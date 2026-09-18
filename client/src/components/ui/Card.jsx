export default function Card({ title, subtitle, children, action }) {
  return (
    <section className="card">
      {(title || subtitle || action) && (
        <div className="card-header">
          <div>
            {title && <h3>{title}</h3>}
            {subtitle && <p>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}
