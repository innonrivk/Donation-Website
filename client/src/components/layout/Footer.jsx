import { useContent } from '../../context/ContentContext';
import { CONTENT_KEYS } from '../../lib/contentKeys';
import { formatContentInline } from '../../utils/formatContent';
import './Footer.css';

export default function Footer() {
  const brandName = useContent(CONTENT_KEYS.FOOTER_BRAND_NAME, '**OpenmindProjects**');
  const brandDesc = useContent(CONTENT_KEYS.FOOTER_BRAND_DESC, 'Building stronger communities through sustainable development initiatives.');
  const tagline = useContent(CONTENT_KEYS.FOOTER_TAGLINE, 'Every donation makes a difference 💜');

  const plainBrandName = brandName.replace(/[*_$]/g, '');

  return (
    <footer className="footer">
      <div className="footer__container container">
        <div className="footer__brand">
          <span className="footer__brand-name">
            {formatContentInline(brandName)}
          </span>
          <p className="footer__brand-desc">
            {formatContentInline(brandDesc)}
          </p>
        </div>
        <div className="footer__bottom">
          <p className="footer__copyright">
            © {new Date().getFullYear()} {plainBrandName}. All rights reserved.
          </p>
          <p className="footer__tagline">
            {formatContentInline(tagline)}
          </p>
        </div>
      </div>
    </footer>
  );
}
