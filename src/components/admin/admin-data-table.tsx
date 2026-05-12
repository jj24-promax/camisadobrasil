import { cn } from "@/lib/utils";

type Column<T> = {
  key: keyof T | string;
  header: string;
  className?: string;
  cell: (row: T) => React.ReactNode;
};

type AdminDataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  emptyMessage?: string;
  getRowKey: (row: T) => string;
  /** `id` na `<tr>` (ex.: scroll desde outra página com `?leadId=`). */
  getRowDomId?: (row: T) => string | undefined;
  /** Classes extras por linha (ex.: destacar pedidos pagos). */
  getRowClassName?: (row: T) => string | undefined;
  /** Rodapé dentro do mesmo card (ex.: paginação). */
  footer?: React.ReactNode;
  /** Classes extras na `<table>` (ex.: `min-w-[1180px]` para muitas colunas). */
  tableClassName?: string;
};

export function AdminDataTable<T>({
  columns,
  rows,
  emptyMessage = "Nenhum registro.",
  getRowKey,
  getRowDomId,
  getRowClassName,
  footer,
  tableClassName,
}: AdminDataTableProps<T>) {
  return (
    <div className="admin-table-surface">
      <div className="overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
        <table
          className={cn("w-full min-w-[860px] text-left text-sm md:min-w-[960px]", tableClassName)}
        >
          <thead>
            <tr className="border-b border-white/[0.08] bg-[#070c14]/98">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  scope="col"
                  className={cn(
                    "whitespace-nowrap px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/95 first:pl-5 last:pr-5 sm:px-5 sm:first:pl-6 sm:last:pr-6",
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-sm leading-snug">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-5 py-14 text-center text-sm leading-relaxed text-muted-foreground sm:px-6"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={getRowKey(row)}
                  id={getRowDomId?.(row)}
                  className={cn(
                    "border-b border-white/[0.05] transition-colors last:border-0 hover:bg-white/[0.025]",
                    getRowClassName?.(row)
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={String(col.key)}
                      className={cn(
                        "px-4 py-3.5 align-middle text-foreground/95 first:pl-5 last:pr-5 sm:px-5 sm:py-4 sm:first:pl-6 sm:last:pr-6",
                        col.className
                      )}
                    >
                      {col.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {footer ? <div className="admin-table-footer">{footer}</div> : null}
    </div>
  );
}
