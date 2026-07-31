import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "../firebase.js";
import { content, SUPPORTED_LANGUAGES } from "../content.js";
import { AUTH_EMAIL_DOMAIN, getGuestByEmail } from "../guests.js";
import { getCustomContent, loadGroupCustomContent } from "../invitation-profile.js";
import { loadGuestProfiles } from "../guest-profiles.js";


const LANGUAGE_STORAGE_KEY = "boda-language";
const USERNAME_STORAGE_KEY = "boda-username";

const interfaceText = {
  es: {
    gateEyebrow: "Invitación privada",
    gateBody:
      "Escribe tu usuario y la contraseña que compartimos contigo para abrir la invitación.",
    gateUsernameLabel: "Usuario",
    gateUsernamePlaceholder: "Tu usuario",
    gateLabel: "Contraseña",
    gateButton: "Entrar",
    gateWorking: "Abriendo…",
    gateError:
      "El usuario o la contraseña no son correctos. Revisa que los hayas escrito bien o pide que te los reenviemos.",
    gateNoProfile:
      "No encontramos un invitado con este usuario. Revisa que lo hayas escrito bien o escríbenos para ayudarte.",
    gateLost: "¿Perdiste tu usuario o contraseña? Escríbenos y te los reenviaremos.",
    submitWorking: "Enviando…",
    submitSuccess: "¡Gracias! Recibimos tu respuesta.",
    submitError: "No pudimos enviar la respuesta. Revisa tu conexión e inténtalo de nuevo.",
  },
  fr: {
    gateEyebrow: "Invitation privée",
    gateBody:
      "Saisissez votre identifiant et le mot de passe que nous vous avons envoyés pour ouvrir l’invitation.",
    gateUsernameLabel: "Identifiant",
    gateUsernamePlaceholder: "Votre identifiant",
    gateLabel: "Mot de passe",
    gateButton: "Entrer",
    gateWorking: "Ouverture…",
    gateError:
      "L’identifiant ou le mot de passe n’est pas correct. Vérifiez-les ou demandez-nous de vous les renvoyer.",
    gateNoProfile:
      "Aucun invité ne correspond à cet identifiant. Vérifiez-le ou écrivez-nous pour obtenir de l’aide.",
    gateLost: "Identifiant ou mot de passe perdu ? Écrivez-nous et nous vous les renverrons.",
    submitWorking: "Envoi…",
    submitSuccess: "Merci ! Nous avons bien reçu votre réponse.",
    submitError: "L’envoi a échoué. Vérifiez votre connexion et réessayez.",
  },
  en: {
    gateEyebrow: "Private invitation",
    gateBody:
      "Enter your username and the password we shared with you to open the invitation.",
    gateUsernameLabel: "Username",
    gateUsernamePlaceholder: "Your username",
    gateLabel: "Password",
    gateButton: "Enter",
    gateWorking: "Opening…",
    gateError:
      "The username or password is not correct. Check them or ask us to resend them.",
    gateNoProfile:
      "We could not find a guest with this username. Check it or message us for help.",
    gateLost: "Lost your username or password? Message us and we'll resend them.",
    submitWorking: "Sending…",
    submitSuccess: "Thank you! We received your response.",
    submitError: "We could not send your response. Check your connection and try again.",
  },
};

function normalizeLanguage(value) {
  return SUPPORTED_LANGUAGES.includes(value) ? value : "es";
}

function getInitialLanguage() {
  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored) return normalizeLanguage(stored);
  const browser = navigator.language?.split("-")[0];
  return normalizeLanguage(browser);
}

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [language, setLanguageState] = useState(getInitialLanguage);
  const [authState, setAuthState] = useState("loading");
  const [profile, setProfile] = useState(null);
  const [gateError, setGateError] = useState(null);

  useEffect(() => {
    document.documentElement.lang = language;
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }, [language]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setAuthState("signedOut");
        setProfile(null);
        return;
      }
      try {
        const guest = getGuestByEmail(user.email);
        const storedUsername = window.localStorage.getItem(USERNAME_STORAGE_KEY);
        const username = storedUsername || guest?.username || "";
        const [custom] = await Promise.all([
          loadGroupCustomContent(),
          loadGuestProfiles(),
        ]);
        setProfile({
          guest,
          username,
          custom,
          email: user.email,
        });
        setAuthState("signedIn");

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
    const email = `${username}@${AUTH_EMAIL_DOMAIN}`;
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
      console.warn("Invitation access rejected", error.code || error.message);
      setGateError("gateError");
    }
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
      signIn,
    }),
    [language, authState, profile, gateError],
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
