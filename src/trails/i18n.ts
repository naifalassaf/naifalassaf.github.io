import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import type { Lang } from './types'

const ar = {
  title: 'مسارات السعودية',
  docTitle: 'مسارات السعودية — البراري',
  subtitle: 'مسارات المشي الرسمية في السعودية على خريطة واحدة',
  brand: 'البراري',
  switchLang: 'English',
  tally: { trails: 'مسار', mapped: 'على الخريطة', regions: 'منطقة' },
  filters: {
    search: 'ابحث باسم المسار أو المدينة',
    searchLabel: 'بحث',
    source: 'الجهة',
    region: 'المنطقة',
    difficulty: 'الصعوبة',
    sort: 'الترتيب',
    all: 'الكل',
    sortDefault: 'حسب الجهة',
    sortPlain: 'الافتراضي',
    sortShort: 'الأقصر أولًا',
    sortLong: 'الأطول أولًا',
    sortEasy: 'الأسهل أولًا',
    sortNear: 'الأقرب إليّ',
    toggle: 'بحث متقدم',
    clear: 'مسح التصفية',
    locating: 'جارٍ تحديد موقعك…',
    noLocation: 'تعذّر تحديد موقعك، فبقي الترتيب كما هو.',
  },
  source: { ksrnr: 'محمية الملك سلمان', darb: 'جمعية درب', asir: 'هيئة تطوير عسير' },
  difficulty: { easy: 'سهل', moderate: 'متوسط', hard: 'صعب' },
  unit: { km: 'كم', m: 'م', h: 'س', min: 'د' },
  stat: { length: 'الطول', high: 'أعلى نقطة', gain: 'الصعود', time: 'المدة', away: 'المسافة منك' },
  link: {
    ksrnr: 'الصفحة الرسمية',
    darb: 'صفحة درب',
    schf: 'صفحة اتحاد التسلق والهايكنج',
    asir: 'دليل الأنشطة',
    kml: 'تحميل KML',
    gmaps: 'خرائط جوجل',
    search: 'بحث في الخرائط',
  },
  noStart: 'بدون إحداثيات منشورة',
  route: 'خط المسار مرسوم',
  empty: 'لا توجد مسارات مطابقة.',
  legend: { ksrnr: 'محمية الملك سلمان', darb: 'جمعية درب', asir: 'هيئة تطوير عسير', route: 'خط المسار' },
  layers: { sat: 'صور الأقمار الصناعية', topo: 'خريطة تضاريس' },
  locate: {
    button: 'موقعي',
    retry: 'حاول مرة أخرى',
    close: 'إغلاق',
    denied: {
      title: 'الوصول إلى الموقع مرفوض',
      body: 'لعرض موقعك على الخريطة، اسمح لهذه الصفحة بالوصول إلى موقعك ثم اضغط «حاول مرة أخرى». موقعك يبقى على جهازك ولا يُرسَل أو يُحفَظ.',
    },
    unavailable: {
      title: 'تعذّر تحديد موقعك',
      body: 'لم يصل جهازك إلى إشارة الموقع. جرّب في مكان مكشوف، أو تأكد أن خدمات الموقع مفعّلة في الجهاز.',
    },
    unsupported: {
      title: 'المتصفح لا يدعم تحديد الموقع',
      body: 'جرّب فتح الصفحة في متصفح آخر.',
    },
    steps: {
      ios: [
        'في سفاري: اضغط على «aA» أو أيقونة الإعدادات في شريط العنوان، ثم «إعدادات الموقع» ← «الموقع» ← «سماح».',
        'إذا لم يظهر الخيار: الإعدادات ← الخصوصية والأمان ← خدمات الموقع، وتأكد أنها مفعّلة وأن «مواقع سفاري» على «أثناء الاستخدام».',
      ],
      android: [
        'اضغط على أيقونة القفل أو الإعدادات بجانب عنوان الصفحة.',
        'اختر «الأذونات» ← «الموقع» ← «سماح».',
        'تأكد أن الموقع مفعّل في إعدادات الجهاز.',
      ],
      desktop: [
        'اضغط على أيقونة القفل أو الإعدادات بجانب عنوان الصفحة في المتصفح.',
        'غيّر «الموقع» إلى «سماح»، ثم أعد تحميل الصفحة إذا طُلب منك.',
      ],
    },
  },
  about: {
    heading: 'عن البيانات وحقوقها',
    ksrnr:
      'مسارات <b>محمية الملك سلمان</b> ({{count}}) وخطوطها من موقع <a href="https://ksrnr.gov.sa/ar/content/event/168" target="_blank" rel="noopener">هيئة تطوير محمية الملك سلمان بن عبدالعزيز الملكية</a>، لقطة بتاريخ {{date}}. الحقوق محفوظة للهيئة. وتنص إرشادات المحمية على التنسيق مع مرشد معتمد من الاتحاد السعودي للتسلق والهايكنج.',
    asir:
      'مسارات <b>عسير</b> ({{count}}) من <a href="https://discoveraseer.com/booklet?type=outdoor&locale=ar" target="_blank" rel="noopener">دليل الأنشطة الخارجية</a> لهيئة تطوير منطقة عسير، لقطة بتاريخ {{date}}، وخطوطها من ملفات KML المرتبطة بالدليل. الحقوق محفوظة للهيئة.',
    darb:
      'مسارات <b>جمعية درب</b> ({{count}}) وخطوطها من <a href="https://darb.org" target="_blank" rel="noopener">جمعية درب</a>، وتُحدَّث أسبوعيًّا (آخر تحديث {{date}}). الحقوق محفوظة للجمعية.',
    schf:
      'مسار <b>قارح - الماردية</b> من بناء جمعية درب، ولم يُنشر في موقعها بعد: بياناته من <a href="https://climbing.sa/qarh-al-mardiyah-trail/" target="_blank" rel="noopener">صفحة المسار لدى الاتحاد السعودي للتسلق والهايكنج</a>، وخطه من <a href="https://www.wikiloc.com/hiking-trails/msr-qrh-lmrdy-266740482" target="_blank" rel="noopener">تسجيل طاري الشمري على Wikiloc</a> بعد مطابقته بخريطة الاتحاد.',
    gaps: 'المسارات التي لا تنشر جهتها إحداثياتها مدرجة بمدينتها مع رابط بحث في الخرائط.',
    unofficial:
      'هذه صفحة شخصية غير رسمية لا تمثل أيًّا من الجهات. لكل مسار رابط إلى صفحته الرسمية، فارجع إليها قبل الخروج.',
    oursEn: '',
    by: 'صنعها <a href="/">نايف العساف</a>.',
  },
}

const en: typeof ar = {
  title: 'Saudi Trails',
  docTitle: 'Saudi Trails — Al-Barari',
  subtitle: 'Official hiking trails in Saudi Arabia, on one map',
  brand: 'Al-Barari',
  switchLang: 'العربية',
  tally: { trails: 'trails', mapped: 'on the map', regions: 'regions' },
  filters: {
    search: 'Search by trail or city',
    searchLabel: 'Search',
    source: 'Source',
    region: 'Region',
    difficulty: 'Difficulty',
    sort: 'Sort',
    all: 'All',
    sortDefault: 'By source',
    sortPlain: 'Default',
    sortShort: 'Shortest first',
    sortLong: 'Longest first',
    sortEasy: 'Easiest first',
    sortNear: 'Nearest to me',
    toggle: 'Advanced search',
    clear: 'Clear filters',
    locating: 'Finding your location…',
    noLocation: 'Couldn’t find your location, so the order is unchanged.',
  },
  source: { ksrnr: 'King Salman Royal Reserve', darb: 'Darb', asir: 'Aseer Development Authority' },
  difficulty: { easy: 'Easy', moderate: 'Moderate', hard: 'Hard' },
  unit: { km: 'km', m: 'm', h: 'h', min: 'min' },
  stat: { length: 'Length', high: 'High point', gain: 'Climb', time: 'Time', away: 'Distance from you' },
  link: {
    ksrnr: 'Official page',
    darb: 'Darb page',
    schf: 'SCHF page',
    asir: 'Activities guide',
    kml: 'Download KML',
    gmaps: 'Google Maps',
    search: 'Search maps',
  },
  noStart: 'No published coordinates',
  route: 'Route shown',
  empty: 'No trails match.',
  legend: { ksrnr: 'King Salman Royal Reserve', darb: 'Darb', asir: 'Aseer Development Authority', route: 'Route' },
  layers: { sat: 'Satellite', topo: 'Terrain' },
  locate: {
    button: 'My location',
    retry: 'Try again',
    close: 'Close',
    denied: {
      title: 'Location access is blocked',
      body: 'To see where you are on the map, allow this page to use your location, then tap “Try again”. Your location stays on your device: it isn’t sent anywhere or stored.',
    },
    unavailable: {
      title: 'Couldn’t find your location',
      body: 'Your device didn’t get a location fix. Try somewhere with open sky, or check that location services are on.',
    },
    unsupported: {
      title: 'This browser can’t share your location',
      body: 'Try opening the page in another browser.',
    },
    steps: {
      ios: [
        'In Safari, tap “aA” or the settings icon in the address bar, then Website Settings → Location → Allow.',
        'If that’s not there: Settings → Privacy & Security → Location Services. Make sure it’s on and Safari Websites is set to “While Using the App”.',
      ],
      android: [
        'Tap the lock or settings icon next to the page address.',
        'Choose Permissions → Location → Allow.',
        'Check that location is turned on in your phone’s settings.',
      ],
      desktop: [
        'Click the lock or settings icon next to the page address.',
        'Set Location to Allow, then reload the page if asked.',
      ],
    },
  },
  about: {
    heading: 'About the data',
    ksrnr:
      `<b>King Salman Royal Reserve</b> trails ({{count}}) and their routes come from the <a href="https://ksrnr.gov.sa/en/content/event/168" target="_blank" rel="noopener">King Salman bin Abdulaziz Royal Reserve Development Authority</a>, as of {{date}}. All rights belong to the Authority. The Reserve's guidelines ask hikers to arrange a guide certified by the Saudi Climbing and Hiking Federation.`,
    asir:
      '<b>Asir</b> trails ({{count}}) come from the <a href="https://discoveraseer.com/booklet?type=outdoor&locale=en" target="_blank" rel="noopener">Outdoor Activities Guide</a> of the Aseer Development Authority, as of {{date}}, with routes from the KML files the guide links to. All rights belong to the Authority.',
    darb:
      '<b>Darb</b> trails ({{count}}) and their routes come from the <a href="https://darb.org/en" target="_blank" rel="noopener">Darb association</a>, refreshed weekly (last {{date}}). All rights belong to Darb.',
    schf:
      'The <b>Qarh – Al Mardiyah</b> trail was built by Darb but isn’t on Darb’s site yet. Its details come from the <a href="https://climbing.sa/qarh-al-mardiyah-trail/" target="_blank" rel="noopener">Saudi Climbing and Hiking Federation’s trail page</a>, and its route from <a href="https://www.wikiloc.com/hiking-trails/msr-qrh-lmrdy-266740482" target="_blank" rel="noopener">a Wikiloc recording by طاري الشمري</a>, checked against the Federation’s map.',
    gaps: 'Trails whose Source publishes no coordinates are listed by city, with a map search link.',
    unofficial:
      'This is an unofficial personal project, not affiliated with any Source. Every trail links to its official page: check it before you go.',
    oursEn: 'English names marked * are our own transliterations; the Source publishes them in Arabic only.',
    by: 'Made by <a href="/">Naif Alassaf</a>.',
  },
}

i18n.use(initReactI18next).init({
  resources: { ar: { translation: ar }, en: { translation: en } },
  lng: initialLang(),
  fallbackLng: 'ar',
  interpolation: { escapeValue: false },
})

/** ?lang= wins, then the last choice on this device, then Arabic. */
export function initialLang(): Lang {
  const q = new URLSearchParams(location.search).get('lang')
  if (q === 'ar' || q === 'en') return q
  try {
    const s = localStorage.getItem('trails.lang')
    if (s === 'ar' || s === 'en') return s
  } catch {
    /* storage blocked: fall through */
  }
  return 'ar'
}

export function rememberLang(lang: Lang) {
  try {
    localStorage.setItem('trails.lang', lang)
  } catch {
    /* storage blocked: the URL still carries it */
  }
}

export default i18n
