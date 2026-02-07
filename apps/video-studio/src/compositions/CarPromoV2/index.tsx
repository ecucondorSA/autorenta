import React from 'react';
import {
	AbsoluteFill,
	Img,
	interpolate,
	spring,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';

// --- Schema ---
interface CarPromoV2Props {
	carName: string;
	pricePerDay: number;
	imageUrl: string;
}

// --- Components ---

const KenBurns: React.FC<{
	src: string;
	className?: string;
}> = ({ src }) => {
	const frame = useCurrentFrame();
	const { durationInFrames } = useVideoConfig();

	// Zoom sutil de 1.0 a 1.15
	const scale = interpolate(frame, [0, durationInFrames], [1.05, 1.2], {
		extrapolateRight: 'clamp',
	});

	// Movimiento sutil lateral (Pan)
	const translate = interpolate(frame, [0, durationInFrames], [0, -20], {
		extrapolateRight: 'clamp',
	});

	return (
		<AbsoluteFill style={{ overflow: 'hidden', backgroundColor: '#000' }}>
			<Img
				src={src}
				style={{
					width: '100%',
					height: '100%',
					objectFit: 'cover',
					transform: `scale(${scale}) translateX(${translate}px)`,
				}}
			/>
		</AbsoluteFill>
	);
};

const AnimatedText: React.FC<{
	text: string;
	delay?: number;
	style?: React.CSSProperties;
	isPrice?: boolean;
}> = ({ text, delay = 0, style, isPrice = false }) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	const entrance = spring({
		frame: frame - delay,
		fps,
		config: {
			damping: 12, // Menos rebote, más "premium"
			mass: 0.8,
		},
	});

	// Slide from bottom + Opacity
	const translateY = interpolate(entrance, [0, 1], [40, 0]);
	const opacity = interpolate(entrance, [0, 1], [0, 1]);

	return (
		<div style={{ overflow: 'hidden', ...style }}>
			<div
				style={{
					transform: `translateY(${translateY}px)`,
					opacity,
					fontFamily: 'Inter, sans-serif',
					fontWeight: isPrice ? 800 : 600,
					color: isPrice ? '#4ade80' : '#ffffff', // Green for price, white for text
                    textShadow: '0 4px 20px rgba(0,0,0,0.5)',
				}}
			>
				{text}
			</div>
		</div>
	);
};

const OverlayGradient = () => (
	<AbsoluteFill
		style={{
			background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 50%)',
		}}
	/>
);

const LogoWatermark = () => {
    return (
        <div style={{
            position: 'absolute',
            top: 40,
            left: 40,
            color: '#ffffff',
            fontFamily: 'Inter, sans-serif',
            fontWeight: 700,
            letterSpacing: '-1px',
            fontSize: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            opacity: 0.9
        }}>
            <div style={{
                width: 12,
                height: 12,
                backgroundColor: '#ef4444', // Red accent
                borderRadius: '50%'
            }} />
            AUTORENTA
        </div>
    )
}

// --- Main Composition ---

export const CarPromoV2: React.FC<CarPromoV2Props> = ({
	carName,
	pricePerDay,
	imageUrl,
}) => {
    // Fade in general para suavizar la entrada
    const frame = useCurrentFrame();
    const opacity = interpolate(frame, [0, 10], [0, 1]);

	return (
		<AbsoluteFill style={{ backgroundColor: '#111', opacity }}>
			{/* Layer 1: Background Image with Ken Burns */}
			<KenBurns src={imageUrl} />

			{/* Layer 2: Gradient Overlay for readability */}
			<OverlayGradient />

			{/* Layer 3: Content */}
			<AbsoluteFill
				style={{
					justifyContent: 'flex-end',
					padding: 60,
					paddingBottom: 100,
				}}
			>
				<AnimatedText
					text={carName}
					delay={10}
					style={{
						fontSize: 80,
						lineHeight: 1,
						marginBottom: 20,
                        textTransform: 'uppercase',
                        letterSpacing: '-2px'
					}}
				/>
				
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <AnimatedText
                        text="Desde"
                        delay={15}
                        style={{
                            fontSize: 30,
                            color: '#ccc',
                            fontWeight: 400
                        }}
                    />
                    <AnimatedText
                        text={`$${pricePerDay.toLocaleString('es-AR')}`}
                        delay={20}
                        isPrice
                        style={{
                            fontSize: 60,
                        }}
                    />
                    <AnimatedText
                        text="/día"
                        delay={25}
                        style={{
                            fontSize: 30,
                            color: '#ccc',
                            fontWeight: 400
                        }}
                    />
                </div>
			</AbsoluteFill>

            {/* Layer 4: Branding */}
            <LogoWatermark />
		</AbsoluteFill>
	);
};