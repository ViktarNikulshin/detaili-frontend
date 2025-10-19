import React, { useEffect, useMemo, useState } from 'react';
import { reportAPI } from '../../services/reportApi';
import { MasterWeeklyReport } from '../../types/report';
import { Link } from 'react-router-dom';
import './MasterReport.css'; // Подключаем новые стили

const MasterReport: React.FC = () => {
    const [reports, setReports] = useState<MasterWeeklyReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchReport = async () => {
            try {
                setLoading(true);
                const response = await reportAPI.getMastersWeeklyReport();
                setReports(response.data);
                setError(null);
            } catch (err) {
                setError('Не удалось загрузить отчет. Попробуйте позже.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchReport();
    }, []);

    // Собираем все уникальные типы работ для заголовков таблицы
    const workTypeHeaders = useMemo(() => {
        const allEarnings = reports.flatMap(report => report.earnings);
        const uniqueWorkTypes = Array.from(new Set(allEarnings.map(e => e.workTypeName)));
        return uniqueWorkTypes.sort();
    }, [reports]);

    if (loading) return <div className="report-container"><p>Загрузка отчета...</p></div>;
    if (error) return <div className="report-container error-message"><p>{error}</p></div>;

    return (
        <div className="report-container">
            <h2>Сводный отчет по мастерам за неделю</h2>
            {reports.length === 0 ? (
                <p>Нет данных для отображения.</p>
            ) : (
                <div className="table-wrapper">
                    <table>
                        <thead>
                        <tr>
                            <th>Мастер</th>
                            {workTypeHeaders.map(header => <th key={header}>{header}</th>)}
                            <th>Итого</th>
                        </tr>
                        </thead>
                        <tbody>
                        {reports.map(report => {
                            // Создаем карту для быстрого доступа к заработку по типу работы
                            const earningsMap = new Map(report.earnings.map(e => [e.workTypeName, e.totalEarnings]));
                            return (
                                <tr key={report.masterId}>
                                    <td>
                                        <Link to={`/reports/master/${report.masterId}`} className="master-link">
                                            {report.masterFirstName} {report.masterLastName}
                                        </Link>
                                    </td>
                                    {workTypeHeaders.map(header => (
                                        <td key={header}>
                                            {earningsMap.get(header)?.toFixed(2) || '–'}
                                        </td>
                                    ))}
                                    <td><strong>{report.totalMasterEarnings.toFixed(2)}</strong></td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default MasterReport;