import type { Section, DecoType, Preset } from "./types";

function buildStyle(deco: DecoType, preset: Preset, forceBold: boolean): string {
  const bold = forceBold || preset.useBold;
  let style = bold ? "font-weight:bold;" : "";

  if (deco === "underline") {
    style += "text-decoration:underline;";
  } else if (deco === "text") {
    style += `color:${preset.textColor};`;
    if (preset.textWithUnderline) style += "text-decoration:underline;";
  } else {
    // bg
    style += `background-color:${preset.bgColor};`;
    if (preset.darkBg) style += "color:#ffffff;";
  }

  if (preset.fontFamily !== "inherit") style = `font-family:${preset.fontFamily};` + style;
  return style;
}

function decorateHtml(sent: string, deco: DecoType, preset: Preset, phrase?: string, forceBold = false): string {
  const style = buildStyle(deco, preset, forceBold);
  const wrap = (text: string) => `<span style="${style}">${text}</span>`;

  if (phrase && phrase !== sent && sent.includes(phrase)) {
    const idx = sent.indexOf(phrase);
    return sent.slice(0, idx) + wrap(phrase) + sent.slice(idx + phrase.length);
  }
  return wrap(sent);
}

export function buildHtml(sections: Section[], preset: Preset): string {
  let html = "";
  for (const sec of sections) {
    if (sec.subtitle) {
      html += `<p style="font-size:17px;font-weight:bold;margin:24px 0 10px;">${sec.subtitle}</p>\n`;
    }
    const decoMap = new Map(sec.decorated.map((d) => [d.sentence, d]));
    for (const sent of sec.sentences) {
      const d = decoMap.get(sent);
      html += d
        ? `<p style="line-height:1.9;margin-bottom:16px;">${decorateHtml(sent, d.deco, preset, d.phrase, d.forceBold)}</p>\n`
        : `<p style="line-height:1.9;margin-bottom:16px;">${sent}</p>\n`;
    }
    html += `<p style="line-height:1.9;margin-bottom:16px;">&nbsp;</p>\n`;
  }
  return html;
}
