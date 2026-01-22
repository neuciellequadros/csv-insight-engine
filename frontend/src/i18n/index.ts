import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import pt from "../locales/pt/common.json";
import en from "../locales/en/common.json";
import es from "../locales/es/common.json";

const STORAGE_KEY = "insightcsv_lang";

const savedLang = localStorage.getItem(STORAGE_KEY);
const defaultLang = savedLang || "pt";

i18n.use(initReactI18next).init({
  resources: {
    pt: { common: pt },
    en: { common: en },
    es: { common: es },
  },
  lng: defaultLang,
  fallbackLng: "pt",
  ns: ["common"],
  defaultNS: "common",
  interpolation: { escapeValue: false },
});

export function setAppLanguage(lang: "pt" | "en" | "es") {
  i18n.changeLanguage(lang);
  localStorage.setItem(STORAGE_KEY, lang);
}

export default i18n;
