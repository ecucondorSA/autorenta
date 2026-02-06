import { Composition } from 'remotion';
import { CarPromo } from './compositions/CarPromo';

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
    </>
  );
};
