import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Img } from 'remotion';

export interface CarPromoProps {
  carName: string;
  pricePerDay: number;
  imageUrl: string;
}

export const CarPromo: React.FC<CarPromoProps> = ({ carName, pricePerDay, imageUrl }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Fade in animation
  const opacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Zoom effect for background
  const scale = interpolate(frame, [0, 150], [1, 1.1]);

  return (
    <AbsoluteFill style={{ backgroundColor: 'black' }}>
      <AbsoluteFill style={{ opacity, transform: `scale(${scale})` }}>
        <Img
          src={imageUrl}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
        {/* Gradient Overlay */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '50%',
            background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)',
          }}
        />
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          padding: 60,
          opacity,
        }}
      >
        <h1
          style={{
            fontFamily: 'Satoshi, sans-serif',
            fontSize: 80,
            color: 'white',
            margin: 0,
            fontWeight: 900,
            lineHeight: 1.1,
            textShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}
        >
          {carName}
        </h1>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            marginTop: 20,
          }}
        >
          <div
            style={{
              backgroundColor: '#00D95F', // AutoRenta Neon Green
              padding: '10px 24px',
              borderRadius: 50,
              fontSize: 40,
              fontWeight: 'bold',
              color: 'black',
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            ${pricePerDay}
          </div>
          <span
            style={{
              color: 'white',
              fontSize: 30,
              fontFamily: 'Satoshi, sans-serif',
              fontWeight: 500,
            }}
          >
            / día
          </span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
