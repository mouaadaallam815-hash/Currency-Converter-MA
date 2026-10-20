const $ = (id) => document.getElementById(id);

const translations = {
  ar: {
    subtitle:"محول العملات العالمي", amountLabel:"المبلغ", fromLabel:"من العملة",
    toLabel:"العملة المستهدفة", exchangeRate:"سعر الصرف", updated:"آخر تحديث",
    loading:"جارٍ تحميل أسعار الصرف…", refresh:"تحديث الأسعار",
    footer:"الأسعار تعتمد على مصدر خارجي وقد تتأخر.", failed:"تعذر تحميل الأسعار. تحقق من اتصال الإنترنت وحاول مجدداً.",
    loaded:"تم تحديث أسعار الصرف.", noRate:"لا يتوفر سعر لهذه العملة حالياً."
  },
  fr: {
    subtitle:"Convertisseur de devises mondial", amountLabel:"Montant", fromLabel:"Devise source",
    toLabel:"Devise cible", exchangeRate:"Taux de change", updated:"Dernière mise à jour",
    loading:"Chargement des taux…", refresh:"Actualiser les taux",
    footer:"Les taux proviennent d'une source externe et peuvent être retardés.", failed:"Impossible de charger les taux. Vérifiez votre connexion puis réessayez.",
    loaded:"Taux de change actualisés.", noRate:"Taux actuellement indisponible pour cette devise."
  },
  en: {
    subtitle:"Global currency converter", amountLabel:"Amount", fromLabel:"From currency",
    toLabel:"To currency", exchangeRate:"Exchange rate", updated:"Last updated",
    loading:"Loading exchange rates…", refresh:"Refresh rates",
    footer:"Rates come from an external source and may be delayed.", failed:"Could not load rates. Check your internet connection and try again.",
    loaded:"Exchange rates updated.", noRate:"A rate for this currency is not currently available."
  }
};

// Priority currencies appear first. All additional currencies returned by the rate provider are added after them.
const priority = ["USD","EUR","MAD","GBP","JPY","CHF","CAD","AUD","CNY","SAR","AED","DZD","TND"];
const symbols = {USD:"$",EUR:"€",MAD:"DH",GBP:"£",JPY:"¥",CHF:"CHF",CAD:"C$",AUD:"A$",CNY:"¥",SAR:"﷼",AED:"د.إ",DZD:"د.ج",TND:"د.ت"};
const names = {
  USD:{ar:"الدولار الأمريكي",fr:"Dollar américain",en:"US Dollar"},
  EUR:{ar:"اليورو",fr:"Euro",en:"Euro"},
  MAD:{ar:"الدرهم المغربي",fr:"Dirham marocain",en:"Moroccan Dirham"},
  GBP:{ar:"الجنيه الإسترليني",fr:"Livre sterling",en:"British Pound"},
  JPY:{ar:"الين الياباني",fr:"Yen japonais",en:"Japanese Yen"},
  CHF:{ar:"الفرنك السويسري",fr:"Franc suisse",en:"Swiss Franc"},
  CAD:{ar:"الدولار الكندي",fr:"Dollar canadien",en:"Canadian Dollar"},
  AUD:{ar:"الدولار الأسترالي",fr:"Dollar australien",en:"Australian Dollar"},
  CNY:{ar:"اليوان الصيني",fr:"Yuan chinois",en:"Chinese Yuan"},
  SAR:{ar:"الريال السعودي",fr:"Riyal saoudien",en:"Saudi Riyal"},
  AED:{ar:"الدرهم الإماراتي",fr:"Dirham des Émirats",en:"UAE Dirham"},
  DZD:{ar:"الدينار الجزائري",fr:"Dinar algérien",en:"Algerian Dinar"},
  TND:{ar:"الدينار التونسي",fr:"Dinar tunisien",en:"Tunisian Dinar"}
};
let rates = {};
let currencyCodes = [];
let lang = "ar";

function t(key){ return translations[lang][key] || key; }
function currencyName(code){
  return names[code]?.[lang] || new Intl.DisplayNames([lang], {type:"currency"}).of(code) || code;
}
function formatMoney(value, code){
  if (!Number.isFinite(value)) return "—";
  try { return new Intl.NumberFormat(lang === "ar" ? "ar-MA" : lang, {style:"currency",currency:code,maximumFractionDigits:4}).format(value); }
  catch { return `${value.toLocaleString()} ${code}`; }
}
function applyLanguage(){
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    if (translations[lang][key]) el.textContent = translations[lang][key];
  });
  renderCurrencyNames();
  render();
}
function renderCurrencyNames(){
  for (const side of ["from","to"]) {
    const code = $(side+"Currency").value;
    $(side+"Name").textContent = code ? currencyName(code) : "";
    $(side+"Symbol").textContent = symbols[code] || code || "¤";
  }
}
function buildOptions(){
  const available = new Set(currencyCodes);
  const ordered = [...priority.filter(c => available.has(c)), ...currencyCodes.filter(c => !priority.includes(c)).sort()];
  for (const id of ["fromCurrency","toCurrency"]) {
    const select = $(id), previous = select.value;
    select.replaceChildren();
    ordered.forEach(code => {
      const option = document.createElement("option");
      option.value = code;
      option.textContent = `${code} — ${currencyName(code)}`;
      select.appendChild(option);
    });
    if (ordered.includes(previous)) select.value = previous;
  }
  if (!currencyCodes.includes("EUR")) {
    // EUR is intentionally a priority currency; a missing EUR response is reported rather than silently inventing a rate.
    $("status").textContent = t("noRate");
  }
  if (!$("fromCurrency").value) $("fromCurrency").value = currencyCodes.includes("USD") ? "USD" : currencyCodes[0];
  if (!$("toCurrency").value) $("toCurrency").value = currencyCodes.includes("EUR") ? "EUR" : currencyCodes[1] || currencyCodes[0];
  renderCurrencyNames();
}
function render(){
  const amount = Number($("amount").value);
  const from = $("fromCurrency").value, to = $("toCurrency").value;
  const ratio = rates[to] / rates[from];
  const value = amount * ratio;
  $("result").textContent = Number.isFinite(value) ? formatMoney(value,to) : "—";
  $("rate").textContent = Number.isFinite(ratio) ? `1 ${from} = ${formatMoney(ratio,to)}` : "—";
  renderCurrencyNames();
}
async function loadRates(){
  $("refresh").disabled = true;
  $("status").textContent = t("loading");
  try {
    const response = await fetch("https://open.er-api.com/v6/latest/USD", {cache:"no-store"});
    if (!response.ok) throw new Error("HTTP "+response.status);
    const data = await response.json();
    if (data.result !== "success" || !data.rates) throw new Error("Invalid rates response");
    rates = data.rates;
    currencyCodes = Object.keys(rates).sort();
    // Rates are expressed relative to USD. Make USD explicit in case the provider omits it.
    rates.USD = 1;
    if (!currencyCodes.includes("USD")) currencyCodes.push("USD");
    buildOptions();
    $("updatedAt").textContent = data.time_last_update_utc ? new Date(data.time_last_update_utc).toLocaleString(lang) : "—";
    $("status").textContent = t("loaded");
    render();
  } catch (error) {
    $("status").textContent = t("failed");
    console.error(error);
  } finally {
    $("refresh").disabled = false;
  }
}
$("amount").addEventListener("input", render);
$("fromCurrency").addEventListener("change", render);
$("toCurrency").addEventListener("change", render);
$("swap").addEventListener("click", () => {
  const oldFrom = $("fromCurrency").value;
  $("fromCurrency").value = $("toCurrency").value;
  $("toCurrency").value = oldFrom;
  render();
});
$("refresh").addEventListener("click", loadRates);
$("language").addEventListener("change", event => {
  lang = event.target.value;
  applyLanguage();
  if (rates.USD) buildOptions();
});
applyLanguage();
loadRates();
