import { Composition } from 'remotion';
import { CarPromo } from './compositions/CarPromo';
import { CarPromoV2 } from './compositions/CarPromoV2';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="CarPromo"
        component={CarPromo}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          carName: 'Toyota Corolla 2024',
          pricePerDay: 15000,
          imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4',
        }}
      />
      <Composition
        id="CarPromoV2"
        component={CarPromoV2}
        durationInFrames={150} // 5 seconds at 30fps
        fps={30}
        width={1080}
        height={1920} // 9:16 Vertical Video (Reels/TikTok)
        defaultProps={{
          carName: 'Porsche 911 GT3',
          pricePerDay: 450000,
          imageUrl: 'https://images.unsplash.com/photo-1503376763036-066120622c74',
        }}
      />
    </>
  );
};