import { useEffect, useState } from 'react';
import { Grid } from '@giphy/react-components';
import { GiphyFetch } from '@giphy/js-fetch-api';
import './GifPicker.css';

const gf = new GiphyFetch(import.meta.env.VITE_GIPHY_API_KEY);

interface GifPickerProps {
  onSelect: (url: string) => void;
  onClose: () => void;
}

export function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [width, setWidth] = useState(400);

  useEffect(() => {
    const el = document.querySelector('.gif-picker');
    if (el) setWidth(el.clientWidth - 24);
  }, []);

  const fetchGifs = (offset: number) => gf.trending({ offset, limit: 12 });

  return (
    <div className="gif-picker">
      <header>
        <span>GIFs</span>
        <button type="button" onClick={onClose}>✕</button>
      </header>
      <Grid
        width={width}
        columns={3}
        fetchGifs={fetchGifs}
        onGifClick={(gif: { images: { original: { url: string } } }, e: { preventDefault: () => void }) => {
          e.preventDefault();
          onSelect(gif.images.original.url);
        }}
      />
    </div>
  );
}
