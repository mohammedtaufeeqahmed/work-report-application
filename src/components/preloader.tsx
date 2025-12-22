'use client';

import { useEffect, useRef, useState } from 'react';

export function Preloader() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('INITIALIZING');
  const [isComplete, setIsComplete] = useState(false);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const progressFrameRef = useRef<number | undefined>(undefined);

  const states = [
    'INITIALIZING CORE',
    'LOADING ASSETS',
    'VERIFYING INTEGRITY',
    'ESTABLISHING UPLINK',
    'RENDERING UI',
  ];

  // 3D Sphere Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    const sphereRadius = 250;
    const numParticles = 300;

    let angleX = 0;
    let angleY = 0;

    interface Point3D {
      x: number;
      y: number;
      z: number;
      baseSize: number;
      project(ax: number, ay: number): { x: number; y: number; s: number };
    }

    class Point3DImpl implements Point3D {
      x: number;
      y: number;
      z: number;
      baseSize: number;

      constructor() {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);

        this.x = sphereRadius * Math.sin(phi) * Math.cos(theta);
        this.y = sphereRadius * Math.sin(phi) * Math.sin(theta);
        this.z = sphereRadius * Math.cos(phi);
        this.baseSize = Math.random() * 1.5 + 0.5;
      }

      project(ax: number, ay: number) {
        let x1 = this.x * Math.cos(ay) - this.z * Math.sin(ay);
        let z1 = this.x * Math.sin(ay) + this.z * Math.cos(ay);

        let y1 = this.y * Math.cos(ax) - z1 * Math.sin(ax);
        let z2 = this.y * Math.sin(ax) + z1 * Math.cos(ax);

        const scale = 500 / (500 + z2);
        const x2D = x1 * scale + width / 2;
        const y2D = y1 * scale + height / 2;

        return { x: x2D, y: y2D, s: scale };
      }
    }

    function resize() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    }

    resize();
    window.addEventListener('resize', resize);

    const particles: Point3D[] = [];
    for (let i = 0; i < numParticles; i++) {
      particles.push(new Point3DImpl());
    }

    function animate() {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      angleY += 0.003;
      angleX += 0.002;

      ctx.fillStyle = '#fff';

      particles.forEach((p) => {
        const proj = p.project(angleX, angleY);
        const alpha = (proj.s - 0.5) * 1.5;
        if (alpha > 0) {
          ctx.globalAlpha = Math.min(alpha, 0.8);
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, p.baseSize * proj.s, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      ctx.lineWidth = 0.3;
      for (let i = 0; i < particles.length; i += 2) {
        const p1 = particles[i].project(angleX, angleY);
        if (p1.s < 0.6) continue;

        for (let j = i + 1; j < particles.length; j += 5) {
          const p2 = particles[j].project(angleX, angleY);
          if (p2.s < 0.6) continue;

          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 60) {
            ctx.strokeStyle = `rgba(255,255,255, ${0.15 * (1 - dist / 60)})`;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Data Stream Simulation
  useEffect(() => {
    const leftLog = document.getElementById('log-left');
    const rightLog = document.getElementById('log-right');
    if (!leftLog || !rightLog) return;

    const vocab = ['ALLOC', 'MEM_OK', 'SYS_0X', 'PACKET', 'LINK', 'VIRT', 'PROXY', 'KERNEL'];

    function addLogLine(container: HTMLElement, align: 'left' | 'right') {
      const line = document.createElement('div');
      line.className = 'sys-row';
      const hex = '0x' + Math.floor(Math.random() * 16777215).toString(16).toUpperCase().padStart(6, '0');
      const kw = vocab[Math.floor(Math.random() * vocab.length)];
      const val = Math.floor(Math.random() * 999);

      if (align === 'left') line.innerText = `> ${kw} :: ${hex}`;
      else line.innerText = `[${val}ms] ${hex}`;

      container.appendChild(line);

      if (container.children.length > 6) container.removeChild(container.firstChild);
    }

    const leftInterval = setInterval(() => addLogLine(leftLog, 'left'), 400);
    const rightInterval = setInterval(() => addLogLine(rightLog, 'right'), 650);

    return () => {
      clearInterval(leftInterval);
      clearInterval(rightInterval);
    };
  }, []);

  // Progress Logic
  useEffect(() => {
    let currentProgress = 0;

    function frame() {
      currentProgress += Math.random() * 0.8;
      if (currentProgress > 100) currentProgress = 100;

      setProgress(currentProgress);

      const stateIdx = Math.min(Math.floor((currentProgress / 100) * states.length), states.length - 1);
      setStatus(states[stateIdx]);

      if (currentProgress < 100) {
        progressFrameRef.current = requestAnimationFrame(frame);
      } else {
        setTimeout(() => {
          setStatus('COMPLETE');
          setTimeout(() => {
            setIsComplete(true);
          }, 1000);
        }, 500);
      }
    }

    progressFrameRef.current = requestAnimationFrame(frame);

    return () => {
      if (progressFrameRef.current) {
        cancelAnimationFrame(progressFrameRef.current);
      }
    };
  }, []);

  if (isComplete) return null;

  return (
    <div
      id="preloader"
      style={{
        opacity: isComplete ? 0 : 1,
        transform: isComplete ? 'scale(1.05)' : 'scale(1)',
      }}
    >
      <canvas ref={canvasRef} id="canvas-layer" />
      <div className="ui-layer">
        <div className="corner tl" />
        <div className="corner tr" />
        <div className="corner bl" />
        <div className="corner br" />
        <div className="stream-col stream-left" id="log-left" />
        <div className="stream-col stream-right" id="log-right" />
      </div>
      <div className="center-stage">
        <div className="reactor-ring">
          <div className="circle c1" />
          <div className="circle c2" />
          <div className="circle c3" />
          <div className="core" />
        </div>
        <div className="title-block">
          <h1 className="brand">WorkReport</h1>
          <div className="status-line">
            <span id="system-status">{status}</span>
          </div>
          <div className="progress-container">
            <div className="progress-fill" id="bar" style={{ width: `${progress}%` }} />
            <div className="progress-num" id="num">
              {Math.floor(progress).toString().padStart(2, '0')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

