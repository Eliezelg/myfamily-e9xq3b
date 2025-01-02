/**
 * Enhanced Family Selector Component
 * Version: 1.0.0
 * 
 * A comprehensive family selection component implementing Material Design 3.0 guidelines
 * with enhanced accessibility, RTL support, and real-time family metrics tracking.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react'; // ^18.2.0
import { useTranslation } from 'react-i18next'; // ^12.0.0

import { IFamily, FamilyStatus } from '../../../interfaces/family.interface';
import { useFamily } from '../../../hooks/useFamily';
import {
  Container,
  SelectButton,
  DropdownList,
  FamilyOption,
  ActiveIndicator,
  dropdownAnimation,
  reducedMotionStyles
} from './FamilySelector.styles';

/**
 * Props interface for FamilySelector component
 */
interface FamilySelectorProps {
  className?: string;
  disabled?: boolean;
  showMetrics?: boolean;
  onFamilyChange?: (family: IFamily) => void;
  ariaLabel?: string;
  testId?: string;
}

/**
 * Enhanced FamilySelector component with comprehensive functionality
 */
const FamilySelector: React.FC<FamilySelectorProps> = React.memo(({
  className,
  disabled = false,
  showMetrics = true,
  onFamilyChange,
  ariaLabel,
  testId = 'family-selector'
}) => {
  // Hooks
  const { t, i18n } = useTranslation();
  const { families, currentFamily, setCurrentFamily } = useFamily();
  
  // State
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  
  // Refs
  const dropdownRef = useRef<HTMLUListElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  /**
   * Handle family selection with validation and metrics
   */
  const handleFamilySelect = useCallback((family: IFamily) => {
    if (family.status === FamilyStatus.SUSPENDED) {
      return; // Prevent selecting suspended families
    }

    setCurrentFamily(family);
    onFamilyChange?.(family);
    setIsOpen(false);
    setActiveIndex(-1);
    buttonRef.current?.focus();
  }, [setCurrentFamily, onFamilyChange]);

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (disabled) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setActiveIndex(prev => 
            prev < families.length - 1 ? prev + 1 : prev
          );
        }
        break;

      case 'ArrowUp':
        event.preventDefault();
        if (isOpen) {
          setActiveIndex(prev => prev > 0 ? prev - 1 : prev);
        }
        break;

      case 'Enter':
      case ' ':
        event.preventDefault();
        if (isOpen && activeIndex >= 0) {
          handleFamilySelect(families[activeIndex]);
        } else {
          setIsOpen(prev => !prev);
        }
        break;

      case 'Escape':
        event.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
        buttonRef.current?.focus();
        break;

      case 'Tab':
        if (isOpen) {
          event.preventDefault();
          setIsOpen(false);
          setActiveIndex(-1);
        }
        break;
    }
  }, [disabled, isOpen, activeIndex, families, handleFamilySelect]);

  /**
   * Handle click outside to close dropdown
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * Focus management for accessibility
   */
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const options = dropdownRef.current.querySelectorAll('li');
      if (activeIndex >= 0 && options[activeIndex]) {
        (options[activeIndex] as HTMLElement).focus();
      }
    }
  }, [isOpen, activeIndex]);

  return (
    <Container 
      className={className}
      dir={i18n.dir()}
      data-testid={testId}
    >
      <SelectButton
        ref={buttonRef}
        onClick={() => !disabled && setIsOpen(prev => !prev)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || t('family.selector.label')}
        disabled={disabled}
        data-testid={`${testId}-button`}
      >
        {currentFamily ? (
          <>
            <span>{currentFamily.name}</span>
            {showMetrics && currentFamily.poolUtilization && (
              <span aria-label={t('family.pool.utilization', { 
                value: Math.round(currentFamily.poolUtilization * 100) 
              })}>
                {Math.round(currentFamily.poolUtilization * 100)}%
              </span>
            )}
          </>
        ) : (
          <span>{t('family.selector.placeholder')}</span>
        )}
      </SelectButton>

      {isOpen && (
        <DropdownList
          ref={dropdownRef}
          role="listbox"
          aria-label={t('family.selector.list')}
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          data-testid={`${testId}-list`}
        >
          {families.map((family, index) => (
            <FamilyOption
              key={family.id}
              role="option"
              aria-selected={currentFamily?.id === family.id}
              tabIndex={activeIndex === index ? 0 : -1}
              onClick={() => handleFamilySelect(family)}
              onMouseEnter={() => setActiveIndex(index)}
              data-testid={`${testId}-option-${family.id}`}
            >
              <span>
                {currentFamily?.id === family.id && (
                  <ActiveIndicator aria-hidden="true" />
                )}
                {family.name}
              </span>
              {showMetrics && family.poolUtilization && (
                <span aria-label={t('family.pool.utilization', {
                  value: Math.round(family.poolUtilization * 100)
                })}>
                  {Math.round(family.poolUtilization * 100)}%
                </span>
              )}
            </FamilyOption>
          ))}
        </DropdownList>
      )}
    </Container>
  );
});

FamilySelector.displayName = 'FamilySelector';

export default FamilySelector;