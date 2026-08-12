// r6-83: add the skip-link label to every dictionary WITHOUT reserialising.
// JSON.parse + JSON.stringify rewrote 60 lines per file (the translators pack
// several short keys onto one line and stringify does not), which buries a
// one-string change in a diff nobody can read. Byte-surgical insert instead.
import fs from 'node:fs';

const LABEL = {
  en: 'Skip to main content',
  ar: 'تخطَّ إلى المحتوى',
  hi: 'मुख्य सामग्री पर जाएँ',
  bn: 'মূল বিষয়বস্তুতে যান',
  ur: 'مرکزی مواد پر جائیں',
};

for (const [loc, value] of Object.entries(LABEL)) {
  const path = `src/i18n/ui/${loc}.json`;
  let src = fs.readFileSync(path, 'utf8');
  if (src.includes('"a11y"')) {
    console.log(`${loc}: already has a11y, skipped`);
    continue;
  }
  const at = src.indexOf('{');
  src = `${src.slice(0, at + 1)}
  "a11y": { "skipToContent": ${JSON.stringify(value)} },${src.slice(at + 1)}`;
  fs.writeFileSync(path, src);
  const back = JSON.parse(fs.readFileSync(path, 'utf8'));
  if (back.a11y.skipToContent !== value) throw new Error(`${loc}: round-trip lost the value`);
  console.log(`${loc}: ok`);
}
