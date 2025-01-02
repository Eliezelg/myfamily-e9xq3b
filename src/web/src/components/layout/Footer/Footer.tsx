import React from 'react'; // v18.2.0
import { useTranslation } from 'react-i18next'; // v12.0.0
import {
  FooterContainer,
  FooterContent,
  FooterLink,
  LanguageSelector
} from './Footer.styles';
import { COLORS } from '../../styles/theme.styles';
import { bodyText } from '../../styles/typography.styles';

interface FooterProps {
  className?: string;
  testId?: string;
}

const Footer: React.FC<FooterProps> = ({ className, testId = 'footer' }) => {
  const { t, i18n } = useTranslation();

  // Supported languages based on geographic coverage
  const languages = [
    { code: 'en', name: 'English' },
    { code: 'he', name: 'עברית', rtl: true },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'es', name: 'Español' },
    { code: 'it', name: 'Italiano' },
    { code: 'ru', name: 'Русский' },
    { code: 'ar', name: 'العربية', rtl: true }
  ];

  const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    const selectedLang = event.target.value;
    const isRTL = languages.find(lang => lang.code === selectedLang)?.rtl || false;

    // Update language configuration
    i18n.changeLanguage(selectedLang);

    // Update document direction for RTL support
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = selectedLang;

    // Update font family based on language
    document.documentElement.style.fontFamily = isRTL ? 
      'Noto Sans Hebrew, sans-serif' : 
      'Roboto, sans-serif';

    // Store language preference
    localStorage.setItem('preferredLanguage', selectedLang);

    // Emit language change event for analytics
    window.dispatchEvent(new CustomEvent('languageChange', {
      detail: { language: selectedLang, isRTL }
    }));
  };

  return (
    <FooterContainer
      className={className}
      data-testid={testId}
      role="contentinfo"
      aria-label={t('footer.aria.label')}
    >
      <FooterContent>
        {/* Copyright section */}
        <div>
          <p style={{ color: COLORS.text.secondary }}>
            {t('footer.copyright', { year: new Date().getFullYear() })}
          </p>
        </div>

        {/* Language selector */}
        <LanguageSelector>
          <label
            htmlFor="language-select"
            style={{ color: COLORS.text.secondary }}
          >
            {t('footer.language.select')}:
          </label>
          <select
            id="language-select"
            value={i18n.language}
            onChange={handleLanguageChange}
            aria-label={t('footer.language.aria.label')}
          >
            {languages.map(({ code, name }) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </LanguageSelector>

        {/* Support links */}
        <nav aria-label={t('footer.navigation.aria.label')}>
          <FooterLink
            href="/support"
            target="_self"
            rel="noopener"
            aria-label={t('footer.links.support.aria.label')}
          >
            {t('footer.links.support')}
          </FooterLink>
          <FooterLink
            href="/privacy"
            target="_self"
            rel="noopener"
            aria-label={t('footer.links.privacy.aria.label')}
          >
            {t('footer.links.privacy')}
          </FooterLink>
          <FooterLink
            href="/terms"
            target="_self"
            rel="noopener"
            aria-label={t('footer.links.terms.aria.label')}
          >
            {t('footer.links.terms')}
          </FooterLink>
          <FooterLink
            href="/contact"
            target="_self"
            rel="noopener"
            aria-label={t('footer.links.contact.aria.label')}
          >
            {t('footer.links.contact')}
          </FooterLink>
        </nav>
      </FooterContent>
    </FooterContainer>
  );
};

export default Footer;