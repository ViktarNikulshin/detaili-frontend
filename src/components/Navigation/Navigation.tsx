import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import logo from '../asserts/a593d73d858fdafbbe4065de23f69533.jpg'
import './Navigation.css'

const Navigation: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };
    const handleCreateOrder = () => {
        navigate('/orders/new');
    };

    return (
        <nav className="navigation">
            <div className="nav-brand">
                <img src={logo} alt="Cristal Car Logo" className="nav-logo" />
                <Link to="/">CRISTAL CAR</Link>
            </div>

            <div className="calendar-actions">
                <button
                    className="btn btn-primary create-order-btn"
                    onClick={handleCreateOrder}
                >
                    + Создать заказ
                </button>
            </div>

            <div className="nav-user">
                <span>{user?.firstName}</span>
                <span className="user-role">({user?.role})</span>
                <button onClick={handleLogout} className="logout-btn">Выйти</button>
            </div>
        </nav>
    );
};

export default Navigation;