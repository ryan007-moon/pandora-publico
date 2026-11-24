'use client';

import React, { useState, useCallback, useMemo, useEffect, memo } from 'react';
import Image, { type ImageProps } from 'next/image';

interface AppImageProps extends Omit<ImageProps, 'src' | 'width' | 'height' | 'onClick'> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  quality?: number;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  fill?: boolean;
  sizes?: string;
  onClick?: () => void;
  fallbackSrc?: string;
  loading?: 'lazy' | 'eager';
  unoptimized?: boolean;
}

const AppImage = memo(function AppImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  quality = 85,
  placeholder = 'empty',
  blurDataURL,
  fill = false,
  sizes,
  onClick,
  fallbackSrc = '/assets/images/no_image.png',
  loading = 'lazy',
  unoptimized = false,
  ...props
}: AppImageProps) {
  const [imageSrc, setImageSrc] = useState(src);
  const [hasError, setHasError] = useState(false);
  const [directSource, setDirectSource] = useState(false);

  useEffect(() => {
    setImageSrc(src);
    setHasError(false);
    setDirectSource(false);
  }, [src]);

  const isExternalUrl = useMemo(
    () => typeof imageSrc === 'string' && imageSrc.startsWith('http'),
    [imageSrc]
  );
  const resolvedUnoptimized = unoptimized || isExternalUrl || directSource;

  const handleError = useCallback(() => {
    // Retry the local original if the optimizer fails before using a placeholder.
    if (!resolvedUnoptimized && imageSrc.startsWith('/') && !imageSrc.startsWith('//')) {
      setDirectSource(true);
      return;
    }
    if (!hasError && imageSrc !== fallbackSrc) {
      setImageSrc(fallbackSrc);
      setDirectSource(true);
      setHasError(true);
    }
  }, [hasError, imageSrc, fallbackSrc, resolvedUnoptimized]);

  // A superfície de carregamento é herdada do contêiner de cada imagem.
  // Um fundo fixo no <img> aparecia como caixa atrás de logotipos transparentes
  // quando o cache concluía o carregamento antes da hidratação (onLoad não dispara).
  const imageClassName = useMemo(() => {
    const classes = [className];
    if (onClick) classes.push('cursor-pointer hover:opacity-90 transition-opacity duration-200');
    return classes.filter(Boolean).join(' ');
  }, [className, onClick]);

  const imageProps = useMemo(() => {
    const baseProps: ImageProps = {
      src: imageSrc,
      alt,
      className: imageClassName,
      quality,
      placeholder,
      unoptimized: resolvedUnoptimized,
      onError: handleError,
      onClick,
    };

    if (priority) {
      baseProps.priority = true;
    } else {
      baseProps.loading = loading;
    }

    if (blurDataURL && placeholder === 'blur') {
      baseProps.blurDataURL = blurDataURL;
    }

    return baseProps;
  }, [
    imageSrc,
    alt,
    imageClassName,
    quality,
    placeholder,
    blurDataURL,
    resolvedUnoptimized,
    priority,
    loading,
    handleError,
    onClick,
  ]);

  if (fill) {
    return (
      <div className="absolute inset-0">
        <Image
          {...imageProps}
          alt={alt}
          fill
          sizes={sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'}
          style={{ objectFit: 'cover' }}
          {...props}
        />
      </div>
    );
  }

  return (
    <Image
      {...imageProps}
      alt={alt}
      width={width || 400}
      height={height || 300}
      sizes={sizes}
      {...props}
    />
  );
});

AppImage.displayName = 'AppImage';

export default AppImage;
