/**
 * Enhanced Family Management Hook
 * Version: 1.0.0
 * 
 * Custom React hook for comprehensive family management with real-time metrics,
 * pool operations, and status tracking capabilities.
 */

import { useCallback } from 'react'; // ^18.2.0
import { useSelector, useDispatch } from 'react-redux'; // ^8.0.5
import { UUID } from 'crypto';

import { 
  IFamily,
  IFamilyMember,
  IFamilySettings,
  FamilyStatus 
} from '../interfaces/family.interface';
import { 
  fetchFamilies,
  fetchFamilyMetrics,
  updateFamilyStatus,
  setCurrentFamily,
  updateFamilyMetrics,
  updatePoolUtilization,
  selectAllFamilies,
  selectCurrentFamily,
  selectFamilyMetrics,
  selectFamilyStatusHistory,
  selectFamilyLoading,
  selectFamilyError,
  selectPoolUtilization
} from '../store/slices/family.slice';
import { FamilyService } from '../services/family.service';
import { IFamilyPool } from '../interfaces/payment.interface';

/**
 * Enhanced custom hook for family management operations
 * Provides comprehensive family management functionality with real-time metrics
 */
export const useFamily = () => {
  const dispatch = useDispatch();
  const familyService = new FamilyService();

  // Redux selectors for family state
  const families = useSelector(selectAllFamilies);
  const currentFamily = useSelector(selectCurrentFamily);
  const loading = useSelector(selectFamilyLoading('fetchFamilies'));
  const error = useSelector(selectFamilyError('fetchFamilies'));

  /**
   * Fetch all families with enhanced metrics
   */
  const fetchFamilyList = useCallback(async () => {
    try {
      await dispatch(fetchFamilies()).unwrap();
      // Fetch metrics for each family
      families.forEach(family => {
        dispatch(fetchFamilyMetrics(family.id));
      });
    } catch (error: any) {
      console.error('Failed to fetch families:', error);
    }
  }, [dispatch, families]);

  /**
   * Fetch specific family by ID with metrics
   */
  const fetchFamilyById = useCallback(async (familyId: UUID) => {
    try {
      await dispatch(fetchFamilies()).unwrap();
      await dispatch(fetchFamilyMetrics(familyId)).unwrap();
    } catch (error: any) {
      console.error('Failed to fetch family:', error);
    }
  }, [dispatch]);

  /**
   * Create new family with initial settings
   */
  const createFamily = useCallback(async (data: Partial<IFamily>) => {
    try {
      const newFamily = await familyService.createFamily(data);
      await fetchFamilyList();
      return newFamily;
    } catch (error: any) {
      console.error('Failed to create family:', error);
      throw error;
    }
  }, [familyService, fetchFamilyList]);

  /**
   * Update family settings with validation
   */
  const updateFamily = useCallback(async (
    familyId: UUID,
    data: Partial<IFamily>
  ) => {
    try {
      const updatedFamily = await familyService.updateFamilySettings(
        familyId,
        data as Partial<IFamilySettings>
      );
      await fetchFamilyById(familyId);
      return updatedFamily;
    } catch (error: any) {
      console.error('Failed to update family:', error);
      throw error;
    }
  }, [familyService, fetchFamilyById]);

  /**
   * Update family pool settings with real-time monitoring
   */
  const updatePoolSettings = useCallback(async (
    familyId: UUID,
    settings: Partial<IFamilyPool>
  ) => {
    try {
      const updatedPool = await familyService.updatePoolSettings(familyId, settings);
      dispatch(updatePoolUtilization({
        familyId,
        utilization: updatedPool.balance / updatedPool.autoTopUpThreshold
      }));
      return updatedPool;
    } catch (error: any) {
      console.error('Failed to update pool settings:', error);
      throw error;
    }
  }, [familyService, dispatch]);

  /**
   * Monitor family pool utilization in real-time
   */
  const monitorPoolUtilization = useCallback((familyId: UUID) => {
    const checkUtilization = async () => {
      try {
        const pool = await familyService.getFamilyPool(familyId);
        dispatch(updatePoolUtilization({
          familyId,
          utilization: pool.balance / pool.autoTopUpThreshold
        }));
      } catch (error) {
        console.error('Failed to monitor pool utilization:', error);
      }
    };

    // Initial check
    checkUtilization();

    // Set up periodic monitoring
    const intervalId = setInterval(checkUtilization, 300000); // Check every 5 minutes

    // Cleanup on unmount
    return () => clearInterval(intervalId);
  }, [familyService, dispatch]);

  /**
   * Add new family member with role validation
   */
  const addFamilyMember = useCallback(async (
    familyId: UUID,
    memberData: Partial<IFamilyMember>
  ) => {
    try {
      const updatedFamily = await familyService.updateFamilySettings(
        familyId,
        { members: [...(currentFamily?.members || []), memberData] }
      );
      await fetchFamilyById(familyId);
      return updatedFamily;
    } catch (error: any) {
      console.error('Failed to add family member:', error);
      throw error;
    }
  }, [familyService, currentFamily, fetchFamilyById]);

  /**
   * Remove family member with validation
   */
  const removeFamilyMember = useCallback(async (
    familyId: UUID,
    memberId: UUID
  ) => {
    try {
      const updatedMembers = currentFamily?.members.filter(
        member => member.id !== memberId
      );
      const updatedFamily = await familyService.updateFamilySettings(
        familyId,
        { members: updatedMembers }
      );
      await fetchFamilyById(familyId);
      return updatedFamily;
    } catch (error: any) {
      console.error('Failed to remove family member:', error);
      throw error;
    }
  }, [familyService, currentFamily, fetchFamilyById]);

  /**
   * Set current active family
   */
  const selectFamily = useCallback((family: IFamily) => {
    dispatch(setCurrentFamily(family.id));
    monitorPoolUtilization(family.id);
  }, [dispatch, monitorPoolUtilization]);

  /**
   * Clear any error states
   */
  const clearError = useCallback(() => {
    // Implementation would depend on error clearing action in familySlice
  }, []);

  return {
    // State
    families,
    currentFamily,
    loading,
    error,
    poolMetrics: currentFamily ? selectPoolUtilization(currentFamily.id) : null,
    statusHistory: currentFamily ? selectFamilyStatusHistory(currentFamily.id) : [],
    engagementScore: currentFamily?.engagementScore,

    // Actions
    fetchFamilies: fetchFamilyList,
    fetchFamilyById,
    createFamily,
    updateFamily,
    updatePoolSettings,
    monitorPoolUtilization,
    addFamilyMember,
    removeFamilyMember,
    setCurrentFamily: selectFamily,
    clearError
  };
};