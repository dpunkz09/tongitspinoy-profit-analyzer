'use client';

import { useState } from 'react';
import { renderValue, signTone } from '../_lib/format';
import type { Column, ColumnKey, GameData, SortState } from '../_lib/types';
import { Icon } from './Icon';
import { ZoomableTable } from './ZoomableTable';

const MIN_WIDTH = 80;

export function AgentTable({
  columns,
  rows,
  totals,
  sort,
  onSort,
  highlighted,
  onHighlight,
  emptyText,
  zoom,
  onZoomChange,
}: {
  columns: Column[];
  rows: GameData[];
  totals: GameData;
  sort: SortState;
  onSort: (col: Column) => void;
  highlighted: string | null;
  onHighlight: (rowId: string) => void;
  emptyText: string;
  zoom: number;
  onZoomChange: (zoom: number) => void;
}) {
  const [widths, setWidths] = useState<Partial<Record<ColumnKey, number>>>({});

  const widthStyle = (key: ColumnKey) => {
    const width = widths[key];
    return width ? { width, minWidth: width, maxWidth: width } : undefined;
  };

  // Pointer capture keeps the drag on the handle, so no document listeners are needed.
  const startResize = (event: React.PointerEvent<HTMLDivElement>, key: ColumnKey) => {
    const handle = event.currentTarget;
    const startWidth = handle.parentElement?.offsetWidth ?? MIN_WIDTH;
    const startX = event.clientX;
    let latestX = startX;
    let frame = 0;

    event.preventDefault();
    handle.setPointerCapture(event.pointerId);

    const move = (e: PointerEvent) => {
      latestX = e.clientX;
      // At most one re-render per screen frame.
      frame ||= requestAnimationFrame(() => {
        frame = 0;
        const next = Math.max(MIN_WIDTH, startWidth + latestX - startX);
        setWidths((prev) => ({ ...prev, [key]: next }));
      });
    };
    const stop = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('lostpointercapture', stop);
    };

    handle.addEventListener('pointermove', move);
    handle.addEventListener('lostpointercapture', stop);
  };

  return (
    <ZoomableTable
      zoom={zoom}
      onZoomChange={onZoomChange}
      className="isolate max-h-[68dvh] overflow-auto overscroll-x-contain"
    >
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            {columns.map((col) => {
              const active = sort?.key === col.key;
              return (
                <th
                  key={col.key}
                  scope="col"
                  title={col.hint}
                  aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  style={widthStyle(col.key)}
                  className={`sticky top-0 border-b border-slate-200 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide whitespace-nowrap ${
                    col.minWidth ?? ''
                  } ${col.key === 'agent' ? 'left-0 z-20' : 'z-10'} ${
                    col.calculated ? 'bg-blue-50 text-blue-900' : 'bg-slate-50 text-slate-600'
                  } ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                >
                  <button
                    type="button"
                    onClick={() => onSort(col)}
                    className={`inline-flex min-h-8 items-center gap-1 uppercase tracking-wide hover:text-slate-900 ${
                      col.align === 'right' ? 'flex-row-reverse' : ''
                    }`}
                  >
                    <span className="flex flex-col items-start">
                      <span>{col.label}</span>
                      {col.sublabel && (
                        <span className="-mt-0.5 text-[9px] font-normal lowercase text-slate-500">
                          {col.sublabel}
                        </span>
                      )}
                    </span>
                    <Icon
                      name={active ? (sort.dir === 'asc' ? 'sort-asc' : 'sort-desc') : 'sort'}
                      className={`h-3.5 w-3.5 ${active ? 'text-slate-900' : 'text-slate-400'}`}
                    />
                  </button>
                  {/* Mouse only: on touch screens this strip caused accidental resizes. */}
                  <div
                    aria-hidden
                    onPointerDown={(e) => startResize(e, col.key)}
                    onDoubleClick={() => setWidths((prev) => ({ ...prev, [col.key]: undefined }))}
                    className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize touch-none hover:bg-blue-500 active:bg-blue-600 [@media(pointer:coarse)]:hidden"
                  />
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-slate-500">
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const marked = highlighted === row.rowId;
              return (
                <tr key={row.rowId} className="group">
                  {columns.map((col) => {
                    const isAgent = col.key === 'agent';
                    const value = row[col.key];
                    // One background per cell, so a highlighted row is amber all the way across.
                    const background = marked
                      ? 'bg-amber-100'
                      : isAgent
                        ? 'bg-white group-hover:bg-slate-50'
                        : col.calculated
                          ? 'bg-blue-50/40 group-hover:bg-blue-50'
                          : 'group-hover:bg-slate-50';
                    const tone =
                      col.signed && typeof value === 'number'
                        ? `font-medium ${signTone(value)}`
                        : isAgent || col.calculated
                          ? 'font-medium text-slate-900'
                          : col.key === 'agentId'
                            ? 'font-mono text-slate-600'
                            : 'text-slate-700';

                    return (
                      <td
                        key={col.key}
                        style={widthStyle(col.key)}
                        className={`border-b border-slate-100 px-3 py-2.5 whitespace-nowrap tabular-nums ${
                          isAgent ? 'sticky left-0 z-[1]' : ''
                        } ${col.align === 'right' ? 'text-right' : 'text-left'} ${background} ${tone}`}
                      >
                        {isAgent ? (
                          <button
                            type="button"
                            aria-pressed={marked}
                            onClick={() => onHighlight(row.rowId)}
                            className="block w-full max-w-[130px] select-none truncate text-left sm:max-w-[240px]"
                            title={row.agent}
                          >
                            {renderValue(row, col)}
                          </button>
                        ) : (
                          renderValue(row, col)
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>

        <tfoot>
          <tr>
            {columns.map((col) => {
              const value = totals[col.key];
              return (
                <td
                  key={col.key}
                  style={widthStyle(col.key)}
                  className={`sticky bottom-0 border-t-2 border-slate-300 bg-slate-100 px-3 py-3 font-semibold whitespace-nowrap tabular-nums ${
                    col.key === 'agent' ? 'left-0 z-20' : 'z-10'
                  } ${col.align === 'right' ? 'text-right' : 'text-left'} ${
                    col.signed && typeof value === 'number' ? signTone(value) : ''
                  }`}
                >
                  {col.key === 'agent' ? 'Total' : renderValue(totals, col)}
                </td>
              );
            })}
          </tr>
        </tfoot>
      </table>
    </ZoomableTable>
  );
}
