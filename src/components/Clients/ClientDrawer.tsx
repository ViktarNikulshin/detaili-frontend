import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clientAPI } from '../../services/clientApi';
import { ClientDetails } from '../../types/client';
import './Clients.css';

const ORDER_STATUS_LABELS: Record<string, { label: string; className: string }> = {
    NEW: { label: 'Новый', className: 'status-new' },
    IN_PROGRESS: { label: 'В работе', className: 'status-in-progress' },
    COMPLETED: { label: 'Завершён', className: 'status-completed' },
    CANCELLED: { label: 'Отменён', className: 'status-cancelled' },
};

interface ClientDrawerProps {
    clientId: number;
    onClose: () => void;
}

const ClientDrawer: React.FC<ClientDrawerProps> = ({ clientId, onClose }) => {
    const [details, setDetails] = useState<ClientDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchDetails = async () => {
            setLoading(true);
            try {
                const response = await clientAPI.getClient(clientId);
                setDetails(response.data);
            } catch (err) {
                console.error('Ошибка загрузки карточки клиента:', err);
                setDetails(null);
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [clientId]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const digits = (details?.phone || '').replace(/\D/g, '');

    const startNewOrder = () => {
        if (!details) return;
        navigate('/orders/new', {
            state: { clientPhone: details.phone, clientName: details.name },
        });
        onClose();
    };

    return (
        <div className="clients-drawer-overlay" onClick={onClose}>
            <div className="clients-drawer" onClick={e => e.stopPropagation()}>
                <button className="clients-drawer-close" onClick={onClose}>&times;</button>

                {loading && <div className="clients-drawer-loading">Загрузка...</div>}
                {!loading && !details && (
                    <div className="clients-drawer-loading error">Не удалось загрузить клиента.</div>
                )}

                {details && (
                    <>
                        <div className="clients-drawer-header">
                            <h2>{details.name || '—'}</h2>
                            <div className="clients-drawer-contacts">
                                <a href={`tel:${details.phone}`} className="clients-drawer-btn call">📞 Позвонить</a>
                                {digits.length >= 10 && (
                                    <a
                                        href={`https://wa.me/${digits}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="clients-drawer-btn whatsapp"
                                    >
                                        WhatsApp
                                    </a>
                                )}
                                <button className="clients-drawer-btn order" onClick={startNewOrder}>
                                    + Новый заказ
                                </button>
                            </div>
                        </div>

                        <div className="clients-drawer-stats">
                            <div className="clients-stat">
                                <span className="clients-stat-title">Заказов</span>
                                <span className="clients-stat-value">{details.ordersCount}</span>
                            </div>
                            <div className="clients-stat">
                                <span className="clients-stat-title">На сумму</span>
                                <span className="clients-stat-value">{Number(details.totalSpent || 0).toFixed(2)}</span>
                            </div>
                            <div className="clients-stat">
                                <span className="clients-stat-title">Средний чек</span>
                                <span className="clients-stat-value">
                                    {details.ordersCount > 0
                                        ? (Number(details.totalSpent || 0) / details.ordersCount).toFixed(2)
                                        : '—'}
                                </span>
                            </div>
                            <div className="clients-stat">
                                <span className="clients-stat-title">Последний визит</span>
                                <span className="clients-stat-value">
                                    {details.lastVisitDate
                                        ? new Date(details.lastVisitDate).toLocaleDateString('ru-RU')
                                        : '—'}
                                </span>
                            </div>
                        </div>

                        {(() => {
                            const cars = Array.from(new Set(
                                details.orders
                                    .filter(o => o.status !== 'CANCELLED' && o.carBrand)
                                    .map(o => o.carBrand as string)
                            ));
                            if (cars.length === 0) return null;
                            return (
                                <div className="clients-drawer-cars">
                                    <span className="clients-drawer-subtitle">Авто клиента:</span>
                                    {cars.map(car => (
                                        <span key={car} className="clients-car-chip">{car}</span>
                                    ))}
                                </div>
                            );
                        })()}

                        <div className="clients-drawer-history">
                            <div className="clients-drawer-subtitle">История заказов</div>
                            {details.orders.length === 0 && (
                                <div className="clients-drawer-empty">Заказов пока нет.</div>
                            )}
                            {details.orders.map(order => {
                                const status = ORDER_STATUS_LABELS[order.status] || {
                                    label: order.status,
                                    className: 'status-new',
                                };
                                return (
                                    <div
                                        key={order.id}
                                        className="clients-order-item"
                                        onClick={() => navigate(`/orders/${order.id}`)}
                                    >
                                        <div className="clients-order-date">
                                            {order.arrivalDate
                                                ? new Date(order.arrivalDate).toLocaleDateString('ru-RU')
                                                : '—'}
                                        </div>
                                        <div className="clients-order-car">{order.carBrand || '—'}</div>
                                        <span className={`clients-order-status ${status.className}`}>{status.label}</span>
                                        <div className="clients-order-cost">
                                            {Number(order.orderCost || 0).toFixed(2)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ClientDrawer;
