import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useParams, useSearchParams} from 'react-router-dom';
import {reportAPI} from '../../services/reportApi';
import {MasterDetailReport, OrderEarning} from '../../types/report'; // Предполагаемые типы
import {format} from 'date-fns';
import './MasterReport.css';
import moment from "moment/moment";

const MasterDetailReportComponent: React.FC = () => {
    const {masterId} = useParams<{ masterId: string }>();
    const [searchParams] = useSearchParams();

    const [report, setReport] = useState<MasterDetailReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');

    const displayDateRange = useMemo(() => {
        if (startDate && endDate) {
            // Приводим дату к Date, используя формат-функцию
            const startDisplay = format(new Date(startDate), 'dd.MM.yyyy');
            const endDisplay = format(new Date(endDate), 'dd.MM.yyyy');
            return `${startDisplay} – ${endDisplay}`;
        }
        return '—';
    }, [startDate, endDate]);

    const fetchDetailReport = useCallback(async (master: string, start: string, end: string) => {
        try {
            setLoading(true);
            const response = await reportAPI.getMasterDetailReport(master,
                moment(start).format('YYYY-MM-DDTHH:mm'),
                moment(end).format('YYYY-MM-DDTHH:mm'));
            setReport(response.data);
            setError(null);
        } catch (err) {
            setError('Не удалось загрузить детальный отчет.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!masterId || !startDate || !endDate) {
            setError('Не указан мастер или диапазон дат для отчета.');
            setLoading(false);
            return;
        }
        fetchDetailReport(masterId, startDate, endDate);

    }, [masterId, startDate, endDate, fetchDetailReport]);

    // Собираем все уникальные заказы для динамических заголовков-колонок (Pivot-таблица)
    const orderHeaders: OrderEarning[] = useMemo(() => {
        if (!report) return [];
        const allOrders = report.reportDetails.flatMap(detail => detail.earningsByOrder);

        // Map для уникальности по orderId
        const uniqueOrderMap = new Map<number, OrderEarning>();
        allOrders.forEach(order => {
            if (!uniqueOrderMap.has(order.orderId)) {
                uniqueOrderMap.set(order.orderId, order);
            }
        });

        // Сортируем по дате выполнения
        return Array.from(uniqueOrderMap.values()).sort((a, b) =>
            new Date(a.executionDate).getTime() - new Date(b.executionDate).getTime()
        );
    }, [report]);

    // Вычисляем общую сумму по всем типам работ
    const grandTotal = useMemo(() => {
        if (!report || !orderHeaders.length) return 0;

        let total = 0;
        for (const detail of report.reportDetails) {
            for (const orderEarning of detail.earningsByOrder) {
                total += orderEarning.earning;
            }
        }
        return total;
    }, [report, orderHeaders]);


    if (loading) return <div className="report-loading">Загрузка детального отчета...</div>;
    if (error) return <div className="report-error">{error}</div>;
    if (!report) return <div className="report-empty">Данные для детального отчета отсутствуют.</div>;

    // --- РЕНДЕРИНГ ---

    return (
        <div className="report-container">
            <h2>Детальный отчет по мастеру: **{report.masterFirstName} {report.masterLastName}**</h2>
            <p className="report-date-range">Отчетный период: **{displayDateRange}**</p>

            {/* Контейнер для прокрутки */}
            <div className="table-wrapper">
                <table className="report-table detail-table">
                    <thead>
                    <tr>
                        <th className="sticky-column">Тип работы</th>
                        {/* Динамические колонки: Заказы */}
                        {orderHeaders.map(order => (
                            <th key={order.orderId} className="order-column">
                                Заказ №{order.orderId} <br/>
                                <small>({order.clientName}, {format(new Date(order.executionDate), 'dd.MM')})</small>
                            </th>
                        ))}
                        <th>Всего по типу</th>
                        {/* Итоговая колонка */}
                    </tr>
                    </thead>
                    <tbody>
                    {report.reportDetails.map(detail => {
                        // Карта для быстрого доступа к заработку по ID заказа
                        const earningsMap = new Map(detail.earningsByOrder.map(e => [e.orderId, e.earning]));

                        // Сумма заработка по текущему типу работы
                        const totalWorkTypeEarning = Array.from(earningsMap.values()).reduce((sum, earning) => sum + earning, 0);

                        return (
                            <tr key={detail.workTypeId}>
                                <td className="sticky-column"><strong>{detail.workTypeName}</strong></td>
                                {/* Ячейки с заработком по заказам */}
                                {orderHeaders.map(order => (
                                    <td key={order.orderId} className="text-center">
                                        {earningsMap.get(order.orderId)?.toFixed(2) || '–'}
                                    </td>
                                ))}
                                {/* Итого по типу работы */}
                                <td className="text-center"><strong>{totalWorkTypeEarning.toFixed(2)}</strong></td>
                            </tr>
                        );
                    })}
                    </tbody>
                    <tfoot>
                    <tr className="report-footer">
                        <td className="sticky-column">**Общий ИТОГ**</td>
                        {/* Заполняем остальные ячейки пустыми ячейками, чтобы colspan работал корректно,
                                или используем одну ячейку с colspan */}
                        <td colSpan={orderHeaders.length}></td>
                        <td className="text-center">
                            <strong>{grandTotal.toFixed(2)}</strong>
                        </td>
                    </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

export default MasterDetailReportComponent;