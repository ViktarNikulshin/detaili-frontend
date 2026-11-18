import React, { useEffect, useMemo, useState } from 'react';
import {
    ColumnDef,
    PaginationState,
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table';
import * as XLSX from 'xlsx';
import { clientAPI } from '../../services/clientApi';
import { ClientListItem } from '../../types/client';
import ClientDrawer from './ClientDrawer';
import './Clients.css';

declare module '@tanstack/react-table' {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface ColumnMeta<TData, TValue> {
        className?: string;
    }
}

type PageNumber = number | '…';

const buildPageNumbers = (current: number, total: number): PageNumber[] => {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i);
    }
    const pages: PageNumber[] = [0];
    let prev: number | null = null;
    for (let p = Math.max(1, current - 1); p <= Math.min(total - 2, current + 1); p++) {
        if (prev !== null && p > prev + 1) pages.push('…');
        pages.push(p);
        prev = p;
    }
    if (prev !== null && prev < total - 2) pages.push('…');
    if (total - 1 !== prev) pages.push(total - 1);
    return pages;
};

const Clients: React.FC = () => {
    const [clients, setClients] = useState<ClientListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 15 });

    useEffect(() => {
        const fetchClients = async () => {
            try {
                const response = await clientAPI.getClients();
                setClients(response.data);
            } catch (err) {
                setError('Не удалось загрузить клиентскую базу.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchClients();
    }, []);

    // При смене поиска всегда возвращаемся на первую страницу
    useEffect(() => {
        setPagination(prev => (prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 }));
    }, [search]);

    // Поиск по имени, телефону и марке авто — локально, без запросов на каждый символ
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return clients;
        return clients.filter(c =>
            c.name?.toLowerCase().includes(q) ||
            c.phone?.toLowerCase().includes(q) ||
            c.lastCarBrand?.toLowerCase().includes(q)
        );
    }, [clients, search]);

    const columns = useMemo<ColumnDef<ClientListItem, any>[]>(() => [
        {
            id: 'name',
            header: () => 'Имя',
            accessorFn: row => row.name || '',
            cell: info => <span className="clients-name-cell">{info.getValue() || '—'}</span>,
        },
        {
            id: 'phone',
            header: () => 'Телефон',
            accessorKey: 'phone',
        },
        {
            id: 'lastCarBrand',
            header: () => 'Последнее авто',
            accessorFn: row => row.lastCarBrand || '',
            cell: info => info.getValue() || '—',
        },
        {
            id: 'ordersCount',
            header: () => 'Заказов',
            accessorKey: 'ordersCount',
            meta: { className: 'text-center' },
        },
        {
            id: 'totalSpent',
            header: () => 'На сумму',
            accessorKey: 'totalSpent',
            cell: info => Number(info.getValue() || 0).toFixed(2),
            meta: { className: 'text-center' },
        },
        {
            id: 'lastVisitDate',
            header: () => 'Последний визит',
            accessorFn: row => row.lastVisitDate || '',
            cell: info => {
                const value = info.getValue();
                if (!value) return '—';
                const d = new Date(value);
                return d.toLocaleDateString('ru-RU');
            },
        },
    ], []);

    const table = useReactTable({
        data: filtered,
        columns,
        state: { pagination },
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        autoResetPageIndex: false,
    });

    const exportToExcel = () => {
        const wsData: (string | number)[][] = [
            ['Имя', 'Телефон', 'Последнее авто', 'Заказов', 'На сумму', 'Последний визит'],
            ...filtered.map(c => [
                c.name || '',
                c.phone || '',
                c.lastCarBrand || '',
                c.ordersCount,
                c.totalSpent,
                c.lastVisitDate ? new Date(c.lastVisitDate).toLocaleDateString('ru-RU') : '',
            ]),
        ];

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        const objectMaxLength: number[] = [];
        wsData.forEach(row => row.forEach((val, colIndex) => {
            const len = val ? val.toString().length : 0;
            if (!objectMaxLength[colIndex] || len > objectMaxLength[colIndex]) {
                objectMaxLength[colIndex] = len;
            }
        }));
        ws['!cols'] = objectMaxLength.map(maxLen => ({ wch: maxLen + 3 }));
        XLSX.utils.book_append_sheet(wb, ws, 'Клиентская база');
        XLSX.writeFile(wb, `Клиентская_база_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.xlsx`);
    };

    if (loading) return <p className="clients-message">Загрузка клиентской базы...</p>;
    if (error) return <p className="clients-message error">{error}</p>;

    const pageIndex = pagination.pageIndex;
    const pageSize = pagination.pageSize;
    const pageCount = table.getPageCount();
    const firstRow = pageIndex * pageSize + 1;
    const lastRow = Math.min((pageIndex + 1) * pageSize, filtered.length);

    return (
        <div className="clients-container">
            <div className="clients-header">
                <h1>Клиентская база</h1>
                <input
                    type="text"
                    className="clients-search"
                    placeholder="Поиск: имя, телефон или марка авто..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                <button className="clients-export-btn" onClick={exportToExcel}>
                    📊 Экспорт в Excel
                </button>
            </div>

            <div className="clients-table-wrapper">
                {filtered.length === 0 ? (
                    <div className="clients-empty">Клиенты не найдены.</div>
                ) : (
                    <table className="clients-table">
                        <thead>
                        {table.getHeaderGroups().map(headerGroup => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map(header => (
                                    <th
                                        key={header.id}
                                        onClick={header.column.getToggleSortingHandler()}
                                        className={header.column.getCanSort() ? 'sortable' : ''}
                                    >
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(header.column.columnDef.header, header.getContext())}
                                        {header.column.getIsSorted() && (
                                            <span>{header.column.getIsSorted() === 'asc' ? ' 🔼' : ' 🔽'}</span>
                                        )}
                                    </th>
                                ))}
                            </tr>
                        ))}
                        </thead>
                        <tbody>
                        {table.getRowModel().rows.map(row => (
                            <tr
                                key={row.id}
                                className={row.original.id === selectedId ? 'clients-row-selected' : ''}
                                onClick={() => setSelectedId(row.original.id)}
                            >
                                {row.getVisibleCells().map(cell => (
                                    <td key={cell.id} className={cell.column.columnDef.meta?.className}>
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </td>
                                ))}
                            </tr>
                        ))}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="clients-footer">
                <span className="clients-footer-info">
                    {filtered.length > 0
                        ? `Показано ${firstRow}–${lastRow} из ${filtered.length}`
                        : ''}
                </span>

                {pageCount > 1 && (
                    <div className="clients-pager">
                        <button
                            className="clients-page-btn"
                            onClick={() => table.setPageIndex(0)}
                            disabled={pageIndex === 0}
                            title="Первая страница"
                        >
                            «
                        </button>
                        <button
                            className="clients-page-btn"
                            onClick={() => table.previousPage()}
                            disabled={pageIndex === 0}
                            title="Предыдущая страница"
                        >
                            ‹
                        </button>
                        {buildPageNumbers(pageIndex, pageCount).map((p, idx) =>
                            p === '…'
                                ? <span key={`dots-${idx}`} className="clients-page-dots">…</span>
                                : (
                                    <button
                                        key={p}
                                        className={`clients-page-btn${p === pageIndex ? ' clients-page-btn-active' : ''}`}
                                        onClick={() => table.setPageIndex(p)}
                                        disabled={p === pageIndex}
                                    >
                                        {p + 1}
                                    </button>
                                )
                        )}
                        <button
                            className="clients-page-btn"
                            onClick={() => table.nextPage()}
                            disabled={pageIndex >= pageCount - 1}
                            title="Следующая страница"
                        >
                            ›
                        </button>
                        <button
                            className="clients-page-btn"
                            onClick={() => table.setPageIndex(pageCount - 1)}
                            disabled={pageIndex >= pageCount - 1}
                            title="Последняя страница"
                        >
                            »
                        </button>
                    </div>
                )}

                <label className="clients-page-size">
                    Строк:
                    <select
                        value={pageSize}
                        onChange={e => setPagination({ pageIndex: 0, pageSize: Number(e.target.value) })}
                    >
                        <option value={10}>10</option>
                        <option value={15}>15</option>
                        <option value={25}>25</option>
                    </select>
                </label>
            </div>

            {selectedId !== null && (
                <ClientDrawer clientId={selectedId} onClose={() => setSelectedId(null)} />
            )}
        </div>
    );
};

export default Clients;
