import { useEffect } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { useTranslation } from "react-i18next";
import { eventData } from "./eventData";
import LanguageSwitcher from "./components/LanguageSwitcher";

function useDocumentLanguage() {
  const { i18n } = useTranslation();

  useEffect(() => {
    document.documentElement.lang = i18n.resolvedLanguage || "fr";
  }, [i18n.resolvedLanguage]);
}

function Shell({ children }) {
  const { t } = useTranslation();
  const location = useLocation();

  let themeClass = "theme-portal";
  if (location.pathname.startsWith("/planning")) {
    themeClass = "theme-planning";
  }
  if (location.pathname.startsWith("/guests")) {
    themeClass = "theme-guests";
  }

  return (
    <div className={`shell ${themeClass}`}>
      <header className="topbar">
        <div className="brand">{t("brand")}</div>
        <nav className="nav-links">
          <NavLink to="/portal">{t("nav.portal")}</NavLink>
          <NavLink to="/planning">{t("nav.planning")}</NavLink>
          <NavLink to="/guests">{t("nav.guests")}</NavLink>
        </nav>
        <LanguageSwitcher />
      </header>
      {children}
    </div>
  );
}

function PortalPage() {
  const { t } = useTranslation();
  const dnaModes = t("dna.modes", { returnObjects: true });
  const modes = Array.isArray(dnaModes) ? dnaModes : [];

  return (
    <div className="page page-portal">
      <section className="hero reveal">
        <p className="eyebrow">{t("portal.kicker")}</p>
        <h1>{t("portal.title")}</h1>
        <p>{t("portal.subtitle")}</p>
        <div className="stack">
          <Link className="btn primary" to="/planning">
            {t("portal.primaryCta")}
          </Link>
          <Link className="btn" to="/guests">
            {t("portal.secondaryCta")}
          </Link>
        </div>
      </section>

      <section className="grid two reveal delayed-1">
        <article className="card">
          <h3>{t("portal.cardOpsTitle")}</h3>
          <p>{t("portal.cardOpsBody")}</p>
        </article>
        <article className="card">
          <h3>{t("portal.cardGuestTitle")}</h3>
          <p>{t("portal.cardGuestBody")}</p>
        </article>
      </section>

      <section className="card reveal delayed-2 dna-block">
        <p className="eyebrow">{t("dna.kicker")}</p>
        <h3>{t("dna.title")}</h3>
        <p>{t("dna.subtitle")}</p>
        <div className="grid two dna-grid">
          {modes.map((mode) => (
            <article className="dna-card" key={mode.code || mode.title}>
              <span className="dna-chip">{mode.code}</span>
              <h4>{mode.title}</h4>
              <p>{mode.body}</p>
              <p className="note">{mode.decor}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function PlanningPage() {
  const { t } = useTranslation();
  const m = eventData.metrics;
  const fridayItems = t("planning.fridayItems", { returnObjects: true });
  const saturdayFoodItems = t("planning.saturdayFoodItems", {
    returnObjects: true,
  });
  const saturdayMusicItems = t("planning.saturdayMusicItems", {
    returnObjects: true,
  });

  const friday = Array.isArray(fridayItems) ? fridayItems : [];
  const satFood = Array.isArray(saturdayFoodItems) ? saturdayFoodItems : [];
  const satMusic = Array.isArray(saturdayMusicItems) ? saturdayMusicItems : [];
  const planningProgramItems = t("planning.programTimeline", {
    returnObjects: true,
  });
  const planningProgram = Array.isArray(planningProgramItems)
    ? planningProgramItems
    : [];
  const planningCabinRulesItems = t("planning.cabinRules", {
    returnObjects: true,
  });
  const planningCabinRules = Array.isArray(planningCabinRulesItems)
    ? planningCabinRulesItems
    : [];
  const planningCabinsItems = t("planning.cabins", {
    returnObjects: true,
  });
  const planningCabins = Array.isArray(planningCabinsItems)
    ? planningCabinsItems
    : [];

  return (
    <div className="page page-planning">
      <section className="hero reveal">
        <p className="eyebrow">{t("planning.kicker")}</p>
        <h1>{t("planning.title")}</h1>
        <p>
          <strong>{t("labels.venue")}:</strong> {eventData.venue} |{" "}
          <strong>{t("labels.weekend")}:</strong> {eventData.weekend} |{" "}
          <strong>{t("labels.musicEnd")}:</strong> {eventData.musicEnd}
        </p>
      </section>

      <section className="grid four reveal delayed-1">
        <article className="metric-card">
          <span>{t("planning.metrics.confirmed")}</span>
          <strong>{m.confirmed}</strong>
        </article>
        <article className="metric-card">
          <span>{t("planning.metrics.lodgingNeeded")}</span>
          <strong>{m.lodgingNeeded}</strong>
        </article>
        <article className="metric-card">
          <span>{t("planning.metrics.selectedCapacity")}</span>
          <strong>{m.selectedCapacity}</strong>
        </article>
        <article className="metric-card">
          <span>{t("planning.metrics.freeSpots")}</span>
          <strong>{m.freeSpots}</strong>
        </article>
      </section>

      <section className="grid two reveal delayed-2">
        <article className="card">
          <h3>{t("planning.fridayTitle")}</h3>
          <ul>
            {friday.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <article className="card">
          <h3>{t("planning.saturdayFoodTitle")}</h3>
          <ul>
            {satFood.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="card reveal delayed-3">
        <h3>{t("planning.saturdayMusicTitle")}</h3>
        <ul>
          {satMusic.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="card reveal delayed-3 program-card">
        <h3>{t("planning.programTitle")}</h3>
        <p className="note">{t("planning.programStatus")}</p>
        <ul className="timeline-list">
          {planningProgram.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="card reveal delayed-3 cabins-card">
        <h3>{t("planning.cabinsTitle")}</h3>
        <p className="note">{t("planning.cabinsSummary")}</p>
        <ul className="timeline-list">
          {planningCabinRules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
        <div className="grid two cabins-grid">
          {planningCabins.map((cabin) => (
            <article className="cabin-card" key={cabin.name}>
              <h4>{cabin.name}</h4>
              <p className="note">
                {cabin.capacity} | {cabin.price}
              </p>
              {cabin.familyRate ? <p className="note">{cabin.familyRate}</p> : null}
              <ul>
                {Array.isArray(cabin.rooms)
                  ? cabin.rooms.map((room) => <li key={room}>{room}</li>)
                  : null}
              </ul>
              {cabin.extraRule ? <p className="note">{cabin.extraRule}</p> : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function GuestsPage() {
  const { t } = useTranslation();
  const dnaPhrases = t("dna.phrases", { returnObjects: true });
  const phrases = Array.isArray(dnaPhrases) ? dnaPhrases : [];
  const guestProgramItems = t("guests.programTimeline", {
    returnObjects: true,
  });
  const guestProgram = Array.isArray(guestProgramItems)
    ? guestProgramItems
    : [];
  const guestCabinRulesItems = t("guests.cabinRules", {
    returnObjects: true,
  });
  const guestCabinRules = Array.isArray(guestCabinRulesItems)
    ? guestCabinRulesItems
    : [];
  const guestCabinsItems = t("guests.cabins", {
    returnObjects: true,
  });
  const guestCabins = Array.isArray(guestCabinsItems) ? guestCabinsItems : [];

  return (
    <div className="page page-guests">
      <section className="hero reveal">
        <p className="eyebrow">{t("guests.kicker")}</p>
        <h1>{eventData.couple}</h1>
        <p>
          <strong>{t("labels.venue")}:</strong> {eventData.venue}
        </p>
      </section>

      <section className="grid two reveal delayed-1">
        <article className="card">
          <h3>{t("guests.awayTitle")}</h3>
          <p>{t("guests.awayBody")}</p>
        </article>
        <article className="card">
          <h3>{t("guests.favoritesTitle")}</h3>
          <p>{t("guests.favoritesBody")}</p>
        </article>
      </section>

      <section className="grid two reveal delayed-2">
        <article className="card">
          <h3>{t("guests.guestPaysTitle")}</h3>
          <ul>
            {t("guests.guestPays", { returnObjects: true }).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <article className="card">
          <h3>{t("guests.coupleCoversTitle")}</h3>
          <ul>
            {t("guests.coupleCovers", { returnObjects: true }).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="card reveal delayed-3">
        <h3>{t("guests.benefitsTitle")}</h3>
        <ul>
          {t("guests.benefits", { returnObjects: true }).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="note">{t("guests.benefitsNote")}</p>
      </section>

      <section className="card reveal delayed-3 program-card">
        <h3>{t("guests.programTitle")}</h3>
        <p className="note">{t("guests.programNote")}</p>
        <ul className="timeline-list">
          {guestProgram.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="card reveal delayed-3 cabins-card">
        <h3>{t("guests.cabinsTitle")}</h3>
        <p className="note">{t("guests.cabinsSummary")}</p>
        <ul className="timeline-list">
          {guestCabinRules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
        <div className="grid two cabins-grid">
          {guestCabins.map((cabin) => (
            <article className="cabin-card" key={cabin.name}>
              <h4>{cabin.name}</h4>
              <p className="note">
                {cabin.capacity} | {cabin.price}
              </p>
              {cabin.familyRate ? <p className="note">{cabin.familyRate}</p> : null}
              <ul>
                {Array.isArray(cabin.rooms)
                  ? cabin.rooms.map((room) => <li key={room}>{room}</li>)
                  : null}
              </ul>
              {cabin.extraRule ? <p className="note">{cabin.extraRule}</p> : null}
            </article>
          ))}
        </div>
      </section>

      <section className="card reveal delayed-3 dna-phrases">
        <h3>{t("dna.signatureTitle")}</h3>
        <div className="tag-row">
          {phrases.map((phrase) => (
            <span className="tag" key={phrase}>
              {phrase}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function App() {
  useDocumentLanguage();

  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Navigate to="/portal" replace />} />
        <Route path="/portal" element={<PortalPage />} />
        <Route path="/planning" element={<PlanningPage />} />
        <Route path="/guests" element={<GuestsPage />} />
      </Routes>
    </Shell>
  );
}
