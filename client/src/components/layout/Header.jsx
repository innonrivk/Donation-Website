import './Header.css';
import { Link } from 'react-router-dom';

export default function Header() {
  return (
    <header className="header">
      <div className="header__container container">
        <Link to="/" className="header__logo">
          <img src="/omp-logo.png" alt="OpenmindProjects Logo" className="header__logo-img" style={{ height: '40px', width: 'auto' }} />
          <span className="header__logo-text">
            <span className="gradient-text">OMP</span>
            <span className="header__logo-subtitle">OpenmindProjects</span>
          </span>
        </Link>
        <nav className="header__nav">
          <a href="#donate" className="header__nav-link">Donate</a>
        </nav>
      </div>
    </header>
  );
}
