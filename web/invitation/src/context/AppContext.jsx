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
  PhoneAuthProvider,
  RecaptchaVerifier,
  reauthenticateWithCredential,
  setPersistence,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signOut as firebaseSignOut,
  updateEmail,
  updatePassword,
  verifyBeforeUpdateEmail,
} from "firebase/auth";

import { auth, db } from "../firebase.js";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { collections } from "../../../shared/firestore-paths.js";
import {
  getInvitationLinkParams,
  computeTimeToAnswer,
  normalizeSource,
} from "../invitation-link.js";
import { content, SUPPORTED_LANGUAGES } from "../content.js";
import {
  AUTH_EMAIL_DOMAIN,
  getActiveGuests,
  getGuest,
  getGuestByAuthUid,
  getGuestByPhone,
  normalizePhoneToE164,
} from "../guests.js";




import {
  getGroupMembers,
  loadAllGuests,
  loadGuestProfiles,
  loadOwnGuestProfile,
  resolveGuestInvitationGroup,
  resolveIdentityCheckPassed,
} from "../guest-profiles.js";

import { useActivityTracker } from "../hooks/useActivityTracker.js";


import { loadRooms } from "../rooms.js";
import { loadCabins } from "../cabins.js";
import {
  getInitialLanguage,
  normalizeIdentifier,
  normalizeLanguage,
  validateCredentials,
} from "../auth/auth-logic.js";


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
      "Saisissez votre identifiant ou e-mail et le mot de passe que nous vous avons envoyés.",
    gateUsernameLabel: "Identifiant ou e-mail",
    gateUsernamePlaceholder: "Votre identifiant ou e-mail",

    gateLabel: "Mot de passe",
    gateButton: "Entrer",
    gateWorking: "Ouverture…",
    gateError:
      "L’identifiant ou le mot de passe n’est pas correct. Vérifiez-les ou demandez-nous de vous les renvoyer.",
    gateNoProfile:
      "Aucun invité ne correspond à cet identifiant. Vérifiez-le ou écrivez-nous pour obtenir de l’aide.",
    gateLost:
      "Identifiant ou mot de passe perdu ? Écrivez-nous et nous vous les renverrons.",
    gateDisclosure:
      "J’accepte que mon nom et ma photo puissent être affichés aux autres invités.",
    submitWorking: "Envoi…",
    submitSuccess: "Merci ! Nous avons bien reçu votre réponse.",
    submitError: "L’envoi a échoué. Vérifiez votre connexion et réessayez.",
    langPrompt: {
      title: "Langue préférée ?",
      body: "Votre navigateur est en {current}, mais nous pensons que votre langue préférée pourrait être {preferred}. On passe l'invitation en {preferred} ?",

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
    langPrompt: {
      title: "Preferred language?",
      body: "Your invitation was in {current}, but we think your preferred language might be {preferred}. Shall we switch it to {preferred}?",
      keep: "Yes, switch to {preferred}",
      switch: "No, keep {current}",
    },
  },
};

// Human-readable language names used in the language-preference modal.

const LANG_NAMES = {
  es: "Español",
  fr: "Français",
  en: "English",
};

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [language, setLanguageState] = useState(() =>
    getInitialLanguage(
      window.localStorage,
      LANGUAGE_STORAGE_KEY,
      SUPPORTED_LANGUAGES,
    ),
  );

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

  // Whether the music stream is actually playing right now. This is kept in
  // sync by the WinampPlayer (via setMusicPlaying) so the Music section's FAB
  // can clearly show "music is playing" vs "music is muted".
  const [musicPlaying, setMusicPlaying] = useState(false);

  // Whether the Music section is currently in view. The Music section's FAB
  // and the Winamp banner are only shown while the guest is actually in the
  // Music section; the audio keeps playing (or stays muted) based on
  // `musicEnabled` regardless of which section is on screen.
  const [musicSectionVisible, setMusicSectionVisibleState] = useState(false);

  // Avoid re-prompting on every auth state change within the same session.
  const langPromptShown = useRef(false);
  // Avoid re-opening the identity modal on every auth state change within the
  // same session (it is still reopenable manually from the user menu).
  const identityPromptShown = useRef(false);

  // Detect when the signed-in guest stops interacting (idle) and write an
  // `activity_events` record so the couple can see who went inactive. Exposes
  // `isActive` on the context so `useSectionTime` can pause accumulation while
  // the guest is idle. No-op until `profile.guest` resolves (after sign-in).
  const { isActive } = useActivityTracker({ guestId: profile?.guest?.id });

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
        // auth email. When a guest signs in via SMS, Firebase creates a user
        // whose uid is the phone number (e.g. "+523332017504"); `getGuestByAuthUid`
        // falls back to a phone lookup so SMS sign-in resolves the same guest.
        const guest = getGuestByAuthUid(user.uid);
        const liveGuest = await loadOwnGuestProfile(user.uid);
        const resolvedGuest = liveGuest ? { ...guest, ...liveGuest } : guest;

        const storedUsername =
          window.localStorage.getItem(USERNAME_STORAGE_KEY);

        const username = storedUsername || resolvedGuest?.username || "";
        // The guests read is scoped to the signed-in guest's OWN invitation
        // group (matching the Firestore rules). This prevents a guest from
        // receiving other groups' phone, cabin, room, payment, or admin data.
        const invitationGroup = resolveGuestInvitationGroup(resolvedGuest);
        await Promise.all([
          loadGuestProfiles(invitationGroup),
          // Load the FULL `guests` collection (not just the signed-in guest's
          // own group) so guest-facing lists like the GUEST CLOUD ("Nos
          // invités") can show every guest, not only the current group. The
          // Firestore rules allow any authenticated guest to read the whole
          // collection; `loadAllGuests` merges only identity/hosting fields so
          // it never clobbers the fresher group-scoped live data.
          loadAllGuests(),
          loadRooms(),
          loadCabins(),
        ]);
        // Group-level custom content (greeting/message) is no longer read from
        // the `invitation_groups` collection on the guest side — that collection
        // is admin-only (dashboard). The guest's own `customContent` lives on
        // their `guests` doc and is read via `profile.guest.customContent`.
        const custom = null;


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
          SUPPORTED_LANGUAGES,
        );
        const current = normalizeLanguage(languageRef.current, SUPPORTED_LANGUAGES);

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

  const setLanguage = (value) =>
    setLanguageState(normalizeLanguage(value, SUPPORTED_LANGUAGES));


  const signIn = async (username, password) => {
    setGateError(null);
    // Normalize the identifier: trim surrounding whitespace and lowercase it
    // so " David@Gmail.com " becomes "david@gmail.com". Emails are
    // case-insensitive in Firebase Auth, so this avoids false rejections.
    const normalized = normalizeIdentifier(username);
    // The identifier is always an email. If it already contains an "@", treat
    // it as a full email (e.g. david.aili.mx@gmail.com). Otherwise it's a bare
    // username: silently append the default auth domain to build a valid email
    // (e.g. "david" → "david@boda-david-y-ayde.web.app"). There is no username
    // lookup — the auth email is always the username plus the default domain.
    const email = normalized.includes("@")
      ? normalized
      : `${normalized}@${AUTH_EMAIL_DOMAIN}`;


    // Validate against Firebase Auth's schema BEFORE hitting the network so we
    // fail fast with a clear reason instead of a cryptic 400.
    const { emailValid, passwordValid } = validateCredentials(email, password);


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
    let userCredential;
    try {
      await Promise.race([
        (async () => {
          await setPersistence(auth, browserLocalPersistence);
          userCredential = await signInWithEmailAndPassword(auth, email, password);
        })(),
        timeout,
      ]);
      window.localStorage.setItem(USERNAME_STORAGE_KEY, username);

      // Write a lightweight `login_events` record on every REAL sign-in. This
      // MUST live here (not in onAuthStateChanged, which fires on every refresh
      // via browserLocalPersistence) so the couple is notified only when the
      // guest actually types their credentials.
      const uid = userCredential?.user?.uid || null;
      const linkParams = getInvitationLinkParams();
      addDoc(collection(db, collections.loginEvents), {
        guestId: uid,
        username: normalized,
        source: normalizeSource(linkParams.source),
        medium: linkParams.medium || "",
        campaign: linkParams.campaign || "",
        sentAt: linkParams.sentAt || null,
        timeToAnswer: computeTimeToAnswer(linkParams.sentAt),
        email,
        createdAt: serverTimestamp(),
      }).catch((err) => {
        console.warn("[auth] Failed to log login event", err);
      });
      // onAuthStateChanged will fire and set authState to signedIn.
    } catch (error) {
      console.warn("Invitation access rejected", error.code || error.message, {
        email,
      });
      setGateError("gateError");
    }
  };

  // Start an SMS sign-in for a guest phone number. The phone is normalized to
  // E.164 (e.g. "523332017504" → "+523332017504") and must match a guest in the
  // registry, otherwise we refuse to send a code. On success it returns the
  // Firebase `confirmationResult` so the caller can prompt for the 6-digit code
  // and call `confirmSmsCode`. The reCAPTCHA verifier is rendered into the
  // provided container element (the login form) so the challenge appears inline.
  const signInWithSms = async (phone, recaptchaContainerId) => {
    setGateError(null);
    const e164 = normalizePhoneToE164(phone);
    if (!e164) {
      setGateError("gateError");
      return null;
    }
    const guest = getGuestByPhone(e164);
    if (!guest) {
      console.warn("[auth] no guest matches phone, refusing SMS sign-in:", e164);
      setGateError("gateNoProfile");
      return null;
    }
    try {
      await setPersistence(auth, browserLocalPersistence);
      const verifier = new RecaptchaVerifier(auth, recaptchaContainerId, {
        size: "invisible",
      });
      const confirmationResult = await signInWithPhoneNumber(auth, e164, verifier);
      return confirmationResult;
    } catch (error) {
      console.warn("SMS sign-in failed", error.code || error.message, { e164 });
      setGateError("gateError");
      return null;
    }
  };

  // Complete an SMS sign-in with the 6-digit code the guest received. The
  // `confirmationResult` comes from `signInWithSms`. On success, onAuthStateChanged
  // fires and resolves the guest by the phone-number uid via `getGuestByAuthUid`.
  const confirmSmsCode = async (confirmationResult, code) => {
    setGateError(null);
    try {
      const credential = PhoneAuthProvider.credential(
        confirmationResult.verificationId,
        code,
      );
      await signInWithCredential(auth, credential);
      return true;
    } catch (error) {
      console.warn("SMS code rejected", error.code || error.message);
      setGateError("gateError");
      return false;
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
    const normalized = normalizeIdentifier(newEmail);
    const currentEmail = normalizeIdentifier(user.email);


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

  // Toggle whether the Music section is currently in view. Drives the FAB and
  // Winamp banner visibility (see musicSectionVisible above).
  const setMusicSectionVisible = (visible) =>
    setMusicSectionVisibleState(visible);

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
      musicPlaying,
      setMusicPlaying,
      musicSectionVisible,
      setMusicSectionVisible,
      signIn,
      signInWithSms,
      confirmSmsCode,
      signOut,
      changePassword,
      changeEmail,
      reauthenticate,
      isActive,
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
      musicPlaying,
      musicSectionVisible,
      isActive,
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
