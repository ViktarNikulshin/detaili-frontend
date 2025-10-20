import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { reportAPI } from '../../services/reportApi';
import { MasterWeeklyReport } from '../../types/report';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import './MasterReport.css';
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    createColumnHelper,
    getSortedRowModel,
    ColumnDef,
    Table,
} from '@tanstack/react-table';
import moment from "moment/moment";

declare module '@tanstack/react-table' {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface ColumnMeta<TData, TValue> {
        className?: string;
    }
}

// Тип для колонок MasterWeeklyReport
type ReportRow = MasterWeeklyReport;

// Хелпер для создания колонок
const columnHelper = createColumnHelper<ReportRow>();

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---

// Функция для получения даты ПОНЕДЕЛЬНИКА для заданной даты
const getMonday = (date: Date): Date => {
    date = new Date(date);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
};

// Функция для форматирования даты в YYYY-MM-DD (для API)
const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const MasterReport: React.FC = () => {
    const [reports, setReports] = useState<MasterWeeklyReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentDate, setCurrentDate] = useState(new Date());

    const dateRange = useMemo(() => {
        const startDate = getMonday(currentDate);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        return {
            startDate: formatDate(startDate),
            endDate: formatDate(endDate),
            displayStart: format(startDate, 'dd.MM.yyyy'),
            displayEnd: format(endDate, 'dd.MM.yyyy'),
        };
    }, [currentDate]);

    const fetchReport = useCallback(async (start: string, end: string) => {
        try {
            setLoading(true);
            const response = await reportAPI.getMastersWeeklyReport(
                moment(start).format('YYYY-MM-DDTHH:mm'),
                moment(end).format('YYYY-MM-DDTHH:mm'));
            setReports(response.data);
            setError(null);
        } catch (err) {
            setError('Не удалось загрузить отчет. Попробуйте позже.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchReport(dateRange.startDate, dateRange.endDate);
    }, [dateRange, fetchReport]);

    // --- ЛОГИКА TANSTACK TABLE ---

    // 1. Собираем все уникальные типы работ (нужно для динамических колонок)
    const workTypeHeaders = useMemo(() => {
        const allEarnings = reports.flatMap(report => report.earnings);
        const uniqueWorkTypes = Array.from(new Set(allEarnings.map(e => e.workTypeName)));
        return uniqueWorkTypes.sort();
    }, [reports]);

    // 2. Определяем динамические колонки для типов работ
    const workTypeColumns = useMemo(() => {
        return workTypeHeaders.map(header =>
            columnHelper.accessor(row => {
                const earning = row.earnings.find(e => e.workTypeName === header)?.totalEarnings;
                // Возвращаем число или undefined.
                return earning;
            }, {
                id: header,
                header: () => header,
                // Если value не undefined, форматируем, иначе '–'
                cell: info => info.getValue() !== undefined && info.getValue() !== null ? info.getValue()!.toFixed(2) : '–',
                footer: () => {
                    const totalByType = reports.reduce((acc, report) => {
                        const earning = report.earnings.find(e => e.workTypeName === header)?.totalEarnings || 0;
                        return acc + earning;
                    }, 0);
                    return totalByType > 0 ? <strong>{totalByType.toFixed(2)}</strong> : null;
                },
                meta: { className: 'text-center' },
            })
        );
    }, [workTypeHeaders, reports]);

    // 3. Определяем полный набор колонок
    const columns: ColumnDef<ReportRow, any>[] = useMemo(() => [
        columnHelper.accessor('masterFirstName', {
            id: 'masterName',
            header: () => 'Мастер',
            cell: info => (
                <Link
                    to={`/reports/master/${info.row.original.masterId}?start=${dateRange.startDate}&end=${dateRange.endDate}`}
                    className="master-link"
                >
                    {info.row.original.masterFirstName} {info.row.original.masterLastName}
                </Link>
            ),
        }),
        // Приводим workTypeColumns к универсальному типу для объединения
        ...(workTypeColumns as ColumnDef<ReportRow, any>[]),
        columnHelper.accessor('totalMasterEarnings', {
            id: 'total',
            header: () => 'Итого ЗП',
            cell: info => <strong>{info.getValue().toFixed(2)}</strong>,
            footer: () => {
                const grandTotal = reports.reduce((acc, report) => acc + report.totalMasterEarnings, 0);
                return <strong>{grandTotal.toFixed(2)}</strong>;
            },
            meta: { className: 'text-center' },
        }),
    ], [workTypeColumns, dateRange, reports]);

    // 4. Инициализация таблицы с хуком
    const table: Table<ReportRow> = useReactTable({
        data: reports,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        // getFooterGroups не требуется
    });

    if (loading) return <div className="report-loading">Загрузка отчета...</div>;
    if (error) return <div className="report-error">{error}</div>;

    // --- РЕНДЕРИНГ ---

    return (
        <div className="report-container">
            <h2>Недельный отчет по зарплате мастеров</h2>

            <div className="date-navigation">
                <button
                    onClick={() => setCurrentDate(prev => new Date(prev.setDate(prev.getDate() - 7)))}
                >
                    &lt; Предыдущая неделя
                </button>
                <span>Отчет за неделю: **{dateRange.displayStart}** - **{dateRange.displayEnd}**</span>
                <button
                    onClick={() => setCurrentDate(prev => new Date(prev.setDate(prev.getDate() + 7)))}
                >
                    Следующая неделя &gt;
                </button>
            </div>

            {reports.length === 0 ? (
                <div className="report-empty">Данные за выбранный период отсутствуют.</div>
            ) : (
                <div className="table-wrapper">
                    <table className="report-table">
                        <thead>
                        {table.getHeaderGroups().map(headerGroup => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map(header => (
                                    <th
                                        key={header.id}
                                        colSpan={header.colSpan}
                                        onClick={header.column.getToggleSortingHandler()}
                                        className={header.column.getCanSort() ? 'sortable' : ''}
                                    >
                                        {/* Рендерим заголовок */}
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                        {/* Индикатор сортировки */}
                                        {header.column.getIsSorted() && (
                                            <span>
                                                    {header.column.getIsSorted() === 'asc' ? ' 🔼' : ' 🔽'}
                                                </span>
                                        )}
                                    </th>
                                ))}
                            </tr>
                        ))}
                        </thead>
                        <tbody>
                        {table.getRowModel().rows.map(row => (
                            <tr key={row.id}>
                                {row.getVisibleCells().map(cell => (
                                    <td
                                        key={cell.id}
                                        className={cell.column.columnDef.meta?.className}
                                    >
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </td>
                                ))}
                            </tr>
                        ))}
                        </tbody>
                        <tfoot>
                        {table.getFooterGroups().map(footerGroup => (
                            <tr key={footerGroup.id} className="report-footer">
                                {footerGroup.headers.map(header => (
                                    <td
                                        key={header.id}
                                        colSpan={header.colSpan}
                                        className={header.column.columnDef.meta?.className}
                                    >
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                header.column.columnDef.footer,
                                                header.getContext()
                                            )}
                                    </td>
                                ))}
                            </tr>
                        ))}
                        </tfoot>
                    </table>
                </div>
            )}
        </div>
    );
};

export default MasterReport;