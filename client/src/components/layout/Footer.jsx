import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__container container">
        <div className="footer__brand">
          <span className="gradient-text footer__brand-name">OpenmindProjects</span>
          <p className="footer__brand-desc">
            Building stronger communities through sustainable development initiatives.
          </p>
        </div>
        <div className="footer__bottom">
          <p className="footer__copyright">
            © {new Date().getFullYear()} OpenmindProjects. All rights reserved.
          </p>
          <p className="footer__tagline">
            Every donation makes a difference 💜
          </p>
        </div>
      </div>
    </footer>
  );
}
