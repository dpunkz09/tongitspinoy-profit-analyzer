'use client';

import { useEffect, useRef } from 'react';
import { agentRowsOf } from '../_lib/calc';
import { APP_NAME, DEVELOPER, OVERVIEW } from '../_lib/config';
import type { SheetData } from '../_lib/types';
import { Icon, type IconName } from './Icon';
import { BrandMark } from './ui';

interface NavProps {
  sheets: SheetData[];
  activeView: string;
  onSelect: (view: string) => void;
}

function NavItem({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: IconName;
  label: string;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors ${
        active ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
      }`}
    >
      <Icon name={icon} className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      {badge !== undefined && (
        <span className="rounded bg-slate-700/60 px-1.5 text-xs tabular-nums text-slate-300">{badge}</span>
      )}
    </button>
  );
}

export function Sidebar({
  sheets,
  activeView,
  onSelect,
  fileName,
  onClear,
}: NavProps & { fileName: string; onClear: () => void }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-slate-900 lg:flex">
      <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-5">
        <BrandMark />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold text-white">{APP_NAME}</p>
          <p className="text-xs text-slate-400">Profit analytics</p>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5" aria-label="Primary">
        <div>
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Workspace
          </p>
          <NavItem
            active={activeView === OVERVIEW}
            onClick={() => onSelect(OVERVIEW)}
            icon="overview"
            label="Overview"
          />
        </div>

        <div>
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Games{sheets.length > 0 ? ` (${sheets.length})` : ''}
          </p>
          {sheets.length === 0 ? (
            <p className="px-3 text-xs text-slate-500">Upload a workbook to list games.</p>
          ) : (
            <div className="space-y-0.5">
              {sheets.map((sheet) => (
                <NavItem
                  key={sheet.sheetName}
                  active={activeView === sheet.sheetName}
                  onClick={() => onSelect(sheet.sheetName)}
                  icon="table"
                  label={sheet.sheetName}
                  badge={agentRowsOf(sheet).length}
                />
              ))}
            </div>
          )}
        </div>
      </nav>

      <div className="border-t border-slate-800 px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Data source</p>
        <p className="mt-1 flex items-center gap-2 text-sm text-slate-300" title={fileName}>
          <Icon name="file" className="h-4 w-4 shrink-0 text-slate-500" />
          <span className="truncate">{fileName || 'No file loaded'}</span>
        </p>
        {sheets.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="mt-2 inline-flex items-center gap-2 py-1 text-xs text-slate-400 hover:text-white"
          >
            <Icon name="trash" className="h-4 w-4" />
            Clear saved data
          </button>
        )}
        <p className="mt-3 text-xs italic text-slate-400">{DEVELOPER}</p>
      </div>
    </aside>
  );
}

/** One-tap game switcher for phones and tablets. */
function MobileTabs({ sheets, activeView, onSelect }: NavProps) {
  const stripRef = useRef<HTMLElement>(null);

  // Keep the selected tab in view without moving the page itself.
  useEffect(() => {
    const strip = stripRef.current;
    const tab = strip?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!strip || !tab) return;
    strip.scrollTo({
      left: tab.offsetLeft - (strip.clientWidth - tab.offsetWidth) / 2,
      behavior: 'smooth',
    });
  }, [activeView, sheets.length]);

  const items = [
    { view: OVERVIEW, label: 'Overview' },
    ...sheets.map((s) => ({ view: s.sheetName, label: s.sheetName })),
  ];

  return (
    <nav
      ref={stripRef}
      aria-label="Games"
      className="scrollbar-none relative flex gap-2 overflow-x-auto overscroll-x-contain px-4 pb-2 sm:px-8 lg:hidden"
    >
      {items.map(({ view, label }) => {
        const active = activeView === view;
        return (
          <button
            key={view}
            type="button"
            onClick={() => onSelect(view)}
            aria-current={active ? 'page' : undefined}
            className={`min-h-10 shrink-0 whitespace-nowrap rounded-full border px-4 text-sm font-medium ${
              active
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-300 bg-white text-slate-700 active:bg-slate-100'
            }`}
          >
            {label}
          </button>
        );
      })}
    </nav>
  );
}

export function Header({
  title,
  subtitle,
  sheets,
  activeView,
  onSelect,
  onUpload,
}: NavProps & { title: string; subtitle: string; onUpload: () => void }) {
  const hasData = sheets.length > 0;

  return (
    // On short landscape screens the header scrolls away to leave room for data.
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white pt-[env(safe-area-inset-top)] [@media(max-height:500px)]:static">
      <div className="flex min-h-14 items-center justify-between gap-3 px-4 py-2 sm:px-8 lg:min-h-16">
        <div className="flex min-w-0 items-center gap-3">
          <div className="lg:hidden">
            <BrandMark />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold leading-tight text-slate-900 sm:text-lg">{title}</h1>
            <p className="truncate text-xs text-slate-500 sm:text-sm">{subtitle}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onUpload}
          aria-label={hasData ? 'Replace file' : 'Upload file'}
          className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-md bg-blue-700 px-3 text-sm font-medium text-white shadow-sm hover:bg-blue-800 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 sm:px-4 md:min-h-10"
        >
          <Icon name="upload" className="h-4 w-4" />
          <span className="hidden sm:inline">{hasData ? 'Replace file' : 'Upload file'}</span>
        </button>
      </div>

      {hasData && <MobileTabs sheets={sheets} activeView={activeView} onSelect={onSelect} />}
    </header>
  );
}
