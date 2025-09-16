import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './components/Login/Login';
import CalendarView from './components/CalendarView/CalendarView';
import OrderForm from "./components/OrderForm/OrderForm";
import Layout from './components/Layout/Layout';
import './App.css';

function App() {
    return (
        <AuthProvider>
            <Router>
                <div className="App">
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/" element={<Layout />}>
                            <Route index element={<CalendarView />} />
                            <Route path="calendar" element={<CalendarView />} />
                            <Route path="orders/new" element={<OrderForm />} />
                            <Route path="orders/:id" element={<OrderForm />} />
                        </Route>
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </div>
            </Router>
        </AuthProvider>
    );
}

export default App;