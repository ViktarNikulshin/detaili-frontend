import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute'; // 💡 Убедитесь, что путь правильный
import Login from './components/Login/Login';
import CalendarView from './components/CalendarView/CalendarView';
import OrderForm from "./components/OrderForm/OrderForm";
import Layout from './components/Layout/Layout';
import './App.css';
import UserForm from "./components/UserForm/UserForm";
import Users from "./components/Users/Users";
import UserRoleForm from "./components/UserRoleForm/UserRoleForm";
import MasterReport from "./components/Reports/MasterReport";
import MasterDetailReport from "./components/Reports/MasterDetailReport";
import WorkTypeDictionaryManager from "./components/WorkTypeDictionaryManager/WorkTypeDictionaryManager";

function App() {
    return (
        <AuthProvider>
            <Router>
                <div className="App">
                    <Routes>
                        {/* 1. Публичный маршрут: доступен всем */}
                        <Route path="/login" element={<Login />} />

                        {/* 2. Защищенные маршруты */}
                        {/* Используем ProtectedRoute для защиты всех вложенных маршрутов */}
                        <Route element={<ProtectedRoute />}>
                            <Route path="/" element={<Layout />}>
                                {/* Здесь все маршруты теперь защищены! */}
                                <Route index element={<CalendarView />} />
                                <Route path="calendar" element={<CalendarView />} />
                                <Route path="orders/new" element={<OrderForm />} />
                                <Route path="orders/:id" element={<OrderForm />} />
                                <Route path="/profile" element={<UserForm />} />
                                <Route path="/users/new" element={<UserForm />} />
                                <Route path="/users" element={<Users />} />
                                <Route path="/users/:id" element={<UserRoleForm />} />
                                <Route path="/reports/masters" element={<MasterReport />} />
                                <Route path="/reports/master/:masterId" element={<MasterDetailReport />} />
                                <Route path="/dictionaries/work-types" element={<WorkTypeDictionaryManager />} />
                            </Route>
                        </Route>

                        {/* 3. Перенаправление для 404 */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </div>
            </Router>
        </AuthProvider>
    );
}

export default App;