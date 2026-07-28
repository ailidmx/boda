import { useTranslation } from "react-i18next";

const LANGUAGES = [
  { code: "fr", flag: "🇫🇷" },
  { code: "es", flag: "🇪🇸" },
  { code: "en", flag: "🇬🇧" },
];

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  return (
    <div className="lang-row" aria-label={t("language.switcher")}>
      {LANGUAGES.map(({ code, flag }) => {
        const active = i18n.resolvedLanguage === code;
        return (
          <button
            type="button"
            key={code}
            className={`lang-btn ${active ? "is-active" : ""}`}
            onClick={() => i18n.changeLanguage(code)}
          >
            <span aria-hidden="true">{flag}</span> {t(`language.${code}`)}
          </button>
        );
      })}
    </div>
  );
}
