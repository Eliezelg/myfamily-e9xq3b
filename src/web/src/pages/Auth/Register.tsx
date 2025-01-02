import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next'; // v22.0.0
import { useNavigate } from 'react-router-dom'; // v6.8.0
import Input from '../../components/common/Input/Input';
import Button from '../../components/common/Button/Button';
import { IRegisterData } from '../../interfaces/auth.interface';
import { validateRegistrationData } from '../../utils/validation.util';
import { authService } from '../../services/auth.service';
import { SUPPORTED_LANGUAGES } from '../../constants/validation.constants';

// Form errors interface with field-specific messages
interface IFormErrors {
  email: string | null;
  password: string | null;
  firstName: string | null;
  lastName: string | null;
  general: string | null;
}

// Form state management interface
interface IFormState {
  isSubmitting: boolean;
  isValidating: boolean;
  submitAttempts: number;
  lastSubmitTime: number;
}

const Register: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  // Form data state
  const [formData, setFormData] = useState<IRegisterData>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    language: i18n.language
  });

  // Form state management
  const [formState, setFormState] = useState<IFormState>({
    isSubmitting: false,
    isValidating: false,
    submitAttempts: 0,
    lastSubmitTime: 0
  });

  // Error state management
  const [errors, setErrors] = useState<IFormErrors>({
    email: null,
    password: null,
    firstName: null,
    lastName: null,
    general: null
  });

  // Cleanup effect
  useEffect(() => {
    return () => {
      // Reset sensitive form data on unmount
      setFormData({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        language: i18n.language
      });
    };
  }, [i18n.language]);

  // Rate limiting check
  const checkRateLimit = useCallback((): boolean => {
    const now = Date.now();
    const timeSinceLastSubmit = now - formState.lastSubmitTime;
    const tooManyAttempts = formState.submitAttempts >= 5;
    const tooFrequent = timeSinceLastSubmit < 1000; // 1 second minimum between attempts

    if (tooManyAttempts || tooFrequent) {
      setErrors(prev => ({
        ...prev,
        general: t('register.error.rateLimit')
      }));
      return false;
    }
    return true;
  }, [formState.lastSubmitTime, formState.submitAttempts, t]);

  // Input change handler with validation
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: null, general: null }));
  }, []);

  // Form submission handler
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // Check rate limiting
    if (!checkRateLimit()) return;

    setFormState(prev => ({
      ...prev,
      isSubmitting: true,
      isValidating: true,
      submitAttempts: prev.submitAttempts + 1,
      lastSubmitTime: Date.now()
    }));

    try {
      // Validate form data
      const validatedData = await validateRegistrationData(formData);

      // Attempt registration
      await authService.register(validatedData);

      // Navigate to login on success
      navigate('/login', { 
        state: { 
          message: t('register.success'),
          email: formData.email 
        }
      });
    } catch (error) {
      const err = error as Error;
      if (err.name === 'ValidationError') {
        setErrors(prev => ({
          ...prev,
          ...err.context,
          general: t('register.error.validation')
        }));
      } else {
        setErrors(prev => ({
          ...prev,
          general: t('register.error.general')
        }));
      }
    } finally {
      setFormState(prev => ({
        ...prev,
        isSubmitting: false,
        isValidating: false
      }));
    }
  }, [formData, checkRateLimit, navigate, t]);

  return (
    <form 
      onSubmit={handleSubmit}
      noValidate
      aria-label={t('register.formLabel')}
      className="register-form"
    >
      <Input
        id="register-email"
        name="email"
        type="email"
        value={formData.email}
        onChange={handleInputChange}
        label={t('register.email')}
        error={errors.email}
        required
        aria-required="true"
        disabled={formState.isSubmitting}
      />

      <Input
        id="register-password"
        name="password"
        type="password"
        value={formData.password}
        onChange={handleInputChange}
        label={t('register.password')}
        error={errors.password}
        required
        aria-required="true"
        disabled={formState.isSubmitting}
      />

      <Input
        id="register-firstName"
        name="firstName"
        type="text"
        value={formData.firstName}
        onChange={handleInputChange}
        label={t('register.firstName')}
        error={errors.firstName}
        required
        aria-required="true"
        disabled={formState.isSubmitting}
      />

      <Input
        id="register-lastName"
        name="lastName"
        type="text"
        value={formData.lastName}
        onChange={handleInputChange}
        label={t('register.lastName')}
        error={errors.lastName}
        required
        aria-required="true"
        disabled={formState.isSubmitting}
      />

      <select
        id="register-language"
        name="language"
        value={formData.language}
        onChange={handleInputChange as any}
        aria-label={t('register.language')}
        disabled={formState.isSubmitting}
      >
        {SUPPORTED_LANGUAGES.map(lang => (
          <option key={lang} value={lang}>
            {t(`languages.${lang}`)}
          </option>
        ))}
      </select>

      {errors.general && (
        <div 
          role="alert"
          aria-live="polite"
          className="error-message"
        >
          {errors.general}
        </div>
      )}

      <Button
        type="submit"
        disabled={formState.isSubmitting}
        loading={formState.isSubmitting}
        fullWidth
        variant="primary"
        size="large"
        ariaLabel={t('register.submit')}
      >
        {t('register.submit')}
      </Button>
    </form>
  );
};

export default Register;