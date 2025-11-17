import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '../utils/axios';
import { useAuthStore } from '../utils/authStore';
import { useNavigate } from 'react-router-dom';
import { useDialog } from '../components/DialogProvider';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()\-_=+])[A-Za-z\d@$!%*?&#^()\-_=+]{8,}$/;

export default function Login() {
  const { register, handleSubmit, formState: { errors } } = useForm({ mode: 'onBlur' });
  const setAuth = useAuthStore(state => state.setAuth);
  const nav = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dialog = useDialog();

  const onSubmit = async (v) => {
    console.log('Login attempt with:', v);
    setIsSubmitting(true);

    try {
      console.log('Making API call to:', `${import.meta.env.VITE_API_BASE}/auth/login`);
      const { data } = await api.post('/auth/login', v);
      console.log('Login successful:', data);
      setAuth(data.user, data.accessToken);

      // Redirect based on user role
      switch (data.user.role) {
        case 'admin':
          nav('/admin');
          break;
        case 'staff':
          nav('/staff');
          break;
        case 'student':
          nav('/student');
          break;
        default:
          nav('/');
      }
    } catch (e) {
      console.error('Login error:', e);
      console.error('Error response:', e.response);
      dialog.alert(e.response?.data?.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-72px)] grid place-items-center">
      <div className="max-w-md w-full card bg-white/90">
        <h2 className="text-xl mb-4">Login</h2>
        <form className="grid gap-3" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div>
            <input
              className="input"
              placeholder="Email"
              type="email"
              {...register('email', {
                required: 'Email is required',
                pattern: { value: emailPattern, message: 'Enter a valid email address' }
              })}
            />
            {errors.email && <span className="text-red-500 text-sm">{errors.email.message}</span>}
          </div>

          <div>
            <input
              className="input"
              placeholder="Password"
              type="password"
              {...register('password', {
                required: 'Password is required',
                pattern: {
                  value: passwordPattern,
                  message: 'Min 8 chars with upper, lower, number & special character'
                }
              })}
            />
            {errors.password && <span className="text-red-500 text-sm">{errors.password.message}</span>}
          </div>

          <button
            className="btn-primary"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <div className="mt-4 text-sm">
          <a className="text-blue-600 hover:underline" href="/forgot-password">Forgot password?</a>
        </div>
        <div className="mt-4 text-sm flex items-center justify-between">
          <span className="text-gray-600">New user?</span>
          <button onClick={() => nav('/register')} className="btn-secondary">Register</button>
        </div>
      </div>
    </div>
  );
}



