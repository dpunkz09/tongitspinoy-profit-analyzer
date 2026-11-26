type CsvCell = string | number;

const escapeCell = (value: CsvCell): string => {
  let text = String(value);
  // Stop spreadsheet apps from running an agent name such as "=HYPERLINK(...)" as a formula.
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const toCsv = (header: string[], rows: CsvCell[][]): string =>
  [header, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n');

function download(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Some mobile browsers start the download late, so don't revoke immediately.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Phones get the native share sheet (Messenger, Viber, Drive…); computers download. */
export async function exportCsv(name: string, csv: string) {
  // BOM keeps Excel from mangling non-ASCII agent names.
  const file = new File(['﻿' + csv], `${name.replace(/[^a-z0-9]+/gi, '_')}.csv`, {
    type: 'text/csv',
  });

  const isTouch = window.matchMedia('(pointer: coarse)').matches;
  if (isTouch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: file.name });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
    }
  }

  download(file);
}
