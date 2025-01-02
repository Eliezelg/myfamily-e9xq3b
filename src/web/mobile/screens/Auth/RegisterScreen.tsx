/**
 * @fileoverview Mobile registration screen component with enhanced security and accessibility
 * Implements comprehensive form validation, multi-language support, and platform-specific optimizations
 * @version 1.0.0
 * @package MyFamily Mobile
 */

import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native'; // v6.0+
import { Formik } from 'formik'; // v2.4+
import * as Yup from 'yup'; // v1.2+

import { IRegisterData } from '../../../../src/interfaces/auth.interface';
import { register } from '../../../../src/services/auth.service';
import KeyboardAvoidingView from '../../components/common/KeyboardAvoidingView/KeyboardAvoidingView';
import SafeAreaView from '../../components/common/SafeAreaView/SafeAreaView';
import TouchableRipple from '../../components/common/TouchableRipple/TouchableRipple';
import { isIOS } from '../../utils/platform.util';
import { moderateScale, scale, verticalScale } from '../../styles/responsive';

// Validation schema with enhanced security rules
const validationSchema = Yup.object().shape({
  email: Yup.string()
    .email('auth.validation.email.invalid')
    .required('auth.validation.email.required'),
  password: Yup.string()
    .min(8, 'auth.validation.password.min')
    .matches(
      /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/,
      'auth.validation.password.pattern'
    )
    .required('auth.validation.password.required'),
  firstName: Yup.string()
    .min(2, 'auth.validation.firstName.min')
    .required('auth.validation.firstName.required'),
  lastName: Yup.string()
    .min(2, 'auth.validation.lastName.min')
    .required('auth.validation.lastName.required'),
  language: Yup.string()
    .oneOf(['en', 'he', 'ar', 'ru', 'fr', 'es', 'de', 'zh'], 'auth.validation.language.invalid')
    .required('auth.validation.language.required'),
});

const RegisterScreen: React.FC = () => {
  const navigation = useNavigation();

  // Initial form values
  const initialValues: IRegisterData = useMemo(() => ({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    language: Platform.select({ ios: 'en', android: 'en' }),
  }), []);

  // Handle registration submission
  const handleRegister = useCallback(async (values: IRegisterData, { setSubmitting, setErrors }: any) => {
    try {
      await register(values);
      navigation.navigate('OnboardingScreen' as never);
    } catch (error: any) {
      setErrors({
        submit: error.message || 'auth.error.registration.failed',
      });
    } finally {
      setSubmitting(false);
    }
  }, [navigation]);

  return (
    <SafeAreaView edges respectRTL>
      <KeyboardAvoidingView behavior={isIOS() ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            <Text style={styles.title}>auth.register.title</Text>
            <Text style={styles.subtitle}>auth.register.subtitle</Text>

            <Formik
              initialValues={initialValues}
              validationSchema={validationSchema}
              onSubmit={handleRegister}
            >
              {({
                handleChange,
                handleBlur,
                handleSubmit,
                values,
                errors,
                touched,
                isSubmitting,
              }) => (
                <View style={styles.form}>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={[styles.input, touched.email && errors.email && styles.inputError]}
                      placeholder="auth.register.email.placeholder"
                      value={values.email}
                      onChangeText={handleChange('email')}
                      onBlur={handleBlur('email')}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="email"
                      textContentType="emailAddress"
                      accessibilityLabel="auth.register.email.accessibility"
                    />
                    {touched.email && errors.email && (
                      <Text style={styles.errorText}>{errors.email}</Text>
                    )}
                  </View>

                  <View style={styles.inputContainer}>
                    <TextInput
                      style={[styles.input, touched.password && errors.password && styles.inputError]}
                      placeholder="auth.register.password.placeholder"
                      value={values.password}
                      onChangeText={handleChange('password')}
                      onBlur={handleBlur('password')}
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                      textContentType="newPassword"
                      accessibilityLabel="auth.register.password.accessibility"
                    />
                    {touched.password && errors.password && (
                      <Text style={styles.errorText}>{errors.password}</Text>
                    )}
                  </View>

                  <View style={styles.nameContainer}>
                    <View style={styles.nameInput}>
                      <TextInput
                        style={[styles.input, touched.firstName && errors.firstName && styles.inputError]}
                        placeholder="auth.register.firstName.placeholder"
                        value={values.firstName}
                        onChangeText={handleChange('firstName')}
                        onBlur={handleBlur('firstName')}
                        autoCapitalize="words"
                        textContentType="givenName"
                        accessibilityLabel="auth.register.firstName.accessibility"
                      />
                      {touched.firstName && errors.firstName && (
                        <Text style={styles.errorText}>{errors.firstName}</Text>
                      )}
                    </View>

                    <View style={styles.nameInput}>
                      <TextInput
                        style={[styles.input, touched.lastName && errors.lastName && styles.inputError]}
                        placeholder="auth.register.lastName.placeholder"
                        value={values.lastName}
                        onChangeText={handleChange('lastName')}
                        onBlur={handleBlur('lastName')}
                        autoCapitalize="words"
                        textContentType="familyName"
                        accessibilityLabel="auth.register.lastName.accessibility"
                      />
                      {touched.lastName && errors.lastName && (
                        <Text style={styles.errorText}>{errors.lastName}</Text>
                      )}
                    </View>
                  </View>

                  <TouchableRipple
                    onPress={() => handleSubmit()}
                    disabled={isSubmitting}
                    style={styles.button}
                    accessibilityLabel="auth.register.submit.accessibility"
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.buttonText}>auth.register.submit</Text>
                    )}
                  </TouchableRipple>

                  {errors.submit && (
                    <Text style={styles.submitError}>{errors.submit}</Text>
                  )}
                </View>
              )}
            </Formik>

            <TouchableRipple
              onPress={() => navigation.navigate('LoginScreen' as never)}
              style={styles.loginLink}
              accessibilityLabel="auth.register.login.accessibility"
            >
              <Text style={styles.loginText}>auth.register.login.link</Text>
            </TouchableRipple>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: scale(24),
  },
  title: {
    fontSize: moderateScale(24),
    fontWeight: 'bold',
    marginBottom: verticalScale(8),
    textAlign: 'center',
  },
  subtitle: {
    fontSize: moderateScale(16),
    color: '#666666',
    marginBottom: verticalScale(32),
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: verticalScale(16),
  },
  input: {
    height: verticalScale(48),
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: scale(8),
    paddingHorizontal: scale(16),
    fontSize: moderateScale(16),
    backgroundColor: '#FFFFFF',
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: moderateScale(12),
    marginTop: verticalScale(4),
  },
  nameContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: verticalScale(16),
  },
  nameInput: {
    flex: 1,
    marginHorizontal: scale(4),
  },
  button: {
    backgroundColor: '#2196F3',
    height: verticalScale(48),
    borderRadius: scale(8),
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: verticalScale(16),
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: moderateScale(16),
    fontWeight: '600',
  },
  submitError: {
    color: '#FF3B30',
    fontSize: moderateScale(14),
    textAlign: 'center',
    marginTop: verticalScale(16),
  },
  loginLink: {
    marginTop: verticalScale(24),
    padding: scale(12),
  },
  loginText: {
    color: '#2196F3',
    fontSize: moderateScale(14),
    textAlign: 'center',
  },
});

export default RegisterScreen;