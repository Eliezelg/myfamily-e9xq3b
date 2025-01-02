import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import ReCAPTCHA from 'react-google-recaptcha';
import styled from 'styled-components';
import { resetPassword } from '../../services/auth.service';
import Input from '../../components/common/Input/Input';
import Button from '../../components/common/Button/Button';
import { COLORS, TYPOGRAPHY, SPACING } from '../../styles/theme.styles';

// Interface for form data
interface IForgotPasswordForm {
  email: string;
  captchaToken: string;
}

// Styled components following Material Design 3.0
const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: ${SPACING.padding.large};
  background-color: ${COLORS.background.default};
`;

const FormContainer = styled.div`
  width: 100%;
  max-width: 400px;
  padding: ${SPACING.padding.large};
  background-color: ${COLORS.background.paper};
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h1`
  font-family: ${TYPOGRAPHY.fontFamily.primary};
  font-size: ${TYPOGRAPHY.fontSize.h1};
  font-weight: ${TYPOGRAPHY.fontWeight.bold};
  color: ${COLORS.text.primary};
  margin-bottom: ${SPACING.margins.large};
  text-align: center;
`;

const Description = styled.p`
  font-family: ${TYPOGRAPHY.fontFamily.primary};
  font-size: ${TYPOGRAPHY.fontSize.body};
  color: ${COLORS.text.secondary};
  margin-bottom: ${SPACING.margins.medium};
  text-align: center;
`;

const CaptchaContainer = styled.div`
  margin: ${SPACING.margins.medium} 0;
  display: flex;
  justify-content: center;
`;

const ForgotPassword: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string>('');
  const [rateLimitExceeded, setRateLimitExceeded] = useState(false);
  const isRTL = i18n.dir() === 'rtl';

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<IForgotPasswordForm>();

  // Email validation regex
  const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

  // Handle CAPTCHA completion
  const handleCaptchaChange = useCallback((token: string | null) => {
    setCaptchaToken(token || '');
  }, []);

  // Handle form submission
  const onSubmit = useCallback(async (data: IForgotPasswordForm) => {
    try {
      if (rateLimitExceeded) {
        setError('email', {
          type: 'manual',
          message: t('auth.errors.rateLimitExceeded'),
        });
        return;
      }

      if (!captchaToken) {
        setError('email', {
          type: 'manual',
          message: t('auth.errors.captchaRequired'),
        });
        return;
      }

      setIsLoading(true);

      await resetPassword({
        email: data.email,
        captchaToken,
      });

      // Navigate to confirmation page
      navigate('/auth/forgot-password-confirmation', {
        state: { email: data.email },
      });
    } catch (error) {
      if ((error as Error).message.includes('rate limit')) {
        setRateLimitExceeded(true);
      }
      setError('email', {
        type: 'manual',
        message: t('auth.errors.resetFailed'),
      });
    } finally {
      setIsLoading(false);
    }
  }, [captchaToken, navigate, rateLimitExceeded, setError, t]);

  return (
    <Container>
      <FormContainer>
        <Title>{t('auth.forgotPassword.title')}</Title>
        <Description>{t('auth.forgotPassword.description')}</Description>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Input
            id="email"
            name="email"
            type="email"
            label={t('auth.labels.email')}
            error={errors.email?.message}
            disabled={isLoading || rateLimitExceeded}
            required
            {...register('email', {
              required: t('auth.validation.emailRequired'),
              pattern: {
                value: EMAIL_REGEX,
                message: t('auth.validation.emailInvalid'),
              },
            })}
          />

          <CaptchaContainer>
            <ReCAPTCHA
              sitekey={process.env.REACT_APP_RECAPTCHA_SITE_KEY || ''}
              onChange={handleCaptchaChange}
              hl={i18n.language}
              theme="light"
              size="normal"
            />
          </CaptchaContainer>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={isLoading}
            disabled={isLoading || rateLimitExceeded || !captchaToken}
            rtl={isRTL}
          >
            {t('auth.buttons.resetPassword')}
          </Button>

          <Button
            type="button"
            variant="outlined"
            fullWidth
            onClick={() => navigate('/auth/login')}
            disabled={isLoading}
            rtl={isRTL}
            style={{ marginTop: SPACING.margins.medium }}
          >
            {t('auth.buttons.backToLogin')}
          </Button>
        </form>
      </FormContainer>
    </Container>
  );
};

export default ForgotPassword;