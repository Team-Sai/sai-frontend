import type { ComponentPropsWithRef } from 'react';

type AppImageProps = ComponentPropsWithRef<'img'> & {
  src: string;
  alt: string;
};

/** Shared image defaults; source assets are optimized separately. */
export default function AppImage({ decoding = 'async', ...props }: AppImageProps) {
  return <img decoding={decoding} {...props} />;
}
