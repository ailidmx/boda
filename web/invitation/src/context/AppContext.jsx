import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  browserLocalPersistence,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  setPersistence,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateEmail,
  updatePassword,
  verifyBeforeUpdateEmail,
} from "firebase/auth";

import { auth } from "../firebase.js";
import { content, SUPPORTED_LANGUAGES } from "../content.js";
import {
  AUTH_EMAIL_DOMAIN,
  getActiveGuests,
  getGuest,
} from "../guests.js";

import {
  getCustomContent,
  loadGroupCustomContent,
} from "../invitation-profile.js";
import {
  getGroupMembers,
  loadAllGuests,
  loadGuestProfiles,
  loadOwnGuestProfile,
  resolveGuestInvitationGroup,
  resolveIdentityCheckPassed,
} from "../guest-profiles.js";


import { loadAttendanceResponses } from "../guest-attendance.js";
import { loadRooms } from "../rooms.js";
import { loadCabins } from "../cabins.js";

const LANGUAGE_STORAGE_KEY = "boda-language";
const USERNAME_STORAGE_KEY = "boda-username";
const MUSIC_ENABLED_KEY = "boda-music-enabled";

const interfaceText = {
  es: {
    gateEyebrow: "Invitación privada",
    gateBody:
      "Escribe tu usuario o correo y la contraseña que compartimos contigo.",
    gateUsernameLabel: "Usuario o correo",
    gateUsernamePlaceholder: "Tu usuario o correo",

    gateLabel: "Contraseña",
    gateButton: "Entrar",
    gateWorking: "Abriendo…",
    gateError: "El usuario o la contraseña no son correctos.",

    gateNoProfile:
      "No encontramos un invitado con este usuario. Revisa que lo hayas escrito bien o escríbenos para ayudarte.",
    gateLost:
      "¿Perdiste tu usuario o contraseña? ¿No recibiste tu invitación? Escríbenos.",
    gateDisclosure:
      "Acepto que mi nombre y mi foto puedan mostrarse a otros invitados.",

    submitWorking: "Enviando…",
    submitSuccess: "¡Gracias! Recibimos tu respuesta.",
    submitError:
      "No pudimos enviar la respuesta. Revisa tu conexión e inténtalo de nuevo.",
    stepLabel: "Paso",
    next: "Siguiente",
    back: "Atrás",
    finish: "Terminar",
    langPrompt: {
      title: "¿Idioma preferido?",
      body: "Tu invitación estaba en {current}, pero detectamos que tu idioma preferido podría ser {preferred}. ¿La cambiamos a {preferred}?",
      keep: "Sí, cambiar a {preferred}",
      switch: "No, mantener {current}",
    },
  },

  fr: {
    gateEyebrow: "Invitation privée",
    gateBody:
      "Saisis ton identifiant ou e-mail et le mot de passe que nous t’avons envoyés.",
    gateUsernameLabel: "Identifiant ou e-mail",
    gateUsernamePlaceholder: "Ton identifiant ou e-mail",

    gateLabel: "Mot de passe",
    gateButton: "Entrer",
    gateWorking: "Ouverture…",
    gateError:
      "L’identifiant ou le mot de passe n’est pas correct. Vérifie-les ou demande-nous de te les renvoyer.",
    gateNoProfile:
      "Aucun invité ne correspond à cet identifiant. Vérifie-le ou écris-nous pour obtenir de l’aide.",
    gateLost:
      "Identifiant ou mot de passe perdu ? Écris-nous et nous te les renverrons.",
    gateDisclosure:
      "J’accepte que mon nom et ma photo puissent être affichés aux autres invités.",
    submitWorking: "Envoi…",
    submitSuccess: "Merci ! Nous avons bien reçu ta réponse.",
    submitError: "L’envoi a échoué. Vérifie ta connexion et réessaie.",
    stepLabel: "Étape",
    next: "Continuer",
    back: "Retour",
    finish: "Terminer",
    langPrompt: {
      title: "Langue préférée ?",
      body: "Ton navigateur est en {current}, mais nous pensons que ta langue préférée pourrait être {preferred}. On passe l'invitation en {preferred} ?",

      keep: "Oui, passer en {preferred}",
      switch: "Non, garder {current}",
    },
  },

  en: {
    gateEyebrow: "Private invitation",
    gateBody:
      "Enter your username or email and the password we shared with you.",
    gateUsernameLabel: "User name or email",
    gateUsernamePlaceholder: "Your user name or email",

    gateLabel: "Password",
    gateButton: "Enter",
    gateWorking: "Opening…",
    gateError:
      "The username or password is not correct. Check them or ask us to resend them.",
    gateNoProfile:
      "We could not find a guest with this username. Check it or message us for help.",
    gateLost:
      "Lost your username or password? Message us and we'll resend them.",
    gateDisclosure:
      "I agree that my name and photo may be shown to other guests.",
    submitWorking: "Sending…",
    submitSuccess: "Thank you! We received your response.",
    submitError:
      "We could not send your response. Check your connection and try again.",
    stepLabel: "Step",
    next: "Next",
    back: "Back",
    finish: "Finish",
    langPrompt: {
      title: "Preferred language?",
      body: "Your invitation was in {current}, but we think your preferred language might be {preferred}. Shall we switch it to {preferred}?",
      keep: "Yes, switch to {preferred}",
      switch: "No, keep {current}",
    },
  },
};

function normalizeLanguage(value) {
  return SUPPORTED_LANGUAGES.includes(value) ? value : "es";
}

function getInitialLanguage() {
  // The login page always defaults to Spanish. A stored language is only
  // trusted for a signed-in user (it is cleaned when we land on the login
  // page), so we never rely on browser detection here.
  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored) {
    console.log("[lang] using stored language:", stored);
    return normalizeLanguage(stored);
  }
  console.log("[lang] no stored language; defaulting to Spanish (es)");
  return "es";
}

// Human-readable language names used in the language-preference modal.
const LANG_NAMES = {
  es: "Español",
  fr: "Français",
  en: "English",
};

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [language, setLanguageState] = useState(getInitialLanguage);
  const [authState, setAuthState] = useState("loading");
  const [profile, setProfile] = useState(null);
  const [gateError, setGateError] = useState(null);
  // When set, the language-preference modal is shown after sign-in. It holds
  // the language the user was seeing (the login page, Spanish by default) and
  // the guest's preferred language (what we switched to in the background).
  const [langPrompt, setLangPrompt] = useState(null);

  // When true, the identity-check modal is shown. It auto-opens after sign-in
  // (once per session) for guests who have not yet acknowledged it, and can be
  // reopened from the user menu.
  const [identityPrompt, setIdentityPrompt] = useState(false);

  // Whether the hidden Spotify music player is enabled. Defaults to OFF so the
  // player never auto-starts or auto-plays. The guest can toggle it from the
  // user menu. Persisted in localStorage so the choice survives reloads.
  const [musicEnabled, setMusicEnabledState] = useState(
    () => window.localStorage.getItem(MUSIC_ENABLED_KEY) === "1",
  );

  // Avoid re-prompting on every auth state change within the same session.
  const langPromptShown = useRef(false);
  // Avoid re-opening the identity modal on every auth state change within the
  // same session (it is still reopenable manually from the user menu).
  const identityPromptShown = useRef(false);

  // Tracks the currently active language so the auth listener (which has empty
  // deps) can read the latest value without going stale.
  const languageRef = useRef(language);
  languageRef.current = language;

  useEffect(() => {
    document.documentElement.lang = language;
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }, [language]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // Landing on the login page means we have no trusted local data, so
        // clear any leftover language/username and reset to Spanish.
        window.localStorage.removeItem(LANGUAGE_STORAGE_KEY);
        window.localStorage.removeItem(USERNAME_STORAGE_KEY);
        setLanguageState("es");
        setAuthState("signedOut");
        setProfile(null);
        return;
      }

      try {
        // Auth UIDs are set to the guest ID (from the Google Sheet `ID`
        // column), so the signed-in guest is resolved by UID — not by email.
        // This keeps the link stable even if the user later changes their
        // auth email.
        const guest = getGuest(user.uid);
        const liveGuest = await loadOwnGuestProfile(user.uid);
        const resolvedGuest = liveGuest ? { ...guest, ...liveGuest } : guest;
        const storedUsername =
          window.localStorage.getItem(USERNAME_STORAGE_KEY);

        const username = storedUsername || resolvedGuest?.username || "";
        // The guests read is scoped to the signed-in guest's OWN invitation
        // group (matching the Firestore rules). This prevents a guest from
        // receiving other groups' phone, cabin, room, payment, or admin data.
        const invitationGroup = resolveGuestInvitationGroup(resolvedGuest);
        const [custom] = await Promise.all([
          loadGroupCustomContent(invitationGroup),
          loadGuestProfiles(invitationGroup),
          // Load the LIVE hosting/identity data for ALL guests so the extra
          // cabin occupancy (in the "Et après ?" section) can find every guest
          // sharing the same xtraCabin, including those from other groups.
          loadAllGuests(),
          loadAttendanceResponses(invitationGroup),
          loadRooms(),
          loadCabins(),
        ]);


        const groupMembers = getGroupMembers(resolvedGuest, getActiveGuests());
        const hasPendingIdentityVerification = groupMembers.some((member) => {
          const staticFlag = member?.idCheckUser === true;
          const liveFlag = resolveIdentityCheckPassed(member);
          return !(staticFlag || liveFlag);
        });

        setProfile({
          guest: resolvedGuest,
          username,
          custom,
          email: user.email,
        });
        setAuthState("signedIn");

        // After sign-in we use the guest's preferred language. If it differs
        // from the language the user was seeing (the login page, which is
        // Spanish by default), switch to the preferred language in the
        // background and offer a confirmation modal (only once per session).
        const preferred = normalizeLanguage(
          resolvedGuest?.identity?.lang || resolvedGuest?.lang,
        );
        const current = normalizeLanguage(languageRef.current);
        console.log("[lang] after sign-in detection:", {
          guestLang: resolvedGuest?.identity?.lang || resolvedGuest?.lang,
          preferred,
          current,
          differs: preferred !== current,
          alreadyPrompted: langPromptShown.current,
        });
        if (preferred && preferred !== current && !langPromptShown.current) {
          langPromptShown.current = true;
          setLanguageState(preferred);
          setLangPrompt({ current, preferred });
        }

        // Auto-open the identity-check modal once per session for guests who
        // have not yet acknowledged it. It can always be reopened from the
        // user menu.
        if (hasPendingIdentityVerification && !identityPromptShown.current) {
          identityPromptShown.current = true;
          setIdentityPrompt(true);
        }
      } catch (error) {
        console.warn("Failed to load guest profile", error);
        setAuthState("signedOut");
      }
    });
    return unsubscribe;
  }, []);

  const setLanguage = (value) => setLanguageState(normalizeLanguage(value));

  const signIn = async (username, password) => {
    setGateError(null);
    // Normalize the identifier: trim surrounding whitespace and lowercase it
    // so " David@Gmail.com " becomes "david@gmail.com". Emails are
    // case-insensitive in Firebase Auth, so this avoids false rejections.
    const normalized = String(username || "")
      .trim()
      .toLowerCase();
    // The identifier is always an email. If it already contains an "@", treat
    // it as a full email (e.g. david.aili.mx@gmail.com). Otherwise it's a bare
    // username: silently append the default auth domain so we always attempt a
    // normal Firebase Auth email/password login.
    const email = normalized.includes("@")
      ? normalized
      : `${normalized}@${AUTH_EMAIL_DOMAIN}`;

    // Validate against Firebase Auth's schema BEFORE hitting the network so we
    // fail fast with a clear reason instead of a cryptic 400.
    //   - Email: valid format, max 254 chars, no leading/trailing whitespace.
    //   - Password: min 6 chars, max 4096 chars.
    const emailValid =
      email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const passwordValid =
      typeof password === "string" &&
      password.length >= 6 &&
      password.length <= 4096;

    console.log("[auth] sign-in attempt:", {
      rawInput: username,
      constructedEmail: email,
      emailValid,
      passwordValid,
      passwordLength: password ? password.length : 0,
    });
    if (!emailValid) {
      console.warn("[auth] invalid email format, aborting sign-in:", email);
      setGateError("gateError");
      return;
    }
    if (!passwordValid) {
      console.warn(
        "[auth] invalid password length, aborting sign-in (must be 6-4096 chars):",
        password ? password.length : 0,
      );
      setGateError("gateError");
      return;
    }

    const timeout = new Promise((_, reject) =>
      window.setTimeout(() => reject(new Error("timeout")), 15000),
    );
    try {
      await Promise.race([
        (async () => {
          await setPersistence(auth, browserLocalPersistence);
          await signInWithEmailAndPassword(auth, email, password);
        })(),
        timeout,
      ]);
      window.localStorage.setItem(USERNAME_STORAGE_KEY, username);
      // onAuthStateChanged will fire and set authState to signedIn.
    } catch (error) {
      console.warn("Invitation access rejected", error.code || error.message, {
        email,
      });
      setGateError("gateError");
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      window.localStorage.removeItem(USERNAME_STORAGE_KEY);
      // onAuthStateChanged will fire and set authState to signedOut.
    } catch (error) {
      console.warn("Sign out failed", error);
    }
  };

  const changePassword = async (newPassword) => {
    const user = auth.currentUser;
    if (!user) throw new Error("no-user");
    await updatePassword(user, newPassword);
  };

  // Re-authenticate the current user with their password. Firebase requires a
  // recent sign-in to change the email or password; if the session is too old,
  // `updateEmail`/`updatePassword` throw `auth/requires-recent-login`. Callers
  // can catch that and prompt for the password, then call this before retrying.
  const reauthenticate = async (password) => {
    const user = auth.currentUser;
    if (!user) throw new Error("no-user");
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);
  };

  // Change the signed-in user's auth email (the real login credential). The
  // email is NOT stored in the `guests` collection — it lives in Firebase Auth.
  // If the session is too old, this throws `auth/requires-recent-login`; the
  // caller should prompt for the password and call `reauthenticate` first.
  const changeEmail = async (newEmail) => {
    const user = auth.currentUser;
    if (!user) throw new Error("no-user");
    const normalized = String(newEmail || "")
      .trim()
      .toLowerCase();
    const currentEmail = String(user.email || "")
      .trim()
      .toLowerCase();

    if (normalized && normalized === currentEmail) {
      return { status: "unchanged", email: currentEmail };
    }

    try {
      await updateEmail(user, normalized);
      await user.reload();

      // Keep the in-memory profile in sync immediately so the identity modal
      // reflects the updated login email without requiring a full reload.
      setProfile((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          email: user.email || normalized,
        };
      });

      return { status: "updated" };
    } catch (error) {
      // Some Firebase projects enforce verifying the new email before applying
      // it. In that mode, send a verification link instead of hard failing.
      if (error?.code === "auth/operation-not-allowed") {
        // Some environments (localhost/preview hosts) are not authorized as
        // continue URLs in Firebase Auth. Use a known authorized host there.
        const host = window.location.hostname;
        const isLocalHost = host === "localhost" || host === "127.0.0.1";
        const continueUrl = isLocalHost
          ? "https://boda-500805.web.app"
          : window.location.origin;

        try {
          await verifyBeforeUpdateEmail(user, normalized, {
            url: continueUrl,
            handleCodeInApp: false,
          });
        } catch (verifyError) {
          // Retry with SDK defaults in case project/email action settings are
          // incompatible with explicit actionCodeSettings.
          await verifyBeforeUpdateEmail(user, normalized);
          return { status: "verification-sent", email: normalized };
        }
        return { status: "verification-sent", email: normalized };
      }
      throw error;
    }
  };

  // Keep the preferred language (already active) and close the modal.
  const dismissLangPrompt = () => setLangPrompt(null);

  // Switch back to the previous language (what the user was seeing) and close
  // the modal.
  const revertLangPrompt = useCallback(() => {
    if (langPrompt) setLanguageState(langPrompt.current);
    setLangPrompt(null);
  }, [langPrompt]);

  // Close the identity-check modal WITHOUT recording that it was passed, so it
  // will pop up again on the next navigation/session.
  const dismissIdentityPrompt = () => setIdentityPrompt(false);

  // Close the identity-check modal after the guest confirmed (OK). The write
  // of `identityCheckPassed` is handled by the modal itself.
  const confirmIdentityPrompt = () => setIdentityPrompt(false);

  // Reopen the identity-check modal from the user menu at any time.
  const openIdentityPrompt = () => setIdentityPrompt(true);

  // Toggle the hidden Spotify music player on/off. Persisted so the choice
  // survives reloads. Defaults to OFF (no auto-start, no auto-play).
  const setMusicEnabled = (enabled) => {
    setMusicEnabledState(enabled);
    window.localStorage.setItem(MUSIC_ENABLED_KEY, enabled ? "1" : "0");
  };

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: content[language],
      interfaceText: interfaceText[language],
      authState,
      profile,
      gateError,
      langPrompt,
      langNames: LANG_NAMES,
      dismissLangPrompt,
      revertLangPrompt,
      identityPrompt,
      dismissIdentityPrompt,
      confirmIdentityPrompt,
      openIdentityPrompt,
      musicEnabled,
      setMusicEnabled,
      signIn,
      signOut,
      changePassword,
      changeEmail,
      reauthenticate,
    }),
    [
      language,
      authState,
      profile,
      gateError,
      langPrompt,
      identityPrompt,
      revertLangPrompt,
      musicEnabled,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
