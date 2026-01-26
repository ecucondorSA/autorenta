import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'ar-car-carousel',
  templateUrl: './car-carousel.component.html',
  styleUrls: ['./car-carousel.component.scss']
})
export class CarCarouselComponent implements OnChanges {
  @Input() images: string[] = [];
  public carImageBaseUrl = environment.apiBaseUrl + '/cars';
  public sliderImages: any[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['images'] && changes['images'].currentValue) {
      this.sliderImages = this.images.map((image) => {
        return {
          image: `${this.carImageBaseUrl}/${image}`,
          thumbImage: `${this.carImageBaseUrl}/${image}`,
          alt: 'car image',
          title: 'car image'
        };
      });
    }
  }

  constructor() { }

}
