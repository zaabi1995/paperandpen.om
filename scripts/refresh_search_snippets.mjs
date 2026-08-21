import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const UPDATED_DATE = '2026-08-21';

const articles = {
  'what-is-a-proforma-invoice': {
    en: {
      title: 'What Is a Proforma Invoice? Meaning, Uses and Example',
      description:
        'A proforma invoice is a preliminary sales document sent before delivery. Learn its purpose, what it includes, and how it differs from a tax invoice.',
    },
    ar: {
      title: 'ما هي الفاتورة المبدئية؟ المعنى والاستخدام والمثال',
      description:
        'الفاتورة المبدئية مستند بيع أولي يُرسل قبل التسليم. تعرّف على غرضها وما تتضمنه والفرق بينها وبين الفاتورة الضريبية.',
    },
    hi: {
      title: 'प्रोफॉर्मा इनवॉइस क्या है? अर्थ, उपयोग और उदाहरण',
      description:
        'प्रोफॉर्मा इनवॉइस डिलीवरी से पहले भेजा जाने वाला प्रारंभिक बिक्री दस्तावेज है। जानें इसका उद्देश्य, इसमें क्या शामिल है और यह टैक्स इनवॉइस से कैसे अलग है।',
    },
    bn: {
      title: 'Proforma Invoice কী? অর্থ, ব্যবহার ও উদাহরণ',
      description:
        'Proforma invoice হলো ডেলিভারির আগে পাঠানো একটি প্রাথমিক বিক্রয় নথি। এর উদ্দেশ্য, এতে কী থাকে এবং tax invoice থেকে এর পার্থক্য জানুন।',
    },
    ur: {
      title: 'پروفارما انوائس کیا ہے؟ مطلب، استعمال اور مثال',
      description:
        'پروفارما انوائس ڈیلیوری سے پہلے بھیجی جانے والی ابتدائی فروخت کی دستاویز ہے۔ اس کا مقصد، ضروری تفصیل اور ٹیکس انوائس سے فرق جانیں۔',
    },
  },
  'vat-invoicing-gcc-guide': {
    en: {
      title: 'GCC VAT Invoicing Guide: Tax Invoice Rules by Country',
      description:
        'GCC VAT invoice rules differ by country. Check the fields a tax invoice generally needs, the correct calculation order, and where to verify current rules.',
      sourceBlock: `## Verify current rules at the source

Use our country guides for [Oman](/vat/oman), the [United Arab Emirates](/vat/uae), [Saudi Arabia](/vat/saudi-arabia), and [Bahrain](/vat/bahrain). Each guide names and links the tax authority documents behind its figures. Check the relevant authority again before issuing an invoice because tax rules can change.`,
    },
    ar: {
      title: 'دليل فواتير ضريبة القيمة المضافة في الخليج حسب الدولة',
      description:
        'تختلف قواعد فواتير ضريبة القيمة المضافة بين دول الخليج. تعرّف على الحقول المطلوبة وطريقة الحساب الصحيحة ومكان التحقق من القواعد الحالية.',
      sourceBlock: `## تحقّق من القواعد الحالية من مصدرها

استخدم أدلتنا الخاصة بـ[عُمان](/vat/oman) و[الإمارات العربية المتحدة](/vat/uae) و[السعودية](/vat/saudi-arabia) و[البحرين](/vat/bahrain). يسمّي كل دليل مستندات الجهة الضريبية التي تستند إليها الأرقام ويربط بها. تحقّق من الجهة المختصة مرة أخرى قبل إصدار الفاتورة لأن القواعد الضريبية قد تتغير.`,
    },
    hi: {
      title: 'GCC VAT इनवॉइस गाइड: देश के अनुसार टैक्स नियम',
      description:
        'GCC में VAT इनवॉइस के नियम देश के अनुसार अलग हैं। जरूरी फ़ील्ड, सही गणना क्रम और मौजूदा नियमों की पुष्टि कहाँ करें, यह जानें।',
      sourceBlock: `## मौजूदा नियम आधिकारिक स्रोत से जाँचें

[ओमान](/vat/oman), [संयुक्त अरब अमीरात](/vat/uae), [सऊदी अरब](/vat/saudi-arabia) और [बहरीन](/vat/bahrain) के लिए हमारी देश गाइड देखें। हर गाइड अपने आँकड़ों के पीछे मौजूद कर प्राधिकरण के दस्तावेजों का नाम और लिंक देती है। इनवॉइस जारी करने से पहले संबंधित प्राधिकरण से दोबारा पुष्टि करें क्योंकि कर नियम बदल सकते हैं।`,
    },
    bn: {
      title: 'GCC VAT ইনভয়েস গাইড: দেশভিত্তিক করের নিয়ম',
      description:
        'GCC-তে VAT ইনভয়েসের নিয়ম দেশভেদে আলাদা। প্রয়োজনীয় তথ্য, সঠিক হিসাবের ধাপ এবং বর্তমান নিয়ম কোথায় যাচাই করবেন তা জানুন।',
      sourceBlock: `## বর্তমান নিয়ম মূল উৎস থেকে যাচাই করুন

[ওমান](/vat/oman), [সংযুক্ত আরব আমিরাত](/vat/uae), [সৌদি আরব](/vat/saudi-arabia) এবং [বাহরাইন](/vat/bahrain) সম্পর্কে আমাদের দেশভিত্তিক গাইড দেখুন। প্রতিটি গাইডে ব্যবহৃত কর কর্তৃপক্ষের নথির নাম ও লিংক রয়েছে। করের নিয়ম পরিবর্তিত হতে পারে, তাই ইনভয়েস দেওয়ার আগে সংশ্লিষ্ট কর্তৃপক্ষের তথ্য আবার যাচাই করুন।`,
    },
    ur: {
      title: 'GCC VAT انوائس گائیڈ: ملک کے لحاظ سے ٹیکس قواعد',
      description:
        'GCC میں VAT انوائس کے قواعد ہر ملک میں مختلف ہیں۔ ضروری معلومات، درست حسابی ترتیب اور موجودہ قواعد کی تصدیق کہاں کریں، یہ جانیں۔',
      sourceBlock: `## موجودہ قواعد اصل ماخذ سے چیک کریں

[عمان](/vat/oman)، [متحدہ عرب امارات](/vat/uae)، [سعودی عرب](/vat/saudi-arabia) اور [بحرین](/vat/bahrain) کے لیے ہماری ملکی گائیڈز دیکھیں۔ ہر گائیڈ میں استعمال ہونے والی ٹیکس اتھارٹی کی دستاویزات کے نام اور لنکس شامل ہیں۔ ٹیکس قواعد بدل سکتے ہیں، اس لیے انوائس جاری کرنے سے پہلے متعلقہ اتھارٹی سے دوبارہ تصدیق کریں۔`,
    },
  },
};

const omanVatCalculator = {
  en: {
    metaTitle: 'Oman VAT Calculator: Add or Remove 5% VAT',
    metaDescription:
      "Calculate Oman's 5% VAT online. Add VAT to a net amount or remove it from a gross total to see the net, VAT and total instantly, with no signup.",
  },
  ar: {
    metaTitle: 'حاسبة ضريبة عُمان 5%: إضافة الضريبة أو عكسها',
    metaDescription:
      'احسب ضريبة القيمة المضافة في عُمان بنسبة 5% عبر الإنترنت. أضف الضريبة إلى الصافي أو اعكسها من الإجمالي لعرض الصافي والضريبة والمجموع فوراً.',
  },
  hi: {
    metaTitle: 'ओमान VAT कैलकुलेटर: 5% VAT जोड़ें या हटाएँ',
    metaDescription:
      'ओमान का 5% VAT ऑनलाइन निकालें। नेट राशि में VAT जोड़ें या ग्रॉस कुल से हटाकर नेट, VAT और कुल तुरंत देखें, बिना साइनअप के।',
  },
  bn: {
    metaTitle: 'ওমান VAT ক্যালকুলেটর: 5% VAT যোগ বা বাদ দিন',
    metaDescription:
      'ওমানের 5% VAT অনলাইনে হিসাব করুন। নেট অঙ্কে VAT যোগ করুন বা গ্রস মোট থেকে বাদ দিয়ে নেট, VAT ও মোট তাৎক্ষণিক দেখুন, সাইনআপ ছাড়াই।',
  },
  ur: {
    metaTitle: 'عمان VAT کیلکولیٹر: 5% VAT شامل یا ختم کریں',
    metaDescription:
      'عمان کا 5% VAT آن لائن نکالیں۔ نیٹ رقم میں VAT شامل کریں یا گراس کل سے ختم کر کے نیٹ، VAT اور کل فوری دیکھیں، سائن اپ کے بغیر۔',
  },
};

const conciseEnglishTitles = {
  'src/content/industries/en/restaurants.json':
    'Restaurant Billing & Recipe Inventory | Paper & Pen',
  'src/content/industries/en/salons.json':
    'Salon Billing, Staff & Stock Software | Paper & Pen',
  'src/content/industries/en/trading.json':
    'Trading & Wholesale ERP Software | Paper & Pen',
  'src/content/usecases/en/accountants.json':
    'Accounting Software for Accountants | Paper & Pen',
  'src/content/usecases/en/agencies.json':
    'Agency Invoicing & Client Billing | Paper & Pen',
  'src/content/usecases/en/small-business.json':
    'Small Business ERP & Invoicing | Paper & Pen',
};

const changed = [];

function save(relative, next) {
  const path = resolve(ROOT, relative);
  const current = readFileSync(path, 'utf8');
  if (current === next) return;
  writeFileSync(path, next, 'utf8');
  changed.push(relative);
}

function yamlString(value) {
  return JSON.stringify(value);
}

function setFrontmatterField(frontmatter, field, value, afterField) {
  const line = `${field}: ${yamlString(value)}`;
  const matcher = new RegExp(`^${field}:.*$`, 'm');
  if (matcher.test(frontmatter)) return frontmatter.replace(matcher, line);
  const after = new RegExp(`^(${afterField}:.*)$`, 'm');
  if (!after.test(frontmatter)) throw new Error(`Missing ${afterField} before ${field}`);
  return frontmatter.replace(after, `$1\n${line}`);
}

function updateArticle(locale, slug, values) {
  const relative = `src/content/blog/${locale}/${slug}.mdx`;
  const path = resolve(ROOT, relative);
  const source = readFileSync(path, 'utf8');
  const closing = source.indexOf('\n---', 4);
  if (!source.startsWith('---\n') || closing === -1) {
    throw new Error(`Invalid frontmatter in ${relative}`);
  }
  let frontmatter = source.slice(4, closing);
  frontmatter = setFrontmatterField(frontmatter, 'title', values.title, 'slug');
  frontmatter = setFrontmatterField(frontmatter, 'description', values.description, 'title');
  frontmatter = setFrontmatterField(frontmatter, 'shortAnswer', values.description, 'description');
  frontmatter = setFrontmatterField(frontmatter, 'updatedDate', UPDATED_DATE, 'pubDate');
  let next = `---\n${frontmatter}${source.slice(closing)}`;
  if (values.sourceBlock) {
    const start = '{/* search-authority-sources:start */}';
    const end = '{/* search-authority-sources:end */}';
    const legacyStart = '<!-- search-authority-sources:start -->';
    const legacyEnd = '<!-- search-authority-sources:end -->';
    const block = `${start}\n${values.sourceBlock}\n${end}`;
    const replaceDelimited = (text, opening, closing) => {
      const from = text.indexOf(opening);
      const to = text.indexOf(closing, from + opening.length);
      if (from === -1 || to === -1) return undefined;
      return `${text.slice(0, from)}${block}${text.slice(to + closing.length)}`;
    };
    next =
      replaceDelimited(next, start, end) ||
      replaceDelimited(next, legacyStart, legacyEnd) ||
      `${next.trimEnd()}\n\n${block}\n`;
  }
  save(relative, next);
}

function updateJson(relative, fields, relatedHref) {
  const path = resolve(ROOT, relative);
  let source = readFileSync(path, 'utf8');
  for (const [field, value] of Object.entries(fields)) {
    const matcher = new RegExp(`^(\\s*)"${field}":\\s*.*?(,?)$`, 'm');
    if (!matcher.test(source)) throw new Error(`Missing ${field} in ${relative}`);
    source = source.replace(matcher, `$1"${field}": ${JSON.stringify(value)}$2`);
  }
  if (relatedHref) {
    const matcher = /^(\s*)"related":\s*(\[[^\n]*\])(,?)$/m;
    const match = source.match(matcher);
    if (!match) throw new Error(`Missing single-line related list in ${relative}`);
    const related = JSON.parse(match[2]);
    if (!related.includes(relatedHref)) related.unshift(relatedHref);
    source = source.replace(matcher, `$1"related": ${JSON.stringify(related)}$3`);
  }
  save(relative, source);
}

for (const [slug, locales] of Object.entries(articles)) {
  for (const [locale, values] of Object.entries(locales)) {
    updateArticle(locale, slug, values);
  }
}

for (const [locale, values] of Object.entries(omanVatCalculator)) {
  updateJson(
    `src/content/tools/${locale}/oman-vat-calculator.json`,
    {
      metaTitle: values.metaTitle,
      metaDescription: values.metaDescription,
      heroSubtitle: values.metaDescription,
    },
    '/vat/oman'
  );
}

for (const [relative, metaTitle] of Object.entries(conciseEnglishTitles)) {
  updateJson(relative, { metaTitle });
}

console.log(
  changed.length
    ? `Updated ${changed.length} search-snippet source files.`
    : 'Search-snippet source files already match the release configuration.'
);
