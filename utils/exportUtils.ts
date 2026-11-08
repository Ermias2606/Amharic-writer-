// utils/exportUtils.ts
import JSZip from 'jszip';
import type { Anthology } from '../types';
import { toGeezNumeral } from './geezUtils';

// Helper to strip HTML tags for plain text / markdown
function htmlToPlainText(html: string): string {
  if (typeof window === 'undefined') {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

// Convert HTML content into clean Markdown
function htmlToMarkdown(html: string): string {
  let md = html
    .replace(/<h1>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<h4>(.*?)<\/h4>/gi, '#### $1\n\n')
    .replace(/<b>(.*?)<\/b>/gi, '**$1**')
    .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<i>(.*?)<\/i>/gi, '*$1*')
    .replace(/<em>(.*?)<\/em>/gi, '*$1*')
    .replace(/<sup>(\d+)<\/sup>/gi, '[^$1]')
    .replace(/<li>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<\/?(ul|ol)>/gi, '\n')
    .replace(/<p>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<br\s*\/?>/gi, '\n');

  return htmlToPlainText(md);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export Anthology as Markdown (.md)
 */
export function exportToMarkdown(anthology: Anthology, useGeezNumerals = false): void {
  const lines: string[] = [];

  lines.push(`# ${anthology.title}\n`);
  lines.push(`*አማርኛ ስብስብ / Amharic Anthology*\n`);
  lines.push(`*Tone:* ${anthology.writingTone || 'Academic'}\n`);
  lines.push(`---\n`);

  lines.push(`## መቅድም / Preface\n`);
  lines.push(htmlToMarkdown(anthology.preface));
  lines.push('\n---\n');

  if (anthology.format === 'short') {
    lines.push(`## ${anthology.shortType || 'አጭር ጽሁፍ / Short Writing'}\n`);
    lines.push(htmlToMarkdown(anthology.shortContent || ''));
    lines.push('\n---\n');
  } else if (anthology.parts) {
    anthology.parts.forEach((part, pIdx) => {
      const partNum = useGeezNumerals ? toGeezNumeral(pIdx + 1) : `${pIdx + 1}`;
      lines.push(`## ክፍል ${partNum}: ${part.title}\n`);

      part.chapters.forEach((chapter, cIdx) => {
        const chapNum = useGeezNumerals ? toGeezNumeral(cIdx + 1) : `${cIdx + 1}`;
        lines.push(`### ምዕራፍ ${chapNum}: ${chapter.title}\n`);
        if (chapter.content) {
          lines.push(htmlToMarkdown(chapter.content));
        } else if (chapter.outline) {
          lines.push(`> *ረቂቅ:* ${chapter.outline}\n`);
        }

        if (chapter.footnotes && chapter.footnotes.length > 0) {
          lines.push('\n#### አောက်ခြေማስታወሻዎች / Footnotes:\n');
          chapter.footnotes.forEach((fn) => {
            lines.push(`[^${fn.id}]: ${fn.text}`);
          });
        }
        lines.push('\n');
      });
      lines.push('---\n');
    });
  }

  lines.push(`## ማጠቃለያ / Summary\n`);
  lines.push(htmlToMarkdown(anthology.summary));
  lines.push('\n');

  if (anthology.glossary && anthology.glossary.length > 0) {
    lines.push(`\n---\n## የቃላት መፍቻ / Glossary\n`);
    lines.push(`| Amharic Term | English Definition |`);
    lines.push(`|---|---|`);
    anthology.glossary.forEach((term) => {
      lines.push(`| **${term.term}** | ${term.definition} |`);
    });
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
  const safeTitle = (anthology.title || 'anthology').replace(/[^a-zA-Z0-9\u1200-\u137F]/g, '_');
  triggerDownload(blob, `${safeTitle}.md`);
}

/**
 * Export Anthology as JSON
 */
export function exportToJson(anthology: Anthology): void {
  const blob = new Blob([JSON.stringify(anthology, null, 2)], { type: 'application/json;charset=utf-8' });
  const safeTitle = (anthology.title || 'anthology').replace(/[^a-zA-Z0-9\u1200-\u137F]/g, '_');
  triggerDownload(blob, `${safeTitle}.json`);
}

/**
 * Export Anthology as a full standard EPUB (.epub)
 */
export async function exportToEpub(anthology: Anthology, useGeezNumerals = false): Promise<void> {
  const zip = new JSZip();

  // 1. mimetype (Must be first, uncompressed)
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  // 2. META-INF/container.xml
  zip.folder('META-INF')?.file(
    'container.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
    <rootfiles>
        <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
    </rootfiles>
</container>`
  );

  const oebps = zip.folder('OEBPS');
  if (!oebps) return;

  // EPUB CSS
  const css = `
body {
    font-family: 'Noto Serif Ethiopic', 'Abyssinica SIL', serif;
    line-height: 1.8;
    margin: 5%;
    color: #1a1a1a;
}
h1, h2, h3 {
    font-family: 'Noto Serif Ethiopic', 'Abyssinica SIL', serif;
    color: #8b151b;
    margin-top: 1.5em;
    margin-bottom: 0.5em;
}
h1 { font-size: 2em; text-align: center; }
h2 { font-size: 1.5em; border-bottom: 2px solid #c59b27; padding-bottom: 0.2em; }
h3 { font-size: 1.25em; }
p { margin-bottom: 1em; text-align: justify; text-indent: 1.5em; }
.footnotes {
    margin-top: 2em;
    padding-top: 1em;
    border-top: 1px solid #ccc;
    font-size: 0.85em;
    color: #555;
}
.cover-img {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 0 auto;
}
`;
  oebps.file('styles.css', css);

  // Manifest items and spine items
  interface ManifestItem {
    id: string;
    href: string;
    mediaType: string;
  }
  const manifest: ManifestItem[] = [
    { id: 'css', href: 'styles.css', mediaType: 'text/css' },
    { id: 'nav', href: 'nav.xhtml', mediaType: 'application/xhtml+xml' },
  ];
  const spine: string[] = [];

  // Cover image handling
  let hasCoverImage = false;
  if (anthology.frontCoverImage) {
    try {
      const coverBase64 = anthology.frontCoverImage.replace(/^data:image\/[a-z]+;base64,/, '');
      oebps.file('cover.jpg', coverBase64, { base64: true });
      manifest.push({ id: 'cover-image', href: 'cover.jpg', mediaType: 'image/jpeg' });

      const coverXhtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>Cover</title><link rel="stylesheet" href="styles.css"/></head>
<body style="text-align:center; padding:0; margin:0;">
    <h1>${anthology.title}</h1>
    <img src="cover.jpg" alt="Cover" class="cover-img"/>
</body>
</html>`;
      oebps.file('cover.xhtml', coverXhtml);
      manifest.push({ id: 'cover', href: 'cover.xhtml', mediaType: 'application/xhtml+xml' });
      spine.push('cover');
      hasCoverImage = true;
    } catch (e) {
      console.warn('Could not add cover image to EPUB', e);
    }
  }

  // Preface
  const prefaceXhtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>መቅድም / Preface</title><link rel="stylesheet" href="styles.css"/></head>
<body>
    <h2>መቅድም (Preface)</h2>
    <div>${anthology.preface || ''}</div>
</body>
</html>`;
  oebps.file('preface.xhtml', prefaceXhtml);
  manifest.push({ id: 'preface', href: 'preface.xhtml', mediaType: 'application/xhtml+xml' });
  spine.push('preface');

  // Chapters / Parts
  const navLinks: { title: string; href: string }[] = [{ title: 'መቅድም (Preface)', href: 'preface.xhtml' }];

  if (anthology.format === 'short') {
    const shortTitle = anthology.shortType || 'አጭር ጽሁፍ (Short Writing)';
    const shortXhtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>${shortTitle}</title><link rel="stylesheet" href="styles.css"/></head>
<body>
    <h2>${shortTitle}</h2>
    <div>${anthology.shortContent || ''}</div>
</body>
</html>`;
    oebps.file('short.xhtml', shortXhtml);
    manifest.push({ id: 'short', href: 'short.xhtml', mediaType: 'application/xhtml+xml' });
    spine.push('short');
    navLinks.push({ title: shortTitle, href: 'short.xhtml' });
  } else if (anthology.parts) {
    anthology.parts.forEach((part, pIdx) => {
      const partNum = useGeezNumerals ? toGeezNumeral(pIdx + 1) : `${pIdx + 1}`;
      part.chapters.forEach((chapter, cIdx) => {
        const chapNum = useGeezNumerals ? toGeezNumeral(cIdx + 1) : `${cIdx + 1}`;
        const chapId = `part_${pIdx + 1}_chap_${cIdx + 1}`;
        const chapFile = `${chapId}.xhtml`;

        const footnotesHtml =
          chapter.footnotes && chapter.footnotes.length > 0
            ? `<div class="footnotes">
                <h4>አောက်ခြေማስታወሻዎች / Footnotes</h4>
                <ol>${chapter.footnotes.map((fn) => `<li>${fn.text}</li>`).join('')}</ol>
               </div>`
            : '';

        const chapXhtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>${chapter.title}</title><link rel="stylesheet" href="styles.css"/></head>
<body>
    <div style="color: #666; font-size: 0.9em;">ክፍል ${partNum}: ${part.title}</div>
    <h3>ምዕራፍ ${chapNum}: ${chapter.title}</h3>
    <div>${chapter.content || `<p>${chapter.outline || ''}</p>`}</div>
    ${footnotesHtml}
</body>
</html>`;
        oebps.file(chapFile, chapXhtml);
        manifest.push({ id: chapId, href: chapFile, mediaType: 'application/xhtml+xml' });
        spine.push(chapId);
        navLinks.push({ title: `ምዕራፍ ${chapNum}: ${chapter.title}`, href: chapFile });
      });
    });
  }

  // Summary
  const summaryXhtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>ማጠቃለያ / Summary</title><link rel="stylesheet" href="styles.css"/></head>
<body>
    <h2>ማጠቃለያ (Summary)</h2>
    <div>${anthology.summary || ''}</div>
</body>
</html>`;
  oebps.file('summary.xhtml', summaryXhtml);
  manifest.push({ id: 'summary', href: 'summary.xhtml', mediaType: 'application/xhtml+xml' });
  spine.push('summary');
  navLinks.push({ title: 'ማጠቃለያ (Summary)', href: 'summary.xhtml' });

  // Glossary if present
  if (anthology.glossary && anthology.glossary.length > 0) {
    const glossaryXhtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>የቃላት መፍቻ / Glossary</title><link rel="stylesheet" href="styles.css"/></head>
<body>
    <h2>የቃላት መፍቻ (Glossary)</h2>
    <table style="width:100%; border-collapse: collapse;">
        <thead>
            <tr style="border-bottom: 2px solid #8b151b;">
                <th style="text-align:left; padding: 6px;">Term (Amharic)</th>
                <th style="text-align:left; padding: 6px;">Definition (English)</th>
            </tr>
        </thead>
        <tbody>
            ${anthology.glossary
              .map(
                (g) => `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 6px; font-weight: bold; color: #8b151b;">${g.term}</td>
                    <td style="padding: 6px;">${g.definition}</td>
                </tr>`
              )
              .join('')}
        </tbody>
    </table>
</body>
</html>`;
    oebps.file('glossary.xhtml', glossaryXhtml);
    manifest.push({ id: 'glossary', href: 'glossary.xhtml', mediaType: 'application/xhtml+xml' });
    spine.push('glossary');
    navLinks.push({ title: 'የቃላት መፍቻ (Glossary)', href: 'glossary.xhtml' });
  }

  // nav.xhtml (EPUB 3 Navigation)
  const navXhtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>Table of Contents</title><link rel="stylesheet" href="styles.css"/></head>
<body>
    <nav epub:type="toc" id="toc">
        <h1>ማውጫ (Table of Contents)</h1>
        <ol>
            ${navLinks.map((nl) => `<li><a href="${nl.href}">${nl.title}</a></li>`).join('')}
        </ol>
    </nav>
</body>
</html>`;
  oebps.file('nav.xhtml', navXhtml);

  // content.opf
  const bookId = `urn:uuid:${Math.random().toString(36).substring(2, 15)}`;
  const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="BookId">
    <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
        <dc:title>${anthology.title || 'Amharic Anthology'}</dc:title>
        <dc:language>am</dc:language>
        <dc:identifier id="BookId">${bookId}</dc:identifier>
        <dc:creator>Amharic Anthology Generator AI</dc:creator>
        <meta property="dcterms:modified">${new Date().toISOString().replace(/\.[0-9]+Z$/, 'Z')}</meta>
        ${hasCoverImage ? '<meta name="cover" content="cover-image"/>' : ''}
    </metadata>
    <manifest>
        ${manifest
          .map((item) => {
            const properties = item.id === 'nav' ? ' properties="nav"' : '';
            return `<item id="${item.id}" href="${item.href}" media-type="${item.mediaType}"${properties}/>`;
          })
          .join('\n        ')}
    </manifest>
    <spine>
        ${spine.map((id) => `<itemref idref="${id}"/>`).join('\n        ')}
    </spine>
</package>`;
  oebps.file('content.opf', opf);

  // Generate EPUB Blob
  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
  const safeTitle = (anthology.title || 'anthology').replace(/[^a-zA-Z0-9\u1200-\u137F]/g, '_');
  triggerDownload(blob, `${safeTitle}.epub`);
}
