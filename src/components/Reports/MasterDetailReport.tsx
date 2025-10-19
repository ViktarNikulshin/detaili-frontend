import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { reportAPI } from '../../services/reportApi';
import { MasterDetailReport } from '../../types/report';
import { format } from 'date-fns';
import './MasterReport.css';

const MasterDetailReportComponent: React.FC = () => {
    const { masterId } = useParams<{ masterId: string }>();
    const [report, setReport] = useState<MasterDetailReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!masterId) return;
        const fetchDetailReport = async () => {
            try {
                setLoading(true);
                const response = await reportAPI.getMasterDetailReport(masterId);
                setReport(response.data);
                setError(null);
            } catch (err) {
                setError('Не удалось загрузить детальный отчет.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchDetailReport();
    }, [masterId]);

    // Собираем все уникальные заказы для заголовков
    const orderHeaders = useMemo(() => {
        if (!report) return [];
        const allOrders = report.reportDetails.flatMap(detail => detail.earningsByOrder);
        const uniqueOrdersMap = new Map(allOrders.map(o => [o.orderId, o]));
        return Array.from(uniqueOrdersMap.values()).sort((a,b) => a.orderId - b.orderId);
    }, [report]);

    if (loading) return <div className="report-container"><p>Загрузка отчета...</p></div>;
    if (error) return <div className="report-container error-message"><p>{error}</p></div>;
    if (!report) return <div className="report-container"><p>Нет данных для отображения.</p></div>;

    return (
        <div className="report-container">
            <Link to="/reports/masters" className="back-link">← Назад к сводному отчету</Link>
            <h2>Детальный отчет: {report.masterFirstName} {report.masterLastName}</h2>
            <div className="table-wrapper">
                <table>
                    <thead>
                    <tr>
                        <th>Тип работы</th>
                        {orderHeaders.map(order => (
                            <th key={order.orderId}>
                                Заказ №{order.orderId} <br/>
                                <small>({order.clientName}, {format(new Date(order.executionDate), 'dd.MM')})</small>
                            </th>
                        ))}
                    </tr>
                    </thead>
                    <tbody>
                    {report.reportDetails.map(detail => {
                        const earningsMap = new Map(detail.earningsByOrder.map(e => [e.orderId, e.earning]));
                        return (
                            <tr key={detail.workTypeId}>
                                <td><strong>{detail.workTypeName}</strong></td>
                                {orderHeaders.map(order => (
                                    <td key={order.orderId}>
                                        {earningsMap.get(order.orderId)?.toFixed(2) || '–'}
                                    </td>
                                ))}
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default MasterDetailReportComponent;