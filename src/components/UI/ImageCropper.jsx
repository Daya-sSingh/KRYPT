import React, { useState, useRef, useEffect } from 'react';

export default function ImageCropper({ imageSrc, onCrop, onCancel }) {
  const canvasRef = useRef(null);
  const imgRef    = useRef(null);
  const [scale,   setScale]   = useState(1);
  const [offset,  setOffset]  = useState({ x:0, y:0 });
  const drag      = useRef(null);
  const SIZE = 280;

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.max(SIZE / img.width, SIZE / img.height);
      setScale(ratio);
      imgRef.current = img;
      requestAnimationFrame(() => drawCanvas(img, {x:0,y:0}, ratio));
    };
    img.src = imageSrc;
  }, [imageSrc]);

  function drawCanvas(img, off, sc) {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, SIZE, SIZE);
    const iw = img.width * sc;
    const ih = img.height * sc;
    const x  = (SIZE - iw) / 2 + off.x;
    const y  = (SIZE - ih) / 2 + off.y;
    ctx.drawImage(img, x, y, iw, ih);
    // Dark overlay
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(SIZE/2, SIZE/2, SIZE/2 - 2, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
    // Border
    ctx.strokeStyle = '#39ff6a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(SIZE/2, SIZE/2, SIZE/2 - 2, 0, Math.PI*2);
    ctx.stroke();
  }

  function redraw(off, sc) {
    if (imgRef.current) drawCanvas(imgRef.current, off, sc);
  }

  function onMouseDown(e) {
    drag.current = { mx: e.clientX, my: e.clientY, ox: offset.x, oy: offset.y };
  }
  function onMouseMove(e) {
    if (!drag.current) return;
    const off = { x: drag.current.ox + e.clientX - drag.current.mx, y: drag.current.oy + e.clientY - drag.current.my };
    setOffset(off);
    redraw(off, scale);
  }
  function onMouseUp() { drag.current = null; }
  function onWheel(e) {
    e.preventDefault();
    const sc = Math.max(0.3, Math.min(5, scale + (e.deltaY > 0 ? -0.05 : 0.05)));
    setScale(sc);
    redraw(offset, sc);
  }

  function handleCrop() {
    const out = document.createElement('canvas');
    out.width = out.height = 256;
    const ctx = out.getContext('2d');
    ctx.beginPath();
    ctx.arc(128, 128, 128, 0, Math.PI*2);
    ctx.clip();
    const img = imgRef.current;
    const iw  = img.width * scale;
    const ih  = img.height * scale;
    const x   = (SIZE - iw) / 2 + offset.x;
    const y   = (SIZE - ih) / 2 + offset.y;
    ctx.drawImage(img, x/SIZE*256, y/SIZE*256, iw/SIZE*256, ih/SIZE*256);
    out.toBlob(blob => onCrop(blob, out.toDataURL('image/jpeg', 0.85)), 'image/jpeg', 0.85);
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:16, padding:24, display:'flex', flexDirection:'column', alignItems:'center', gap:16, maxWidth:360, width:'100%' }}>
        <h3 style={{ color:'var(--text)', margin:0, fontSize:16 }}>Crop Profile Picture</h3>
        <p style={{ color:'var(--text-muted)', fontSize:13, margin:0, textAlign:'center' }}>Drag to reposition · Scroll or slider to zoom</p>
        <canvas ref={canvasRef} width={SIZE} height={SIZE}
          style={{ borderRadius:'50%', cursor:'grab', border:'2px solid var(--border)', touchAction:'none' }}
          onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp} onWheel={onWheel}
        />
        <div style={{ display:'flex', alignItems:'center', gap:10, width:'100%' }}>
          <span style={{ fontSize:12, color:'var(--text-faint)', flexShrink:0 }}>Zoom</span>
          <input type="range" min={0.3} max={5} step={0.05} value={scale}
            onChange={e => { const s=Number(e.target.value); setScale(s); redraw(offset,s); }}
            style={{ flex:1, accentColor:'#39ff6a' }} />
          <span style={{ fontSize:12, color:'var(--text-faint)', flexShrink:0 }}>{Math.round(scale*100)}%</span>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="krypt-button-ghost" onClick={onCancel}>Cancel</button>
          <button className="krypt-button" onClick={handleCrop}>Apply</button>
        </div>
      </div>
    </div>
  );
}
