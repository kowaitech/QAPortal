import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Register from './pages/Register';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AdminDashboard from './pages/admin/AdminDashboard';
import TestSchedule from './pages/admin/TestSchedule';
import StaffDashboard from './pages/staff/StaffDashboard';
import StudentDashboard from './pages/student/StudentDashboard';
import Tests from './pages/student/Tests';
import TakeTest from './pages/student/TakeTest';
import Protected from './utils/Protected';
import Navbar from './components/Navbar';

export default function App() {
  return (
    <>
      <Navbar />
      <main className="container-page py-6">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/admin" element={<Protected roles={['admin']}><AdminDashboard /></Protected>} />
          <Route path="/staff" element={<Protected roles={['staff']}><StaffDashboard /></Protected>} />
          <Route path="/student" element={<Protected roles={['student']}><StudentDashboard /></Protected>} />
          <Route path="/admin/tests" element={<Protected roles={['admin']}><TestSchedule /></Protected>} />
          <Route path="/student/tests" element={<Protected roles={['student']}><Tests /></Protected>} />
          <Route path="/student/take/:id" element={<Protected roles={['student']}><TakeTest /></Protected>} />
        </Routes>
      </main>
    </>
  );
}
