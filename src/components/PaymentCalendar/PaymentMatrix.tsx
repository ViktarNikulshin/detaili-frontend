/**
 * Матрица «статьи × дни» с закреплёнными левой и правой колонками.
 *
 * Компонент мемоизирован: до рефакторинга каждое нажатие клавиши в форме
 * операции перерисовывало все ~540 узлов <table>. Теперь он перерисовывается
 * только при реальном изменении данных матрицы.
 */
import React, { memo, useCallback, useMemo } from 'react';
import moment from 'moment';
import { PcDay, PcPeriod } from '../../types/paymentCalendar';
import { MatrixRowConfig, MATRIX_SECTIONS, WEEKDAYS_RU } from './pcMatrix';

export const fmt = (value: number | undefined | null): string => (value ?? 0).toFixed(2);

/** Ячейки закрыты `white-space: nowrap` — лишние дроби в них обрезаются. */
const formatCell = (value: number | undefined | null): string => {
    const num = value ?? 0;
    return num === 0 ? '' : String(Math.round(num));
};

const formatTotal = (value: number | undefined | null): string => String(Math.round(value ?? 0));

const isWeekendDate = (date: string): boolean => {
    const iso = moment(date).isoWeekday();
    return iso === 6 || iso === 7;
};

interface RowProps {
    row: MatrixRowConfig;
    days: PcDay[];
    dayLabels: Record<string, string>;
    todayStr: string;
    period: PcPeriod;
    onAddToCell: (date: string, row: MatrixRowConfig) => void;
}

const MatrixRow = memo<RowProps>(({ row, days, dayLabels, todayStr, period, onAddToCell }) => {
    const isTotalRow = row.rowType === 'income-total' || row.rowType === 'expense-total';
    const isInteractive = Boolean(row.direction);
    const rowTotal = row.getTotalValue(period);

    const rowClassName = [
        isTotalRow ? 'pc-subtotal-row' : '',
        row.rowType === 'income-total' ? 'pc-income-subtotal' : '',
        row.rowType === 'expense-total' ? 'pc-expense-subtotal' : '',
    ].filter(Boolean).join(' ');

    return (
        <tr className={rowClassName}>
            <td className="pc-sticky-col pc-article-cell" title={row.label}>
                {row.label}
            </td>

            {days.map(day => {
                const value = row.getDayValue(day);
                const isToday = day.date === todayStr;
                const className = [
                    'pc-val-cell',
                    isInteractive ? 'pc-clickable-cell' : '',
                    isWeekendDate(day.date) ? 'pc-weekend-col' : '',
                    isToday ? 'pc-today-col' : '',
                    row.rowType === 'income-total' && value > 0 ? 'pc-income-cell' : '',
                    row.rowType === 'expense-total' && value > 0 ? 'pc-expense-cell' : '',
                ].filter(Boolean).join(' ');

                return (
                    <td
                        key={day.date}
                        onClick={isInteractive ? () => onAddToCell(day.date, row) : undefined}
                        title={
                            `${row.label} · ${dayLabels[day.date]}: ${fmt(value)} BYN` +
                            (isInteractive ? ' (нажмите для добавления)' : '')
                        }
                        className={className}
                    >
                        {formatCell(value)}
                    </td>
                );
            })}

            <td
                title={`${fmt(rowTotal)} BYN`}
                className={[
                    'pc-sticky-total pc-total-cell',
                    row.rowType === 'income-total' ? 'pc-income-cell' : '',
                    row.rowType === 'expense-total' ? 'pc-expense-cell' : '',
                ].filter(Boolean).join(' ')}
            >
                {formatTotal(rowTotal)}
            </td>
        </tr>
    );
});
MatrixRow.displayName = 'MatrixRow';

interface Props {
    period: PcPeriod;
    mode: 'MONTH' | 'WEEK';
    onAddToCell: (date: string, row: MatrixRowConfig) => void;
}

const PaymentMatrix = memo<Props>(({ period, mode, onAddToCell }) => {
    const days = period.days;

    // `todayStr` вычисляется один раз на рендер матрицы, а не на каждую
    // ячейку (раньше `format(new Date(), …)` вызывался 600+ раз за отрисовку).
    const todayStr = useMemo(() => moment().format('YYYY-MM-DD'), []);

    // Подписи дат для title считаются один раз на рендер, а не в каждой из
    // 400+ ячеек: `moment(...).format()` в title стоило ~400 вызовов.
    const dayLabels = useMemo(() => {
        const map: Record<string, string> = {};
        days.forEach(day => {
            map[day.date] = moment(day.date).format('DD.MM');
        });
        return map;
    }, [days]);

    const handleAddToCell = useCallback(
        (date: string, row: MatrixRowConfig) => onAddToCell(date, row),
        [onAddToCell]
    );

    const periodNetFlow = period.incomesTotal.total - period.paymentsTotal.total;

    return (
        <div className="table-wrapper no-border-radius-bottom pc-matrix-wrapper">
            <table className="report-table pc-matrix-table">
                <thead>
                    <tr>
                        <th className="pc-sticky-col">Статья (BYN)</th>
                        {days.map(day => {
                            const weekdayIdx = moment(day.date).isoWeekday() - 1;
                            return (
                                <th
                                    key={day.date}
                                    className={[
                                        'pc-day-th',
                                        isWeekendDate(day.date) ? 'pc-weekend-col' : '',
                                        day.date === todayStr ? 'pc-today-col' : '',
                                        day.cashGap ? 'pc-gap-col-head' : '',
                                    ].filter(Boolean).join(' ')}
                                    title={`${WEEKDAYS_RU[weekdayIdx] ?? ''}, ${moment(day.date).format('DD.MM.YYYY')}`}
                                >
                                    <div className="pc-day-num">
                                        {mode === 'MONTH' ? moment(day.date).format('D') : dayLabels[day.date]}
                                    </div>
                                    <div className="pc-day-wd">{WEEKDAYS_RU[weekdayIdx] ?? ''}</div>
                                </th>
                            );
                        })}
                        <th className="pc-sticky-total">Итого</th>
                    </tr>
                </thead>

                <tbody>
                    {MATRIX_SECTIONS.map(section => (
                        <React.Fragment key={section.sectionTitle}>
                            <tr className="pc-section-row">
                                <td className="pc-sticky-col pc-section-title">{section.sectionTitle}</td>
                                <td colSpan={days.length} className="pc-section-spacer" />
                                <td className="pc-sticky-total pc-section-spacer" />
                            </tr>

                            {section.rows.map(row => (
                                <MatrixRow
                                    key={row.key}
                                    row={row}
                                    days={days}
                                    dayLabels={dayLabels}
                                    todayStr={todayStr}
                                    period={period}
                                    onAddToCell={handleAddToCell}
                                />
                            ))}
                        </React.Fragment>
                    ))}

                    {/* Дневной баланс */}
                    <tr className="pc-summary-row pc-daily-balance-row">
                        <td className="pc-sticky-col pc-article-cell">Дневной баланс</td>
                        {days.map(day => (
                            <td
                                key={day.date}
                                title={`Дневной баланс ${dayLabels[day.date]}: ${fmt(day.dayBalance)} BYN`}
                                className={[
                                    'pc-val-cell',
                                    isWeekendDate(day.date) ? 'pc-weekend-col' : '',
                                    day.dayBalance < 0 ? 'pc-negative' : (day.dayBalance > 0 ? 'pc-positive' : ''),
                                ].filter(Boolean).join(' ')}
                            >
                                {formatTotal(day.dayBalance)}
                            </td>
                        ))}
                        <td
                            title={`Итого за период: ${fmt(periodNetFlow)} BYN`}
                            className={`pc-sticky-total pc-total-cell ${periodNetFlow < 0 ? 'pc-negative' : 'pc-positive'}`}
                        >
                            {formatTotal(periodNetFlow)}
                        </td>
                    </tr>

                    {/* Кумулятивный остаток / кассовый разрыв */}
                    <tr className="pc-summary-row pc-cumulative-row">
                        <td className="pc-sticky-col pc-article-cell" title="Кумулятивный остаток / Кассовый разрыв">
                            Остаток / Разрыв
                        </td>
                        {days.map(day => {
                            const isGap = day.cashGap || day.cumulativeBalance < 0;
                            return (
                                <td
                                    key={day.date}
                                    title={
                                        isGap
                                            ? `Кассовый разрыв ${dayLabels[day.date]}: ${fmt(day.cumulativeBalance)} BYN`
                                            : `Остаток на ${dayLabels[day.date]}: ${fmt(day.cumulativeBalance)} BYN`
                                    }
                                    className={`pc-val-cell pc-cumulative-cell ${isGap ? 'pc-gap-cell' : 'pc-ok-cell'}`}
                                >
                                    {isGap && <span className="pc-gap-triangle" aria-hidden="true">▲</span>}
                                    <span>{formatTotal(day.cumulativeBalance)}</span>
                                </td>
                            );
                        })}
                        <td
                            title={`Остаток на конец периода: ${fmt(period.totalClosing)} BYN`}
                            className={[
                                'pc-sticky-total pc-total-cell pc-cumulative-cell',
                                period.totalClosing < 0 || period.hasCashGap ? 'pc-gap-cell' : 'pc-ok-cell',
                            ].join(' ')}
                        >
                            {formatTotal(period.totalClosing)}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
});
PaymentMatrix.displayName = 'PaymentMatrix';

export default PaymentMatrix;