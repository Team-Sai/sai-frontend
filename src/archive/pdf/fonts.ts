import { Font } from '@react-pdf/renderer';

export const PDF_FONT_FAMILY = 'Pretendard';

let registered = false;

export function registerPdfFonts() {
  if (registered) return;
  registered = true;

  Font.register({
    family: PDF_FONT_FAMILY,
    fonts: [
      { src: '/fonts/Pretendard-Regular-subset.woff2', fontWeight: 400 },
      { src: '/fonts/Pretendard-Bold-subset.woff2', fontWeight: 700 },
    ],
  });

  Font.registerHyphenationCallback((word) => [word]);
}
