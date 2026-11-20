/**
 * Журнал операций периода: фильтры, таблица и строка добавления/правки.
 *
 * Вынесен отдельно и мемоизирован. Главная причина — форма ввода: до
 * рефакторинга каждое нажатие клавиши в полях поднимало состояние наверх и
 * перерисовывало всю матрицу на ~540 узлов вместе с таблицей операций.
 */
import React, { memo, useMemo, useState } from 'react';
import moment from 'moment';
import DatePicker from 'react-datepicker';
import { ru } from 'date-fns/locale';
import { format } from 'date-fns';
import {
    PcAccount,
    PcCategory,
    PcDirection,
    PcOperation,
    PcOperationSave,
    PC_ACCOUNT_LABELS,
} from '../../types/paymentCalendar';
import { getCategoryLabel, getCategoryOptions } from './pcMatrix';
import { fmt } from './PaymentMatrix';

export const getAccountLabel = (account: PcAccount | string): string =>
    PC_ACCOUNT_LABELS[account as PcAccount] ?? String(account);

const ACCOUNT_OPTIONS = Object.keys(PC_ACCOUNT_LABELS) as PcAccount[];

export type DirectionFilter = 'ALL' | PcDirection;
export type AccountFilter = 'ALL' | PcAccount;

/** Черновик формы; суммы как строки, чтобы поле ввода не «прыгало». */
export interface OperationDraft {
    date: string;
    direction: PcDirection;
    category: PcCategory;
    account: PcAccount;
    amount: string;
    description: string;
}

interface Props {
    operations: PcOperation[];
    loading: boolean;
    saving: boolean;
    draft: OperationDraft | null;
    editingId: number | null;
    onDraftChange: (patch: Partial<OperationDraft>) => void;
    onStartAdd: () => void;
    onStartEdit: (operation: PcOperation) => void;
    onCancel: () => void;
    onSave: () => void;
    onDelete: (id: number) => void;
}

const PaymentOperations = memo<Props>(({
    operations,
    loading,
    saving,
    draft,
    editingId,
    onDraftChange,
    onStartAdd,
    onStartEdit,
    onCancel,
    onSave,
    onDelete,
}) => {
    const [directionFilter, setDirectionFilter] = useState<DirectionFilter>('ALL');
    const [accountFilter, setAccountFilter] = useState<AccountFilter>('ALL');

    const filtered = useMemo(
        () => operations.filter(op => {
            if (directionFilter !== 'ALL' && op.direction !== directionFilter) return false;
            if (accountFilter !== 'ALL' && op.account !== accountFilter) return false;
            return true;
        }),
        [operations, directionFilter, accountFilter]
    );

    const draftDate = useMemo(
        () => (draft ? moment(draft.date, 'YYYY-MM-DD', true).toDate() : null),
        [draft]
    );

    const categoryOptions = draft ? getCategoryOptions(draft.direction) : [];

    return (
        <section id="pc-operations-anchor" className="pc-operations-section">
            <div className="pc-operations-header">

                {draft === null && editingId === null && (
                    <button type="button" className="add-row-green-btn" onClick={onStartAdd}>
                        Добавить операцию <span className="plus-icon">+</span>
                    </button>
                )}
            </div>

            {loading && <div className="report-loading">Загрузка операций...</div>}

            <div className="table-wrapper">
                <table className="report-table pc-ops-table">
                    <thead>
                        <tr>
                            <th style={{ width: '11%' }}>Дата</th>
                            <th style={{ width: '9%' }}>Тип</th>
                            <th style={{ width: '17%' }}>Статья</th>
                            <th style={{ width: '14%' }}>Счёт</th>
                            <th style={{ width: '11%' }}>Сумма (BYN)</th>
                            <th style={{ width: '24%' }}>Описание</th>
                            <th style={{ width: '14%' }}>Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 && !loading && draft === null && (
                            <tr>
                                <td colSpan={7} className="pc-empty">
                                    Операций по выбранным параметрам за период нет
                                </td>
                            </tr>
                        )}

                        {filtered.map(op => {
                            const isEditing = op.id === editingId && draft !== null;

                            if (isEditing && draft) {
                                return (
                                    <tr key={op.id} className="editable-row">
                                        <td>
                                            <DatePicker
                                                selected={draftDate}
                                                locale={ru}
                                                onChange={(date: Date | null) =>
                                                    date && onDraftChange({ date: format(date, 'yyyy-MM-dd') })
                                                }
                                                dateFormat="dd.MM.yyyy"
                                                className="inline-input"
                                            />
                                        </td>
                                        <td>
                                            <select
                                                value={draft.direction}
                                                onChange={e => onDraftChange({ direction: e.target.value as PcDirection })}
                                                className="inline-input"
                                            >
                                                <option value="INCOME">Приход</option>
                                                <option value="EXPENSE">Расход</option>
                                            </select>
                                        </td>
                                        <td>
                                            <select
                                                value={draft.category}
                                                onChange={e => onDraftChange({ category: e.target.value as PcCategory })}
                                                className="inline-input"
                                            >
                                                {categoryOptions.map(c => (
                                                    <option key={c} value={c}>{getCategoryLabel(c)}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td>
                                            <select
                                                value={draft.account}
                                                onChange={e => onDraftChange({ account: e.target.value as PcAccount })}
                                                className="inline-input"
                                            >
                                                {ACCOUNT_OPTIONS.map(a => (
                                                    <option key={a} value={a}>{getAccountLabel(a)}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={draft.amount}
                                                onChange={e => onDraftChange({ amount: e.target.value })}
                                                className="inline-input"
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                value={draft.description}
                                                onChange={e => onDraftChange({ description: e.target.value })}
                                                className="inline-input"
                                            />
                                        </td>
                                        <td className="action-icons-cell">
                                            <button
                                                type="button"
                                                disabled={saving}
                                                onClick={onSave}
                                                className="icon-btn save-icon"
                                                title="Сохранить"
                                            >
                                                💾
                                            </button>
                                            <button
                                                type="button"
                                                onClick={onCancel}
                                                className="icon-btn cancel-icon"
                                                title="Отмена"
                                            >
                                                ❌
                                            </button>
                                        </td>
                                    </tr>
                                );
                            }

                            const isAuto = op.sourceType === 'ORDER_AUTO';
                            return (
                                <tr key={op.id} className={isAuto ? 'pc-auto-row' : ''}>
                                    <td>{moment(op.date).format('DD.MM.YYYY')}</td>
                                    <td>
                                        <span className={`pc-direction-badge ${op.direction === 'INCOME' ? 'pc-in' : 'pc-out'}`}>
                                            {op.direction === 'INCOME' ? 'Приход' : 'Расход'}
                                        </span>
                                    </td>
                                    <td>{getCategoryLabel(op.category)}</td>
                                    <td>{getAccountLabel(op.account)}</td>
                                    <td className={op.direction === 'INCOME' ? 'pc-positive' : 'pc-negative'}>
                                        {op.direction === 'INCOME' ? '+' : '−'}{fmt(op.amount)}
                                    </td>
                                    <td className="pc-desc-cell" title={op.description || ''}>
                                        {op.description || ''}
                                    </td>
                                    <td className="action-icons-cell">
                                        {isAuto ? (
                                            <span className="text-muted" title="Создано автоматически по завершению заказа">
                                                🧾 заказ №{op.orderId}
                                            </span>
                                        ) : (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => onStartEdit(op)}
                                                    className="icon-btn edit-icon"
                                                    title="Редактировать"
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => onDelete(op.id)}
                                                    className="icon-btn delete-icon"
                                                    title="Удалить"
                                                >
                                                    🗑️
                                                </button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}

                        {draft !== null && editingId === null && (
                            <tr className="editable-row">
                                <td>
                                    <DatePicker
                                        selected={draftDate}
                                        locale={ru}
                                        onChange={(date: Date | null) =>
                                            date && onDraftChange({ date: format(date, 'yyyy-MM-dd') })
                                        }
                                        dateFormat="dd.MM.yyyy"
                                        className="inline-input"
                                    />
                                </td>
                                <td>
                                    <select
                                        value={draft.direction}
                                        onChange={e => onDraftChange({ direction: e.target.value as PcDirection })}
                                        className="inline-input"
                                    >
                                        <option value="INCOME">Приход</option>
                                        <option value="EXPENSE">Расход</option>
                                    </select>
                                </td>
                                <td>
                                    <select
                                        value={draft.category}
                                        onChange={e => onDraftChange({ category: e.target.value as PcCategory })}
                                        className="inline-input"
                                    >
                                        {categoryOptions.map(c => (
                                            <option key={c} value={c}>{getCategoryLabel(c)}</option>
                                        ))}
                                    </select>
                                </td>
                                <td>
                                    <select
                                        value={draft.account}
                                        onChange={e => onDraftChange({ account: e.target.value as PcAccount })}
                                        className="inline-input"
                                    >
                                        {ACCOUNT_OPTIONS.map(a => (
                                            <option key={a} value={a}>{getAccountLabel(a)}</option>
                                        ))}
                                    </select>
                                </td>
                                <td>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={draft.amount}
                                        onChange={e => onDraftChange({ amount: e.target.value })}
                                        className="inline-input"
                                        placeholder="0.00"
                                    />
                                </td>
                                <td>
                                    <input
                                        type="text"
                                        value={draft.description}
                                        onChange={e => onDraftChange({ description: e.target.value })}
                                        className="inline-input"
                                        placeholder="Например: аренда / плёнка / коммуналка"
                                    />
                                </td>
                                <td className="action-icons-cell">
                                    <span className="text-muted">новая</span>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {draft !== null && (
                <div className="action-buttons-container">
                    <button
                        type="button"
                        disabled={saving}
                        className="add-row-green-btn save-btn"
                        onClick={onSave}
                    >
                        {saving
                            ? 'Сохранение...'
                            : (editingId === null ? 'Сохранить новую операцию' : 'Сохранить изменения')}
                    </button>
                    <button
                        type="button"
                        disabled={saving}
                        className="add-row-green-btn cancel-btn"
                        onClick={onCancel}
                    >
                        Отмена
                    </button>
                </div>
            )}
        </section>
    );
});
PaymentOperations.displayName = 'PaymentOperations';

export default PaymentOperations;

/** Payload для API из черновика; null, если сумма некорректна. */
export const draftToPayload = (draft: OperationDraft): PcOperationSave | null => {
    const amount = Number(draft.amount.replace(',', '.'));
    if (!draft.amount || Number.isNaN(amount) || amount <= 0) return null;
    return {
        date: draft.date,
        direction: draft.direction,
        category: draft.category,
        account: draft.account,
        amount,
        description: draft.description.trim() || undefined,
    };
};
