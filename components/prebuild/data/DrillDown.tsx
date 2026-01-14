'use client';

import * as React from 'react';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

export type DrillDownColumn = {
  key: string;
  label: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
};

export type DrillDownTable = {
  key: string;
  label: React.ReactNode;
  columns: DrillDownColumn[];
  rows: Array<Record<string, React.ReactNode>>;
  emptyText?: React.ReactNode;
};

export type DrillDownDataSet = {
  key: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  tables: DrillDownTable[];
};

export type DrillDownApi = {
  openDrilldown: (dataSetKey: string, tableKey?: string) => void;
  close: () => void;
};

export type DrillDownProps = {
  dataSets: DrillDownDataSet[];
  className?: string;
  apiRef?: React.MutableRefObject<DrillDownApi | null>;
};

const DEFAULT_EMPTY_TEXT = 'No drill down data.';

function getAlignmentClass(align?: DrillDownColumn['align']) {
  if (align === 'center') return 'text-center';
  if (align === 'right') return 'text-right';
  return 'text-left';
}

export function DrillDown({ dataSets, className, apiRef }: DrillDownProps) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [activeDataSetKey, setActiveDataSetKey] = React.useState<string | undefined>(undefined);
  const [activeTableKey, setActiveTableKey] = React.useState<string | undefined>(undefined);

  const dataSetMap = React.useMemo(() => new Map(dataSets.map((dataSet) => [dataSet.key, dataSet])), [dataSets]);

  const openDrilldown = React.useCallback((dataSetKey: string, tableKey?: string) => {
    setActiveDataSetKey(dataSetKey);
    if (tableKey) {
      setActiveTableKey(tableKey);
    }
    setDialogOpen(true);
  }, []);

  const close = React.useCallback(() => setDialogOpen(false), []);

  React.useEffect(() => {
    if (!apiRef) return;
    const api = { openDrilldown, close };
    apiRef.current = api;

    return () => {
      if (apiRef.current === api) {
        apiRef.current = null;
      }
    };
  }, [apiRef, openDrilldown, close]);

  React.useEffect(() => {
    if (!dataSets.length) {
      if (activeDataSetKey !== undefined) {
        setActiveDataSetKey(undefined);
      }
      if (activeTableKey !== undefined) {
        setActiveTableKey(undefined);
      }
      return;
    }

    const resolvedDataSet = dataSetMap.get(activeDataSetKey ?? '') ?? dataSets[0];
    if (resolvedDataSet && resolvedDataSet.key !== activeDataSetKey) {
      setActiveDataSetKey(resolvedDataSet.key);
    }

    if (!resolvedDataSet.tables.length) {
      if (activeTableKey !== undefined) {
        setActiveTableKey(undefined);
      }
      return;
    }

    const resolvedTable =
      resolvedDataSet.tables.find((table) => table.key === activeTableKey) ?? resolvedDataSet.tables[0];

    if (resolvedTable && resolvedTable.key !== activeTableKey) {
      setActiveTableKey(resolvedTable.key);
    }
  }, [dataSets, dataSetMap, activeDataSetKey, activeTableKey]);

  const activeDataSet = activeDataSetKey ? dataSetMap.get(activeDataSetKey) : dataSets[0];
  const activeTables = activeDataSet?.tables ?? [];
  const activeTableKeyValue = activeTableKey ?? activeTables[0]?.key;

  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className={cn('flex max-h-[85vh] w-[calc(100%-2rem)] flex-col gap-4 overflow-hidden sm:max-w-4xl', className)}
        >
          <DialogHeader>
            {activeDataSet?.label ? <DialogTitle>{activeDataSet.label}</DialogTitle> : null}
            {activeDataSet?.description ? <DialogDescription>{activeDataSet.description}</DialogDescription> : null}
          </DialogHeader>
          {activeTables.length > 1 ? (
            <Tabs
              value={activeTableKeyValue}
              onValueChange={setActiveTableKey}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="shrink-0 overflow-x-auto">
                <TabsList className="w-max">
                  {activeTables.map((table) => (
                    <TabsTrigger key={table.key} value={table.key}>
                      {table.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              {activeTables.map((table) => (
                <TabsContent key={table.key} value={table.key} className="flex min-h-0 flex-1 flex-col">
                  {renderTable(table)}
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <div className="min-h-0 flex-1">{activeTables[0] ? renderTable(activeTables[0]) : renderEmpty()}</div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function renderEmpty() {
  return <div className="text-muted-foreground text-sm">{DEFAULT_EMPTY_TEXT}</div>;
}

function renderTable(table: DrillDownTable) {
  if (!table.columns.length) {
    return <div className="text-muted-foreground text-sm">{table.emptyText ?? DEFAULT_EMPTY_TEXT}</div>;
  }

  if (!table.rows.length) {
    return <div className="text-muted-foreground text-sm">{table.emptyText ?? DEFAULT_EMPTY_TEXT}</div>;
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto rounded-md border">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            {table.columns.map((column) => (
              <TableHead
                key={column.key}
                className={cn(
                  'bg-muted/50 text-xs font-semibold text-muted-foreground',
                  getAlignmentClass(column.align),
                  column.className
                )}
              >
                {column.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {table.rows.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {table.columns.map((column) => (
                <TableCell key={column.key} className={cn(getAlignmentClass(column.align), column.className)}>
                  {row[column.key] ?? '-'}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
