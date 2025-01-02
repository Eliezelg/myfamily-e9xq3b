/**
 * @fileoverview Responsive photo grid component with advanced features
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LazyLoadImage } from 'react-lazy-load-image-component'; // v1.5.0
import { IContent, ContentType, ContentStatus } from '../../../interfaces/content.interface';
import { GridContainer, PhotoItem, PhotoImage } from './PhotoGrid.styles';

// Constants for component configuration
const DEFAULT_MAX_PHOTOS = 28;
const INTERSECTION_OBSERVER_OPTIONS = {
  root: null,
  rootMargin: '50px',
  threshold: 0.1
};
const VIRTUAL_SCROLL_BUFFER = 5;

/**
 * Props interface for PhotoGrid component
 */
interface PhotoGridProps {
  photos: IContent[];
  selectable?: boolean;
  selectedIds?: string[];
  onSelect?: (id: string) => void;
  maxPhotos?: number;
  onError?: (error: Error) => void;
  loadingPlaceholder?: React.ReactNode;
  errorFallback?: React.ReactNode;
  containerRef?: React.RefObject<HTMLDivElement>;
  virtualScrolling?: boolean;
}

/**
 * Filters and validates photos for display
 * @param photos Array of content items
 * @returns Filtered array of ready photos
 */
const filterReadyPhotos = (photos: IContent[]): IContent[] => {
  if (!Array.isArray(photos)) {
    return [];
  }

  return photos
    .filter(photo => 
      photo &&
      photo.type === ContentType.PHOTO &&
      photo.status === ContentStatus.READY &&
      photo.url &&
      photo.metadata?.printReady
    )
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
};

/**
 * PhotoGrid Component
 * Displays a responsive grid of family photos with advanced features
 */
const PhotoGrid: React.FC<PhotoGridProps> = ({
  photos,
  selectable = false,
  selectedIds = [],
  onSelect,
  maxPhotos = DEFAULT_MAX_PHOTOS,
  onError,
  loadingPlaceholder,
  errorFallback,
  containerRef,
  virtualScrolling = false
}) => {
  const [visiblePhotos, setVisiblePhotos] = useState<IContent[]>([]);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const photoRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Filter and validate photos
  const filteredPhotos = useMemo(() => 
    filterReadyPhotos(photos).slice(0, maxPhotos),
    [photos, maxPhotos]
  );

  /**
   * Handles photo selection with keyboard support
   */
  const handlePhotoClick = useCallback((
    photoId: string,
    event: React.MouseEvent | React.KeyboardEvent
  ) => {
    event.preventDefault();
    
    if (!selectable || !onSelect) return;

    if (event.type === 'keydown' && (event as React.KeyboardEvent).key !== 'Enter') {
      return;
    }

    onSelect(photoId);
  }, [selectable, onSelect]);

  /**
   * Handles image load success
   */
  const handleImageLoad = useCallback((photoId: string) => {
    setLoadedImages(prev => new Set(prev).add(photoId));
  }, []);

  /**
   * Handles image load error
   */
  const handleImageError = useCallback((photoId: string, error: Error) => {
    onError?.(new Error(`Failed to load photo ${photoId}: ${error.message}`));
  }, [onError]);

  /**
   * Sets up intersection observer for virtual scrolling
   */
  useEffect(() => {
    if (!virtualScrolling) {
      setVisiblePhotos(filteredPhotos);
      return;
    }

    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const photoId = entry.target.getAttribute('data-photo-id');
        if (photoId && entry.isIntersecting) {
          setVisiblePhotos(prev => {
            const photoIndex = filteredPhotos.findIndex(p => p.id === photoId);
            const start = Math.max(0, photoIndex - VIRTUAL_SCROLL_BUFFER);
            const end = Math.min(filteredPhotos.length, photoIndex + VIRTUAL_SCROLL_BUFFER);
            return filteredPhotos.slice(start, end);
          });
        }
      });
    }, INTERSECTION_OBSERVER_OPTIONS);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [filteredPhotos, virtualScrolling]);

  /**
   * Observes photo elements for virtual scrolling
   */
  useEffect(() => {
    if (!virtualScrolling || !observerRef.current) return;

    photoRefs.current.forEach((element) => {
      observerRef.current?.observe(element);
    });

    return () => {
      photoRefs.current.forEach((element) => {
        observerRef.current?.unobserve(element);
      });
    };
  }, [virtualScrolling, filteredPhotos]);

  /**
   * Renders individual photo item
   */
  const renderPhoto = useCallback((photo: IContent) => {
    const isSelected = selectedIds.includes(photo.id);
    const isLoaded = loadedImages.has(photo.id);

    return (
      <PhotoItem
        key={photo.id}
        ref={el => el && photoRefs.current.set(photo.id, el)}
        data-photo-id={photo.id}
        onClick={(e) => handlePhotoClick(photo.id, e)}
        onKeyDown={(e) => handlePhotoClick(photo.id, e)}
        role="button"
        tabIndex={0}
        aria-selected={isSelected}
        aria-label={photo.metadata.description}
      >
        <LazyLoadImage
          component={PhotoImage}
          src={photo.url}
          alt={photo.metadata.description}
          width={photo.metadata.width}
          height={photo.metadata.height}
          loading="lazy"
          threshold={100}
          className={isLoaded ? 'loaded' : ''}
          onLoad={() => handleImageLoad(photo.id)}
          onError={(e) => handleImageError(photo.id, e as Error)}
          placeholder={loadingPlaceholder}
          errorFallback={errorFallback}
        />
      </PhotoItem>
    );
  }, [
    selectedIds,
    loadedImages,
    handlePhotoClick,
    handleImageLoad,
    handleImageError,
    loadingPlaceholder,
    errorFallback
  ]);

  if (!filteredPhotos.length) {
    return null;
  }

  return (
    <GridContainer ref={containerRef} role="grid" aria-label="Photo grid">
      {(virtualScrolling ? visiblePhotos : filteredPhotos).map(renderPhoto)}
    </GridContainer>
  );
};

export default PhotoGrid;