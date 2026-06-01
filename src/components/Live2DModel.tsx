import React, { useEffect, useRef, useState } from 'react';

export default function Live2DModel() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tip, setTip] = useState('等待 Cubism SDK 加载...');

  const MODEL_JSON = '/live2d/omega/omega.model3.json';
  const MODEL_MOC3 = '/live2d/omega/omega.moc3';
  const MODEL_TEXTURE = '/live2d/omega/desktop.1024/texture_00.png';

  useEffect(() => {
    let animationId: number;

    // 先等 SDK 加载好
    const checkSDK = setInterval(() => {
      if ((window as any).CubismSDK) {
        clearInterval(checkSDK);
        setTip('SDK 已加载，准备初始化...');
        run();
      }
    }, 100);

    const run = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const CubismSDK = (window as any).CubismSDK;
      const gl = canvas.getContext('webgl', {
        alpha: true,
        antialias: true,
        preserveDrawingBuffer: true,
      });
      if (!gl) {
        setTip('❌ WebGL 初始化失败');
        return;
      }

      // 透明背景
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      const dpr = window.devicePixelRatio || 1;
      canvas.width = 420 * dpr;
      canvas.height = 620 * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);

      // 初始化 Cubism
      setTip('初始化 Cubism...');
      CubismSDK.start();
      CubismSDK.initialize();

      // 加载 moc3
      setTip('加载 moc3 模型...');
      const moc3Buffer = await fetch(MODEL_MOC3).then(res => res.arrayBuffer());
      if (!moc3Buffer) {
        setTip('❌ moc3 加载失败');
        return;
      }

      // 创建模型
      const model = CubismSDK.Model.create(moc3Buffer);
      if (!model) {
        setTip('❌ Cubism 模型创建失败');
        return;
      }

      // 加载并绑定贴图
      setTip('加载贴图...');
      const texture = await loadTexture(gl, MODEL_TEXTURE);
      if (!texture) {
        setTip('❌ 贴图加载失败');
        return;
      }
      model.setTexture(0, texture);

      // 创建渲染器
      const renderer = CubismSDK.Renderer.create(gl);

      // 渲染循环（带呼吸效果）
      setTip('🎉 角色渲染中！');
      const startTime = Date.now();
      const draw = () => {
        const elapsedTime = (Date.now() - startTime) / 1000;
        gl.clear(gl.COLOR_BUFFER_BIT);

        // 简单呼吸
        model.setParameterValueById('PARAM_BREATH', Math.sin(elapsedTime * 2) * 0.1);
        model.update();
        renderer.drawModel(model);

        animationId = requestAnimationFrame(draw);
      };
      draw();
    };

    // 加载纹理
    async function loadTexture(gl: WebGLRenderingContext, url: string) {
      return new Promise<WebGLTexture | null>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const tex = gl.createTexture()!;
          gl.bindTexture(gl.TEXTURE_2D, tex);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
          resolve(tex);
        };
        img.onerror = () => resolve(null);
        img.src = url;
      });
    }

    return () => {
      clearInterval(checkSDK);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          background: 'transparent',
        }}
      />
      <div style={{
        position: 'absolute',
        bottom: 8,
        left: 8,
        color: '#fff',
        fontSize: 12,
        background: 'rgba(0,0,0,0.5)',
        padding: '4px 8px',
        borderRadius: 4,
      }}>
        {tip}
      </div>
    </div>
  );
}