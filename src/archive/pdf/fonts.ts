import { Font } from "@react-pdf/renderer";

export const PDF_SERIF_FONT_FAMILY = "Noto Serif KR";

export const PDF_SANS_FONT_FAMILY = "Noto Sans KR";

let registered = false;

export function registerPdfFonts() {
  if (registered) {
    return;
  }

  registered = true;

  Font.register({
    family: PDF_SERIF_FONT_FAMILY,

    fonts: [
      {
        src: "/fonts/noto/NotoSerifKR-Regular.woff2",
        fontWeight: 400,
      },
      {
        src: "/fonts/noto/NotoSerifKR-Bold.woff2",
        fontWeight: 700,
      },
    ],
  });

  Font.register({
    family: PDF_SANS_FONT_FAMILY,

    fonts: [
      {
        src: "/fonts/noto/NotoSansKR-Regular.woff2",
        fontWeight: 400,
      },
      {
        src: "/fonts/noto/NotoSansKR-Bold.woff2",
        fontWeight: 700,
      },
    ],
  });

  Font.registerHyphenationCallback(
    (word) => [word],
  );
}
