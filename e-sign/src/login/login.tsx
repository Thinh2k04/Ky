import type React from 'react';
import { useState } from 'react';
import type { LoginCredentials } from '../hooks/useAdminSession';

interface LoginScreenProps {
  onLogin: (credentials: LoginCredentials) => Promise<void>;
  isSubmitting: boolean;
}

export default function LoginScreen({ onLogin, isSubmitting }: LoginScreenProps) {
  const [form, setForm] = useState<LoginCredentials>({ username: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    try {
      await onLogin(form);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Không thể đăng nhập.');
    }
  };

  return (
    <div className="auth-page auth-page--bubbly">
      <div className="bubble-layer" aria-hidden="true">
        <span className="bubble bubble--1" />
        <span className="bubble bubble--2" />
        <span className="bubble bubble--3" />
        <span className="bubble bubble--4" />
        <span className="bubble bubble--5" />
      </div>

      <div className="auth-shell auth-shell--centered">
        <section className="auth-card auth-card--login">
          <div className="auth-card-glow auth-card-glow--one" aria-hidden="true" />
          <div className="auth-card-glow auth-card-glow--two" aria-hidden="true" />

          <form className="auth-form auth-form--centered" onSubmit={handleSubmit}>
            <div className="auth-form-head auth-form-head--center">
              <h1>Đăng nhập</h1>
            </div>

            <label className="field-group">
              <span>Tên đăng nhập</span>
              <input
                value={form.username}
                onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
                type="text"
                placeholder="admin"
                autoComplete="username"
                required
              />
            </label>

            <label className="field-group">
              <span>Mật khẩu</span>
              <input
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </label>

            {error ? <p className="auth-error">{error}</p> : null}

            <button type="submit" className="auth-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
