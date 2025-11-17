import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/axios';
import { useDialog } from '../components/DialogProvider';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()\-_=+])[A-Za-z\d@$!%*?&#^()\-_=+]{8,}$/;
const mobilePattern = /^[0-9]{10}$/;

export default function Register() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({
    mode: 'onBlur',
    defaultValues: {
      role: 'student',
      collegeName: '',
      mobileNumber: '',
      department: '',
      yearOfPassing: ''
    }
  });
  const nav = useNavigate();
  const dialog = useDialog();

  const onSubmit = async (v) => {
    try {
      setIsSubmitting(true);
      await api.post('/auth/register', v);
      await dialog.alert('Registered — awaiting admin approval');
      nav('/login');
    } catch (e) {
      dialog.alert(e.response?.data?.message || 'Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-72px)] grid place-items-center">
      <div className="max-w-md w-full card bg-white/90">
        <h2 className="text-xl font-semibold mb-4">Register</h2>
        <form className="grid gap-3" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div>
            <input
              className="input"
              placeholder="Full name"
              {...register('name', {
                required: 'Full name is required',
                minLength: { value: 3, message: 'Name must be at least 3 characters' }
              })}
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
          </div>

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
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
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
            {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
          </div>

          <div>
            <input
              className="input"
              placeholder="College Name"
              {...register('collegeName', { required: 'College name is required' })}
            />
            {errors.collegeName && <p className="text-red-500 text-sm mt-1">{errors.collegeName.message}</p>}
          </div>

          <div>
            <input
              className="input"
              placeholder="Mobile Number"
              inputMode="numeric"
              {...register('mobileNumber', {
                required: 'Mobile number is required',
                pattern: { value: mobilePattern, message: 'Enter a 10 digit mobile number' }
              })}
            />
            {errors.mobileNumber && <p className="text-red-500 text-sm mt-1">{errors.mobileNumber.message}</p>}
          </div>

          <div>
            <input
              className="input"
              placeholder="Department"
              {...register('department', { required: 'Department is required' })}
            />
            {errors.department && <p className="text-red-500 text-sm mt-1">{errors.department.message}</p>}
          </div>

          <div>
            <input
              className="input"
              placeholder="Year of Passing"
              type="number"
              {...register('yearOfPassing', {
                required: 'Year of passing is required',
                min: { value: 1950, message: 'Enter a valid year' },
                max: { value: 2100, message: 'Enter a valid year' }
              })}
            />
            {errors.yearOfPassing && <p className="text-red-500 text-sm mt-1">{errors.yearOfPassing.message}</p>}
          </div>

          <label>Register as</label>
          <div>
            <select
              className="input"
              {...register('role', { required: 'Role is required' })}
            >
              <option value="student">Student</option>
              <option value="staff">Staff</option>
            </select>
            {errors.role && <p className="text-red-500 text-sm mt-1">{errors.role.message}</p>}
          </div>

          <button className="btn-primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Registering...' : 'Register'}
          </button>
        </form>
        <div className="mt-4 text-sm flex items-center justify-between">
          <span className="text-gray-600">Already have an account?</span>
          <button onClick={() => nav('/login')} className="btn-secondary">Login</button>
        </div>
      </div>
    </div>
  );
}
