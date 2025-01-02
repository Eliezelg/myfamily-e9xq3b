import React, { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form'; // v7.43.0
import { useTranslation } from 'react-i18next'; // v22.0.0
import { useNavigate } from 'react-router-dom'; // v6.8.0

import Input from '../../components/common/Input/Input';
import Button from '../../components/common/Button/Button';
import { useAuth } from '../../hooks/useAuth';
import { ILoginCredentials } from '../../interfaces/auth.interface';

// Constants for security and validation
const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

interface LoginFormData extends ILoginCredentials {
  rememberMe: boolean;
}

/**
 * Enhanced Login component with comprehensive security features,
 * internationalization support, and accessibility compliance
 */
const Login: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { login, loginWithOAuth, verify2FA, isAuthenticated, requires2FA } = useAuth();

  // Form state management with validation
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    clearErrors,
  } = useForm<LoginFormData>({
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  // Security state
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<Date | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [showTwoFactor, setShowTwoFactor] = useState(false);

  // RTL support
  const isRTL = i18n.dir() === 'rtl';

  /**
   * Handles form submission with enhanced security checks
   */
  const onSubmit = useCallback(async (data: LoginFormData) => {
    try {
      // Check for account lockout
      if (lockoutUntil && new Date() < lockoutUntil) {
        const remainingTime = Math.ceil((lockoutUntil.getTime() - Date.now()) / 1000 / 60);
        setError('email', {
          type: 'manual',
          message: t('auth.errors.accountLocked', { minutes: remainingTime }),
        });
        return;
      }

      // Attempt login
      const result = await login({
        email: data.email.toLowerCase(),
        password: data.password,
      });

      if (result.requires2FA) {
        setShowTwoFactor(true);
      } else {
        navigate('/dashboard');
      }

      // Reset security counters on success
      setLoginAttempts(0);
      setLockoutUntil(null);

    } catch (error) {
      // Handle failed login attempt
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);

      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        const lockoutTime = new Date(Date.now() + LOCKOUT_DURATION);
        setLockoutUntil(lockoutTime);
        setError('email', {
          type: 'manual',
          message: t('auth.errors.tooManyAttempts'),
        });
      } else {
        setError('password', {
          type: 'manual',
          message: t('auth.errors.invalidCredentials'),
        });
      }
    }
  }, [login, loginAttempts, lockoutUntil, navigate, setError, t]);

  /**
   * Handles OAuth authentication
   */
  const handleOAuthLogin = useCallback(async (provider: string) => {
    try {
      const result = await loginWithOAuth(provider);
      if (result.requires2FA) {
        setShowTwoFactor(true);
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      setError('email', {
        type: 'manual',
        message: t('auth.errors.oauthError'),
      });
    }
  }, [loginWithOAuth, navigate, setError, t]);

  /**
   * Handles 2FA verification
   */
  const handle2FAVerification = useCallback(async () => {
    try {
      await verify2FA(twoFactorCode);
      navigate('/dashboard');
    } catch (error) {
      setError('twoFactorCode', {
        type: 'manual',
        message: t('auth.errors.invalid2FACode'),
      });
    }
  }, [verify2FA, twoFactorCode, navigate, setError, t]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !requires2FA) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, requires2FA, navigate]);

  return (
    <div className="login-container">
      {!showTwoFactor ? (
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <h1>{t('auth.login.title')}</h1>
          
          <Input
            id="email"
            type="email"
            label={t('auth.login.emailLabel')}
            error={errors.email?.message}
            {...register('email', {
              required: t('auth.validation.emailRequired'),
              pattern: {
                value: EMAIL_REGEX,
                message: t('auth.validation.emailInvalid'),
              },
            })}
            rtl={isRTL}
          />

          <Input
            id="password"
            type="password"
            label={t('auth.login.passwordLabel')}
            error={errors.password?.message}
            {...register('password', {
              required: t('auth.validation.passwordRequired'),
              minLength: {
                value: 8,
                message: t('auth.validation.passwordLength'),
              },
            })}
            rtl={isRTL}
          />

          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={isSubmitting}
            disabled={!!lockoutUntil}
            rtl={isRTL}
          >
            {t('auth.login.submitButton')}
          </Button>

          <div className="oauth-buttons">
            <Button
              type="button"
              variant="outlined"
              onClick={() => handleOAuthLogin('google')}
              rtl={isRTL}
            >
              {t('auth.login.googleButton')}
            </Button>
          </div>
        </form>
      ) : (
        <div className="two-factor-container">
          <h2>{t('auth.twoFactor.title')}</h2>
          
          <Input
            id="twoFactorCode"
            type="text"
            label={t('auth.twoFactor.codeLabel')}
            value={twoFactorCode}
            onChange={(e) => setTwoFactorCode(e.target.value)}
            error={errors.twoFactorCode?.message}
            rtl={isRTL}
          />

          <Button
            type="button"
            variant="primary"
            onClick={handle2FAVerification}
            fullWidth
            rtl={isRTL}
          >
            {t('auth.twoFactor.verifyButton')}
          </Button>
        </div>
      )}
    </div>
  );
};

export default Login;