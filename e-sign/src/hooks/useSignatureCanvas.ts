import { useRef } from 'react';
import type React from 'react';

type DrawEvent = React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>;

const DEFAULT_PEN_WIDTH = 3.5;

export function useSignatureCanvas(totalPads: number) {
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>(Array(totalPads).fill(null));
  const activeCanvasIndex = useRef<number | null>(null);
  const blankDataUrls = useRef<string[]>(Array(totalPads).fill(''));

  const setCanvasRef = (index: number, element: HTMLCanvasElement | null) => {
    canvasRefs.current[index] = element;
    if (element) {
      blankDataUrls.current[index] = element.toDataURL('image/png');
    }
  };

  const getContext = (index: number) => {
    const canvas = canvasRefs.current[index];
    if (!canvas) return null;

    const context = canvas.getContext('2d');
    if (!context) return null;

    context.lineWidth = DEFAULT_PEN_WIDTH;
    context.lineCap = 'round';
    context.strokeStyle = '#000';
    return context;
  };

  const getPointerPosition = (event: DrawEvent, index: number) => {
    const canvas = canvasRefs.current[index];
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    if ('touches' in event) {
      const touch = event.touches[0];
      return {
        x: ((touch.clientX - rect.left) * canvas.width) / rect.width,
        y: ((touch.clientY - rect.top) * canvas.height) / rect.height,
      };
    }

    return {
      x: ((event.clientX - rect.left) * canvas.width) / rect.width,
      y: ((event.clientY - rect.top) * canvas.height) / rect.height,
    };
  };

  const startDrawing = (event: DrawEvent, index: number) => {
    const context = getContext(index);
    const point = getPointerPosition(event, index);
    if (!context || !point) return;

    if ('touches' in event) event.preventDefault();

    activeCanvasIndex.current = index;
    context.beginPath();
    context.moveTo(point.x, point.y);
  };

  const draw = (event: DrawEvent, index: number) => {
    if (activeCanvasIndex.current !== index) return;

    const context = getContext(index);
    const point = getPointerPosition(event, index);
    if (!context || !point) return;

    if ('touches' in event) event.preventDefault();

    context.lineTo(point.x, point.y);
    context.stroke();
  };

  const stopDrawing = () => {
    activeCanvasIndex.current = null;
  };

  const clearSignature = (index: number) => {
    const canvas = canvasRefs.current[index];
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    blankDataUrls.current[index] = canvas.toDataURL('image/png');
  };

  const getSignatureDataUrls = () => {
    return canvasRefs.current.map((canvas, index) => {
      if (!canvas) return '';

      const currentDataUrl = canvas.toDataURL('image/png');
      const blankDataUrl = blankDataUrls.current[index];

      if (blankDataUrl && currentDataUrl === blankDataUrl) {
        return '';
      }

      return currentDataUrl;
    });
  };

  return {
    setCanvasRef,
    startDrawing,
    draw,
    stopDrawing,
    clearSignature,
    getSignatureDataUrls,
  };
}
