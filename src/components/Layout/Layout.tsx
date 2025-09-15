import React from 'react';
import { Outlet } from 'react-router-dom';
import Navigation from '../Navigation/Navigation';

const Layout: React.FC = () => {
    return (
        <div className="layout">
            <Navigation />
            <main className="layout-content">
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;