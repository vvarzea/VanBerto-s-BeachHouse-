
function isFoodBizCategory(cat){
  return cat === "Restaurantes" || cat === "Bares" || cat === "FastFood" || cat === "Churrasqueiras" || cat === "Farmacias";
}

// --------- LOCALIZAÇÃO DA CASA ---------
const HOUSE_LOCATION = {
  nome: "VanBerto's Beach House",
  morada: "Rua do Salgado 1, Ferrel, Peniche",
  lat: 39.356494,
  lng: -9.354807
};
function houseMapsUrl(){
  return "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent(HOUSE_LOCATION.lat + "," + HOUSE_LOCATION.lng);
}
function houseDirectionsUrl(){
  return "https://www.google.com/maps/dir/?api=1&destination=" +
    encodeURIComponent(HOUSE_LOCATION.lat + "," + HOUSE_LOCATION.lng);
}

// --------- CONTACTO DA CASA (fonte única do número) ---------
const HOUSE_PHONE_INTL = "+351966944973";      // usar sempre este formato para tel:/wa.me
const HOUSE_PHONE_DISPLAY = "966 944 973";     // formato legível para mostrar ao hóspede

function houseWaLink(prefilledText){
  const digits = HOUSE_PHONE_INTL.replace(/[^\d]/g, "");
  const base = "https://wa.me/" + digits;
  return prefilledText ? base + "?text=" + encodeURIComponent(prefilledText) : base;
}

// --------- ESTADO GLOBAL ---------
let currentLang = "pt";
let currentCategory = "tudo";
let searchTerm = "";
let favoritos = new Set(); // "categoria|nome"
let itemAtual = null;      // item aberto no modal
let lastFocusEl = null;

const LS_KEY_FAVS = "vb_favoritos_v1";
const LS_KEY_LANG = "vb_lang_v1";

// --------- ELEMENTOS DOM ---------
const cardsContainer = document.getElementById("cards-container");

// Botão Instalar (PWA)
const installBtn = document.getElementById("btn-install");
const directionsBtn = document.getElementById("directions-btn");
let deferredInstallPrompt = null;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  if (installBtn) installBtn.hidden = false;
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  if (installBtn) installBtn.hidden = true;
});

// --------- INSTALAÇÃO NO IOS/SAFARI (não existe beforeinstallprompt) ---------
const iosInstallBanner = document.getElementById("ios-install-banner");
const iosInstallCloseBtn = document.getElementById("ios-install-close");
const LS_KEY_IOS_BANNER_DISMISSED = "vb_ios_banner_dismissed_v1";

function isIosDevice() {
  const ua = navigator.userAgent || "";
  return /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); // iPadOS 13+
}
function isStandaloneDisplay() {
  return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
    navigator.standalone === true;
}

if (
  iosInstallBanner &&
  isIosDevice() &&
  !isStandaloneDisplay() &&
  localStorage.getItem(LS_KEY_IOS_BANNER_DISMISSED) !== "1"
) {
  iosInstallBanner.hidden = false;
}

if (iosInstallCloseBtn) {
  iosInstallCloseBtn.addEventListener("click", () => {
    if (iosInstallBanner) iosInstallBanner.hidden = true;
    try { localStorage.setItem(LS_KEY_IOS_BANNER_DISMISSED, "1"); } catch {}
  });
}

if (directionsBtn){
  directionsBtn.href = houseDirectionsUrl();
}

// Contactos: href sempre gerado a partir de HOUSE_PHONE_INTL (fonte única)
const contactBtnEl = document.getElementById("contact-btn");
if (contactBtnEl) contactBtnEl.href = "tel:" + HOUSE_PHONE_INTL;

const whatsappContactBtn = document.getElementById("whatsapp-contact-btn");
if (whatsappContactBtn) whatsappContactBtn.href = houseWaLink();

// --------- WiFi: copiar password ---------
const wifiCopyBtn = document.getElementById("wifi-copy-btn");
const wifiPassEl = document.getElementById("wifi-pass");
if (wifiCopyBtn && wifiPassEl){
  wifiCopyBtn.addEventListener("click", async () => {
    const pass = wifiPassEl.textContent.trim();
    try {
      await navigator.clipboard.writeText(pass);
    } catch {
      // fallback para browsers/contextos sem Clipboard API (ex: http sem https)
      const tmp = document.createElement("textarea");
      tmp.value = pass;
      document.body.appendChild(tmp);
      tmp.select();
      try { document.execCommand("copy"); } catch {}
      document.body.removeChild(tmp);
    }
    const T = getHomeI18n();
    wifiCopyBtn.dataset.justCopied = "1";
    wifiCopyBtn.textContent = T.wifiCopied;
    setTimeout(() => {
      delete wifiCopyBtn.dataset.justCopied;
      wifiCopyBtn.textContent = getHomeI18n().wifiCopyBtn;
    }, 1800);
  });
}

if (installBtn){
  installBtn.addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    try { await deferredInstallPrompt.userChoice; } catch {}
    deferredInstallPrompt = null;
    installBtn.hidden = true;
  });
}

const langButtons = document.querySelectorAll(".lang-btn");
const searchInput = document.getElementById("search-input");
const scrollTopBtn = document.getElementById("scroll-top");
const shareFavsBtn = document.getElementById("btn-share-favs");

// Modal
const modal = document.getElementById("detail-modal");
const modalCloseBtn = document.getElementById("modal-close-btn");
const modalTitle = document.getElementById("modal-title");
const modalCategory = document.getElementById("modal-category");
const modalDesc = document.getElementById("modal-desc");


const modalPhoto = document.getElementById("modal-photo");
const modalActions = document.getElementById("modal-actions");
const btnCall = document.getElementById("btn-call");
const btnWhatsapp = document.getElementById("btn-whatsapp");
const modalDetails = document.getElementById("modal-details");
const modalMapText = document.getElementById("modal-map-text");
const modalOpenMapsBtn = document.getElementById("modal-open-maps");
const modalMapIframe = document.getElementById("modal-map-iframe");
const mapOfflineMsg = document.getElementById("map-offline-msg");
const mapOfflineBtn = document.getElementById("map-offline-btn");
const favToggleBtn = document.getElementById("fav-toggle");
const tabButtons = document.querySelectorAll(".tab-btn");
const tabPanels = document.querySelectorAll(".tab-panel");

// QR Modal
const qrModal = document.getElementById("qr-modal");
const qrCloseBtn = document.getElementById("qr-close-btn");
const qrTitle = document.getElementById("qr-title");
const qrText = document.getElementById("qr-text");
const qrHint = document.getElementById("qr-hint");
const qrCanvas = document.getElementById("qr-canvas");
const qrCopyBtn = document.getElementById("qr-copy");
const qrClearBtn = document.getElementById("qr-clear");


// Outros textos estáticos
const brandTitleEl = document.getElementById("brand-title");
const brandTaglineEl = document.getElementById("brand-tagline");
const h1El = document.getElementById("main-heading");
const subtitleEl = document.getElementById("subtitle");
const btnMain = document.getElementById("btn-cat-main");
const btnFavs = document.getElementById("btn-cat-favs");
const btnPraias = document.getElementById("btn-cat-praias");
const btnLocais = document.getElementById("btn-cat-locais");
const btnSuper = document.getElementById("btn-cat-super");
const btnFarm = document.getElementById("btn-cat-farm");
const btnRest = document.getElementById("btn-cat-rest");
const btnChurras = document.getElementById("btn-cat-churras");
const btnBares = document.getElementById("btn-cat-bares");
const btnEventos = document.getElementById("btn-cat-eventos");
const btnFast = document.getElementById("btn-cat-fast");
const btnMapAll = document.getElementById("btn-map-all");
const backBtn = document.getElementById("btn-back-categories");
const contactBtn = document.getElementById("contact-btn");
const footer1 = document.getElementById("footer-line1");
const footer2 = document.getElementById("footer-line2");
const tabInfo = document.getElementById("tab-info");
const tabPhotos = document.getElementById("tab-photos");
const tabMap = document.getElementById("tab-map");
const tabEvent = document.getElementById("tab-event");
const eventDateEl = document.getElementById("event-date");
const eventMetaEl = document.getElementById("event-meta");
const eventAddCalBtn = document.getElementById("event-add-calendar");
const eventCopyBtn = document.getElementById("event-copy");
const eventNoteEl = document.getElementById("event-note");

// Ícones por categoria (SVG inline)
const iconByCat = {
  Praias:
    `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 18c2 0 2-1 4-1s2 1 4 1 2-1 4-1 2 1 4 1" />
      <path d="M3 21c2 0 2-1 4-1s2 1 4 1 2-1 4-1 2 1 4 1" />
      <path d="M8 13c0-4 3-7 7-7" />
      <path d="M14 6c2 1 3 3 3 5" />
    </svg>`,
  Locais:
    `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 21s7-5 7-11a7 7 0 0 0-14 0c0 6 7 11 7 11z"/>
      <circle cx="12" cy="10" r="2.5"/>
    </svg>`,
  Supermercados:
    `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 6h15l-1.5 8.5H7.5L6 6z"/>
      <path d="M6 6 5 3H2"/>
      <circle cx="9" cy="20" r="1.5"/>
      <circle cx="18" cy="20" r="1.5"/>
    </svg>`,
  Restaurantes:
    `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 3v7a3 3 0 0 0 3 3v8" />
      <path d="M7 3v7" />
      <path d="M11 3v7a3 3 0 0 1-3 3" />
      <path d="M14 3v10a4 4 0 0 0 4 4h2" />
      <path d="M18 3v6" />
    </svg>`,
  Churrasqueiras:
    `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2c2 2 3 4 1.5 6S10 11 12 14c2-2 4-3 5-6 1-3-1-5-5-6z"/>
      <path d="M6 22c2-3 4-5 6-6 2 1 4 3 6 6"/>
    </svg>`,
  Bares:
    `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 3h14l-3 8v9a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-9L5 3z"/>
      <path d="M8 11h8"/>
    </svg>`,
  FastFood:
    `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 10c0-3 3-5 7-5s7 2 7 5"/>
      <path d="M4 13h16"/>
      <path d="M6 18h12"/>
    </svg>`,
  Farmacias:
    `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="4"/>
      <path d="M12 8v8"/>
      <path d="M8 12h8"/>
    </svg>`
};


// Imagens por categoria (URLs genéricas mas reais)


// Imagem "offline" por categoria (SVG embutido) — fica bonito e funciona sem fotos
const imgByCat = {
  Praias: svgDataUri("Praias", "#0ea5e9", "#22c55e", "🏖️"),
  Locais: svgDataUri("Locais", "#a855f7", "#22d3ee", "📌"),
  Supermercados: svgDataUri("Supermercados", "#22c55e", "#bef264", "🛒"),
  Restaurantes: svgDataUri("Restaurantes", "#fb923c", "#ec4899", "🍽️"),
  Churrasqueiras: svgDataUri("Churrasqueiras", "#f97316", "#b91c1c", "🔥"),
  Bares: svgDataUri("Bares", "#0ea5e9", "#6366f1", "🍹"),
  FastFood: svgDataUri("Fast food", "#ec4899", "#facc15", "🍔"),
  Farmacias: svgDataUri("Farmácias", "#22c55e", "#0ea5e9", "💊"),
  Eventos: svgDataUri("Eventos", "#22c55e", "#0ea5e9", "📅")
};

function svgDataUri(title, c1, c2, emoji) {
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="800" height="420" viewBox="0 0 800 420">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${c1}"/>
        <stop offset="1" stop-color="${c2}"/>
      </linearGradient>
      <filter id="s" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="rgba(0,0,0,0.35)"/>
      </filter>
    </defs>
    <rect width="800" height="420" rx="36" fill="url(#g)"/>
    <circle cx="660" cy="120" r="90" fill="rgba(255,255,255,0.22)"/>
    <circle cx="120" cy="320" r="140" fill="rgba(255,255,255,0.12)"/>
    <text x="58" y="130" font-size="78" font-family="Poppins, Arial, sans-serif" font-weight="800" fill="rgba(255,255,255,0.95)" filter="url(#s)">${emoji}</text>
    <text x="170" y="130" font-size="48" font-family="Poppins, Arial, sans-serif" font-weight="800" fill="rgba(255,255,255,0.95)" filter="url(#s)">${escapeXml(title)}</text>
    <text x="150" y="185" font-size="22" font-family="Poppins, Arial, sans-serif" font-weight="600" fill="rgba(255,255,255,0.88)">VanBerto's Beach House • Baleal</text>
  </svg>`;
  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg.trim());
}

function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, ch => ({ "<":"&lt;", ">":"&gt;", "&":"&amp;", "'":"&apos;", '"':"&quot;" }[ch]));
}


// --------- DADOS (PT + EN + ES + FR + Dicas VanBerto's) ---------
const data = {
  Praias: [
    {
      nome: "Praia do Baleal – Norte e Sul",
      descPT: "Praia icónica de Peniche, excelente para surf e famílias. A nossa praia — fica mesmo aqui ao pé!",
      descEN: "Iconic beach in Peniche, great for surfing and families. Our beach — right on the doorstep!",
      descES: "Playa icónica de Peniche, perfecta para surf y familias. ¡Está justo aquí al lado!",
      descFR: "Plage iconique de Peniche, excellente pour le surf et les familles. Notre plage — juste à côté !",
      tipVB: "O lado Norte é melhor para surf, o Sul é mais calmo e ideal para famílias com crianças.",
      mapa: "Praia do Baleal Peniche"
    },
    {
      nome: "Praia de Peniche de Cima",
      descPT: "Areia extensa, ótima para caminhadas e banhos tranquilos.",
      descEN: "Long sandy beach, perfect for walks and swimming.",
      descES: "Playa extensa, ideal para paseos y baños tranquilos.",
      descFR: "Grande plage de sable, parfaite pour les promenades et la baignade.",
      tipVB: "Ótima para caminhadas ao amanhecer — o silêncio e a luz são únicos.",
      mapa: "Praia de Peniche de Cima"
    },
    {
      nome: "Praia da Gamboa",
      descPT: "Ambiente muito calmo e familiar, ideal para relaxar.",
      descEN: "Calm and family-friendly beach, ideal to relax.",
      descES: "Ambiente muy tranquilo y familiar, ideal para relajarse.",
      descFR: "Plage calme et familiale, idéale pour se détendre.",
      tipVB: "O bar da Gamboa tem o melhor pôr do sol de Peniche — não percas!",
      mapa: "Praia da Gamboa Peniche"
    },
    {
      nome: "Praia da Consolação",
      descPT: "Conhecida pelas rochas ricas em iodo e águas terapêuticas. Ótima para snorkel.",
      descEN: "Known for iodine-rich rocks and therapeutic waters. Great for snorkelling.",
      descES: "Famosa por sus rocas ricas en yodo y aguas terapéuticas. Ideal para snorkel.",
      descFR: "Connue pour ses rochers riches en iode et ses eaux thérapeutiques. Idéale pour le snorkeling.",
      tipVB: "Perfeita para quem tem problemas respiratórios — o iodo faz maravilhas!",
      mapa: "Praia da Consolação Peniche"
    },
    {
      nome: "Praia dos Supertubos",
      descPT: "Onda tubular de nível mundial, palco do campeonato WSL. Espetáculo mesmo sem entrar na água!",
      descEN: "World-class tubular wave, WSL championship spot. Amazing to watch even from the shore!",
      descES: "Ola tubular de clase mundial, sede del campeonato WSL. ¡Espectacular incluso desde la orilla!",
      descFR: "Vague tubulaire de classe mondiale, site du championnat WSL. Spectaculaire même depuis la plage !",
      tipVB: "Mesmo que não surfes, vale a pena ir ver os tubos. De outubro a fevereiro as ondas são gigantescas.",
      mapa: "Praia dos Supertubos"
    },
    {
      nome: "Praia do Portinho da Areia Sul",
      descPT: "Pequena baía abrigada, muito fotogénica e ideal para snorkel.",
      descEN: "Small sheltered bay, very picturesque and great for snorkelling.",
      descES: "Pequeña bahía resguardada, muy fotogénica e ideal para snorkel.",
      descFR: "Petite baie abritée, très photogénique et idéale pour le snorkeling.",
      tipVB: "Uma das praias mais bonitas da zona — leva a câmara porque as fotos ficam incríveis!",
      mapa: "Portinho da Areia Sul Peniche"
    },
    {
      nome: "Praia do Molhe Leste",
      descPT: "Boa para surf e pôr do sol junto ao molhe do porto.",
      descEN: "Popular for surf and sunsets near the harbour pier.",
      descES: "Popular para surf y atardeceres junto al muelle.",
      descFR: "Populaire pour le surf et les couchers de soleil près de la digue.",
      tipVB: "Fica mesmo ao lado do porto — combinam bem um passeio pela doca e um gelado no final.",
      mapa: "Praia do Molhe Leste"
    },
    {
      nome: "Praia de São Bernardino",
      descPT: "Praia familiar e sossegada, a poucos minutos de Peniche.",
      descEN: "Quiet family beach, a short drive from Peniche.",
      descES: "Playa familiar y tranquila, a pocos minutos de Peniche.",
      descFR: "Plage familiale et calme, à quelques minutes de Peniche.",
      tipVB: "Menos conhecida pelos turistas — se quiseres praia sossegada é esta!",
      mapa: "Praia de São Bernardino"
    }
  ],
  Locais: [
    {
      nome: "Ilha do Baleal",
      descPT: "Ilhote ligado por istmo de areia, perfeito para fotos e passeios ao pôr do sol.",
      descEN: "Small island connected by a sand isthmus, perfect for photos and sunset walks.",
      descES: "Pequeña isla unida por un istmo de arena, perfecta para fotos y paseos al atardecer.",
      descFR: "Petit îlot relié par un isthme de sable, parfait pour les photos et les promenades au coucher du soleil.",
      tipVB: "Fica mesmo à frente do VanBerto's! Dá uma volta ao ilhote — demora 20 minutos e vale cada segundo.",
      mapa: "Ilha do Baleal"
    },
    {
      nome: "Berlengas",
      descPT: "Reserva natural com águas cristalinas. Acesso de barco a partir de Peniche (45 min).",
      descEN: "Natural reserve with crystal clear waters. Boat trip from Peniche (45 min).",
      descES: "Reserva natural con aguas cristalinas. Barco desde Peniche (45 min).",
      descFR: "Réserve naturelle aux eaux cristallines. Bateau depuis Peniche (45 min).",
      tipVB: "Reserva o barco com antecedência — enche rápido no verão! Vale muito a pena, é um dia inesquecível.",
      mapa: "Ilhas Berlengas"
    },
    {
      nome: "Museu da Renda de Bilros de Peniche",
      horarioPT: "Terça a domingo 10h00–13h00 e 14h00–18h00. Encerra à segunda.",
      horarioEN: "Tue–Sun 10:00–13:00 and 14:00–18:00. Closed Mon.",
      descPT: "Museu dedicado à famosa renda de bilros de Peniche.",
      descEN: "Museum dedicated to Peniche’s traditional bobbin lace.",
      descES: "Museo dedicado al famoso encaje de bolillos de Peniche.",
      descFR: "Musée consacré à la célèbre dentelle aux fuseaux de Peniche.",
      mapa: "Museu da Renda de Bilros Peniche"
    },
    {
      nome: "Museu Nacional Resistência e Liberdade (Fortaleza)",
      horarioPT: "Terça a domingo 10h00–18h00 (última entrada 17h15). Encerra à segunda e em 1 jan, Domingo de Páscoa, 1 maio e 25 dez.",
      horarioEN: "Tue–Sun 10:00–18:00 (last entry 17:15). Closed Mon and on Jan 1, Easter Sunday, May 1, Dec 25.",
      descPT: "Antiga prisão política do Estado Novo, hoje museu de memória com vista para o mar.",
      descEN: "Former political prison during the dictatorship, now a moving memory museum.",
      descES: "Antigua prisión política, hoy museo de memoria con vistas al mar.",
      descFR: "Ancienne prison politique, aujourd'hui musée de mémoire avec vue sur la mer.",
      tipVB: "Um sítio muito especial. A vista do topo das muralhas para as Berlengas é de cortar a respiração.",
      mapa: "Fortaleza de Peniche"
    },
    {
      nome: "Farol do Cabo Carvoeiro + Miradouro",
      descPT: "Vista deslumbrante sobre o Atlântico e as ilhas Berlengas.",
      descEN: "Stunning views over the Atlantic and the Berlengas islands.",
      descES: "Vistas impresionantes al Atlántico y las islas Berlengas.",
      descFR: "Vue imprenable sur l'Atlantique et les îles Berlengas.",
      tipVB: "Obrigatório ao final da tarde — o pôr do sol daqui é simplesmente mágico. Leva um casaco!",
      mapa: "Cabo Carvoeiro"
    },
    {
      nome: "Castelo de Óbidos",
      descPT: "Vila medieval encantadora com muralhas intactas, a cerca de 25 minutos de Peniche.",
      descEN: "Charming medieval walled village, about 25 minutes away.",
      descES: "Encantadora villa medieval amurallada, a unos 25 minutos.",
      descFR: "Charmant village médiéval fortifié, à environ 25 minutes.",
      tipVB: "Experimenta a ginjinha em copinhos de chocolate — é a tradição local. Visita de manhã para evitar as multidões.",
      mapa: "Castelo de Óbidos"
    },
    {
      nome: "Dino Parque da Lourinhã",
      descPT: "Parque temático com dinossauros em tamanho real, ótimo para famílias.",
      descEN: "Outdoor dinosaur theme park, great for families.",
      descES: "Parque temático con dinosaurios a tamaño real, ideal para familias.",
      descFR: "Parc à thème avec des dinosaures grandeur nature, idéal pour les familles.",
      tipVB: "As crianças ficam loucas! Fica a 20 minutos — uma boa saída para um dia diferente.",
      mapa: "Dino Parque Lourinhã"
    },
    {
      nome: "Jardim Buddha Eden",
      descPT: "Grande jardim oriental com esculturas, lagos e budas gigantes.",
      descEN: "Huge oriental garden with giant sculptures, lakes and buddhas.",
      descES: "Enorme jardín oriental con esculturas gigantes, lagos y budas.",
      descFR: "Immense jardin oriental avec des sculptures géantes, des lacs et des bouddhas.",
      tipVB: "Um sítio surpreendente que pouca gente conhece — as fotos ficam incríveis e é muito tranquilo.",
      mapa: "Buddha Eden Bombarral"
    },
    {
      nome: "Praia da Foz do Arelho",
      descPT: "Onde a lagoa de Óbidos encontra o mar — ótima para famílias e desportos náuticos.",
      descEN: "Where the Óbidos lagoon meets the sea — great for families and water sports.",
      descES: "Donde la laguna de Óbidos se encuentra con el mar — ideal para familias y deportes náuticos.",
      descFR: "Là où le lagon d'Óbidos rencontre la mer — idéal pour les familles et les sports nautiques.",
      tipVB: "A lagoa é mais quente e calma que o mar — perfeita para crianças pequenas.",
      mapa: "Praia da Foz do Arelho"
    }
  ],
  Supermercados: [
    {
      nome: "Continente",
      descPT: "Maior supermercado de Peniche, com grande variedade de produtos.",
      descEN: "Largest supermarket in Peniche with a wide variety.",
      descES: "El supermercado más grande de Peniche, con gran variedad.",
      descFR: "Le plus grand supermarché de Peniche, avec une grande variété.",
      tipVB: "Tem tudo — frutas, peixe, bebidas, produtos de higiene. É a nossa escolha principal.",
      mapa: "Continente Peniche"
    },
    {
      nome: "Pingo Doce",
      descPT: "Bons produtos frescos e preços competitivos.",
      descEN: "Good fresh produce and competitive prices.",
      descES: "Buenos productos frescos y precios competitivos.",
      descFR: "Bons produits frais et prix compétitifs.",
      tipVB: "Os produtos de marca própria são muito bons e baratos. As refeições prontas são uma boa opção para um jantar rápido.",
      mapa: "Pingo Doce Peniche"
    },
    {
      nome: "Lidl",
      descPT: "Opção económica com produtos essenciais e boas promoções semanais.",
      descEN: "Budget-friendly with essentials and good weekly deals.",
      descES: "Opción económica con esenciales y buenas ofertas semanales.",
      descFR: "Option économique avec l'essentiel et de bonnes promotions hebdomadaires.",
      tipVB: "Ótimo para fruta, iogurtes e snacks. As promoções de quinta-feira são sempre uma surpresa!",
      mapa: "Lidl Peniche"
    },
    {
      nome: "Intermarché",
      descPT: "Supermercado completo com talho, peixaria e posto de combustível.",
      descEN: "Full supermarket with butcher, fishmonger and petrol station.",
      descES: "Supermercado completo con carnicería, pescadería y gasolinera.",
      descFR: "Supermarché complet avec boucherie, poissonnerie et station-service.",
      tipVB: "O peixe fresco daqui é muito bom — Peniche é terra de pesca e nota-se na qualidade!",
      mapa: "Intermarché Peniche"
    },
    {
      nome: "Aldi",
      descPT: "Prático para compras rápidas do dia-a-dia com bons preços.",
      descEN: "Practical for quick everyday shopping at good prices.",
      descES: "Práctico para compras rápidas del día a día a buenos precios.",
      descFR: "Pratique pour les courses rapides du quotidien à bons prix.",
      tipVB: "Muito perto do centro — ideal quando só precisas de algumas coisas.",
      mapa: "Aldi Peniche"
    }
  ],
  Farmacias: [
    {
      nome: "Farmácia Central",
      descPT: "Farmácia no centro de Peniche, na Rua José Estevão.",
      descEN: "Pharmacy in central Peniche, on Rua José Estevão.",
      descES: "Farmacia en el centro de Peniche, en la Rua José Estevão.",
      descFR: "Pharmacie au centre de Peniche, Rua José Estevão.",
      tipVB: "Fica mesmo no centro da cidade — fácil de combinar com outras compras.",
      mapa: "Farmácia Central, Rua José Estevão 16, Peniche",
      telefone: "262782135",
      horarioPT: "Confirma o horário ao telefone ou no Google Maps (pode variar por época).",
      horarioEN: "Confirm hours by phone or on Google Maps (may vary by season)."
    },
    {
      nome: "Farmácia Proença",
      descPT: "Farmácia na Praça Jacob Rodrigues Pereira, junto à zona da Ajuda.",
      descEN: "Pharmacy on Praça Jacob Rodrigues Pereira, near Ajuda.",
      descES: "Farmacia en la Praça Jacob Rodrigues Pereira, cerca de Ajuda.",
      descFR: "Pharmacie sur la Praça Jacob Rodrigues Pereira, près d'Ajuda.",
      tipVB: "Costuma ter horário alargado — boa opção se precisares mais tarde.",
      mapa: "Farmácia Proença, Praça Jacob Rodrigues Pereira 14-15, Peniche",
      telefone: "262782100",
      horarioPT: "Aproximadamente 09:00–19:00 (confirma localmente, pode variar).",
      horarioEN: "Roughly 09:00–19:00 (please confirm locally, may vary)."
    },
    {
      nome: "Farmácia Higiénica",
      descPT: "Farmácia na Rua António da Conceição Bento, em Peniche.",
      descEN: "Pharmacy on Rua António da Conceição Bento, in Peniche.",
      descES: "Farmacia en la Rua António da Conceição Bento, en Peniche.",
      descFR: "Pharmacie Rua António da Conceição Bento, à Peniche.",
      tipVB: "Boa opção alternativa se a farmácia central estiver cheia.",
      mapa: "Farmácia Higiénica, Rua António da Conceição Bento 21-B, Peniche",
      telefone: "262782415",
      horarioPT: "Confirma o horário ao telefone ou no Google Maps (pode variar por época).",
      horarioEN: "Confirm hours by phone or on Google Maps (may vary by season)."
    },
    {
      nome: "Farmácia Santo Estêvão",
      descPT: "Farmácia em Ferrel, muito perto do VanBerto's Beach House.",
      descEN: "Pharmacy in Ferrel, very close to VanBerto's Beach House.",
      descES: "Farmacia en Ferrel, muy cerca de VanBerto's Beach House.",
      descFR: "Pharmacie à Ferrel, tout près de VanBerto's Beach House.",
      tipVB: "A mais perto de casa! Ótima para uma emergência rápida sem ires até Peniche.",
      mapa: "Farmácia Santo Estêvão, Rua do Brejo 6-B, Ferrel, Peniche",
      telefone: "262758029",
      horarioPT: "Aproximadamente 09:00–13:00 e 14:30–19:30 (confirma localmente).",
      horarioEN: "Roughly 09:00–13:00 and 14:30–19:30 (please confirm locally)."
    },
    {
      nome: "Farmácia Serra",
      descPT: "Farmácia em Serra d'El-Rei, na Avenida da Liberdade (EN 114).",
      descEN: "Pharmacy in Serra d'El-Rei, on Avenida da Liberdade (EN 114).",
      descES: "Farmacia en Serra d'El-Rei, en la Avenida da Liberdade (EN 114).",
      descFR: "Pharmacie à Serra d'El-Rei, Avenida da Liberdade (EN 114).",
      tipVB: "Útil se estiveres a passar por Serra d'El-Rei ou vindo de Óbidos.",
      mapa: "Farmácia Serra, Avenida da Liberdade 78, Serra d'El-Rei",
      telefone: "262909122",
      horarioPT: "Confirma o horário ao telefone ou no Google Maps (pode variar por época).",
      horarioEN: "Confirm hours by phone or on Google Maps (may vary by season)."
    },
    {
      nome: "Farmácia Santa Luzia",
      descPT: "Farmácia em Atouguia da Baleia, junto à Praça Geraldes.",
      descEN: "Pharmacy in Atouguia da Baleia, near Praça Geraldes.",
      descES: "Farmacia en Atouguia da Baleia, junto a la Praça Geraldes.",
      descFR: "Pharmacie à Atouguia da Baleia, près de la Praça Geraldes.",
      tipVB: "Boa opção se estiveres do lado de Atouguia da Baleia.",
      mapa: "Farmácia Santa Luzia, Praça Geraldes 1, Atouguia da Baleia",
      telefone: "262769265",
      horarioPT: "Aproximadamente 09:00–13:00 e 15:00–20:00 (confirma localmente).",
      horarioEN: "Roughly 09:00–13:00 and 15:00–20:00 (please confirm locally)."
    },
    {
      nome: "Farmácia Confiança",
      descPT: "Farmácia na Rua José Augusto Vaz, do lado de Atouguia da Baleia.",
      descEN: "Pharmacy on Rua José Augusto Vaz, on the Atouguia da Baleia side.",
      descES: "Farmacia en la Rua José Augusto Vaz, del lado de Atouguia da Baleia.",
      descFR: "Pharmacie Rua José Augusto Vaz, côté Atouguia da Baleia.",
      tipVB: "Mais uma opção se as farmácias do centro estiverem fechadas.",
      mapa: "Farmácia Confiança, Rua José Augusto Vaz 5, Atouguia da Baleia",
      telefone: "262759171",
      horarioPT: "Confirma o horário ao telefone ou no Google Maps (pode variar por época).",
      horarioEN: "Confirm hours by phone or on Google Maps (may vary by season)."
    }
  ],
  Restaurantes: [
    {
      nome: "Tasca do Joel",
      descPT: "Restaurante clássico de Peniche para peixe fresco e marisco. Ambiente familiar e autêntico.",
      descEN: "Classic Peniche restaurant for fresh fish and seafood. Family and authentic feel.",
      descES: "Restaurante clásico de Peniche para pescado fresco y marisco. Ambiente familiar y auténtico.",
      descFR: "Restaurant classique de Peniche pour poisson frais et fruits de mer. Ambiance familiale et authentique.",
      tipVB: "Um dos nossos favoritos! O peixe grelhado e as amêijoas à Bulhão Pato são imperdíveis.",
      mapa: "Tasca do Joel Peniche"
    },
    {
      nome: "Taberna do Ganhão",
      descPT: "Petiscos e pratos típicos portugueses num espaço acolhedor e descontraído.",
      descEN: "Traditional Portuguese tapas and dishes in a warm, relaxed space.",
      descES: "Tapas y platos típicos portugueses en un espacio acogedor y relajado.",
      descFR: "Tapas et plats typiques portugais dans un espace chaleureux et décontracté.",
      tipVB: "Perfeito para um jantar tardio com amigos. O polvo à lagareiro é divinal!",
      mapa: "Taberna do Ganhão Peniche"
    },
    {
      nome: "O Pedro",
      descPT: "Excelente peixe grelhado e comida tradicional portuguesa com preços honestos.",
      descEN: "Excellent grilled fish and local cuisine at honest prices.",
      descES: "Excelente pescado a la brasa y cocina tradicional portuguesa a precios honestos.",
      descFR: "Excellent poisson grillé et cuisine locale à prix honnêtes.",
      tipVB: "Muito bom e sempre cheio — reserva mesa com antecedência no verão!",
      mapa: "Restaurante O Pedro Peniche"
    },
    {
      nome: "D Raiz",
      descPT: "Cozinha moderna com sabores regionais e ingredientes locais.",
      descEN: "Modern cuisine with regional flavours and local ingredients.",
      descES: "Cocina moderna con sabores regionales e ingredientes locales.",
      descFR: "Cuisine moderne aux saveurs régionales et aux ingrédients locaux.",
      tipVB: "Para uma refeição mais especial — a carta muda com a estação e está sempre deliciosa.",
      mapa: "D Raiz Peniche"
    },
    {
      nome: "Italiano O Outro",
      descPT: "Massas artesanais e pizzas num ambiente descontraído. Ótimo para famílias.",
      descEN: "Handmade pasta and pizzas in a relaxed atmosphere. Great for families.",
      descES: "Pasta artesanal y pizzas en ambiente relajado. Perfecto para familias.",
      descFR: "Pâtes maison et pizzas dans une ambiance décontractée. Idéal pour les familles.",
      tipVB: "A nossa escolha quando queremos pizza — as massas frescas são feitas na hora!",
      mapa: "Italiano O Outro Peniche"
    },
    {
      nome: "Mundano Baleal",
      descPT: "Restaurante jovem com vista para o mar, cocktails e ambiente animado.",
      descEN: "Trendy spot with sea view, cocktails and a lively vibe.",
      descES: "Restaurante moderno con vista al mar, cócteles y ambiente animado.",
      descFR: "Restaurant tendance avec vue sur la mer, cocktails et ambiance animée.",
      tipVB: "Ótimo para um jantar com vista para o oceano. Os cocktails são muito bons!",
      mapa: "Mundano Baleal"
    },
    {
      nome: "Maresia",
      descPT: "Restaurante mesmo na praia do Baleal, com boa comida e ambiente de verão.",
      descEN: "Right on Baleal beach, good food and summer vibes.",
      descES: "Justo en la playa de Baleal, buena comida y ambiente veraniego.",
      descFR: "Directement sur la plage de Baleal, bonne cuisine et ambiance estivale.",
      tipVB: "Adoramos o pequeno-almoço aqui ao fim de semana — os ovos Benedict são de outro mundo!",
      mapa: "Maresia Baleal"
    },
    {
      nome: "Miyabi Sushi",
      descPT: "Sushi fresco e variado, uma boa alternativa ao peixe grelhado.",
      descEN: "Fresh and varied sushi, a great alternative to grilled fish.",
      descES: "Sushi fresco y variado, una buena alternativa al pescado a la brasa.",
      descFR: "Sushis frais et variés, une bonne alternative au poisson grillé.",
      tipVB: "Surpreendentemente bom para uma cidade de praia! O sushi de peixe local é muito fresco.",
      mapa: "Miyabi Sushi Peniche"
    },
    {
      nome: "Marisqueira Mirandum",
      descPT: "Marisqueira muito procurada pelos visitantes, com marisco fresquíssimo.",
      descEN: "Very popular seafood restaurant with the freshest shellfish.",
      descES: "Marisquería muy popular entre los visitantes, con marisco fresquísimo.",
      descFR: "Restaurant de fruits de mer très populaire, avec des produits ultra-frais.",
      tipVB: "As lagostas e as gambas são espetaculares — para uma refeição especial!",
      mapa: "Marisqueira Mirandum Peniche"
    },
    {
      nome: "Marisqueira dos Cortiçais",
      descPT: "Marisco tradicional muito apreciado pelos locais — um sinal de qualidade.",
      descEN: "Traditional seafood, highly appreciated by locals — always a good sign.",
      descES: "Marisco tradicional muy apreciado por los lugareños — siempre buena señal.",
      descFR: "Fruits de mer traditionnels très appréciés des locaux — toujours bon signe.",
      tipVB: "O sítio preferido dos pescadores locais — quando os locais comem lá, é sempre bom sinal!",
      mapa: "Marisqueira dos Cortiçais Peniche"
    },
    {
      nome: "Bateira",
      descPT: "Restaurante descontraído junto ao mar com bons petiscos e refeições.",
      descEN: "Relaxed beachside spot for snacks and full meals.",
      descES: "Lugar relajado junto al mar para tapas y comidas completas.",
      descFR: "Endroit décontracté en bord de mer pour grignoter ou dîner.",
      tipVB: "Ótimo para um almoço rápido depois da praia — o prego no pão é muito bom!",
      mapa: "Restaurante Bateira Peniche"
    }
  ],
  Churrasqueiras: [
    {
      nome: "A Caseirinha",
      descPT: "Frango de churrasco muito saboroso — um clássico em Peniche.",
      descEN: "Very tasty grilled chicken — a Peniche classic.",
      descES: "Pollo a la brasa muy sabroso — un clásico en Peniche.",
      descFR: "Poulet grillé très savoureux — un classique à Peniche.",
      tipVB: "O nosso take-away de eleição! O frango com piri-piri daqui é fantástico. Chega cedo — esgota rápido!",
      mapa: "Churrasqueira A Caseirinha Peniche"
    },
    {
      nome: "Churrasqueira O Nortista",
      descPT: "Take-away muito popular entre os residentes, ótimo custo-benefício.",
      descEN: "Popular takeaway among locals, great value for money.",
      descES: "Comida para llevar muy popular entre los residentes, excelente relación calidad-precio.",
      descFR: "Plats à emporter très populaires chez les résidents, excellent rapport qualité-prix.",
      tipVB: "Rápido, barato e muito bom — ideal quando se quer uma refeição sem complicações.",
      mapa: "Churrasqueira O Nortista Peniche"
    },
    {
      nome: "Churrasqueira Vó Dina",
      descPT: "Refeições económicas, bem servidas e com sabor a casa.",
      descEN: "Budget-friendly, generous portions with a home-cooked feel.",
      descES: "Comidas económicas, bien servidas y con sabor casero.",
      descFR: "Repas économiques, bien servis et cuisinés maison.",
      tipVB: "Ótimo para um jantar económico sem abdicar da qualidade. A caldeirada é especial!",
      mapa: "Churrasqueira Vó Dina Peniche"
    }
  ],
  Bares: [
    {
      nome: "Danau Beach Bar",
      descPT: "Bar de praia com ambiente tropical e descontraído no Baleal.",
      descEN: "Tropical style beach bar in Baleal with a relaxed vibe.",
      descES: "Bar de playa con ambiente tropical y relajado en Baleal.",
      descFR: "Bar de plage au style tropical et décontracté à Baleal.",
      tipVB: "O nosso bar de praia favorito aqui no Baleal! Os caipirinhas são perfeitos ao fim do dia.",
      mapa: "Danau Beach Bar Baleal"
    },
    {
      nome: "Bar do Quebrado",
      descPT: "Bar junto à praia, ótimo para o final da tarde e ver o pôr do sol.",
      descEN: "Chilled beach bar, great for late afternoon and watching the sunset.",
      descES: "Bar junto a la playa, ideal para el final de la tarde y ver el atardecer.",
      descFR: "Bar de plage sympa, idéal pour la fin d'après-midi et le coucher du soleil.",
      tipVB: "Vista fantástica para o pôr do sol — um copo na mão e o sol a descer. Perfeito!",
      mapa: "Bar do Quebrado Peniche"
    },
    {
      nome: "Bar do Bruno",
      descPT: "Bar simples, animado e muito popular entre surfistas e locais.",
      descEN: "Simple and lively bar, very popular with surfers and locals.",
      descES: "Bar sencillo y animado, muy popular entre surfistas y lugareños.",
      descFR: "Bar simple et animé, très populaire parmi les surfeurs et les habitants.",
      tipVB: "Se quiseres conhecer a vibe local de Peniche, é aqui. Sempre com boa música!",
      mapa: "Bar do Bruno Peniche"
    },
    {
      nome: "Java House",
      descPT: "Café e bar com ambiente jovem, boa música e cocktails criativos.",
      descEN: "Cafe and bar with a young vibe, good music and creative cocktails.",
      descES: "Café y bar con ambiente joven, buena música y cócteles creativos.",
      descFR: "Café et bar avec une ambiance jeune, bonne musique et cocktails créatifs.",
      tipVB: "Ótimo para um brunch relaxado ou para começar a noite. O café é muito bom!",
      mapa: "Java House Peniche"
    },
    {
      nome: "Gamboa Bar",
      descPT: "Perfeito para ver o pôr do sol na Praia da Gamboa com uma bebida na mão.",
      descEN: "Perfect spot to watch the sunset at Gamboa beach with a drink in hand.",
      descES: "El lugar perfecto para ver el atardecer en la playa de Gamboa con una bebida.",
      descFR: "L'endroit parfait pour regarder le coucher de soleil à Gamboa avec un verre.",
      tipVB: "Um dos melhores pôres do sol de Peniche — chega um pouco antes para garantir lugar.",
      mapa: "Gamboa Bar Peniche"
    },
    {
      nome: "Tribo da Praia – Bar da Praia",
      descPT: "Bar alternativo e descontraído no Baleal, com música ao vivo e ambiente surf.",
      descEN: "Alternative and relaxed bar in Baleal, with live music and surf vibes.",
      descES: "Bar alternativo y relajado en Baleal, con música en vivo y ambiente surf.",
      descFR: "Bar alternatif et décontracté à Baleal, avec musique live et ambiance surf.",
      tipVB: "Às sextas-feiras têm música ao vivo — muito boa vibração!",
      mapa: "Tribo da Praia Baleal"
    },
    {
      nome: "The Base",
      descPT: "Bar animado com música e muita energia surfista no Baleal.",
      descEN: "Lively bar with music and lots of surf energy in Baleal.",
      descES: "Bar animado con música y mucha energía surfera en Baleal.",
      descFR: "Bar animé avec musique et plein d'énergie surf à Baleal.",
      tipVB: "Bom para noites mais animadas — fica mesmo na zona do Baleal, muito perto de casa!",
      mapa: "The Base Baleal"
    },
    {
      nome: "Supertubos Beach Bar",
      descPT: "Bar mesmo em frente às ondas de Supertubos, ótimo para ver surf.",
      descEN: "Bar right in front of Supertubos waves, great for watching surf.",
      descES: "Bar justo frente a las olas de Supertubos, ideal para ver surf.",
      descFR: "Bar directement devant les vagues de Supertubos, idéal pour regarder le surf.",
      tipVB: "Ver surf de copo na mão é uma experiência única — especialmente no inverno com ondas grandes!",
      mapa: "Supertubos Beach Bar"
    },
    {
      nome: "Bananas Beach Bar",
      descPT: "Bar colorido e divertido, diretamente na praia do Baleal.",
      descEN: "Colourful and fun beach bar right on Baleal beach.",
      descES: "Bar colorido y divertido, directamente en la playa de Baleal.",
      descFR: "Bar coloré et amusant, directement sur la plage de Baleal.",
      tipVB: "Ótimo para um almoço descontraído de pés na areia — os batidos são deliciosos!",
      mapa: "Bananas Beach Bar Baleal"
    }
  ],
  FastFood: [
    {
      nome: "Burger King",
      descPT: "Fast-food internacional perto da zona comercial de Peniche.",
      descEN: "International fast-food near Peniche's commercial area.",
      descES: "Comida rápida internacional cerca de la zona comercial de Peniche.",
      descFR: "Restauration rapide internationale près de la zone commerciale de Peniche.",
      tipVB: "Quando as crianças insistem! Fica no centro comercial a 5 minutos de carro.",
      mapa: "Burger King Peniche"
    },
    {
      nome: "Telepizza 🍕",
      descPT: "Pizzas para levar ou pedir entrega em casa — rápido e prático.",
      descEN: "Pizza for takeaway or home delivery — quick and convenient.",
      descES: "Pizzas para llevar o pedir a domicilio — rápido y práctico.",
      descFR: "Pizzas à emporter ou en livraison — rapide et pratique.",
      tipVB: "Boa opção para quando estão todos cansados e querem uma noite de filme com pizza!",
      mapa: "Telepizza Peniche"
    },
    {
      nome: "Duna Kebab",
      descPT: "Kebabs e refeições rápidas muito populares entre os surfistas.",
      descEN: "Kebabs and quick meals very popular with surfers.",
      descES: "Kebabs y comidas rápidas muy populares entre los surfistas.",
      descFR: "Kebabs et repas rapides très populaires parmi les surfeurs.",
      tipVB: "Depois de um dia de surf, um kebab grande resolve tudo! Atende tarde — ótimo para saídas noturnas.",
      mapa: "Duna Kebab Peniche"
    },
    {
      nome: "Yo-Yo Kebab e Pizzas 🍕",
      descPT: "Kebabs, pizzas e hambúrgueres — boa variedade para toda a família.",
      descEN: "Kebabs, pizzas and burgers — great variety for the whole family.",
      descES: "Kebabs, pizzas y hamburguesas — gran variedad para toda la familia.",
      descFR: "Kebabs, pizzas et burgers — grande variété pour toute la famille.",
      tipVB: "Prático e rápido quando o tempo escasseia. As pizzas são surpreendentemente boas!",
      mapa: "Yo Yo Kebab Peniche"
    },
    {
      nome: "Boina Verde Snack-Bar",
      descPT: "Petiscos e refeições rápidas num ambiente local e descontraído.",
      descEN: "Snacks and quick meals in a local, relaxed setting.",
      descES: "Tapas y comidas rápidas en un ambiente local y relajado.",
      descFR: "Snacks et repas rapides dans un cadre local et décontracté.",
      tipVB: "Um sítio simpático para um almoço rápido e sem pretensões. Os bifanas são muito bons!",
      mapa: "Boina Verde Peniche"
    }

  ],
  Eventos: [{
      nome: "Mercado Municipal de Peniche",
      descPT: "Bom local para ver peixe fresco, produtos regionais e sentir o ritmo da cidade.",
      descEN: "Great place to see fresh fish, regional products and the town vibe.",
      descES: "Buen lugar para ver pescado fresco, productos regionales y sentir el ritmo de la ciudad.",
      descFR: "Bon endroit pour voir du poisson frais, des produits régionaux et sentir le rythme de la ville.",
      mapa: "Mercado Municipal de Peniche"
    },
    {
      nome: "Cabo Carvoeiro (pôr do sol)",
      descPT: "Miradouro com vistas incríveis. Sugestão: ir ao final da tarde para ver o pôr do sol.",
      descEN: "Viewpoint with amazing scenery. Tip: go in the late afternoon for sunset.",
      descES: "Mirador con vistas increíbles. Consejo: ve al final de la tarde para ver la puesta de sol.",
      descFR: "Point de vue avec des paysages incroyables. Astuce : viens en fin d'après-midi pour voir le coucher de soleil.",
      mapa: "Cabo Carvoeiro"
    },
    {
      nome: "Praia dos Supertubos (surf em época)",
      descPT: "Quando há provas, Supertubos recebe competições de surf. Confirma cartazes e redes sociais na semana.",
      descEN: "During event weeks, Supertubos hosts surf competitions. Check posters and social media that week.",
      descES: "Cuando hay pruebas, Supertubos acoge competiciones de surf. Consulta carteles y redes sociales esa semana.",
      descFR: "Lors des semaines d'événements, Supertubos accueille des compétitions de surf. Vérifie les affiches et les réseaux sociaux cette semaine-là.",
      mapa: "Praia dos Supertubos"
    }
,
    {
      nome: "🇵🇹 Feriado: Ano Novo",
      descPT: "Feriado nacional em Portugal.",
      descEN: "National holiday in Portugal.",
      descES: "Festivo nacional en Portugal.",
      descFR: "Jour férié national au Portugal.",
      mapa: "Portugal",
      dataISO: "2026-01-01",
      horaInicio: "09:00",
      horaFim: "10:00",
      local: "Peniche"
    },
    {
      nome: "🎭 Carnaval (data habitual)",
      descPT: "Dia de Carnaval (tolerância de ponto em muitos locais). Confirma localmente.",
      descEN: "Carnival day (often optional). Please confirm locally.",
      descES: "Día de Carnaval (a menudo opcional). Confirma localmente.",
      descFR: "Jour de Carnaval (souvent facultatif). Merci de confirmer localement.",
      mapa: "Peniche",
      dataISO: "2026-02-17",
      horaInicio: "09:00",
      horaFim: "10:00",
      local: "Peniche"
    },
    {
      nome: "✝️ Sexta-Feira Santa",
      descPT: "Feriado nacional (Sexta-Feira Santa).",
      descEN: "National holiday (Good Friday).",
      descES: "Festivo nacional (Viernes Santo).",
      descFR: "Jour férié national (Vendredi saint).",
      mapa: "Peniche",
      dataISO: "2026-04-03",
      horaInicio: "09:00",
      horaFim: "10:00",
      local: "Peniche"
    },
    {
      nome: "🇵🇹 25 de Abril",
      descPT: "Dia da Liberdade (feriado nacional).",
      descEN: "Freedom Day (national holiday).",
      descES: "Día de la Libertad (festivo nacional).",
      descFR: "Jour de la Liberté (jour férié national).",
      mapa: "Peniche",
      dataISO: "2026-04-25",
      horaInicio: "09:00",
      horaFim: "10:00",
      local: "Peniche"
    },
    {
      nome: "👷 Dia do Trabalhador",
      descPT: "1 de Maio (feriado nacional).",
      descEN: "Labour Day (national holiday).",
      descES: "1 de mayo (festivo nacional).",
      descFR: "1er mai (jour férié national).",
      mapa: "Peniche",
      dataISO: "2026-05-01",
      horaInicio: "09:00",
      horaFim: "10:00",
      local: "Peniche"
    },
    {
      nome: "⛪ Corpo de Deus",
      descPT: "Corpo de Deus (feriado nacional).",
      descEN: "Corpus Christi (national holiday).",
      descES: "Corpus Christi (festivo nacional).",
      descFR: "Fête-Dieu (jour férié national).",
      mapa: "Peniche",
      dataISO: "2026-06-04",
      horaInicio: "09:00",
      horaFim: "10:00",
      local: "Peniche"
    },
    {
      nome: "🇵🇹 Dia de Portugal",
      descPT: "10 de Junho (feriado nacional).",
      descEN: "Portugal Day (national holiday).",
      descES: "10 de junio (festivo nacional).",
      descFR: "10 juin (jour férié national).",
      mapa: "Peniche",
      dataISO: "2026-06-10",
      horaInicio: "09:00",
      horaFim: "10:00",
      local: "Peniche"
    },
    {
      nome: "🎉 Festa em honra de N.ª Sr.ª da Boa Viagem (Peniche) — início",
      descPT: "Festa de Peniche em honra de N.ª Sr.ª da Boa Viagem (datas anunciadas: 10 de julho a 3 de agosto de 2026). Confirma programa.",
      descEN: "Peniche festivities (announced dates: 10 July to 3 Aug 2026). Please confirm programme.",
      descES: "Fiesta de Peniche en honor de Nuestra Señora de la Buena Travesía (fechas anunciadas: 10 de julio a 3 de agosto de 2026). Confirma el programa.",
      descFR: "Fête de Peniche en l'honneur de Notre-Dame du Bon Voyage (dates annoncées : du 10 juillet au 3 août 2026). Merci de confirmer le programme.",
      mapa: "Ribeira Antiga Peniche",
      dataISO: "2026-07-10",
      horaInicio: "12:00",
      horaFim: "13:00",
      local: "Peniche"
    },
    {
      nome: "🏛️ Dia do Município / Feriado Municipal de Peniche",
      descPT: "Feriado municipal (Dia do Município) — 5 de agosto.",
      descEN: "Municipal holiday (Municipality Day) — 5 August.",
      descES: "Festivo municipal (Día del Municipio) — 5 de agosto.",
      descFR: "Jour férié municipal (Jour de la Municipalité) — 5 août.",
      mapa: "Câmara Municipal de Peniche",
      dataISO: "2026-08-05",
      horaInicio: "09:00",
      horaFim: "10:00",
      local: "Peniche"
    },
    {
      nome: "🙏 Assunção de Nossa Senhora",
      descPT: "15 de agosto (feriado nacional).",
      descEN: "Assumption Day (national holiday).",
      descES: "15 de agosto (festivo nacional).",
      descFR: "15 août (jour férié national).",
      mapa: "Peniche",
      dataISO: "2026-08-15",
      horaInicio: "09:00",
      horaFim: "10:00",
      local: "Peniche"
    },
    {
      nome: "🇵🇹 Implantação da República",
      descPT: "5 de outubro (feriado nacional).",
      descEN: "Republic Day (national holiday).",
      descES: "5 de octubre (festivo nacional).",
      descFR: "5 octobre (jour férié national).",
      mapa: "Peniche",
      dataISO: "2026-10-05",
      horaInicio: "09:00",
      horaFim: "10:00",
      local: "Peniche"
    },
    {
      nome: "🕯️ Dia de Todos os Santos",
      descPT: "1 de novembro (feriado nacional).",
      descEN: "All Saints' Day (national holiday).",
      descES: "1 de noviembre (festivo nacional).",
      descFR: "1er novembre (jour férié national).",
      mapa: "Peniche",
      dataISO: "2026-11-01",
      horaInicio: "09:00",
      horaFim: "10:00",
      local: "Peniche"
    },
    {
      nome: "🇵🇹 Restauração da Independência",
      descPT: "1 de dezembro (feriado nacional).",
      descEN: "Independence Restoration Day (national holiday).",
      descES: "1 de diciembre (festivo nacional).",
      descFR: "1er décembre (jour férié national).",
      mapa: "Peniche",
      dataISO: "2026-12-01",
      horaInicio: "09:00",
      horaFim: "10:00",
      local: "Peniche"
    },
    {
      nome: "✨ Imaculada Conceição",
      descPT: "8 de dezembro (feriado nacional).",
      descEN: "Immaculate Conception (national holiday).",
      descES: "8 de diciembre (festivo nacional).",
      descFR: "8 décembre (jour férié national).",
      mapa: "Peniche",
      dataISO: "2026-12-08",
      horaInicio: "09:00",
      horaFim: "10:00",
      local: "Peniche"
    },
    {
      nome: "🎄 Natal",
      descPT: "25 de dezembro (feriado nacional).",
      descEN: "Christmas Day (national holiday).",
      descES: "25 de diciembre (festivo nacional).",
      descFR: "25 décembre (jour férié national).",
      mapa: "Peniche",
      dataISO: "2026-12-25",
      horaInicio: "09:00",
      horaFim: "10:00",
      local: "Peniche"
    },
    {
      nome: "🎶 Baleal Offshore Beats",
      link: "https://balealoffshorebeats.pt",
      descPT: "Festival no Baleal/Ferrel. Datas variam — consulta a agenda oficial.",
      descEN: "Festival in Baleal/Ferrel. Dates vary — check official agenda.",
      descES: "Festival en Baleal/Ferrel. Las fechas varían — consulta la agenda oficial.",
      descFR: "Festival à Baleal/Ferrel. Les dates varient — consulte l'agenda officiel.",
      mapa: "Baleal Ferrel",
      local: "Baleal"
    },
    {
      nome: "⛪ Festas de Santo Estêvão (Baleal)",
      descPT: "Festas com procissão à volta da ilha. Datas variam — confirma na página oficial.",
      descEN: "Local festivities with procession around the island. Dates vary — please confirm.",
      descES: "Fiestas con procesión alrededor de la isla. Las fechas varían — confirma en la página oficial.",
      descFR: "Fêtes avec procession autour de l'île. Les dates varient — merci de confirmer sur la page officielle.",
      mapa: "Ilha do Baleal",
      local: "Baleal"
    }
]
};

// --------- UTILITÁRIAS ---------
function labelCategoria(cat) {
  const labels = {
    pt: {
      Praias: "Praias",
      Locais: "Locais de interesse",
      Supermercados: "Supermercados",
      Restaurantes: "Restaurantes",
      Churrasqueiras: "Churrasqueiras",
      Bares: "Bares",
      FastFood: "Fast-Food",
      Farmacias: "Farmácias",
      Eventos: "Eventos"
    },
    en: {
      Praias: "Beaches",
      Locais: "Places of interest",
      Supermercados: "Supermarkets",
      Restaurantes: "Restaurants",
      Churrasqueiras: "Grill & BBQ",
      Bares: "Bars",
      FastFood: "Fast food",
      Farmacias: "Pharmacies",
      Eventos: "Local events"
    },
    es: {
      Praias: "Playas",
      Locais: "Lugares de interés",
      Supermercados: "Supermercados",
      Restaurantes: "Restaurantes",
      Churrasqueiras: "Parrillas",
      Bares: "Bares",
      FastFood: "Comida rápida",
      Farmacias: "Farmacias",
      Eventos: "Eventos locales"
    },
    fr: {
      Praias: "Plages",
      Locais: "Lieux d’intérêt",
      Supermercados: "Supermarchés",
      Restaurantes: "Restaurants",
      Churrasqueiras: "Grillades",
      Bares: "Bars",
      FastFood: "Fast-food",
      Farmacias: "Pharmacies",
      Eventos: "Événements locaux"
    }
  };

  const lang = labels[currentLang] ? currentLang : "en";
  return labels[lang][cat] || cat;
}

function desc(item) {
  if (currentLang === "pt") return item.descPT || item.descEN || "";
  if (currentLang === "en") return item.descEN || item.descPT || "";
  if (currentLang === "es") return item.descES || item.descEN || item.descPT || "";
  if (currentLang === "fr") return item.descFR || item.descEN || item.descPT || "";
  return item.descEN || item.descPT || "";
}

// --------- FAVORITOS (localStorage) ---------
function loadLanguage() {
  try {
    const saved = localStorage.getItem(LS_KEY_LANG);
    if (saved === "pt" || saved === "en" || saved === "es" || saved === "fr") return saved;
  } catch {}
  return "pt";
}

function saveLanguage(lang) {
  try { localStorage.setItem(LS_KEY_LANG, lang); } catch {}
}

function loadFavoritos() {
  try {
    const raw = localStorage.getItem(LS_KEY_FAVS);
    if (!raw) return;
    const arr = JSON.parse(raw);
    favoritos = new Set(arr);
  } catch {}
}

function saveFavoritos() {
  localStorage.setItem(LS_KEY_FAVS, JSON.stringify([...favoritos]));
}

function favKey(cat, nome) {
  return `${cat}|${nome}`;
}

function isFav(cat, nome) {
  return favoritos.has(favKey(cat, nome));
}

function toggleFav(cat, nome) {
  const key = favKey(cat, nome);
  if (favoritos.has(key)) favoritos.delete(key);
  else favoritos.add(key);
  saveFavoritos();
}

// --------- RENDER ---------
function passaFiltroPesquisa(item) {
  if (!searchTerm.trim()) return true;
  const termo = searchTerm.toLowerCase();
  return (
    (item.nome || "").toLowerCase().includes(termo) ||
    (item.descPT || "").toLowerCase().includes(termo) ||
    (item.descEN || "").toLowerCase().includes(termo) ||
    (item.descES || "").toLowerCase().includes(termo) ||
    (item.descFR || "").toLowerCase().includes(termo) ||
    (item.tipVB || "").toLowerCase().includes(termo)
  );
}

function gerarCategoriasPrincipais() {
  cardsContainer.innerHTML = "";
  Object.keys(data).forEach(cat => {
    const label = labelCategoria(cat);
    const icon = iconByCat[cat] || "📍";
    const texto = getHomeI18n().tapToSeeAll(label);

    const card = document.createElement("article");
    card.className = "card";
    card.dataset.cat = cat;

    const img = imgByCat[cat];
    card.innerHTML = `
      <img class="card-img" src="${img}" alt="${label}" loading="lazy" />
      <div class="card-header">
        <div class="card-title"><span class="card-ico">${icon}</span><span>${label}</span></div>
      </div>
      <div class="card-desc">${texto}</div>
      <div class="card-footer">
        <span class="card-meta">${getHomeI18n().vanBertoSuggestions}</span>
      </div>
    `;

    card.addEventListener("click", () => {
      switchCategory(cat);
    });

    cardsContainer.appendChild(card);
  });
}



// ===== Eventos: cards mostram só o que é local/relevante (calendário pode ter tudo) =====
function isEventoParaCards(item){
  if(!item) return false;

  const nome = (item.nome || "").toLowerCase();
  const descpt = (item.descPT || "").toLowerCase();

  // Exclui feriados nacionais nos cards
  const isFeriadoNacional = descpt.includes("feriado nacional") || nome.includes("feriado:") || nome.startsWith("🇵🇹");

  if(isFeriadoNacional) return false;

  // Mantém eventos realmente locais/úteis
  const keep = [
    "boa viagem", "baleal offshore beats", "santo estêvão", "santo estevao",
    "município", "municipio", "peniche", "baleal", "supertubos", "wsl", "feira", "mercado"
  ];
  const isLocal = keep.some(k => nome.includes(k) || descpt.includes(k));

  // Se tiver data e for claramente local, mostra
  if(item.dataISO && isLocal) return true;

  // Se não tiver data, ainda pode ser local (festival anual)
  if(isLocal) return true;

  return false;
}

function gerarCardsDeCategoria(cat) {
  cardsContainer.innerHTML = "";
  const lista = data[cat] || [];
  const labelCat = labelCategoria(cat);
  const icon = iconByCat[cat] || "📍";

  lista
    .filter(passaFiltroPesquisa)
    .filter(item => (cat === "Eventos" ? isEventoParaCards(item) : true))
    .forEach(item => {
      const card = document.createElement("article");
      card.className = "card";
      card.dataset.cat = cat;

      const fav = isFav(cat, item.nome);
      const descText = desc(item);

      const img = item.img || imgByCat[cat];
      card.innerHTML = `
        <img class="card-img" src="${img}" alt="${item.nome}" loading="lazy" />
        <div class="card-header">
          <div class="card-title"><span class="card-ico">${icon}</span><span>${item.nome}</span></div>
        </div>
        <div class="card-category">${labelCat}</div>
        <div class="card-desc">${descText}</div>
        <div class="card-footer">
          <span class="card-meta">${getHomeI18n().tapForDetails}</span>
          <button class="fav-btn" aria-label="Favorito">${fav ? "★" : "☆"}</button>
        </div>
      `;

      const favBtn = card.querySelector(".fav-btn");
      favBtn.addEventListener("click", ev => {
        ev.stopPropagation();
        toggleFav(cat, item.nome);
        favBtn.textContent = isFav(cat, item.nome) ? "★" : "☆";
        if (itemAtual && itemAtual.nome === item.nome && itemAtual.cat === cat) {
          atualizarFavToggle();
        }
      });

      card.addEventListener("click", () => abrirModal(cat, item));

      cardsContainer.appendChild(card);
    });

  if (!cardsContainer.children.length) {
    const msg = document.createElement("p");
    msg.style.color = "#9ca3af";
    msg.style.fontSize = "13px";
    msg.textContent = getHomeI18n().noResults;
    cardsContainer.appendChild(msg);
  }
}


function gerarFavoritos() {
  cardsContainer.innerHTML = "";
  const itens = [];
  Object.keys(data).forEach(cat => {
    (data[cat] || []).forEach(item => {
      if (isFav(cat, item.nome)) itens.push({ cat, item });
    });
  });

  if (!itens.length) {
    const msg = document.createElement("p");
    msg.style.color = "#9ca3af";
    msg.style.fontSize = "13px";
    msg.textContent =
      currentLang === "pt"
        ? "Ainda não adicionaste favoritos. Toca numa estrela para guardares locais."
        : "No favourites yet. Tap a star to save places.";
    cardsContainer.appendChild(msg);
    return;
  }

  // Mantém a pesquisa a funcionar também nos favoritos
  itens
    .filter(({ item }) => passaFiltroPesquisa(item))
    .forEach(({ cat, item }) => {
      const labelCat = labelCategoria(cat);
      const icon = iconByCat[cat] || "📍";

      const card = document.createElement("article");
      card.className = "card";
      card.dataset.cat = cat;

      const descText = desc(item);

      const img = item.img || imgByCat[cat];
      card.innerHTML = `
        <img class="card-img" src="${img}" alt="${item.nome}" loading="lazy" />
        <div class="card-header">
          <div class="card-title"><span class="card-ico">${icon}</span><span>${item.nome}</span></div>
        </div>
        <div class="card-category">${labelCat}</div>
        <div class="card-desc">${descText}</div>
        <div class="card-footer">
          <span class="card-meta">${getHomeI18n().tapForDetails}</span>
          <button class="fav-btn" aria-label="Favorito">★</button>
        </div>
      `;

      const favBtn = card.querySelector(".fav-btn");
      favBtn.addEventListener("click", ev => {
        ev.stopPropagation();
        toggleFav(cat, item.nome);
        // Se removeu, re-renderiza para tirar da lista
        renderAtual();
try{ toggleEventsCalendar(false); }catch{}
        if (itemAtual && itemAtual.nome === item.nome && itemAtual.cat === cat) {
          atualizarFavToggle();
        }
      });

      card.addEventListener("click", () => abrirModal(cat, item));

      cardsContainer.appendChild(card);
    });
}

function renderAtual() {
  // Transição suave ao trocar de vista
  cardsContainer.classList.add("fade-out");
  window.requestAnimationFrame(() => {
    if (currentCategory === "tudo") gerarCategoriasPrincipais();
    else if (currentCategory === "favoritos") gerarFavoritos();
    else gerarCardsDeCategoria(currentCategory);

    if (backBtn) backBtn.hidden = currentCategory === "tudo";

    toggleEventsCalendar(currentCategory === "Eventos");

    window.requestAnimationFrame(() => {
      cardsContainer.classList.remove("fade-out");
    });
  });
}


function formatEventDate(item){
  // item.dataISO: YYYY-MM-DD, item.horaInicio: HH:MM, item.horaFim: HH:MM
  if (!item.dataISO) return null;
  const dateStr = item.dataISO;
  const timeA = item.horaInicio ? item.horaInicio : "";
  const timeB = item.horaFim ? ("–" + item.horaFim) : "";
  return `${dateStr}${timeA ? " · " + timeA + timeB : ""}`;
}

function makeICS({ title, description, location, startISO, endISO }){
  // startISO/endISO: YYYYMMDDTHHMMSSZ
  const uid = `${Date.now()}-${Math.random().toString(16).slice(2)}@vanbertos`;
  const dtstamp = new Date().toISOString().replace(/[-:]/g,"").split(".")[0] + "Z";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//VanBerto's//Peniche Guide//PT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${startISO}`,
    `DTEND:${endISO}`,
    `SUMMARY:${escapeICS(title)}`,
    `DESCRIPTION:${escapeICS(description || "")}`,
    `LOCATION:${escapeICS(location || "")}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ];
  return lines.join("\r\n");
}

function escapeICS(s){
  return String(s)
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/:/g, "\\:");
}

function toICSDateTime(dateISO, timeHHMM){
  // dateISO YYYY-MM-DD; timeHHMM HH:MM (local) -> create UTC-ish without tz conversions (good enough for simple use)
  const [y,m,d] = dateISO.split("-").map(Number);
  const [hh,mm] = (timeHHMM || "12:00").split(":").map(Number);
  const dt = new Date(Date.UTC(y, m-1, d, hh, mm, 0));
  return dt.toISOString().replace(/[-:]/g,"").split(".")[0] + "Z";
}

function fillEventPanel(cat, item){
  if (!eventDateEl || !eventMetaEl || !eventAddCalBtn || !eventCopyBtn || !eventNoteEl) return;

  const t = (function(){
    // tenta ir buscar strings do dicionário já usado
    const map = {
      pt: { add:"📅 Adicionar ao calendário", copy:"📋 Copiar detalhes", noDate:"Este evento não tem data definida. Confirma no próprio dia.", offlineMap:"O mini-mapa pode não aparecer offline. Usa o botão para abrir no Maps quando tiveres rede." },
      en: { add:"📅 Add to calendar", copy:"📋 Copy details", noDate:"This event has no fixed date. Please confirm on the day.", offlineMap:"The mini-map may not load offline. Use the button to open Maps when online." },
      es: { add:"📅 Añadir al calendario", copy:"📋 Copiar detalles", noDate:"Este evento no tiene fecha fija. Confirma el mismo día.", offlineMap:"El mini-mapa puede no cargarse offline. Usa el botón para abrir Maps cuando tengas internet." },
      fr: { add:"📅 Ajouter au calendrier", copy:"📋 Copier les détails", noDate:"Cet événement n’a pas de date fixe. Vérifie le jour même.", offlineMap:"La mini-carte peut ne pas charger hors ligne. Utilise le bouton pour ouvrir Maps quand tu es en ligne." }
    };
    return map[currentLang] || map.en;
  })();

  eventAddCalBtn.textContent = t.add;
  eventCopyBtn.textContent = t.copy;

  const d = formatEventDate(item);
  eventDateEl.textContent = d || "";
  const loc = item.local || (item.mapa || "");
  eventMetaEl.textContent = loc ? `📍 ${loc}` : "";

  // Nota: se não houver data fixa, mostrar aviso
  eventNoteEl.textContent = d ? t.offlineMap : t.noDate;

  eventCopyBtn.onclick = async () => {
    const txt = `${item.nome}\n${desc(item)}\n${loc ? "Local: " + loc + "\n" : ""}${d ? "Data: " + d : ""}`;
    try {
      await navigator.clipboard.writeText(txt);
      eventCopyBtn.textContent = "✅";
      setTimeout(() => { eventCopyBtn.textContent = t.copy; }, 900);
    } catch {
      prompt("Copiar:", txt);
    }
  };

  eventAddCalBtn.onclick = () => {
    // se não houver data, não gera calendário
    if (!item.dataISO) return;
    const start = toICSDateTime(item.dataISO, item.horaInicio || "12:00");
    const end = toICSDateTime(item.dataISO, item.horaFim || item.horaInicio || "13:00");
    const ics = makeICS({
      title: item.nome,
      description: desc(item),
      location: loc,
      startISO: start,
      endISO: end
    });
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "evento.ics";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
}



function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
}

function isFoodCategory(cat){
  // categorias com detalhes (comidas e bebidas)
  return cat === "Restaurantes" || cat === "Bares" || cat === "FastFood" || cat === "Churrasqueiras";
}

function clearFoodDetails(){
  if(!modalDetails) return;
  modalDetails.innerHTML = "";
  modalDetails.hidden = true;
}


function smartFoodTip(item){
  const txt = ((item.nome || "") + " " + (item.descPT || "") + " " + (item.descEN || "")).toLowerCase();

  const tips = {
    pt: {
      peixe: "Pergunta pelo peixe do dia e pelo que está mais fresco.",
      marisco: "Se gostas de marisco, pergunta o que está disponível no dia.",
      grelhado: "Para grelhados, pede recomendações do staff (ponto e acompanhamentos).",
      tradicional: "Pede o prato do dia — costuma ser a melhor escolha.",
      pizza: "Em horas de pico, é melhor reservar ou chegar cedo.",
      sushi: "Se fores em grupo, pergunta por menus/combos para partilhar.",
      vegetariano: "Pergunta por opções vegetarianas e acompanhamentos.",
      sobremesa: "Guarda espaço para a sobremesa da casa.",
      bar: "Confirma se há petiscos e se existe música ao vivo em certos dias.",
      default: "Pergunta pela especialidade da casa e pelo prato do dia."
    },
    en: {
      peixe: "Ask for the catch of the day and what’s freshest.",
      marisco: "If you like seafood, ask what’s available today.",
      grelhado: "For grilled dishes, ask the staff for their recommendations.",
      tradicional: "Ask for the dish of the day — often the best pick.",
      pizza: "At peak hours, it’s better to book or arrive early.",
      sushi: "For groups, ask for sharing menus/combos.",
      vegetariano: "Ask for vegetarian options and sides.",
      sobremesa: "Save room for the house dessert.",
      bar: "Check if they serve snacks and whether there’s live music on some days.",
      default: "Ask for the house specialty and the dish of the day."
    },
    es: {
      peixe: "Pregunta por el pescado del día y lo más fresco.",
      marisco: "Si te gusta el marisco, pregunta qué hay hoy.",
      grelhado: "Para platos a la parrilla, pide recomendaciones.",
      tradicional: "Pregunta por el plato del día — suele ser la mejor opción.",
      pizza: "En horas punta, mejor reservar o ir temprano.",
      sushi: "Para grupos, pregunta por menús/combos para compartir.",
      vegetariano: "Pregunta por opciones vegetarianas.",
      sobremesa: "Deja sitio para el postre de la casa.",
      bar: "Confirma si hay tapas y si hay música en directo algunos días.",
      default: "Pregunta por la especialidad de la casa y el plato del día."
    },
    fr: {
      peixe: "Demande le poisson du jour et ce qui est le plus frais.",
      marisco: "Si tu aimes les fruits de mer, demande ce qu’il y a aujourd’hui.",
      grelhado: "Pour les grillades, demande les conseils du personnel.",
      tradicional: "Demande le plat du jour — souvent le meilleur choix.",
      pizza: "Aux heures de pointe, mieux vaut réserver ou arriver tôt.",
      sushi: "Pour les groupes, demande des menus/combos à partager.",
      vegetariano: "Demande des options végétariennes.",
      sobremesa: "Garde de la place pour le dessert maison.",
      bar: "Vérifie s’il y a des snacks et de la musique live certains jours.",
      default: "Demande la spécialité de la maison et le plat du jour."
    }
  };

  const t = tips[currentLang] || tips.en;

  if (txt.includes("bar") || txt.includes("cocktail") || txt.includes("cerveja") || txt.includes("beer")) return t.bar;
  if (txt.includes("marisco") || txt.includes("seafood") || txt.includes("fruits de mer")) return t.marisco;
  if (txt.includes("peixe") || txt.includes("fish")) return t.peixe;
  if (txt.includes("grelh") || txt.includes("grill")) return t.grelhado;
  if (txt.includes("tradicion") || txt.includes("traditional") || txt.includes("caseir")) return t.tradicional;
  if (txt.includes("pizza")) return t.pizza;
  if (txt.includes("sushi")) return t.sushi;
  if (txt.includes("vegetar")) return t.vegetariano;
  if (txt.includes("sobremesa") || txt.includes("dessert")) return t.sobremesa;

  return t.default;
}

function renderFoodDetails(item){
  if(!modalDetails) return;

  const L = {
    pt: { horario:"Horário", preco:"Preço", tipo:"Tipo", reservas:"Reservas", takeaway:"Take-away", dica:"Dica" },
    en: { horario:"Hours", preco:"Price", tipo:"Type", reservas:"Bookings", takeaway:"Takeaway", dica:"Tip" },
    es: { horario:"Horario", preco:"Precio", tipo:"Tipo", reservas:"Reservas", takeaway:"Para llevar", dica:"Consejo" },
    fr: { horario:"Horaires", preco:"Prix", tipo:"Type", reservas:"Réservation", takeaway:"À emporter", dica:"Astuce" }
  };
  const l = L[currentLang] || L.en;

  // defaults leves (sem inventar factos específicos)
  const Tdef = getHomeI18n();
  const horario = item.horario || Tdef.defaultHorario;
  const preco = item.preco || "€€";
  const tipo = item.tipoComida || item.tipo || Tdef.defaultTipo;
  const reservas = item.reservas || Tdef.defaultReservas;
  const takeaway = item.takeaway || Tdef.defaultTakeaway;
  const dica = item.dica || smartFoodTip(item);

  const chips = [
    { ico:"⏰", k:l.horario, v:horario },
    { ico:"💶", k:l.preco, v:preco },
    { ico:"🍽️", k:l.tipo, v:tipo },
    { ico:"📌", k:l.reservas, v:reservas },
    { ico:"🥡", k:l.takeaway, v:takeaway },
    { ico:"⭐", k:l.dica, v:dica }
  ];

  modalDetails.innerHTML = chips.map(c => `
    <div class="detail-chip">
      <div class="detail-ico" aria-hidden="true">${c.ico}</div>
      <div class="detail-txt">
        <div class="detail-k">${c.k}</div>
        <div class="detail-v">${escapeHtml(c.v)}</div>
      </div>
    </div>
  `).join("");

  modalDetails.hidden = false;
}



function normalizePhone(raw){
  if(!raw) return "";
  const s = String(raw).trim();
  const digits = s.replace(/[^\d+]/g,"");
  // keep + if first char is +
  if(digits.startsWith("+")) return digits;
  // if it already looks like country code (11+ digits), keep
  const only = digits.replace(/[^\d]/g,"");
  if(only.length >= 11) return "+" + only;
  // PT heuristic: 9 digits -> +351
  if(only.length === 9) return "+351" + only;
  return "+" + only;
}

function waLinkFromPhone(raw){
  const p = normalizePhone(raw);
  const digits = p.replace(/[^\d]/g,"");
  if(!digits) return "";
  return "https://wa.me/" + digits;
}



function setupQuickActions(item, cat){
  if(!isFoodBizCategory(cat)){
    if(modalActions) modalActions.hidden = true;
    if(btnCall){ btnCall.hidden = true; btnCall.onclick = null; }
    if(btnWhatsapp){ btnWhatsapp.hidden = true; btnWhatsapp.onclick = null; }
    return;
  }
  if(!modalActions || !btnCall || !btnWhatsapp) return;

  const phone = item.telefone || item.tel || item.phone || "";
  const wa = item.whatsapp || phone;

  // Ligar
  if(phone){
    btnCall.hidden = false;
    btnCall.textContent = getHomeI18n().callBtn;
    btnCall.onclick = () => {
      const p = normalizePhone(phone);
      const digits = p.replace(/[^\d]/g,"");
      if(digits) window.location.href = "tel:" + digits;
    };
  } else {
    // fallback útil: abre o local no Google Maps para ver contacto
    btnCall.hidden = false;
    btnCall.textContent = getHomeI18n().callBtnGoogle;
    btnCall.onclick = () => window.open(mapsSearchUrl(item), "_blank", "noopener");
  }

  // WhatsApp
  const waUrl = waLinkFromPhone(wa);
  if(waUrl){
    btnWhatsapp.hidden = false;
    btnWhatsapp.onclick = () => window.open(waUrl, "_blank", "noopener");
  } else {
    btnWhatsapp.hidden = true;
    btnWhatsapp.onclick = null;
  }

  // mostrar/esconder container
  modalActions.hidden = (btnCall.hidden && btnWhatsapp.hidden);
}



function autoPhotoUrl(cat, item){
  // NOTA: o serviço "Unsplash Source" (source.unsplash.com) foi descontinuado
  // pela Unsplash em 2021 e já não responde (dá erro). Por isso deixámos de o usar.
  // Em vez disso, quando um local não tem item.img próprio, usamos o
  // placeholder SVG local (imgByCat) — que é 100% offline e sempre funciona.
  return (imgByCat && imgByCat[cat]) || imgByCat.Locais;
}



function mapsSearchUrl(item){
  const q = item && (item.mapsQuery || item.mapa || item.nome) ? (item.mapsQuery || item.mapa || item.nome) : "";
  if(!q) return "https://www.google.com/maps";
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q);
}


// --------- MODAL ---------
function abrirModal(cat, item) {
  // Reset botões rápidos (evita "ficar preso" de modais anteriores)
  if (typeof modalActions !== "undefined" && modalActions) modalActions.hidden = true;
  if (typeof btnCall !== "undefined" && btnCall) { btnCall.hidden = true; btnCall.onclick = null; }
  if (typeof btnWhatsapp !== "undefined" && btnWhatsapp) { btnWhatsapp.hidden = true; btnWhatsapp.onclick = null; }

  lastFocusEl = document.activeElement;
  itemAtual = { ...item, cat };
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
  setTimeout(() => { modalCloseBtn?.focus(); }, 0);

  modalTitle.textContent = item.nome;
  modalCategory.textContent = labelCategoria(cat);
  modalDesc.textContent = desc(item);

  // Dica da Vanda e do Berto
  const _tipBox = document.getElementById("modal-owner-tip");
  const _tipTxt = document.getElementById("modal-owner-tip-text");
  if (_tipBox && _tipTxt) {
    if (item.tipVB) {
      _tipTxt.textContent = item.tipVB;
      _tipBox.style.display = "flex";
    } else {
      _tipBox.style.display = "none";
    }
  }

  // Foto real (se existir)
  const photo = item.img || item.imagem || (imgByCat && imgByCat[cat]) || "";
  if (modalPhoto && photo) {
    modalPhoto.src = photo;
    modalPhoto.alt = item.nome || "";
    modalPhoto.hidden = false;
  } else if (modalPhoto) {
    modalPhoto.removeAttribute('src');
    modalPhoto.alt = "";
    modalPhoto.hidden = true;
  }

  // Botões rápidos (Ligar / WhatsApp)
  if(!isFoodBizCategory(cat)){
    if(modalActions){ modalActions.hidden = true; }
    if(btnCall){ btnCall.hidden = true; btnCall.onclick = null; }
    if(btnWhatsapp){ btnWhatsapp.hidden = true; btnWhatsapp.onclick = null; }
  } else {
    setupQuickActions(item, cat);
  }

  // Evento: mostra/oculta separador e painel
  if (tabEvent) {
    const isEvent = cat === "Eventos";
    tabEvent.style.display = isEvent ? "" : "none";
    const panelEvent = document.getElementById("panel-event");
    if (panelEvent) panelEvent.style.display = isEvent ? "" : "none";
    if (isEvent) fillEventPanel(cat, item);
  }

  const mapMsg = modalMapText.dataset[currentLang] || modalMapText.dataset.en || "";
  modalMapText.textContent = mapMsg;

  // Mini-mapa embutido (iframe) — com aviso quando não há ligação à internet
  if (modalMapIframe) {
    const destino = item.mapa || item.nome;
    const embed = "https://www.google.com/maps?q=" + encodeURIComponent(destino) + "&output=embed";
    modalMapIframe.src = embed;
  }
  atualizarEstadoMapaOffline();

  atualizarFavToggle();
  ativarTab("info");

  modalOpenMapsBtn.textContent = modalOpenMapsBtn.dataset[currentLang] || modalOpenMapsBtn.dataset.en || modalOpenMapsBtn.textContent;
  modalOpenMapsBtn.onclick = () => {
    const destino = item.mapa || item.nome;
    const url =
      "https://www.google.com/maps/search/?api=1&query=" +
      encodeURIComponent(destino);
    window.location.href = url;
  };
}

function fecharModal() {
  modal.classList.remove("show");
  
  
  if(modalPhoto){ modalPhoto.hidden = true; modalPhoto.removeAttribute("src"); }
  if(modalActions){ modalActions.hidden = true; }
clearFoodDetails();
modal.setAttribute("aria-hidden", "true");
  itemAtual = null;
  try { lastFocusEl?.focus?.(); } catch {}
}

function atualizarFavToggle() {
  if (!itemAtual) return;
  const fav = isFav(itemAtual.cat, itemAtual.nome);
  favToggleBtn.textContent = fav ? "★" : "☆";
}

function ativarTab(tabName) {
  tabButtons.forEach(btn => {
    const isActive = btn.dataset.tab === tabName;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-selected", isActive ? "true" : "false");
  });
  tabPanels.forEach(panel =>
    panel.classList.toggle("active", panel.id === "panel-" + tabName)
  );
  if (tabName === "map") atualizarEstadoMapaOffline();
}

// --------- MAPA: aviso quando não há ligação à internet ---------
function atualizarEstadoMapaOffline() {
  const offline = !navigator.onLine;
  if (mapOfflineMsg) mapOfflineMsg.hidden = !offline;
  if (modalMapIframe) modalMapIframe.style.visibility = offline ? "hidden" : "visible";
}

window.addEventListener("online", atualizarEstadoMapaOffline);
window.addEventListener("offline", atualizarEstadoMapaOffline);

if (mapOfflineBtn) {
  mapOfflineBtn.addEventListener("click", () => {
    if (!itemAtual) return;
    const destino = itemAtual.mapa || itemAtual.nome;
    window.location.href =
      "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(destino);
  });
}

// --------- LÍNGUA ---------
function atualizarTextosEstaticos() {
  const T = {
    pt: {
      title: "VanBerto's Beach House – Dicas de Peniche",
      brandTitle: 'Peniche – "Capital da Onda e do Surf"',
      tagline: "Guia digital para hóspedes do VanBerto's Beach House",
      h1: "Dicas para aproveitar Peniche",
      subtitle:
        "Escolhe uma categoria, pesquisa por palavra-chave ou abre um local para ver mais detalhes e o percurso no Google Maps.",
      btnMain: "Menus principais",
      btnFavs: "⭐ Favoritos",
      btnPraias: "Praias",
      btnLocais: "Locais de interesse",
      btnSuper: "Supermercados",
      btnFarm: "Farmácias",
      btnRest: "Restaurantes",
      btnChurras: "Churrasqueiras",
      btnBares: "Bares",
      btnEventos: "📅 Eventos",
      btnFast: "Fast-Food",
      btnMapAll: "🗺️ Ver todas as localizações no mapa",
      btnShareFavs: "🔗 Partilhar favoritos (QR)",
      back: "← Voltar",
      searchPh: "🔍 Procurar por praia, restaurante, pizza, sushi...",
      contact: "📱 " + HOUSE_PHONE_DISPLAY,
      directions: "📍 Como chegar à casa",
      footer1: "📍 VanBerto's Beach House · Baleal · Peniche",
      footer2: "🌊 Guia rápido para aproveitares o melhor da tua estadia",
      tabInfo: "ℹ️ Info",
      tabMap: "🗺️ Mapa",
      mapText: "Pré-visualização do mapa e ligação para abrir o trajeto no Google Maps.",
      mapsBtn: "📍 Abrir no Google Maps",
      qrTitle: "Partilhar favoritos",
      qrText: "A outra pessoa pode abrir este link ou ler o QR para importar os teus favoritos.",
      qrHint: "Dica: isto funciona melhor se estiveres num site (https) ou a usar Live Server.",
      qrCopy: "📋 Copiar link",
      qrClear: "🗑️ Limpar favoritos",
      importAsk: "Encontrámos favoritos no link. Queres importá-los?",
      importYes: "Importar",
      importNo: "Ignorar"
    },
    en: {
      title: "VanBerto's Beach House – Peniche Guide",
      brandTitle: 'Peniche – "Capital of the Waves and Surf"',
      tagline: "Digital guide for guests of VanBerto's Beach House",
      h1: "Tips to enjoy Peniche",
      subtitle:
        "Choose a category, search by keyword or open a place to see more details and the route on Google Maps.",
      btnMain: "Main menus",
      btnFavs: "⭐ Favourites",
      btnPraias: "Beaches",
      btnLocais: "Places of interest",
      btnSuper: "Supermarkets",
      btnFarm: "Pharmacies",
      btnRest: "Restaurants",
      btnChurras: "Grill & BBQ",
      btnBares: "Bars",
      btnEventos: "📅 Events",
      btnFast: "Fast food",
      btnMapAll: "🗺️ View all locations on the map",
      btnShareFavs: "🔗 Share favourites (QR)",
      back: "← Back",
      searchPh: "🔍 Search for beach, restaurant, pizza, sushi...",
      contact: "📱 " + HOUSE_PHONE_DISPLAY,
      directions: "📍 Get directions to the house",
      footer1: "📍 VanBerto's Beach House · Baleal · Peniche",
      footer2: "🌊 Quick guide to enjoy the best of your stay",
      tabInfo: "ℹ️ Info",
      tabMap: "🗺️ Map",
      mapText: "Map preview and a link to open directions in Google Maps.",
      mapsBtn: "📍 Open in Google Maps",
      qrTitle: "Share favourites",
      qrText: "The other person can open this link or scan the QR to import your favourites.",
      qrHint: "Tip: this works best on a hosted site (https) or using Live Server.",
      qrCopy: "📋 Copy link",
      qrClear: "🗑️ Clear favourites",
      importAsk: "We found favourites in the link. Import them?",
      importYes: "Import",
      importNo: "Ignore"
    },
    es: {
      title: "VanBerto's Beach House – Guía de Peniche",
      brandTitle: 'Peniche – "Capital de las Olas y del Surf"',
      tagline: "Guía digital para huéspedes de VanBerto's Beach House",
      h1: "Consejos para disfrutar Peniche",
      subtitle:
        "Elige una categoría, busca por palabra clave o abre un lugar para ver más detalles y la ruta en Google Maps.",
      btnMain: "Menús",
      btnFavs: "⭐ Favoritos",
      btnPraias: "Playas",
      btnLocais: "Lugares de interés",
      btnSuper: "Supermercados",
      btnFarm: "Farmacias",
      btnRest: "Restaurantes",
      btnChurras: "Parrillas",
      btnBares: "Bares",
      btnEventos: "📅 Eventos",
      btnFast: "Comida rápida",
      btnMapAll: "🗺️ Ver todas las ubicaciones en el mapa",
      btnShareFavs: "🔗 Compartir favoritos (QR)",
      back: "← Volver",
      searchPh: "🔍 Buscar playa, restaurante, pizza, sushi...",
      contact: "📱 " + HOUSE_PHONE_DISPLAY,
      directions: "📍 Cómo llegar a la casa",
      footer1: "📍 VanBerto's Beach House · Baleal · Peniche",
      footer2: "🌊 Guía rápida para disfrutar tu estancia",
      tabInfo: "ℹ️ Info",
      tabMap: "🗺️ Mapa",
      mapText: "Vista previa del mapa y enlace para abrir la ruta en Google Maps.",
      mapsBtn: "📍 Abrir en Google Maps",
      qrTitle: "Compartir favoritos",
      qrText: "La otra persona puede abrir este enlace o escanear el QR para importar tus favoritos.",
      qrHint: "Consejo: funciona mejor en un sitio (https) o con Live Server.",
      qrCopy: "📋 Copiar enlace",
      qrClear: "🗑️ Borrar favoritos",
      importAsk: "Hemos encontrado favoritos en el enlace. ¿Importarlos?",
      importYes: "Importar",
      importNo: "Ignorar"
    },
    fr: {
      title: "VanBerto's Beach House – Guide de Peniche",
      brandTitle: 'Peniche – "Capitale des vagues et du surf"',
      tagline: "Guide digital pour les hôtes de VanBerto's Beach House",
      h1: "Conseils pour profiter de Peniche",
      subtitle:
        "Choisis une catégorie, cherche par mot-clé ou ouvre un lieu pour voir plus de détails et l’itinéraire sur Google Maps.",
      btnMain: "Menus",
      btnFavs: "⭐ Favoris",
      btnPraias: "Plages",
      btnLocais: "Lieux d’intérêt",
      btnSuper: "Supermarchés",
      btnFarm: "Pharmacies",
      btnRest: "Restaurants",
      btnChurras: "Grillades",
      btnBares: "Bars",
      btnEventos: "📅 Événements",
      btnFast: "Fast-food",
      btnMapAll: "🗺️ Voir toutes les localisations sur la carte",
      btnShareFavs: "🔗 Partager les favoris (QR)",
      back: "← Retour",
      searchPh: "🔍 Chercher plage, restaurant, pizza, sushi...",
      contact: "📱 " + HOUSE_PHONE_DISPLAY,
      directions: "📍 Comment venir à la maison",
      footer1: "📍 VanBerto's Beach House · Baleal · Peniche",
      footer2: "🌊 Guide rapide pour profiter de ton séjour",
      tabInfo: "ℹ️ Info",
      tabMap: "🗺️ Carte",
      mapText: "Aperçu de la carte et lien pour ouvrir l’itinéraire dans Google Maps.",
      mapsBtn: "📍 Ouvrir dans Google Maps",
      qrTitle: "Partager les favoris",
      qrText: "L’autre personne peut ouvrir ce lien ou scanner le QR pour importer tes favoris.",
      qrHint: "Astuce : ça marche mieux sur un site (https) ou avec Live Server.",
      qrCopy: "📋 Copier le lien",
      qrClear: "🗑️ Effacer les favoris",
      importAsk: "Nous avons trouvé des favoris dans le lien. Les importer ?",
      importYes: "Importer",
      importNo: "Ignorer"
    }
  };

  const lang = T[currentLang] ? currentLang : "en";
  const t = T[lang];

  document.title = t.title;
  brandTitleEl.textContent = t.brandTitle;
  brandTaglineEl.textContent = t.tagline;
  h1El.textContent = t.h1;
  if (subtitleEl) subtitleEl.textContent = t.subtitle;

  if (btnMain) btnMain.textContent = t.btnMain;
  if (btnFavs) btnFavs.textContent = t.btnFavs;
  if (btnPraias) btnPraias.textContent = t.btnPraias;
  if (btnLocais) btnLocais.textContent = t.btnLocais;
  if (btnSuper) btnSuper.textContent = t.btnSuper;
  if (btnFarm) btnFarm.textContent = t.btnFarm;
  if (btnRest) btnRest.textContent = t.btnRest;
  if (btnChurras) btnChurras.textContent = t.btnChurras;
  if (btnBares) btnBares.textContent = t.btnBares;
  if (btnEventos) btnEventos.textContent = t.btnEventos;
  if (btnFast) btnFast.textContent = t.btnFast;
  btnMapAll.textContent = t.btnMapAll;
  if (shareFavsBtn) shareFavsBtn.textContent = t.btnShareFavs;
  if (backBtn) backBtn.textContent = t.back;

  searchInput.placeholder = t.searchPh;
  contactBtn.textContent = t.contact;
  if (directionsBtn) directionsBtn.textContent = t.directions;
  footer1.textContent = t.footer1;
  footer2.textContent = t.footer2;

  tabInfo.textContent = t.tabInfo;
  tabMap.textContent = t.tabMap;

  // Textos do modal (os restantes são preenchidos quando abre)
  if (qrTitle) qrTitle.textContent = t.qrTitle;
  if (qrText) qrText.textContent = t.qrText;
  if (qrHint) qrHint.textContent = t.qrHint;
  if (qrCopyBtn) qrCopyBtn.textContent = t.qrCopy;
  if (qrClearBtn) qrClearBtn.textContent = t.qrClear;

  // Ajusta texto do mapa (usado no abrirModal)
  modalMapText.dataset.pt = T.pt.mapText;
  modalMapText.dataset.en = T.en.mapText;
  modalMapText.dataset.es = T.es.mapText;
  modalMapText.dataset.fr = T.fr.mapText;

  modalOpenMapsBtn.dataset.pt = T.pt.mapsBtn;
  modalOpenMapsBtn.dataset.en = T.en.mapsBtn;
  modalOpenMapsBtn.dataset.es = T.es.mapsBtn;
  modalOpenMapsBtn.dataset.fr = T.fr.mapsBtn;

  // Guardar strings para import
  window.__IMPORT_T = {
    ask: t.importAsk,
    yes: t.importYes,
    no: t.importNo
  };
}

function setLanguage(lang) {
  currentLang = lang;
  saveLanguage(lang);
  langButtons.forEach(btn =>
    btn.classList.toggle("active", btn.dataset.lang === lang)
  );
  atualizarTextosEstaticos();
  try{ applyHomeSectionsI18n(); }catch{}
  renderAtual();
try{ toggleEventsCalendar(false); }catch{}
}

// --------- MAPA COM TODAS AS LOCALIZAÇÕES ---------
function abrirTodasNoMapa() {
  const todos = [];
  Object.values(data).forEach(lista => {
    lista.forEach(item => {
      if (item.mapa) todos.push(item.mapa);
    });
  });

  const waypoints = todos.map(encodeURIComponent).join("|");
  const destino = encodeURIComponent(HOUSE_LOCATION.lat + "," + HOUSE_LOCATION.lng);
  const url =
    "https://www.google.com/maps/dir/?api=1&destination=" +
    destino +
    "&waypoints=" +
    waypoints;

  window.location.href = url;
}

// --------- NAVEGAÇÃO DE CATEGORIAS ---------
function switchCategory(cat) {
  // Ao entrar em Eventos, limpa a pesquisa para evitar lista vazia por filtro anterior
  if (cat === "Eventos" && searchInput && searchInput.value) {
    searchInput.value = "";
    searchTerm = "";
  }
  currentCategory = cat;
  renderAtual();
  try{ toggleEventsCalendar(false); }catch{}
}

if (backBtn) backBtn.addEventListener("click", () => switchCategory("tudo"));
if (btnFavs) btnFavs.addEventListener("click", () => switchCategory("favoritos"));

langButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    setLanguage(btn.dataset.lang);
  });
});

let searchDebounceTimer = null;
searchInput.addEventListener("input", () => {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    searchTerm = searchInput.value;
    renderAtual();
try{ toggleEventsCalendar(false); }catch{}
  }, 200);
});

document
  .getElementById("btn-map-all")
  .addEventListener("click", abrirTodasNoMapa);

modalCloseBtn.addEventListener("click", fecharModal);
modal.addEventListener("click", e => {
  if (e.target.classList.contains("modal-backdrop")) fecharModal();
});

favToggleBtn.addEventListener("click", () => {
  if (!itemAtual) return;
  toggleFav(itemAtual.cat, itemAtual.nome);
  atualizarFavToggle();
  renderAtual();
try{ toggleEventsCalendar(false); }catch{}
});

tabButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    ativarTab(btn.dataset.tab);
  });
});


// --------- QR CODE (pequeno gerador offline) ---------
// Baseado no trabalho de Kazuhiko Arase (qrcode-generator). Implementação compacta para QR simples.
function QR8bitByte(data){this.data=data;this.mode=1;this.getLength=function(){return this.data.length};this.write=function(buffer){for(let i=0;i<this.data.length;i++){buffer.put(this.data.charCodeAt(i),8)}}}
function QRBitBuffer(){this.buffer=[];this.length=0;this.get=function(i){const bufIndex=Math.floor(i/8);return((this.buffer[bufIndex]>>> (7-i%8))&1)==1};this.put=function(num,length){for(let i=0;i<length;i++){this.putBit(((num>>> (length-i-1))&1)==1)}};this.putBit=function(bit){const bufIndex=Math.floor(this.length/8);if(this.buffer.length<=bufIndex){this.buffer.push(0)}if(bit){this.buffer[bufIndex]|=(0x80>>> (this.length%8))}this.length++}}
const QRMath={EXP_TABLE:new Array(256),LOG_TABLE:new Array(256),glog(n){if(n<1)throw new Error("glog");return this.LOG_TABLE[n]},gexp(n){while(n<0)n+=255;while(n>=256)n-=255;return this.EXP_TABLE[n]}};
for(let i=0;i<8;i++)QRMath.EXP_TABLE[i]=1<<i;
for(let i=8;i<256;i++)QRMath.EXP_TABLE[i]=QRMath.EXP_TABLE[i-4]^QRMath.EXP_TABLE[i-5]^QRMath.EXP_TABLE[i-6]^QRMath.EXP_TABLE[i-8];
for(let i=0;i<255;i++)QRMath.LOG_TABLE[QRMath.EXP_TABLE[i]]=i;
function QRPolynomial(num,shift){let offset=0;while(offset<num.length&&num[offset]==0)offset++;this.num=new Array(num.length-offset+shift);for(let i=0;i<num.length-offset;i++)this.num[i]=num[i+offset];}
QRPolynomial.prototype.get=function(i){return this.num[i]};QRPolynomial.prototype.getLength=function(){return this.num.length};
QRPolynomial.prototype.multiply=function(e){const num=new Array(this.getLength()+e.getLength()-1).fill(0);for(let i=0;i<this.getLength();i++)for(let j=0;j<e.getLength();j++)num[i+j]^=QRMath.gexp(QRMath.glog(this.get(i))+QRMath.glog(e.get(j)));return new QRPolynomial(num,0)};
QRPolynomial.prototype.mod=function(e){if(this.getLength()-e.getLength()<0)return this;const ratio=QRMath.glog(this.get(0))-QRMath.glog(e.get(0));const num=this.num.slice();for(let i=0;i<e.getLength();i++)num[i]^=QRMath.gexp(QRMath.glog(e.get(i))+ratio);return new QRPolynomial(num,0).mod(e)};
function QRRSBlock(totalCount,dataCount){this.totalCount=totalCount;this.dataCount=dataCount}
const QRRSBlockTable={1:[[26,19]],2:[[44,34]],3:[[70,55]],4:[[100,80]]}; // versão 1-4, nível M
function getRSBlocks(typeNumber){const table=QRRSBlockTable[typeNumber];return table.map(t=>new QRRSBlock(t[0],t[1]))}
function QRUtil(){} 
QRUtil.getBCHTypeInfo=function(data){let d=data<<10;const g=0b10100110111;while(QRUtil.getBCHDigit(d)-QRUtil.getBCHDigit(g)>=0)d^=(g<<(QRUtil.getBCHDigit(d)-QRUtil.getBCHDigit(g)));return((data<<10)|d)^0b101010000010010};
QRUtil.getBCHDigit=function(data){let digit=0;while(data!=0){digit++;data>>>=1}return digit};
QRUtil.getMask=function(maskPattern,i,j){switch(maskPattern){case 0:return(i+j)%2==0;case 1:return i%2==0;case 2:return j%3==0;case 3:return(i+j)%3==0;case 4:return(Math.floor(i/2)+Math.floor(j/3))%2==0;case 5:return(i*j)%2+(i*j)%3==0;case 6:return((i*j)%2+(i*j)%3)%2==0;case 7:return((i*j)%3+(i+j)%2)%2==0;default:throw new Error("mask")}}
QRUtil.getErrorCorrectPolynomial=function(errorCorrectLength){let a=new QRPolynomial([1],0);for(let i=0;i<errorCorrectLength;i++)a=a.multiply(new QRPolynomial([1,QRMath.gexp(i)],0));return a};
QRUtil.getLengthInBits=function(mode,type){if(1<=type&&type<10)return 8;throw new Error("type")};
function QRCode(typeNumber,maskPattern){this.typeNumber=typeNumber;this.maskPattern=maskPattern;this.modules=null;this.moduleCount=0;this.dataCache=null;this.dataList=[]}
QRCode.prototype.addData=function(data){this.dataList.push(new QR8bitByte(data));this.dataCache=null};
QRCode.prototype.isDark=function(r,c){if(this.modules[r][c]!=null)return this.modules[r][c];return false};
QRCode.prototype.getModuleCount=function(){return this.moduleCount};
QRCode.prototype.make=function(){this.makeImpl(false,this.getBestMaskPattern())};
QRCode.prototype.makeImpl=function(test,mask){this.moduleCount=this.typeNumber*4+17;this.modules=new Array(this.moduleCount);for(let r=0;r<this.moduleCount;r++){this.modules[r]=new Array(this.moduleCount).fill(null)}
this.setupPositionProbePattern(0,0);this.setupPositionProbePattern(this.moduleCount-7,0);this.setupPositionProbePattern(0,this.moduleCount-7);
this.setupTimingPattern();this.setupTypeInfo(test,mask);
if(this.dataCache==null)this.dataCache=QRCode.createData(this.typeNumber,this.dataList);
this.mapData(this.dataCache,mask)};
QRCode.prototype.setupPositionProbePattern=function(row,col){for(let r=-1;r<=7;r++)for(let c=-1;c<=7;c++){if(row+r<=-1||this.moduleCount<=row+r||col+c<=-1||this.moduleCount<=col+c)continue;
if((0<=r&&r<=6&&(c==0||c==6))||(0<=c&&c<=6&&(r==0||r==6))||(2<=r&&r<=4&&2<=c&&c<=4))this.modules[row+r][col+c]=true;else this.modules[row+r][col+c]=false}}
QRCode.prototype.getBestMaskPattern=function(){let min=1e9;let best=0;for(let i=0;i<8;i++){this.makeImpl(true,i);let lost=QRCode.getLostPoint(this);if(lost<min){min=lost;best=i}}return best}
QRCode.prototype.setupTimingPattern=function(){for(let i=8;i<this.moduleCount-8;i++){if(this.modules[i][6]==null)this.modules[i][6]=(i%2==0);if(this.modules[6][i]==null)this.modules[6][i]=(i%2==0)}}
QRCode.prototype.setupTypeInfo=function(test,mask){const data=(1<<3)|mask;let bits=QRUtil.getBCHTypeInfo(data);for(let i=0;i<15;i++){const mod=!test&&((bits>>i)&1)==1;
if(i<6)this.modules[i][8]=mod;else if(i<8)this.modules[i+1][8]=mod;else this.modules[this.moduleCount-15+i][8]=mod}
for(let i=0;i<15;i++){const mod=!test&&((bits>>i)&1)==1;
if(i<8)this.modules[8][this.moduleCount-i-1]=mod;else if(i<9)this.modules[8][15-i-1+1]=mod;else this.modules[8][15-i-1]=mod}
this.modules[this.moduleCount-8][8]=!test}
QRCode.prototype.mapData=function(data,mask){let inc=-1;let row=this.moduleCount-1;let bitIndex=7;let byteIndex=0;
for(let col=this.moduleCount-1;col>0;col-=2){if(col==6)col--;
while(true){for(let c=0;c<2;c++){if(this.modules[row][col-c]==null){let dark=false;
if(byteIndex<data.length){dark=((data[byteIndex]>>>bitIndex)&1)==1}
const maskBit=QRUtil.getMask(mask,row,col-c);this.modules[row][col-c]=maskBit?!dark:dark;bitIndex--;if(bitIndex==-1){byteIndex++;bitIndex=7}}}
row+=inc;if(row<0||this.moduleCount<=row){row-=inc;inc=-inc;break}}}}
QRCode.createData=function(type,dataList){const rsBlocks=getRSBlocks(type);const buffer=new QRBitBuffer();
for(let i=0;i<dataList.length;i++){const data=dataList[i];buffer.put(data.mode,4);buffer.put(data.getLength(),QRUtil.getLengthInBits(data.mode,type));data.write(buffer)}
// terminator
let totalDataCount=0;for(let i=0;i<rsBlocks.length;i++)totalDataCount+=rsBlocks[i].dataCount;
if(buffer.length+4<=totalDataCount*8)buffer.put(0,4);
while(buffer.length%8!=0)buffer.putBit(false);
// pad
const PAD0=0xEC,PAD1=0x11;
while(buffer.length/8<totalDataCount){buffer.put(PAD0,8);if(buffer.length/8>=totalDataCount)break;buffer.put(PAD1,8)}
return QRCode.createBytes(buffer,rsBlocks)};
QRCode.createBytes=function(buffer,rsBlocks){let offset=0;let maxDc=0,maxEc=0;const dcdata=[],ecdata=[];
for(let r=0;r<rsBlocks.length;r++){const dcCount=rsBlocks[r].dataCount;const ecCount=rsBlocks[r].totalCount-dcCount;maxDc=Math.max(maxDc,dcCount);maxEc=Math.max(maxEc,ecCount);
dcdata[r]=new Array(dcCount);for(let i=0;i<dcdata[r].length;i++)dcdata[r][i]=0xff&buffer.buffer[i+offset];offset+=dcCount;
const rsPoly=QRUtil.getErrorCorrectPolynomial(ecCount);const rawPoly=new QRPolynomial(dcdata[r],rsPoly.getLength()-1);const modPoly=rawPoly.mod(rsPoly);
ecdata[r]=new Array(rsPoly.getLength()-1);for(let i=0;i<ecdata[r].length;i++){const modIndex=i+modPoly.getLength()-ecdata[r].length;ecdata[r][i]=(modIndex>=0)?modPoly.get(modIndex):0}}
let total=0;for(let r=0;r<rsBlocks.length;r++)total+=rsBlocks[r].totalCount;
const data=new Array(total);let index=0;
for(let i=0;i<maxDc;i++)for(let r=0;r<rsBlocks.length;r++)if(i<dcdata[r].length)data[index++]=dcdata[r][i];
for(let i=0;i<maxEc;i++)for(let r=0;r<rsBlocks.length;r++)if(i<ecdata[r].length)data[index++]=ecdata[r][i];
return data};
QRCode.getLostPoint=function(qr){const mc=qr.getModuleCount();let lost=0;
for(let r=0;r<mc;r++)for(let c=0;c<mc;c++){let same=0;const dark=qr.isDark(r,c);
for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){if(dr==0&&dc==0)continue;const rr=r+dr,cc=c+dc;if(rr<0||mc<=rr||cc<0||mc<=cc)continue;if(dark==qr.isDark(rr,cc))same++}
if(same>5)lost+=3+same-5}
for(let r=0;r<mc-1;r++)for(let c=0;c<mc-1;c++){let cnt=0;if(qr.isDark(r,c))cnt++;if(qr.isDark(r+1,c))cnt++;if(qr.isDark(r,c+1))cnt++;if(qr.isDark(r+1,c+1))cnt++;if(cnt==0||cnt==4)lost+=3}
for(let r=0;r<mc;r++)for(let c=0;c<mc-6;c++){if(qr.isDark(r,c)&&!qr.isDark(r,c+1)&&qr.isDark(r,c+2)&&qr.isDark(r,c+3)&&qr.isDark(r,c+4)&&!qr.isDark(r,c+5)&&qr.isDark(r,c+6))lost+=40}
for(let c=0;c<mc;c++)for(let r=0;r<mc-6;r++){if(qr.isDark(r,c)&&!qr.isDark(r+1,c)&&qr.isDark(r+2,c)&&qr.isDark(r+3,c)&&qr.isDark(r+4,c)&&!qr.isDark(r+5,c)&&qr.isDark(r+6,c))lost+=40}
let darkCount=0;for(let r=0;r<mc;r++)for(let c=0;c<mc;c++)if(qr.isDark(r,c))darkCount++;
const ratio=Math.abs(100*darkCount/mc/mc-50)/5;lost+=ratio*10;return lost};
function drawQrToCanvas(text, canvas){
  if(!canvas) return;
  // escolhe versão 4 (aguenta mais texto); se falhar, tenta 3/2/1
  const versions=[4,3,2,1];
  let qr=null;
  for(const v of versions){
    try{qr=new QRCode(v,0);qr.addData(text);qr.make();break;}catch(e){qr=null}
  }
  if(!qr) return;
  const ctx=canvas.getContext("2d");
  const mc=qr.getModuleCount();
  const size=canvas.width;
  const cell=Math.floor(size/mc);
  ctx.clearRect(0,0,size,size);
  ctx.fillStyle="#fff";
  ctx.fillRect(0,0,size,size);
  for(let r=0;r<mc;r++){
    for(let c=0;c<mc;c++){
      ctx.fillStyle=qr.isDark(r,c) ? "#111827" : "#ffffff";
      ctx.fillRect(c*cell, r*cell, cell, cell);
    }
  }
}



function maybeImportFromHash() {
  const h = window.location.hash || "";
  const m = h.match(/#favs=([A-Za-z0-9\-_]+)/);
  if (!m) return;

  const obj = decodeFavState(m[1]);
  if (!obj) return;

  const t = window.__IMPORT_T || { ask: "Import?", yes: "Import", no: "Ignore" };

  // UI simples sem confirmação complexa: confirm() é suficiente e funciona offline
  const ok = confirm(t.ask);
  if (ok) {
    try {
      if (obj.lang) setLanguage(obj.lang);
    } catch {}
    favoritos = new Set(obj.favs);
    saveFavoritos();
    renderAtual();
try{ toggleEventsCalendar(false); }catch{}
    alert("✅ " + (currentLang === "pt" ? "Favoritos importados." : currentLang === "es" ? "Favoritos importados." : currentLang === "fr" ? "Favoris importés." : "Favourites imported."));
  }

  // Limpa hash para não repetir
  history.replaceState(null, "", window.location.href.split("#")[0]);
}


/* ==============================
   SECÇÕES RETRÁTEIS (Meteorologia / Informação da Casa / Emergências)
============================== */
(function initCollapsibleHomeSections(){
  const LS_KEY = "vb_collapsed_sections_v1";

  function loadCollapsedState(){
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return {};
      return JSON.parse(raw) || {};
    } catch { return {}; }
  }

  function saveCollapsedState(state){
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
  }

  function applyState(section, toggleBtn, collapsed){
    section.classList.toggle("is-collapsed", collapsed);
    if (toggleBtn) toggleBtn.setAttribute("aria-expanded", collapsed ? "false" : "true");
  }

  const state = loadCollapsedState();
  const heads = document.querySelectorAll(".home-meteo-head[data-toggle-section]");

  heads.forEach(head => {
    const id = head.getAttribute("data-toggle-section");
    const section = document.getElementById(id);
    const toggleBtn = head.querySelector(".home-meteo-toggle");
    if (!section) return;

    // Aplica estado guardado (por omissão: fechado)
    const collapsed = state[id] === undefined ? true : !!state[id];
    applyState(section, toggleBtn, collapsed);

    head.addEventListener("click", (ev) => {
      // Evita fechar se o clique foi num link/botão interno com a sua própria ação (ex: copiar WiFi)
      if (ev.target.closest("#wifi-copy-btn")) return;

      const isCollapsed = section.classList.contains("is-collapsed");
      const next = !isCollapsed;
      applyState(section, toggleBtn, next);
      state[id] = next;
      saveCollapsedState(state);
    });
  });
})();



/* ==============================
   ANTES DE SAÍRES: avaliação por estrelas + checklist de saída
============================== */
const LS_KEY_CHECKOUT_CHECKLIST = "vb_checkout_checklist_v1";

// Cola aqui o link "Escrever uma avaliação" da ficha do Google Business do VanBerto's.
// Enquanto ficar vazio, o botão de avaliação no Google não aparece.
const GOOGLE_REVIEW_URL = "";

let checkoutRating = 0;

function loadChecklistState(){
  try {
    const raw = localStorage.getItem(LS_KEY_CHECKOUT_CHECKLIST);
    return raw ? (JSON.parse(raw) || {}) : {};
  } catch { return {}; }
}

function saveChecklistState(state){
  try { localStorage.setItem(LS_KEY_CHECKOUT_CHECKLIST, JSON.stringify(state)); } catch {}
}

function renderCheckoutChecklist(){
  const list = document.getElementById("checkout-checklist");
  const progressEl = document.getElementById("checkout-checklist-progress");
  const resetBtn = document.getElementById("checkout-checklist-reset");
  const nudgeEl = document.getElementById("checkout-checklist-nudge");
  if (!list) return;

  const T = getHomeI18n();
  const state = loadChecklistState();

  list.innerHTML = T.checklist.map(item => `
    <li>
      <label>
        <input type="checkbox" data-key="${item.key}" ${state[item.key] ? "checked" : ""} />
        <span>${item.label}</span>
      </label>
    </li>
  `).join("");

  const done = T.checklist.filter(item => state[item.key]).length;
  if (progressEl) progressEl.textContent = T.checklistProgress(done, T.checklist.length);
  if (resetBtn) resetBtn.hidden = done === 0;

  // Convite gentil a avaliar assim que a checklist fica completa (só se ainda não avaliou nesta visita)
  if (nudgeEl){
    const showNudge = done === T.checklist.length && checkoutRating < 1;
    nudgeEl.hidden = !showNudge;
    if (showNudge) nudgeEl.textContent = T.checklistAllDoneNudge;
  }

  list.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener("change", () => {
      const s = loadChecklistState();
      s[cb.dataset.key] = cb.checked;
      saveChecklistState(s);
      renderCheckoutChecklist();
    });
  });
}

(function initCheckoutSection(){
  const starsWrap = document.getElementById("checkout-stars");
  const sendBtn = document.getElementById("checkout-send-btn");
  const commentEl = document.getElementById("checkout-comment");
  const resetBtn = document.getElementById("checkout-checklist-reset");
  const googleBtn = document.getElementById("checkout-google-btn");

  if (starsWrap){
    const stars = Array.from(starsWrap.querySelectorAll(".checkout-star"));

    function paintStars(value){
      stars.forEach(s => {
        const v = Number(s.dataset.value);
        s.classList.toggle("is-active", v <= value);
        s.textContent = v <= value ? "★" : "☆";
      });
      if (sendBtn) sendBtn.disabled = value < 1;
    }

    stars.forEach(s => {
      s.addEventListener("click", () => {
        checkoutRating = Number(s.dataset.value);
        paintStars(checkoutRating);
        renderCheckoutChecklist(); // esconde o nudge assim que já avaliou
      });
    });
  }

  if (sendBtn){
    sendBtn.addEventListener("click", () => {
      if (checkoutRating < 1) return;
      const T = getHomeI18n();
      const comment = commentEl ? commentEl.value.trim() : "";
      const msg = T.ratingWaMessage(checkoutRating, comment);
      window.open(houseWaLink(msg), "_blank", "noopener,noreferrer");

      // Só sugere o Google depois de enviar, e só para avaliações de 4-5 estrelas
      if (googleBtn && GOOGLE_REVIEW_URL && checkoutRating >= 4){
        googleBtn.hidden = false;
        googleBtn.textContent = getHomeI18n().googleReviewBtn;
      }
    });
  }

  if (googleBtn){
    googleBtn.addEventListener("click", () => {
      if (!GOOGLE_REVIEW_URL) return;
      window.open(GOOGLE_REVIEW_URL, "_blank", "noopener,noreferrer");
    });
  }

  if (resetBtn){
    resetBtn.addEventListener("click", () => {
      saveChecklistState({});
      renderCheckoutChecklist();
    });
  }

  // A primeira renderização do checklist acontece via applyHomeSectionsI18n()
  // (chamado mais abaixo, já com HOME_I18N disponível) e sempre que a língua muda.
})();


/* ==============================
   I18N DAS SECÇÕES FIXAS DA HOME
   (Meteorologia / Informação da Casa / Emergências / Praticidades)
============================== */

const HOME_I18N = {
  pt: {
    meteoTitle: "🌤️ Meteorologia · Peniche & Baleal",
    todayTitle: "Hoje",
    tomorrowTitle: "Amanhã",
    surfTitle: "🌊 Mar & Surf",

    houseTitle: "🏠 Informação da Casa",
    wifiTitle: "📶 WiFi",
    wifiPasswordLabel: "Password:",
    wifiCopyBtn: "📋 Copiar",
    wifiCopied: "✅ Copiado!",
    checkinTitle: "🔑 Check-in / Check-out",
    checkinSub: "Entrega das chaves em mão — o horário é combinado convosco antes da chegada.",
    rulesTitle: "📋 Regras da casa",
    rules: [
      "🔇 Silêncio das 23h às 7h (período de descanso previsto na lei portuguesa)",
      "🚭 Não é permitido fumar dentro de casa",
      "🐾 Animais de estimação só mediante autorização prévia — fala connosco antes de reservar",
      "🗑️ Lixo: coloca no contentor verde do parque de estacionamento, junto ao prédio",
      "♻️ Reciclagem: ecoponto (papel/plástico/vidro) no início da rua, junto ao edifício \"Shark's\""
    ],

    sosTitle: "🚨 Emergências & Saúde",
    sosEmergencyTitle: "Emergência nacional",
    sosPharmacyTitle: "Farmácia de serviço hoje",
    sosPharmacyMain: "💊 Ver farmácia",
    sosPoliceTitle: "PSP Peniche (não urgente)",
    sosNote: "Em caso de emergência, liga sempre primeiro para o 112.",

    practicalTitle: "🚗 Praticidades do dia a dia",
    parkingTitle: "🅿️ Estacionamento",
    parkingMain: "Grátis, mesmo à porta",
    parkingSub: "O parque junto ao prédio é gratuito e sem restrições — podes deixar lá o carro durante toda a estadia.",
    transportTitle: "🚕 Transportes, táxi & Uber",
    transportMain: "Uber e Bolt funcionam, mas com menos carros",
    transportSub: "Peniche não tem uma rede de transportes públicos muito forte, por isso ter carro é o mais prático. Uber e Bolt existem na zona, mas com menos motoristas do que em Lisboa — a espera pode ser maior. Preferes táxi? Liga para <a href=\"tel:262782687\">262 782 687</a> ou <a href=\"tel:917296771\">917 296 771</a>.",
    atmTitle: "🏧 Onde levantar dinheiro",
    atmMain: "Multibanco na Estrada do Baleal",
    atmSub: "O mais perto de casa fica na Estrada do Baleal, em Casais do Baleal, a poucos minutos. Há mais opções no centro de Peniche. Quase todos os estabelecimentos aceitam cartão, por isso raramente precisas de dinheiro vivo.",

    checkoutTitle: "🌅 Antes de saíres",
    ratingTitle: "⭐ Avaliar a estadia",
    ratingPrompt: "Como foi a tua estadia? A tua opinião ajuda-nos a melhorar.",
    ratingPlaceholder: "Comentário opcional… (fica entre nós)",
    ratingSendBtn: "💬 Enviar avaliação",
    ratingWaMessage: (stars, comment) =>
      `Olá Vanda e Berto! 🙌\nAcabámos a nossa estadia no VanBerto's Beach House e queríamos deixar uma avaliação:\n\n${"⭐".repeat(stars)} (${stars}/5)` +
      (comment ? `\n\n💬 ${comment}` : ""),
    checklistTitle: "✅ Checklist de saída",
    checklist: [
      { key: "luzes", label: "💡 Luzes apagadas" },
      { key: "lixo", label: "🗑️ Lixo despejado no contentor" },
      { key: "chave", label: "🔑 Chave no local combinado" }
    ],
    checklistProgress: (done, total) => `${done}/${total} concluído${done === total ? " 🎉" : ""}`,
    checklistReset: "🔄 Repor",
    checklistAllDoneNudge: "✅ Tudo pronto! Já agora, que tal deixares a tua avaliação? ⭐",
    googleReviewBtn: "⭐ Deixar também no Google",

    iosInstallMsg: 'Toca em <strong>Partilhar</strong> e depois em <strong>"Adicionar ao ecrã principal"</strong> para instalares esta app.',
    updateBannerMsg: "Nova versão disponível — toca para atualizar",
    mapOfflineMsg: "Precisas de ligação à internet para ver o mapa aqui.",
    mapOfflineBtn: "📍 Abrir no Google Maps",

    weekdays: ["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"],

    updated: "Atualizado",
    unavailable: "Meteorologia indisponível",
    offlineData: "Dados guardados",
    justNow: "agora mesmo",
    minutesAgo: (n) => `há ${n} min`,
    hoursAgo: (n) => `há ${n}h`,
    loadingWeather: "A carregar meteorologia…",
    loadingUpdated: "A carregar…",
    waveHeight: "Altura",
    wavePeriod: "Período",
    waveDirection: "Direção",
    waves: "Ondas",
    windUpTo: "até",
    surfGood: "🔥 Bom",
    surfOk: "👍 Razoável",
    surfWeak: "🙂 Fraco",
    tapToSeeAll: (label) => `Tocar para ver todas as opções de ${label.toLowerCase()}.`,
    vanBertoSuggestions: "Sugestões do VanBerto's",
    tapForDetails: "Tocar para ver detalhes",
    noResults: "Nenhum resultado para esta pesquisa.",
    defaultHorario: "Confirmar no Google Maps",
    defaultTipo: "Restaurante/Bar",
    defaultReservas: "Opcional",
    defaultTakeaway: "Depende do local",
    callBtn: "📞 Ligar",
    callBtnGoogle: "📞 Contacto (Google)",
    weatherCodes: {
      0:"☀️ Céu limpo", 1:"🌤️ Pouco nublado", 2:"⛅ Parcialmente nublado", 3:"☁️ Nublado",
      45:"🌫️ Nevoeiro", 48:"🌫️ Nevoeiro", 51:"🌦️ Chuva fraca", 53:"🌦️ Chuva fraca", 55:"🌦️ Chuva fraca",
      61:"🌦️ Chuva fraca", 63:"🌧️ Chuva", 65:"⛈️ Chuva forte", 71:"❄️ Neve fraca", 73:"❄️ Neve", 75:"❄️ Neve forte",
      80:"🌦️ Aguaceiros", 81:"🌦️ Aguaceiros", 82:"🌧️ Aguaceiros fortes", 95:"⛈️ Trovoada", 96:"⛈️ Trovoada", 99:"⛈️ Trovoada"
    }
  },
  en: {
    meteoTitle: "🌤️ Weather · Peniche & Baleal",
    todayTitle: "Today",
    tomorrowTitle: "Tomorrow",
    surfTitle: "🌊 Sea & Surf",

    houseTitle: "🏠 House Information",
    wifiTitle: "📶 WiFi",
    wifiPasswordLabel: "Password:",
    wifiCopyBtn: "📋 Copy",
    wifiCopied: "✅ Copied!",
    checkinTitle: "🔑 Check-in / Check-out",
    checkinSub: "Keys handed over in person — the time is arranged with you before arrival.",
    rulesTitle: "📋 House rules",
    rules: [
      "🔇 Quiet hours from 11pm to 7am (rest period required by Portuguese law)",
      "🚭 No smoking inside the house",
      "🐾 Pets only with prior authorisation — talk to us before booking",
      "🗑️ Rubbish: use the green bin in the car park, next to the building",
      "♻️ Recycling: recycling point (paper/plastic/glass) at the start of the street, next to the \"Shark's\" building"
    ],

    sosTitle: "🚨 Emergencies & Health",
    sosEmergencyTitle: "National emergency",
    sosPharmacyTitle: "Pharmacy on duty today",
    sosPharmacyMain: "💊 View pharmacy",
    sosPoliceTitle: "PSP Peniche (non-urgent)",
    sosNote: "In an emergency, always call 112 first.",

    practicalTitle: "🚗 Everyday practicalities",
    parkingTitle: "🅿️ Parking",
    parkingMain: "Free, right at the door",
    parkingSub: "The car park next to the building is free and unrestricted — you can leave your car there for your whole stay.",
    transportTitle: "🚕 Transport, taxi & Uber",
    transportMain: "Uber and Bolt work, but with fewer cars",
    transportSub: "Peniche doesn't have a very strong public transport network, so having a car is the most practical option. Uber and Bolt operate in the area, but with fewer drivers than in Lisbon — waiting times can be longer. Prefer a taxi? Call <a href=\"tel:262782687\">262 782 687</a> or <a href=\"tel:917296771\">917 296 771</a>.",
    atmTitle: "🏧 Where to withdraw cash",
    atmMain: "ATM on Estrada do Baleal",
    atmSub: "The closest one to the house is on Estrada do Baleal, in Casais do Baleal, a few minutes away. There are more options in central Peniche. Almost every place accepts card, so you rarely need cash.",

    checkoutTitle: "🌅 Before you leave",
    ratingTitle: "⭐ Rate your stay",
    ratingPrompt: "How was your stay? Your feedback helps us improve.",
    ratingPlaceholder: "Optional comment… (just between us)",
    ratingSendBtn: "💬 Send review",
    ratingWaMessage: (stars, comment) =>
      `Hi Vanda and Berto! 🙌\nWe just finished our stay at VanBerto's Beach House and wanted to leave a review:\n\n${"⭐".repeat(stars)} (${stars}/5)` +
      (comment ? `\n\n💬 ${comment}` : ""),
    checklistTitle: "✅ Departure checklist",
    checklist: [
      { key: "luzes", label: "💡 Lights off" },
      { key: "lixo", label: "🗑️ Rubbish taken to the bin" },
      { key: "chave", label: "🔑 Key left in the agreed spot" }
    ],
    checklistProgress: (done, total) => `${done}/${total} done${done === total ? " 🎉" : ""}`,
    checklistReset: "🔄 Reset",
    checklistAllDoneNudge: "✅ All set! While you're at it, why not leave a review? ⭐",
    googleReviewBtn: "⭐ Also leave it on Google",

    iosInstallMsg: 'Tap <strong>Share</strong>, then <strong>"Add to Home Screen"</strong> to install this app.',
    updateBannerMsg: "New version available — tap to update",
    mapOfflineMsg: "You need an internet connection to see the map here.",
    mapOfflineBtn: "📍 Open in Google Maps",

    weekdays: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],

    updated: "Updated",
    unavailable: "Weather unavailable",
    offlineData: "Saved data",
    justNow: "just now",
    minutesAgo: (n) => `${n} min ago`,
    hoursAgo: (n) => `${n}h ago`,
    loadingWeather: "Loading weather…",
    loadingUpdated: "Loading…",
    waveHeight: "Height",
    wavePeriod: "Period",
    waveDirection: "Direction",
    waves: "Waves",
    windUpTo: "up to",
    surfGood: "🔥 Good",
    surfOk: "👍 Fair",
    surfWeak: "🙂 Weak",
    tapToSeeAll: (label) => `Tap to see all ${label.toLowerCase()}.`,
    vanBertoSuggestions: "VanBerto's suggestions",
    tapForDetails: "Tap for details",
    noResults: "No results for this search.",
    defaultHorario: "Check on Google Maps",
    defaultTipo: "Restaurant/Bar",
    defaultReservas: "Optional",
    defaultTakeaway: "Depends on venue",
    callBtn: "📞 Call",
    callBtnGoogle: "📞 Contact (Google)",
    weatherCodes: {
      0:"☀️ Clear sky", 1:"🌤️ Mostly clear", 2:"⛅ Partly cloudy", 3:"☁️ Cloudy",
      45:"🌫️ Fog", 48:"🌫️ Fog", 51:"🌦️ Light drizzle", 53:"🌦️ Drizzle", 55:"🌦️ Dense drizzle",
      61:"🌦️ Light rain", 63:"🌧️ Rain", 65:"⛈️ Heavy rain", 71:"❄️ Light snow", 73:"❄️ Snow", 75:"❄️ Heavy snow",
      80:"🌦️ Showers", 81:"🌦️ Showers", 82:"🌧️ Heavy showers", 95:"⛈️ Thunderstorm", 96:"⛈️ Thunderstorm", 99:"⛈️ Thunderstorm"
    }
  },
  es: {
    meteoTitle: "🌤️ Meteorología · Peniche & Baleal",
    todayTitle: "Hoy",
    tomorrowTitle: "Mañana",
    surfTitle: "🌊 Mar & Surf",

    houseTitle: "🏠 Información de la casa",
    wifiTitle: "📶 WiFi",
    wifiPasswordLabel: "Contraseña:",
    wifiCopyBtn: "📋 Copiar",
    wifiCopied: "✅ ¡Copiado!",
    checkinTitle: "🔑 Check-in / Check-out",
    checkinSub: "Entrega de llaves en mano — la hora se acuerda contigo antes de la llegada.",
    rulesTitle: "📋 Normas de la casa",
    rules: [
      "🔇 Silencio de 23h a 7h (periodo de descanso previsto por la ley portuguesa)",
      "🚭 No se permite fumar dentro de la casa",
      "🐾 Mascotas solo con autorización previa — habla con nosotros antes de reservar",
      "🗑️ Basura: en el contenedor verde del parking, junto al edificio",
      "♻️ Reciclaje: punto verde (papel/plástico/vidrio) al principio de la calle, junto al edificio \"Shark's\""
    ],

    sosTitle: "🚨 Emergencias & Salud",
    sosEmergencyTitle: "Emergencia nacional",
    sosPharmacyTitle: "Farmacia de guardia hoy",
    sosPharmacyMain: "💊 Ver farmacia",
    sosPoliceTitle: "PSP Peniche (no urgente)",
    sosNote: "En caso de emergencia, llama siempre primero al 112.",

    practicalTitle: "🚗 Cosas prácticas del día a día",
    parkingTitle: "🅿️ Aparcamiento",
    parkingMain: "Gratis, justo en la puerta",
    parkingSub: "El aparcamiento junto al edificio es gratuito y sin restricciones — puedes dejar el coche allí durante toda tu estancia.",
    transportTitle: "🚕 Transporte, taxi & Uber",
    transportMain: "Uber y Bolt funcionan, pero con menos coches",
    transportSub: "Peniche no tiene una red de transporte público muy fuerte, así que tener coche es lo más práctico. Uber y Bolt existen en la zona, pero con menos conductores que en Lisboa — la espera puede ser mayor. ¿Prefieres taxi? Llama al <a href=\"tel:262782687\">262 782 687</a> o al <a href=\"tel:917296771\">917 296 771</a>.",
    atmTitle: "🏧 Dónde sacar dinero",
    atmMain: "Cajero en la Estrada do Baleal",
    atmSub: "El más cercano a la casa está en la Estrada do Baleal, en Casais do Baleal, a pocos minutos. Hay más opciones en el centro de Peniche. Casi todos los establecimientos aceptan tarjeta, así que raramente necesitas dinero en efectivo.",

    checkoutTitle: "🌅 Antes de irte",
    ratingTitle: "⭐ Valorar la estancia",
    ratingPrompt: "¿Qué tal la estancia? Tu opinión nos ayuda a mejorar.",
    ratingPlaceholder: "Comentario opcional… (queda entre nosotros)",
    ratingSendBtn: "💬 Enviar valoración",
    ratingWaMessage: (stars, comment) =>
      `¡Hola Vanda y Berto! 🙌\nAcabamos nuestra estancia en VanBerto's Beach House y queríamos dejar una valoración:\n\n${"⭐".repeat(stars)} (${stars}/5)` +
      (comment ? `\n\n💬 ${comment}` : ""),
    checklistTitle: "✅ Checklist de salida",
    checklist: [
      { key: "luzes", label: "💡 Luces apagadas" },
      { key: "lixo", label: "🗑️ Basura en el contenedor" },
      { key: "chave", label: "🔑 Llave en el lugar acordado" }
    ],
    checklistProgress: (done, total) => `${done}/${total} completado${done === total ? " 🎉" : ""}`,
    checklistReset: "🔄 Reiniciar",
    checklistAllDoneNudge: "✅ ¡Todo listo! Ya que estás, ¿qué tal dejar tu valoración? ⭐",
    googleReviewBtn: "⭐ Dejarla también en Google",

    iosInstallMsg: 'Toca en <strong>Compartir</strong> y luego en <strong>"Añadir a pantalla de inicio"</strong> para instalar esta app.',
    updateBannerMsg: "Nueva versión disponible — toca para actualizar",
    mapOfflineMsg: "Necesitas conexión a internet para ver el mapa aquí.",
    mapOfflineBtn: "📍 Abrir en Google Maps",

    weekdays: ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"],

    updated: "Actualizado",
    unavailable: "Meteorología no disponible",
    offlineData: "Datos guardados",
    justNow: "ahora mismo",
    minutesAgo: (n) => `hace ${n} min`,
    hoursAgo: (n) => `hace ${n}h`,
    loadingWeather: "Cargando meteorología…",
    loadingUpdated: "Cargando…",
    waveHeight: "Altura",
    wavePeriod: "Período",
    waveDirection: "Dirección",
    waves: "Olas",
    windUpTo: "hasta",
    surfGood: "🔥 Bueno",
    surfOk: "👍 Razonable",
    surfWeak: "🙂 Flojo",
    tapToSeeAll: (label) => `Toca para ver todas las opciones de ${label.toLowerCase()}.`,
    vanBertoSuggestions: "Sugerencias de VanBerto's",
    tapForDetails: "Toca para ver detalles",
    noResults: "Sin resultados para esta búsqueda.",
    defaultHorario: "Consultar en Google Maps",
    defaultTipo: "Restaurante/Bar",
    defaultReservas: "Opcional",
    defaultTakeaway: "Depende del local",
    callBtn: "📞 Llamar",
    callBtnGoogle: "📞 Contacto (Google)",
    weatherCodes: {
      0:"☀️ Cielo despejado", 1:"🌤️ Poco nublado", 2:"⛅ Parcialmente nublado", 3:"☁️ Nublado",
      45:"🌫️ Niebla", 48:"🌫️ Niebla", 51:"🌦️ Llovizna leve", 53:"🌦️ Llovizna", 55:"🌦️ Llovizna densa",
      61:"🌦️ Lluvia leve", 63:"🌧️ Lluvia", 65:"⛈️ Lluvia fuerte", 71:"❄️ Nieve leve", 73:"❄️ Nieve", 75:"❄️ Nieve fuerte",
      80:"🌦️ Chubascos", 81:"🌦️ Chubascos", 82:"🌧️ Chubascos fuertes", 95:"⛈️ Tormenta", 96:"⛈️ Tormenta", 99:"⛈️ Tormenta"
    }
  },
  fr: {
    meteoTitle: "🌤️ Météo · Peniche & Baleal",
    todayTitle: "Aujourd'hui",
    tomorrowTitle: "Demain",
    surfTitle: "🌊 Mer & Surf",

    houseTitle: "🏠 Informations sur la maison",
    wifiTitle: "📶 WiFi",
    wifiPasswordLabel: "Mot de passe :",
    wifiCopyBtn: "📋 Copier",
    wifiCopied: "✅ Copié !",
    checkinTitle: "🔑 Arrivée / Départ",
    checkinSub: "Remise des clés en main propre — l'heure est convenue avec vous avant l'arrivée.",
    rulesTitle: "📋 Règlement de la maison",
    rules: [
      "🔇 Silence de 23h à 7h (période de repos prévue par la loi portugaise)",
      "🚭 Il est interdit de fumer à l'intérieur de la maison",
      "🐾 Animaux uniquement avec autorisation préalable — contacte-nous avant de réserver",
      "🗑️ Déchets : à déposer dans le conteneur vert du parking, près du bâtiment",
      "♻️ Recyclage : point de collecte (papier/plastique/verre) au début de la rue, près du bâtiment \"Shark's\""
    ],

    sosTitle: "🚨 Urgences & Santé",
    sosEmergencyTitle: "Urgence nationale",
    sosPharmacyTitle: "Pharmacie de garde aujourd'hui",
    sosPharmacyMain: "💊 Voir la pharmacie",
    sosPoliceTitle: "PSP Peniche (non urgent)",
    sosNote: "En cas d'urgence, appelle toujours d'abord le 112.",

    practicalTitle: "🚗 Pratique au quotidien",
    parkingTitle: "🅿️ Stationnement",
    parkingMain: "Gratuit, juste devant la porte",
    parkingSub: "Le parking près du bâtiment est gratuit et sans restriction — tu peux y laisser la voiture pendant tout ton séjour.",
    transportTitle: "🚕 Transports, taxi & Uber",
    transportMain: "Uber et Bolt fonctionnent, mais avec moins de voitures",
    transportSub: "Peniche n'a pas un réseau de transports publics très développé, donc avoir une voiture est le plus pratique. Uber et Bolt existent dans la région, mais avec moins de chauffeurs qu'à Lisbonne — l'attente peut être plus longue. Tu préfères un taxi ? Appelle le <a href=\"tel:262782687\">262 782 687</a> ou le <a href=\"tel:917296771\">917 296 771</a>.",
    atmTitle: "🏧 Où retirer de l'argent",
    atmMain: "Distributeur sur l'Estrada do Baleal",
    atmSub: "Le plus proche de la maison se trouve sur l'Estrada do Baleal, à Casais do Baleal, à quelques minutes. Il y a plus d'options dans le centre de Peniche. Presque tous les établissements acceptent la carte, donc tu as rarement besoin d'argent liquide.",

    checkoutTitle: "🌅 Avant de partir",
    ratingTitle: "⭐ Évaluer le séjour",
    ratingPrompt: "Comment s'est passé ton séjour ? Ton avis nous aide à nous améliorer.",
    ratingPlaceholder: "Commentaire facultatif… (juste entre nous)",
    ratingSendBtn: "💬 Envoyer l'avis",
    ratingWaMessage: (stars, comment) =>
      `Salut Vanda et Berto ! 🙌\nNous venons de terminer notre séjour au VanBerto's Beach House et voulions laisser un avis :\n\n${"⭐".repeat(stars)} (${stars}/5)` +
      (comment ? `\n\n💬 ${comment}` : ""),
    checklistTitle: "✅ Checklist de départ",
    checklist: [
      { key: "luzes", label: "💡 Lumières éteintes" },
      { key: "lixo", label: "🗑️ Poubelles sorties" },
      { key: "chave", label: "🔑 Clé à l'endroit convenu" }
    ],
    checklistProgress: (done, total) => `${done}/${total} fait${done === total ? " 🎉" : ""}`,
    checklistReset: "🔄 Réinitialiser",
    checklistAllDoneNudge: "✅ Tout est prêt ! Pendant que tu y es, pourquoi ne pas laisser un avis ? ⭐",
    googleReviewBtn: "⭐ Le laisser aussi sur Google",

    iosInstallMsg: 'Appuie sur <strong>Partager</strong>, puis sur <strong>« Sur l\'écran d\'accueil »</strong> pour installer cette app.',
    updateBannerMsg: "Nouvelle version disponible — appuie pour mettre à jour",
    mapOfflineMsg: "Une connexion internet est nécessaire pour voir la carte ici.",
    mapOfflineBtn: "📍 Ouvrir dans Google Maps",

    weekdays: ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"],

    updated: "Mis à jour",
    unavailable: "Météo indisponible",
    offlineData: "Données enregistrées",
    justNow: "à l'instant",
    minutesAgo: (n) => `il y a ${n} min`,
    hoursAgo: (n) => `il y a ${n}h`,
    loadingWeather: "Chargement de la météo…",
    loadingUpdated: "Chargement…",
    waveHeight: "Hauteur",
    wavePeriod: "Période",
    waveDirection: "Direction",
    waves: "Vagues",
    windUpTo: "jusqu'à",
    surfGood: "🔥 Bon",
    surfOk: "👍 Correct",
    surfWeak: "🙂 Faible",
    tapToSeeAll: (label) => `Touche pour voir toutes les options de ${label.toLowerCase()}.`,
    vanBertoSuggestions: "Suggestions de VanBerto's",
    tapForDetails: "Touche pour voir les détails",
    noResults: "Aucun résultat pour cette recherche.",
    defaultHorario: "Vérifier sur Google Maps",
    defaultTipo: "Restaurant/Bar",
    defaultReservas: "Facultatif",
    defaultTakeaway: "Selon l'établissement",
    callBtn: "📞 Appeler",
    callBtnGoogle: "📞 Contact (Google)",
    weatherCodes: {
      0:"☀️ Ciel dégagé", 1:"🌤️ Peu nuageux", 2:"⛅ Partiellement nuageux", 3:"☁️ Nuageux",
      45:"🌫️ Brouillard", 48:"🌫️ Brouillard", 51:"🌦️ Bruine légère", 53:"🌦️ Bruine", 55:"🌦️ Bruine dense",
      61:"🌦️ Pluie légère", 63:"🌧️ Pluie", 65:"⛈️ Pluie forte", 71:"❄️ Neige légère", 73:"❄️ Neige", 75:"❄️ Neige forte",
      80:"🌦️ Averses", 81:"🌦️ Averses", 82:"🌧️ Fortes averses", 95:"⛈️ Orage", 96:"⛈️ Orage", 99:"⛈️ Orage"
    }
  }
};

function getHomeI18n(){
  return HOME_I18N[currentLang] || HOME_I18N.en;
}

function applyHomeSectionsI18n(){
  const T = getHomeI18n();
  const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  const setHtml = (id, val) => { const el = document.getElementById(id); if (el) el.innerHTML = val; };

  // Meteorologia
  setText("i18n-meteo-title", T.meteoTitle);
  setText("i18n-today-title", T.todayTitle);
  setText("i18n-tomorrow-title", T.tomorrowTitle);
  setText("i18n-surf-title", T.surfTitle);
  const meteoUpdated = document.getElementById("home-meteo-updated");
  if (meteoUpdated && (meteoUpdated.textContent.trim() === "" || meteoUpdated.dataset.state === "loading")) {
    meteoUpdated.textContent = T.loadingUpdated;
  }

  // Informação da Casa
  setText("i18n-house-title", T.houseTitle);
  setText("i18n-wifi-title", T.wifiTitle);
  setText("i18n-wifi-password-label", T.wifiPasswordLabel);
  const wifiBtn = document.getElementById("wifi-copy-btn");
  if (wifiBtn && !wifiBtn.dataset.justCopied) wifiBtn.textContent = T.wifiCopyBtn;
  setText("i18n-checkin-title", T.checkinTitle);
  setText("i18n-checkin-sub", T.checkinSub);
  setText("i18n-rules-title", T.rulesTitle);
  const rulesList = document.getElementById("i18n-rules-list");
  if (rulesList) {
    rulesList.innerHTML = T.rules.map(r => `<li>${r}</li>`).join("");
  }

  // Emergências & Saúde
  setText("i18n-sos-title", T.sosTitle);
  setText("i18n-sos-emergency-title", T.sosEmergencyTitle);
  setText("i18n-sos-pharmacy-title", T.sosPharmacyTitle);
  setText("i18n-sos-pharmacy-main", T.sosPharmacyMain);
  setText("i18n-sos-police-title", T.sosPoliceTitle);
  setText("i18n-sos-note", T.sosNote);

  // Praticidades
  setText("i18n-practical-title", T.practicalTitle);
  setText("i18n-parking-title", T.parkingTitle);
  setText("i18n-parking-main", T.parkingMain);
  setText("i18n-parking-sub", T.parkingSub);
  setText("i18n-transport-title", T.transportTitle);
  setText("i18n-transport-main", T.transportMain);
  setHtml("i18n-transport-sub", T.transportSub);
  setText("i18n-atm-title", T.atmTitle);
  setText("i18n-atm-main", T.atmMain);
  setText("i18n-atm-sub", T.atmSub);

  // Antes de saíres (avaliação + checklist)
  setText("i18n-checkout-title", T.checkoutTitle);
  setText("i18n-rating-title", T.ratingTitle);
  setText("i18n-rating-prompt", T.ratingPrompt);
  const checkoutComment = document.getElementById("checkout-comment");
  if (checkoutComment) checkoutComment.placeholder = T.ratingPlaceholder;
  const checkoutSendBtn = document.getElementById("checkout-send-btn");
  if (checkoutSendBtn) checkoutSendBtn.textContent = T.ratingSendBtn;
  setText("i18n-checklist-title", T.checklistTitle);
  const checklistResetBtn = document.getElementById("checkout-checklist-reset");
  if (checklistResetBtn) checklistResetBtn.textContent = T.checklistReset;
  try { renderCheckoutChecklist(); } catch {}

  // Banners (instalação iOS / nova versão) & mini-mapa offline
  setHtml("ios-install-text", T.iosInstallMsg);
  setText("update-banner-text", T.updateBannerMsg);
  setText("map-offline-text", T.mapOfflineMsg);
  const mapOfflineBtnEl = document.getElementById("map-offline-btn");
  if (mapOfflineBtnEl) mapOfflineBtnEl.textContent = T.mapOfflineBtn;

  // Dias da semana do mini-calendário
  const weekRow = document.getElementById("mini-cal-week");
  if (weekRow) {
    const spans = weekRow.querySelectorAll("span");
    T.weekdays.forEach((d, i) => { if (spans[i]) spans[i].textContent = d; });
  }
}

// Corre logo ao carregar, para garantir estado inicial coerente com o idioma
try{ applyHomeSectionsI18n(); }catch{}

// --------- INICIAL ---------
loadFavoritos();
setLanguage(loadLanguage());
currentCategory = "tudo";
renderAtual();
try{ toggleEventsCalendar(false); }catch{}


// --------- VOLTAR AO TOPO ---------
function updateScrollTopVisibility() {
  if (!scrollTopBtn) return;
  const show = window.scrollY > 450;
  scrollTopBtn.classList.toggle("show", show);
}

if (scrollTopBtn) {
  scrollTopBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  window.addEventListener("scroll", updateScrollTopVisibility, { passive: true });
  updateScrollTopVisibility();
}

document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    if (modal.classList.contains("show")) fecharModal();
    if (qrModal && qrModal.classList.contains("show")) fecharQrModal();
  }
});


// --------- PARTILHAR FAVORITOS (LINK + QR) ---------
function encodeFavState() {
  const payload = {
    v: 1,
    lang: currentLang,
    favs: [...favoritos]
  };
  // base64 url-safe
  const jsonStr = JSON.stringify(payload);
  const b64 = btoa(unescape(encodeURIComponent(jsonStr)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  return b64;
}

function decodeFavState(b64) {
  try {
    const padded = b64.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((b64.length + 3) % 4);
    const jsonStr = decodeURIComponent(escape(atob(padded)));
    const obj = JSON.parse(jsonStr);
    if (!obj || !Array.isArray(obj.favs)) return null;
    return obj;
  } catch {
    return null;
  }
}

function buildShareLink() {
  const token = encodeFavState();
  const baseUrl = window.location.href.split("#")[0];
  return baseUrl + "#favs=" + token;
}

function abrirQrModal() {
  if (!qrModal) return;
  qrModal.classList.add("show");
  qrModal.setAttribute("aria-hidden", "false");
  setTimeout(() => { qrCloseBtn?.focus(); }, 0);

  const link = buildShareLink();
  if (qrText) qrText.textContent = qrText.textContent || "";
  drawQrToCanvas(link, qrCanvas);

  if (qrCopyBtn) {
    qrCopyBtn.onclick = async () => {
      try {
        await navigator.clipboard.writeText(link);
        qrCopyBtn.textContent = "✅";
        setTimeout(() => atualizarTextosEstaticos(), 900);
      } catch {
        // fallback
        prompt("Copia o link:", link);
      }
    };
  }

  if (qrClearBtn) {
    qrClearBtn.onclick = () => {
      favoritos = new Set();
      saveFavoritos();
      renderAtual();
try{ toggleEventsCalendar(false); }catch{}
      fecharQrModal();
    };
  }
}

function fecharQrModal() {
  if (!qrModal) return;
  qrModal.classList.remove("show");
  qrModal.setAttribute("aria-hidden", "true");
}

if (shareFavsBtn) shareFavsBtn.addEventListener("click", abrirQrModal);
if (qrCloseBtn) qrCloseBtn.addEventListener("click", fecharQrModal);
if (qrModal) qrModal.addEventListener("click", e => {
  if (e.target.classList.contains("modal-backdrop")) fecharQrModal();
});

maybeImportFromHash();

// Se escolher Eventos, limpa a pesquisa para evitar lista vazia por filtro anterior
if (btnEventos) {
  btnEventos.addEventListener("click", () => {
    if (searchInput && searchInput.value) {
      searchInput.value = "";
      searchTerm = "";
    }
  });
}


/* ==============================
   🌤️ METEOROLOGIA PENICHE/BALEAL
============================== */

const meteoBox = document.getElementById("meteo-info");

function weatherCodePT(code){
  const map = getHomeI18n().weatherCodes || {};
  return map[code] || "—";
}

async function carregarMeteo(){
  if(!meteoBox) return;

  try{
    const res = await fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=39.355&longitude=-9.381&current=temperature_2m,wind_speed_10m,weather_code&timezone=Europe%2FLisbon"
    );

    const data = await res.json();
    const c = data.current;

    const Ti18n = getHomeI18n();
    meteoBox.innerHTML =
      `${c.temperature_2m}°C | 🌬️ ${c.wind_speed_10m} km/h | ${weatherCodePT(c.weather_code)}
       <br><small>${Ti18n.updated} ${c.time.split("T")[1].slice(0,5)}</small>`;

  }catch{
    meteoBox.textContent = getHomeI18n().unavailable;
  }
}

const originalAbrirModal = abrirModal;
abrirModal = function(cat, item){
  originalAbrirModal(cat, item);
  carregarMeteo();
};


/* ==============================
   HOME_FORECAST_PENICHE_BALEAL
   Hoje + Amanhã + Mar/Surf
============================== */

const HOME_LAT = 39.355;  // Peniche/Baleal (aprox.)
const HOME_LON = -9.381;

function pad2(n){ return String(n).padStart(2,"0"); }

function iconFromWeatherCode(code){
  // Ícones simples e consistentes
  if (code === 0) return "☀️";
  if (code === 1) return "🌤️";
  if (code === 2) return "⛅";
  if (code === 3) return "☁️";
  if (code === 45 || code === 48) return "🌫️";
  if ([51,53,55].includes(code)) return "🌦️";
  if ([61,63,65].includes(code)) return "🌧️";
  if ([71,73,75].includes(code)) return "❄️";
  if ([80,81,82].includes(code)) return "🌦️";
  if ([95,96,99].includes(code)) return "⛈️";
  return "🌤️";
}

function humanDirFromDegrees(deg){
  if (deg === null || deg === undefined || isNaN(deg)) return "";
  const dirs = ["N","NE","E","SE","S","SO","O","NO"];
  const i = Math.round(((deg % 360) / 45)) % 8;
  return dirs[i];
}

function surfRating({ waveHeight, wavePeriod, windSpeed }){
  // Heurística simples (não substitui previsão oficial):
  // - Melhor surf costuma ser: ondas >= 1.2m, período >= 10s, vento <= 20 km/h
  // - Moderado: ondas >= 0.8m e período >= 8s e vento <= 28 km/h
  // - Caso contrário: fraco/irregular
  const T = getHomeI18n();
  if (waveHeight >= 1.2 && wavePeriod >= 10 && windSpeed <= 20) return { label:T.surfGood, emoji:"🏄‍♂️" };
  if (waveHeight >= 0.8 && wavePeriod >= 8 && windSpeed <= 28) return { label:T.surfOk, emoji:"🏄" };
  return { label:T.surfWeak, emoji:"🌊" };
}

const LS_KEY_METEO_CACHE = "vb_home_meteo_cache_v1";

function saveMeteoCache(payload){
  try {
    localStorage.setItem(LS_KEY_METEO_CACHE, JSON.stringify({ ...payload, savedAt: Date.now() }));
  } catch {}
}

function loadMeteoCache(){
  try {
    const raw = localStorage.getItem(LS_KEY_METEO_CACHE);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function relativeTimeLabel(savedAt){
  const T = getHomeI18n();
  const diffMin = Math.max(0, Math.round((Date.now() - savedAt) / 60000));
  if (diffMin < 1) return T.justNow;
  if (diffMin < 60) return T.minutesAgo(diffMin);
  const diffH = Math.round(diffMin / 60);
  return T.hoursAgo(diffH);
}

function renderHomeMeteoFromData({ today, tom, waveH, waveP, waveD }, { offline, savedAt } = {}){
  const elUpdated = document.getElementById("home-meteo-updated");
  const elToday = document.getElementById("home-meteo-today");
  const elTodayExtra = document.getElementById("home-meteo-today-extra");
  const elTom = document.getElementById("home-meteo-tomorrow");
  const elTomExtra = document.getElementById("home-meteo-tomorrow-extra");
  const elSurf = document.getElementById("home-surf");
  const elSurfExtra = document.getElementById("home-surf-extra");
  if (!elUpdated || !elToday || !elTom || !elSurf) return;

  const Ti18nA = getHomeI18n();
  const icToday = iconFromWeatherCode(today.code);
  const icTom = iconFromWeatherCode(tom.code);

  elToday.textContent = `${icToday} ${today.tmin}°–${today.tmax}°`;
  elTodayExtra.textContent = `🌅 ${today.sunrise ? today.sunrise.split("T")[1].slice(0,5) : "—"} · 🌇 ${today.sunset ? today.sunset.split("T")[1].slice(0,5) : "—"} · 🌬️ ${Ti18nA.windUpTo} ${today.windMax ?? "—"} km/h · 🌧️ ${today.rain ?? "—"} mm`;

  elTom.textContent = `${icTom} ${tom.tmin}°–${tom.tmax}°`;
  elTomExtra.textContent = `🌅 ${tom.sunrise ? tom.sunrise.split("T")[1].slice(0,5) : "—"} · 🌇 ${tom.sunset ? tom.sunset.split("T")[1].slice(0,5) : "—"} · 🌬️ ${Ti18nA.windUpTo} ${tom.windMax ?? "—"} km/h · 🌧️ ${tom.rain ?? "—"} mm`;

  const rating = surfRating({ waveHeight: waveH, wavePeriod: waveP, windSpeed: Number(today.windMax ?? 0) });
  const dirTxt = humanDirFromDegrees(waveD);
  elSurf.textContent = `${rating.emoji} ${rating.label}`;
  elSurfExtra.textContent = `${Ti18nA.waveHeight} ${waveH.toFixed(1)} m · ${Ti18nA.wavePeriod} ${waveP.toFixed(0)} s · ${Ti18nA.waveDirection} ${dirTxt || "—"}`;

  if (offline){
    elUpdated.textContent = `📴 ${Ti18nA.offlineData} · ${relativeTimeLabel(savedAt)}`;
  } else {
    const now = new Date();
    elUpdated.textContent = `${Ti18nA.updated} ${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
  }
}

async function carregarHomeMeteoESurf(){
  const elUpdated = document.getElementById("home-meteo-updated");
  const elToday = document.getElementById("home-meteo-today");
  const elTom = document.getElementById("home-meteo-tomorrow");
  const elSurf = document.getElementById("home-surf");

  // Se a homepage não tiver o bloco, não faz nada
  if (!elUpdated || !elToday || !elTom || !elSurf) return;

  try{
    // 1) Weather daily (hoje + amanhã) + vento máx
    const urlW = `https://api.open-meteo.com/v1/forecast?latitude=${HOME_LAT}&longitude=${HOME_LON}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,sunrise,sunset&timezone=Europe%2FLisbon`;
    const resW = await fetch(urlW);
    if(!resW.ok) throw new Error("Weather API");
    const dataW = await resW.json();
    const d = dataW.daily;

    const today = {
      code: d.weather_code?.[0],
      tmax: d.temperature_2m_max?.[0],
      tmin: d.temperature_2m_min?.[0],
      rain: d.precipitation_sum?.[0],
      windMax: d.wind_speed_10m_max?.[0],
      sunrise: d.sunrise?.[0],
      sunset: d.sunset?.[0],
      date: d.time?.[0]
    };
    const tom = {
      code: d.weather_code?.[1],
      tmax: d.temperature_2m_max?.[1],
      tmin: d.temperature_2m_min?.[1],
      rain: d.precipitation_sum?.[1],
      windMax: d.wind_speed_10m_max?.[1],
      sunrise: d.sunrise?.[1],
      sunset: d.sunset?.[1],
      date: d.time?.[1]
    };

    // 2) Marine (ondas) — usa hora mais próxima
    const urlM = `https://marine-api.open-meteo.com/v1/marine?latitude=${HOME_LAT}&longitude=${HOME_LON}&hourly=wave_height,wave_period,wave_direction&timezone=Europe%2FLisbon&forecast_days=2`;
    const resM = await fetch(urlM);
    if(!resM.ok) throw new Error("Marine API");
    const dataM = await resM.json();

    const times = dataM.hourly?.time || [];
    const waves = dataM.hourly?.wave_height || [];
    const period = dataM.hourly?.wave_period || [];
    const wdir = dataM.hourly?.wave_direction || [];

    // encontra índice da hora mais próxima do agora
    const now = new Date();
    let best = 0;
    let bestDiff = Infinity;
    for(let i=0;i<times.length;i++){
      const t = new Date(times[i]);
      const diff = Math.abs(t.getTime() - now.getTime());
      if (diff < bestDiff){ bestDiff = diff; best = i; }
    }

    const waveH = Number(waves[best] ?? 0);
    const waveP = Number(period[best] ?? 0);
    const waveD = Number(wdir[best] ?? NaN);

    const payload = { today, tom, waveH, waveP, waveD };
    renderHomeMeteoFromData(payload);
    saveMeteoCache(payload);

  }catch(e){
    const cached = loadMeteoCache();
    if (cached){
      renderHomeMeteoFromData(cached, { offline: true, savedAt: cached.savedAt });
    } else {
      const Ti18nErr = getHomeI18n();
      elUpdated.textContent = Ti18nErr.unavailable;
      elToday.textContent = "—";
      elTom.textContent = "—";
      elSurf.textContent = "—";
    }
  }
}

// Carrega na homepage
carregarHomeMeteoESurf();
// Atualiza a cada 30 minutos
setInterval(carregarHomeMeteoESurf, 30 * 60 * 1000);


/* ==============================
   MODAL_MAR_SURF (extra)
============================== */

async function carregarMeteoMarNoModal(){
  if(!meteoBox) return;
  try{
    const urlM = `https://marine-api.open-meteo.com/v1/marine?latitude=${HOME_LAT}&longitude=${HOME_LON}&hourly=wave_height,wave_period&timezone=Europe%2FLisbon&forecast_days=1`;
    const resM = await fetch(urlM);
    if(!resM.ok) return;

    const dataM = await resM.json();
    const times = dataM.hourly?.time || [];
    const waves = dataM.hourly?.wave_height || [];
    const period = dataM.hourly?.wave_period || [];

    const now = new Date();
    let best = 0, bestDiff = Infinity;
    for(let i=0;i<times.length;i++){
      const t = new Date(times[i]);
      const diff = Math.abs(t.getTime() - now.getTime());
      if (diff < bestDiff){ bestDiff = diff; best = i; }
    }

    const waveH = Number(waves[best] ?? 0);
    const waveP = Number(period[best] ?? 0);

    // acrescenta ao final do conteúdo do modal (sem “estragar” o que já lá está)
    const Ti18nWaves = getHomeI18n().waves;
    const extra = ` <br><small>🌊 ${Ti18nWaves} ${waveH.toFixed(1)} m · ${waveP.toFixed(0)} s</small>`;
    if (!meteoBox.innerHTML.includes("🌊")) meteoBox.innerHTML += extra;
  }catch{}
}

// Garante que também corre quando o modal abre
(function(){
  try{
    const prev = carregarMeteo;
    carregarMeteo = async function(){
      await prev();
      await carregarMeteoMarNoModal();
    };
  }catch{}
})();


/* ==============================
   MINI_CALENDAR_UI (homepage)
============================== */

function toISODateLocal(d){
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const da = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${da}`;
}

function monthLabelPT(d){
  const months = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

function monthLabelEN(d){
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

function monthLabelES(d){
  const months = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

function monthLabelFR(d){
  const months = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

function getMonthLabel(d){
  if (currentLang === "pt") return monthLabelPT(d);
  if (currentLang === "es") return monthLabelES(d);
  if (currentLang === "fr") return monthLabelFR(d);
  return monthLabelEN(d);
}

function getCalStrings(){
  const map = {
    pt: { title:"📅 Calendário de eventos", pick:"Seleciona um dia para ver eventos.", events:"Eventos", open:"Abrir", add:"Adicionar", none:"Sem eventos para este dia." },
    en: { title:"📅 Events calendar", pick:"Pick a day to see events.", events:"Events", open:"Open", add:"Add", none:"No events on this day." },
    es: { title:"📅 Calendario de eventos", pick:"Elige un día para ver eventos.", events:"Eventos", open:"Abrir", add:"Añadir", none:"Sin eventos este día." },
    fr: { title:"📅 Calendrier des événements", pick:"Choisis un jour pour voir les événements.", events:"Événements", open:"Ouvrir", add:"Ajouter", none:"Aucun événement ce jour-là." }
  };
  return map[currentLang] || map.en;
}

function buildEventsByDate(){
  const out = {};
  (data.Eventos || []).forEach(ev => {
    if(!ev.dataISO) return;
    if(!out[ev.dataISO]) out[ev.dataISO] = [];
    out[ev.dataISO].push(ev);
  });
  return out;
}

function renderMiniCalendar(){
  const grid = document.getElementById("cal-grid");
  const monthEl = document.getElementById("cal-month");
  const listEl = document.getElementById("cal-events-list");
  const titleEl = document.querySelector("#mini-cal .mini-cal-title");
  const eventsTitleEl = document.getElementById("cal-events-title");
  const prevBtn = document.getElementById("cal-prev");
  const nextBtn = document.getElementById("cal-next");

  if(!grid || !monthEl || !listEl || !prevBtn || !nextBtn) return;

  const T = getCalStrings();
  if(titleEl) titleEl.textContent = T.title;
  if(eventsTitleEl) eventsTitleEl.textContent = T.events;

  const eventsByDate = buildEventsByDate();
  const today = new Date();
  let view = window.__CAL_VIEW_DATE || new Date(today.getFullYear(), today.getMonth(), 1);
  window.__CAL_VIEW_DATE = view;

  monthEl.textContent = getMonthLabel(view);

  // Monday-first index: JS getDay(): Sun=0..Sat=6
  const firstDay = new Date(view.getFullYear(), view.getMonth(), 1);
  const firstWeekday = (firstDay.getDay() + 6) % 7; // Mon=0..Sun=6
  const daysInMonth = new Date(view.getFullYear(), view.getMonth()+1, 0).getDate();

  // Build cells: leading blanks
  const cells = [];
  for(let i=0;i<firstWeekday;i++){
    cells.push({ empty:true });
  }
  for(let day=1; day<=daysInMonth; day++){
    const d = new Date(view.getFullYear(), view.getMonth(), day);
    const iso = toISODateLocal(d);
    cells.push({ empty:false, day, iso, isToday: iso===toISODateLocal(today), hasEvents: !!eventsByDate[iso] });
  }
  // trailing to complete weeks
  while(cells.length % 7 !== 0) cells.push({ empty:true });

  // Selected date
  const selectedISO = window.__CAL_SELECTED_ISO || toISODateLocal(today);
  window.__CAL_SELECTED_ISO = selectedISO;

  grid.innerHTML = "";
  cells.forEach(c => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cal-day";
    if(c.empty){
      btn.classList.add("is-muted");
      btn.disabled = true;
      btn.textContent = "";
    }else{
      btn.textContent = c.day;
      if(c.isToday) btn.classList.add("is-today");
      if(c.iso === selectedISO) btn.classList.add("is-selected");
      if(c.hasEvents){
        const dot = document.createElement("span");
        dot.className = "cal-dot";
        dot.setAttribute("aria-hidden","true");
        btn.appendChild(dot);
      }
      btn.addEventListener("click", () => {
        window.__CAL_SELECTED_ISO = c.iso;
        renderMiniCalendar();
      });
    }
    grid.appendChild(btn);
  });

  function renderList(){
    const evs = eventsByDate[selectedISO] || [];
    if(!evs.length){
      listEl.textContent = T.none;
      return;
    }

    listEl.innerHTML = "";
    evs.forEach(ev => {
      const box = document.createElement("div");
      box.className = "mini-cal-event-item";

      const top = document.createElement("div");
      top.className = "mini-cal-event-top";

      const name = document.createElement("div");
      name.textContent = ev.nome;

      const time = document.createElement("div");
      time.className = "mini-cal-event-time";
      const tA = ev.horaInicio ? ev.horaInicio : "";
      const tB = ev.horaFim ? ("–" + ev.horaFim) : "";
      time.textContent = (tA ? (tA + tB) : "");

      top.appendChild(name);
      top.appendChild(time);

      const d = document.createElement("div");
      d.className = "mini-cal-event-desc";
      d.textContent = desc(ev);

      const actions = document.createElement("div");
      actions.className = "mini-cal-event-actions";

      const openBtn = document.createElement("button");
      openBtn.className = "mini-cal-link";
      openBtn.type = "button";
      openBtn.textContent = "🗺️ " + T.open;
      openBtn.addEventListener("click", () => {
        const destino = ev.mapa || ev.nome;
        window.location.href = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(destino);
      });

      const addBtn = document.createElement("button");
      addBtn.className = "mini-cal-link";
      addBtn.type = "button";
      addBtn.textContent = "📅 " + T.add;
      addBtn.disabled = !ev.dataISO;
      addBtn.addEventListener("click", () => {
        if(!ev.dataISO) return;
        const start = toICSDateTime(ev.dataISO, ev.horaInicio || "12:00");
        const end = toICSDateTime(ev.dataISO, ev.horaFim || ev.horaInicio || "13:00");
        const ics = makeICS({
          title: ev.nome,
          description: desc(ev),
          location: ev.local || ev.mapa || "",
          startISO: start,
          endISO: end
        });
        const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "evento.ics";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      });

      actions.appendChild(openBtn);
      actions.appendChild(addBtn);

      box.appendChild(top);
      box.appendChild(d);
      box.appendChild(actions);
      listEl.appendChild(box);
    });
  }

  renderList();

  prevBtn.onclick = () => {
    const v = window.__CAL_VIEW_DATE || view;
    window.__CAL_VIEW_DATE = new Date(v.getFullYear(), v.getMonth()-1, 1);
    renderMiniCalendar();
  };
  nextBtn.onclick = () => {
    const v = window.__CAL_VIEW_DATE || view;
    window.__CAL_VIEW_DATE = new Date(v.getFullYear(), v.getMonth()+1, 1);
    renderMiniCalendar();
  };
}

(function(){
  // re-render on language changes (setLanguage() já existe)
  const _setLanguage = setLanguage;
  setLanguage = function(lang){
    _setLanguage(lang);
    try{ renderMiniCalendar(); }catch{}
  };
})();

// Inicializa quando o DOM estiver pronto
try{ renderMiniCalendar(); }catch{}


/* ==============================
   SHOW_CALENDAR_ONLY_IN_EVENTOS
============================== */
function toggleEventsCalendar(show){
  const sec = document.getElementById("events-calendar-section");
  if(!sec) return;
  sec.hidden = !show;
  if(show){
    try{ renderMiniCalendar(); }catch{}
  }
}




/* ==============================
   INFO EXTRA: LINK + HORÁRIO
============================== */

function horarioLabel(){
  const map = { pt:"🕒 Horário", en:"🕒 Opening hours", es:"🕒 Horario", fr:"🕒 Horaires" };
  return map[currentLang] || map.en;
}

function linkLabel(){
  const map = { pt:"🔗 Link oficial", en:"🔗 Official link", es:"🔗 Enlace oficial", fr:"🔗 Lien officiel" };
  return map[currentLang] || map.en;
}

function getHorario(cat, item){
  if(!item) return "";

  // Usa horário definido, se existir
  if(currentLang === "pt" && item.horarioPT) return item.horarioPT;
  if(currentLang !== "pt" && item.horarioEN) return item.horarioEN;

  // Fallback: para sítios onde faz sentido mostrar horários
  const needsHours = ["Restaurantes","Bares","FastFood","Supermercados","Churrasqueiras","Locais","Farmacias"].includes(cat);
  if(needsHours){
    if(currentLang === "pt") return "Consulta o horário no Google Maps (pode variar por época).";
    if(currentLang === "es") return "Consulta el horario en Google Maps (puede variar).";
    if(currentLang === "fr") return "Consulte les horaires sur Google Maps (peuvent varier).";
    return "Check opening hours on Google Maps (may vary).";
  }

  return item.horarioPT || item.horarioEN || "";
}

function buildInfoHtml(cat, item){
  const baseTxt = desc(item);
  const parts = [`${escapeHtml(baseTxt)}`];

  // Horário
  const h = getHorario(cat, item);
  if(h){
    parts.push(`<br><br><strong>${horarioLabel()}</strong><br>${escapeHtml(h)}`);
  }

  // Link oficial
  if(item && item.link){
    const safeUrl = String(item.link);
    parts.push(`<br><br><a class="mini-cal-link" href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(linkLabel())}</a>`);
  }

  return parts.join("");
}

(function(){
  const _abrirModalBase = abrirModal;
  abrirModal = function(cat, item){
    _abrirModalBase(cat, item);
    try{
      if(modalDesc){
        modalDesc.innerHTML = buildInfoHtml(cat, item);
      }
    }catch{}
  };
})();

