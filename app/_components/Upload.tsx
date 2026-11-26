'use client';

import { useState } from 'react';
import { TARGET_SHEETS } from '../_lib/config';
import { Icon } from './Icon';

export function Dropzone({ onFile, onBrowse }: { onFile: (file: File) => void; onBrowse: () => void }) {
  const [dragging, setDragging] = useState(false);

  return (
    <div className="mx-auto max-w-3xl">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          // Ignore events fired while moving between the box's own children.
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) onFile(file);
        }}
        className={`rounded-lg border-2 border-dashed p-6 text-center transition-colors sm:p-12 ${
          dragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-white'
        }`}
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <Icon name="upload" className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-base font-semibold text-slate-900">
          <span className="hidden sm:inline">Drop your XLSX workbook here</span>
          <span className="sm:hidden">Select your XLSX workbook</span>
        </h2>
        <p className="mt-1 text-sm text-slate-500">Supported formats: .xlsx, .xls</p>
        <button
          type="button"
          onClick={onBrowse}
          className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-md bg-blue-700 px-6 text-sm font-medium text-white shadow-sm hover:bg-blue-800 active:bg-blue-900 sm:w-auto"
        >
          Select file
        </button>
        <p className="mt-3 text-xs text-slate-500">
          Your file is read on this device. The last report stays saved in this browser until you clear it.
        </p>
      </div>

      <section className="mt-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:mt-6 sm:p-5">
        <h3 className="text-sm font-semibold text-slate-900">Expected worksheets</h3>
        <p className="mt-1 text-sm text-slate-500">
          These sheets are read when present. Anything else in the workbook is ignored.
        </p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {TARGET_SHEETS.map((name) => (
            <li key={name} className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700">
              {name}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export function LoadingCard({ message = 'Processing workbook…' }: { message?: string }) {
  return (
    <div
      role="status"
      className="mx-auto flex max-w-3xl flex-col items-center rounded-lg border border-slate-200 bg-white p-8 shadow-sm sm:p-16"
    >
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-700" />
      <p className="mt-4 text-sm font-medium text-slate-700">{message}</p>
    </div>
  );
}
