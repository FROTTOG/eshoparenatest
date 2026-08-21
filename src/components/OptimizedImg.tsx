import { optimizedAvif, optimizedImage } from "../image";

/**
 * <picture> s AVIF → WebP/JPEG fallbackem. Prohlížeče s podporou AVIF
 * stahují ~o 30 % menší soubory, ostatní dostanou WebP.
 */
export function OptimizedImg({
  src,
  alt,
  className,
  style,
  width,
  height,
  loading,
  decoding,
  fetchPriority,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  width?: number;
  height?: number;
  loading?: "eager" | "lazy";
  decoding?: "async" | "sync" | "auto";
  fetchPriority?: "high" | "low" | "auto";
}) {
  const avif = optimizedAvif(src);
  const webp = optimizedImage(src);
  return (
    <picture>
      {avif && <source type="image/avif" srcSet={avif} />}
      <img
        src={webp}
        alt={alt}
        className={className}
        style={style}
        width={width}
        height={height}
        loading={loading}
        decoding={decoding}
        fetchPriority={fetchPriority}
      />
    </picture>
  );
}
