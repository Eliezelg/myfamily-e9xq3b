/**
 * Main Dashboard Component
 * Implements a responsive, real-time family content interface with Material Design 3.0 principles
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

import PhotoGrid from '../../components/content/PhotoGrid/PhotoGrid';
import FamilySelector from '../../components/family/FamilySelector/FamilySelector';
import Pool from '../../components/payment/Pool/Pool';
import { useAuth } from '../../hooks/useAuth';
import { useFamily } from '../../hooks/useFamily';
import { COLORS, SPACING, TYPOGRAPHY } from '../../styles/theme.styles';
import { ContentType, ContentStatus } from '../../interfaces/content.interface';

// Styled components for dashboard layout
const DashboardContainer = styled.div`
  padding: ${SPACING.padding.large};
  background: ${COLORS.background.default};
  min-height: 100vh;
  direction: ${({ theme }) => theme.dir};
`;

const Header = styled.header`
  margin-bottom: ${SPACING.margins.large};
`;

const WelcomeText = styled.h1`
  font-family: ${({ theme }) => theme.dir === 'rtl' ? TYPOGRAPHY.fontFamily.rtl : TYPOGRAPHY.fontFamily.primary};
  font-size: ${TYPOGRAPHY.fontSize.h1};
  color: ${COLORS.text.primary};
  margin-bottom: ${SPACING.margins.medium};
`;

const ContentSection = styled.section`
  margin-bottom: ${SPACING.margins.xlarge};
`;

const GazetteStatus = styled.div`
  background: ${COLORS.background.paper};
  padding: ${SPACING.padding.medium};
  border-radius: 8px;
  margin-bottom: ${SPACING.margins.medium};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const Dashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const {
    families,
    currentFamily,
    loading,
    error,
    fetchFamilies,
    setCurrentFamily,
    poolMetrics
  } = useFamily();

  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // Fetch families on component mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchFamilies();
    } else {
      navigate('/login');
    }
  }, [isAuthenticated, fetchFamilies, navigate]);

  // Handle family selection
  const handleFamilyChange = useCallback((family) => {
    setCurrentFamily(family);
  }, [setCurrentFamily]);

  // Handle content upload
  const handleContentUpload = useCallback(async (files: File[]) => {
    try {
      setUploadProgress(0);
      for (const file of files) {
        if (file.type.startsWith('image/')) {
          // Upload progress handler
          const onProgress = (progress: number) => {
            setUploadProgress(progress);
          };

          // Upload file
          await currentFamily?.uploadContent({
            type: ContentType.PHOTO,
            file,
            onProgress,
            metadata: {
              type: 'photo',
              uploadedBy: user?.id
            }
          });
        }
      }
      setUploadProgress(100);
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadProgress(0);
    }
  }, [currentFamily, user]);

  // Handle pool top-up success
  const handlePoolTopUpSuccess = useCallback(() => {
    fetchFamilies();
  }, [fetchFamilies]);

  if (loading) {
    return <DashboardContainer>Loading...</DashboardContainer>;
  }

  if (error) {
    return <DashboardContainer>Error: {error}</DashboardContainer>;
  }

  return (
    <DashboardContainer>
      <Header>
        <WelcomeText>
          {t('dashboard.welcome', { name: user?.firstName })}
        </WelcomeText>
        <FamilySelector
          onFamilyChange={handleFamilyChange}
          disabled={loading}
          showMetrics
          ariaLabel={t('dashboard.familySelector')}
        />
      </Header>

      {currentFamily && (
        <>
          <ContentSection>
            <GazetteStatus>
              <h2>{t('dashboard.nextGazette')}</h2>
              <p>
                {t('dashboard.photosStatus', {
                  current: currentFamily.content?.filter(
                    c => c.status === ContentStatus.READY
                  ).length || 0,
                  max: 28
                })}
              </p>
              {uploadProgress > 0 && (
                <progress value={uploadProgress} max="100" />
              )}
            </GazetteStatus>

            <PhotoGrid
              photos={currentFamily.content?.filter(
                c => c.type === ContentType.PHOTO
              ) || []}
              selectable
              virtualScrolling
              onError={(error) => console.error('Photo grid error:', error)}
              maxPhotos={28}
            />
          </ContentSection>

          <Pool
            familyId={currentFamily.id}
            onTopUpSuccess={handlePoolTopUpSuccess}
            preferredCurrency={currentFamily.settings.preferredCurrency}
            onUtilizationChange={(utilization) => {
              console.log('Pool utilization:', utilization);
            }}
          />
        </>
      )}
    </DashboardContainer>
  );
};

export default Dashboard;