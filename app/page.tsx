'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Header, Sidebar } from './_components/Navigation';
import { GameView } from './_components/GameView';
import { OverviewView } from './_components/OverviewView';
import { Banner } from './_components/ui';
import { Dropzone, LoadingCard } from './_components/Upload';
import { applyPercentage, toPercent } from './_lib/calc';
import {
  COLUMNS,
  DEVELOPER,
  MOBILE_DEFAULT_COLUMNS,
  MOBILE_OVERVIEW_COLUMNS,
  OVERVIEW,
  OVERVIEW_COLUMNS,
} from './_lib/config';
import { useIsPhone } from './_lib/hooks';
import { loadXlsx, readWorkbook } from './_lib/parse';
import { DEFAULT_PREFS, clearData, loadData, loadPrefs, saveData, savePrefs } from './_lib/storage';
import type { Notice, Prefs, SheetData, ZoomTarget } from './_lib/types';

const toggled = <T,>(list: T[], item: T): T[] =>
  list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

/** Resolves after the browser has had a chance to draw the loading state. */
const nextPaint = () => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));

/**
 * Keeps one history entry while a game is open, so the phone's Back button
 * returns to the Overview instead of leaving the app.
 */
function syncHistory(view: string) {
  const inGame = Boolean(window.history.state?.tpGame);
  if (view === OVERVIEW) {
    if (inGame) window.history.back();
  } else {
    window.history[inGame ? 'replaceState' : 'pushState']({ tpGame: view }, '');
  }
}

export default function Home() {
  const [rawSheets, setRawSheets] = useState<SheetData[]>([]);
  const [fileName, setFileName] = useState('');
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [restored, setRestored] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [activeView, setActiveView] = useState<string>(OVERVIEW);
  const inputRef = useRef<HTMLInputElement>(null);
  const isPhone = useIsPhone();

  // Saved data is read after mounting so the server and browser first render match.
  useEffect(() => {
    const timer = setTimeout(() => {
      const saved = loadData();
      if (saved) {
        setRawSheets(saved.sheets);
        setFileName(saved.fileName);
      }
      setPrefs(loadPrefs());
      setRestored(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (restored) savePrefs(prefs);
  }, [prefs, restored]);

  useEffect(() => {
    const onPopState = (event: PopStateEvent) => setActiveView(event.state?.tpGame ?? OVERVIEW);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeView]);

  // Derived, never stored: changing a percentage can't leave stale figures behind.
  const sheets = useMemo(
    () => rawSheets.map((s) => applyPercentage(s, toPercent(prefs.percents[s.sheetName]))),
    [rawSheets, prefs.percents]
  );

  const agentColumns =
    prefs.agentColumns ?? (isPhone ? MOBILE_DEFAULT_COLUMNS : COLUMNS.map((c) => c.key));
  const overviewColumns =
    prefs.overviewColumns ?? (isPhone ? MOBILE_OVERVIEW_COLUMNS : OVERVIEW_COLUMNS.map((c) => c.key));

  const updatePrefs = (patch: Partial<Prefs>) => setPrefs((prev) => ({ ...prev, ...patch }));

  const navigate = (view: string) => {
    syncHistory(view);
    setActiveView(view);
  };

  const setZoom = (target: ZoomTarget, zoom: number) =>
    setPrefs((prev) => ({ ...prev, tableZoom: { ...prev.tableZoom, [target]: zoom } }));

  const setPercent = (sheetName: string, text: string) =>
    setPrefs((prev) => ({ ...prev, percents: { ...prev.percents, [sheetName]: text } }));

  const applyPercentToAll = (text: string) => {
    const message = `Set Profit % to ${toPercent(text)}% for all ${rawSheets.length} games? This replaces their current percentages.`;
    if (!window.confirm(message)) return;
    setPrefs((prev) => ({
      ...prev,
      percents: {
        ...prev.percents,
        ...Object.fromEntries(rawSheets.map((s) => [s.sheetName, text])),
      },
    }));
  };

  const processFile = async (file: File) => {
    if (isLoading) return;

    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      setNotice({
        tone: 'error',
        title: 'Unsupported file type',
        message: `“${file.name}” is not an Excel workbook. Upload an .xlsx or .xls file.`,
      });
      return;
    }

    setIsLoading(true);
    setNotice(null);
    await nextPaint();

    try {
      try {
        await loadXlsx();
      } catch (error) {
        console.error('Could not load the Excel reader:', error);
        setNotice({
          tone: 'error',
          title: 'Excel reader did not load',
          message: 'Check your internet connection, reload the page and try again.',
        });
        return;
      }

      const { sheets: parsed, skipped, warnings } = await readWorkbook(file);

      if (parsed.length === 0) {
        // Keep whatever was loaded before; a bad upload shouldn't wipe the view.
        setNotice({
          tone: 'error',
          title: 'No data found',
          message: `No expected worksheet could be read: ${skipped.join(', ')}.`,
        });
        return;
      }

      setRawSheets(parsed);
      setFileName(file.name);
      saveData({ fileName: file.name, sheets: parsed });
      navigate(OVERVIEW);

      const notes: string[] = [];
      if (skipped.length) notes.push(`Skipped: ${skipped.join(', ')}.`);
      if (warnings.length) notes.push(`Missing columns: ${warnings.join('; ')}.`);
      const carried = parsed
        .filter((s) => toPercent(prefs.percents[s.sheetName]) !== 0)
        .map((s) => `${s.sheetName} ${toPercent(prefs.percents[s.sheetName])}%`);
      if (carried.length) notes.push(`Profit % kept from last time: ${carried.join(', ')}.`);

      if (notes.length) {
        setNotice({ tone: 'warning', title: 'File loaded. Please check:', message: notes.join(' ') });
      }
    } catch (error) {
      console.error('Error parsing file:', error);
      setNotice({
        tone: 'error',
        title: 'Could not read file',
        message: `${
          error instanceof Error ? error.message : 'Unknown error'
        }. Make sure it is a valid XLSX file.`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (file) void processFile(file);
  };

  const openPicker = () => {
    // Start downloading the Excel reader while the user is choosing a file.
    loadXlsx().catch(() => {});
    inputRef.current?.click();
  };

  const clearSavedData = () => {
    if (!window.confirm('Remove the saved report and profit percentages from this browser?')) return;
    clearData();
    setRawSheets([]);
    setFileName('');
    setNotice(null);
    updatePrefs({ percents: {} });
    navigate(OVERVIEW);
  };

  const activeSheet = sheets.find((s) => s.sheetName === activeView);
  const hasData = sheets.length > 0;

  let title = 'Upload workbook';
  let subtitle = 'Import a weekly agent report to calculate Diamond Consume and Accurate Profit';
  if (hasData && activeSheet) {
    title = activeSheet.sheetName;
    subtitle = activeSheet.dateRange || fileName;
  } else if (hasData) {
    title = 'Overview';
    subtitle = `${sheets.length} ${sheets.length === 1 ? 'game' : 'games'} · ${fileName}`;
  }

  let content: React.ReactNode;
  if (!restored) {
    content = <LoadingCard message="Loading…" />;
  } else if (isLoading) {
    content = <LoadingCard />;
  } else if (!hasData) {
    content = <Dropzone onFile={(f) => void processFile(f)} onBrowse={openPicker} />;
  } else if (activeSheet) {
    content = (
      <GameView
        key={`${fileName}:${activeSheet.sheetName}`}
        sheet={activeSheet}
        percentText={prefs.percents[activeSheet.sheetName] ?? ''}
        onPercentChange={(text) => setPercent(activeSheet.sheetName, text)}
        onApplyToAll={applyPercentToAll}
        gameCount={sheets.length}
        visibleColumns={new Set(agentColumns)}
        onToggleColumn={(key) => updatePrefs({ agentColumns: toggled(agentColumns, key) })}
        isPhone={isPhone}
        mobileLayout={prefs.mobileLayout}
        onLayoutChange={(mobileLayout) => updatePrefs({ mobileLayout })}
        zoom={prefs.tableZoom.agents}
        onZoomChange={(zoom) => setZoom('agents', zoom)}
      />
    );
  } else {
    content = (
      <OverviewView
        sheets={sheets}
        onOpen={navigate}
        visibleColumns={new Set(overviewColumns)}
        onToggleColumn={(key) => updatePrefs({ overviewColumns: toggled(overviewColumns, key) })}
        isPhone={isPhone}
        mobileLayout={prefs.mobileLayout}
        onLayoutChange={(mobileLayout) => updatePrefs({ mobileLayout })}
        zoom={prefs.tableZoom.overview}
        onZoomChange={(zoom) => setZoom('overview', zoom)}
      />
    );
  }

  return (
    <div className="min-h-dvh bg-slate-100 text-slate-900">
      <input
        ref={inputRef}
        type="file"
        // MIME types as well as extensions: some Android file pickers ignore extensions.
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        onChange={handleInputChange}
        className="hidden"
        aria-label="Upload XLSX file"
      />

      <Sidebar
        sheets={sheets}
        activeView={activeView}
        onSelect={navigate}
        fileName={fileName}
        onClear={clearSavedData}
      />

      <div className="flex min-h-dvh flex-col lg:pl-64">
        <Header
          title={title}
          subtitle={subtitle}
          sheets={sheets}
          activeView={activeView}
          onSelect={navigate}
          onUpload={openPicker}
        />

        <main className="mx-auto w-full max-w-[1800px] flex-1 py-3 pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] sm:px-8 sm:py-6">
          {notice && <Banner notice={notice} onDismiss={() => setNotice(null)} />}
          {content}
        </main>

        {/* The sidebar is hidden below lg, so its details live here instead. */}
        <footer className="px-4 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom))] text-center text-xs text-slate-500 lg:hidden">
          {hasData && (
            <>
              <p className="[overflow-wrap:anywhere]">{fileName}</p>
              <button type="button" onClick={clearSavedData} className="min-h-11 px-3 font-medium underline">
                Clear saved data
              </button>
            </>
          )}
          <p className="italic">{DEVELOPER}</p>
        </footer>
      </div>
    </div>
  );
}
