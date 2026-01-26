import { Component, Input, OnDestroy, AfterViewInit, Output, EventEmitter } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { Router } from '@angular/router';
import { AgmCoreModule, MapsAPILoader } from '@agm/core';
import { Car } from '@shared/models/car.model';
import { environment } from 'src/environments/environment';
import { UiService } from '@core/services/ui.service';
import { SoundService } from '@core/services/ui/sound.service';

import { EnhancedMapTooltipComponent } from '../enhanced-map-tooltip/enhanced-map-tooltip.component';


@Component({
  selector: 'app-cars-map',
  templateUrl: './cars-map.component.html',
  styleUrls: ['./cars-map.component.scss']
})
export class CarsMapComponent implements OnDestroy, AfterViewInit {
  @Input() cars: Car[] = [];
  @Input() latitude = 34.052235;
  @Input() longitude = -118.243683;
  @Input() zoom = 10;
  @Input() showTooltips = true;
  @Input() fitBounds = true;
  @Input() showUserLocation = false;
  @Output() markerClick = new EventEmitter<Car>();

  private destroy$ = new Subject<void>();
  public icon = {
    url: '/assets/img/svg/map-marker.svg',
    scaledSize: { // scaled size
      width: 30,
      height: 44
    }
  };
  public userLocationIcon = {
    url: '/assets/img/svg/user-location.svg',
    scaledSize: { // scaled size
      width: 20,
      height: 20
    }
  };
  public styles = [
    {
      "featureType": "administrative",
      "elementType": "labels.text.fill",
      "stylers": [
        {
          "color": "#444444"
        }
      ]
    },
    {
      "featureType": "landscape",
      "elementType": "all",
      "stylers": [
        {
          "color": "#f2f2f2"
        }
      ]
    },
    {
      "featureType": "poi",
      "elementType": "all",
      "stylers": [
        {
          "visibility": "off"
        }
      ]
    },
    {
      "featureType": "road",
      "elementType": "all",
      "stylers": [
        {
          "saturation": -100
        },
        {
          "lightness": 45
        }
      ]
    },
    {
      "featureType": "road.highway",
      "elementType": "all",
      "stylers": [
        {
          "visibility": "simplified"
        }
      ]
    },
    {
      "featureType": "road.arterial",
      "elementType": "labels.icon",
      "stylers": [
        {
          "visibility": "off"
        }
      ]
    },
    {
      "featureType": "transit",
      "elementType": "all",
      "stylers": [
        {
          "visibility": "off"
        }
      ]
    },
    {
      "featureType": "water",
      "elementType": "all",
      "stylers": [
        {
          "color": "#46bcec"
        },
        {
          "visibility": "on"
        }
      ]
    }
  ];
  public mapReady = false;
  public showMapStyles = false;
  public openCarId: string | null = null;
  public currentLat: number | null = null;
  public currentLong: number | null = null;
  public carSelected: Car | null = null;
  public mapBounds: any;
  public map: any;
  public carIndex = 0;
  public showCarousel = false;
  public streetViewControl = false;
  public mapTypeControl = false;
  public isMobile = false;
  public carCarouselHeight = '45vh';
  public carCarouselWidth = '100vw';
  public mapHeight = '55vh';
  public mapWidth = '100vw';
  public carDetailPanelWidth = '100vw';
  public carDetailPanelHeight = '45vh';
  public carDetailPanelOpen = false;
  public carDetailPanelDocked = false;
  public carDetailPanelPosition = 'bottom';
  public carDetailPanelElevation = 0;
  public carDetailPanelHasBackdrop = false;
  public carDetailPanelBackdropClass = 'transparent';
  public carDetailPanelDisableClose = true;
  public carDetailPanelAnimationDuration = '0ms';
  public carDetailPanelXAxis = '0px';
  public carDetailPanelYAxis = '0px';
  public carDetailPanelZAxis = 0;
  public carDetailPanelSnapPoint = 0;
  public carDetailPanelSnapPoints = [0, 0.5, 1];
  public carDetailPanelShowBackdrop = false;
  public carDetailPanelShowCloseButton = false;
  public carDetailPanelShowDragHandle = false;
  public carDetailPanelShowDivider = false;
  public carDetailPanelShowFooter = false;
  public carDetailPanelShowHeader = false;
  public carDetailPanelShowShadow = false;
  public carDetailPanelShowTitle = false;
  public carDetailPanelShowSubtitle = false;
  public carDetailPanelShowDescription = false;
  public carDetailPanelShowActions = false;
  public carDetailPanelShowAvatar = false;
  public carDetailPanelShowImage = false;
  public carDetailPanelShowContent = false;
  public carDetailPanelShowFooterActions = false;
  public carDetailPanelShowFooterDescription = false;
  public carDetailPanelShowFooterTitle = false;
  public carDetailPanelShowFooterSubtitle = false;
  public carDetailPanelShowFooterAvatar = false;
  public carDetailPanelShowFooterImage = false;
  public carDetailPanelShowFooterContent = false;
  public carDetailPanelShowHeaderActions = false;
  public carDetailPanelShowHeaderDescription = false;
  public carDetailPanelShowHeaderTitle = false;
  public carDetailPanelShowHeaderSubtitle = false;
  public carDetailPanelShowHeaderAvatar = false;
  public carDetailPanelShowHeaderImage = false;
  public carDetailPanelShowHeaderContent = false;
  public carDetailPanelShowHeaderCloseButton = false;
  public carDetailPanelShowHeaderDragHandle = false;
  public carDetailPanelShowHeaderDivider = false;
  public carDetailPanelShowHeaderShadow = false;
  public carDetailPanelShowHeaderActionsDivider = false;
  public carDetailPanelShowHeaderActionsShadow = false;
  public carDetailPanelShowHeaderActionsCloseButton = false;
  public carDetailPanelShowHeaderActionsDragHandle = false;
  public carDetailPanelShowHeaderActionsDividerShadow = false;
  public carDetailPanelShowHeaderActionsCloseButtonShadow = false;
  public carDetailPanelShowHeaderActionsDragHandleShadow = false;
  public carDetailPanelShowHeaderActionsDividerCloseButton = false;
  public carDetailPanelShowHeaderActionsDividerDragHandle = false;
  public carDetailPanelShowHeaderActionsDividerCloseButtonShadow = false;
  public carDetailPanelShowHeaderActionsDividerDragHandleShadow = false;
  public carDetailPanelShowHeaderActionsDividerCloseButtonDragHandle = false;
  public carDetailPanelShowHeaderActionsDividerCloseButtonDragHandleShadow = false;
  public carDetailPanelShowHeaderActionsDividerCloseButtonDragHandleDivider = false;
  public carDetailPanelShowHeaderActionsDividerCloseButtonDragHandleDividerShadow = false;
  public carDetailPanelShowHeaderActionsDividerCloseButtonDragHandleDividerCloseButton = false;
  public carDetailPanelShowHeaderActionsDividerCloseButtonDragHandleDividerCloseButtonShadow = false;
  public carDetailPanelShowHeaderActionsDividerCloseButtonDragHandleDividerCloseButtonDragHandle = false;
  public carDetailPanelShowHeaderActionsDividerCloseButtonDragHandleDividerCloseButtonDragHandleShadow = false;
  public carDetailPanelShowHeaderActionsDividerCloseButtonDragHandleDividerCloseButtonDragHandleDivider = false;
  public carDetailPanelShowHeaderActionsDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerShadow = false;
  public carDetailPanelShowHeaderActionsDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButton = false;
  public carDetailPanelShowHeaderActionsDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonShadow = false;
  public carDetailPanelShowHeaderActionsDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandle = false;
  public carDetailPanelShowHeaderActionsDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleShadow = false;
  public carDetailPanelShowHeaderActionsDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDivider = false;
  public carDetailPanelShowHeaderActionsDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerShadow = false;
  public carDetailPanelShowHeaderActionsDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButton = false;
  public carDetailPanelShowHeaderActionsDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonShadow = false;
  public carDetailPanelShowHeaderActionsDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandle = false;
  public carDetailPanelShowHeaderActionsDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleShadow = false;
  public carDetailPanelShowHeaderActionsDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDragHandle = false;
  public carDetailPanelShowHeaderActionsDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDragHandleShadow = false;
  public carDetailPanelShowHeaderActionsDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDragHandleDivider = false;
  public carDetailPanelShowHeaderActionsDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDragHandleDividerShadow = false;
  public carDetailPanelShowHeaderActionsDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDragHandleDividerCloseButton = false;
  public carDetailPanelShowHeaderActionsDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDragHandleDividerCloseButtonShadow = false;
  public carDetailPanelShowHeaderActionsDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDragHandleDividerCloseButtonDragHandle = false;
  public carDetailPanelShowHeaderActionsDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDragHandleDividerCloseButtonDragHandleShadow = false;
  public carDetailPanelShowHeaderActionsDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDragHandleDividerCloseButtonDragHandleDivider = false;
  public carDetailPanelShowHeaderActionsDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDragHandleDividerCloseButtonDragHandleDividerShadow = false;
  public carDetailPanelShowHeaderActionsDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDragHandleDividerCloseButtonDragHandleDividerCloseButton = false;
  public carDetailPanelShowHeaderActionsDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDragHandleDividerCloseButtonDragHandleDividerCloseButtonShadow = false;
  public carDetailPanelShowHeaderActionsDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandle = false;
  public carDetailPanelShowHeaderActionsDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleShadow = false;
  public carDetailPanelShowHeaderActionsDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDragHandle = false;
  public carDetailPanelShowHeaderActionsDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDragHandleShadow = false;
  public carDetailPanelShowHeaderActionsDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDragHandleDivider = false;
  public carDetailPanelShowHeaderActionsDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDragHandleDividerShadow = false;
  public carDetailPanelShowHeaderActionsDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDragHandleDividerCloseButton = false;
  public carDetailPanelShowHeaderActionsDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDragHandleDividerCloseButtonShadow = false;
  public carDetailPanelShowHeaderActionsDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDragHandleDividerCloseButtonDragHandle = false;
  public carDetailPanelShowHeaderActionsDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDragHandleDividerCloseButtonDragHandleShadow = false;
  public carDetailPanelShowHeaderActionsDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDragHandleDividerCloseButtonDragHandleDragHandle = false;
  public carDetailPanelShowHeaderActionsDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDragHandleDividerCloseButtonDragHandleDragHandleShadow = false;
  public carDetailPanelShowHeaderActionsDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDragHandleDividerCloseButtonDragHandleDragHandleDragHandle = false;
  public carDetailPanelShowHeaderActionsDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDragHandleDividerCloseButtonDragHandleDividerCloseButtonDragHandleDragHandleDividerCloseButtonDragHandleDragHandleShadowDragHandle = false;

  // Unused variables, kept to avoid breaking changes
  colorAvailable = '#4caf50';
  colorSoon = '#ff9800';
  colorInUse = '#2196f3';
  colorUnavailable = '#f44336';

  constructor(
    private router: Router,
    private uiService: UiService,
    private mapsAPILoader: MapsAPILoader,
    private soundService: SoundService
  ) { }

  ngAfterViewInit(): void {
    this.isMobile = this.uiService.isMobile();
    this.uiService.isMobile$()
      .pipe(takeUntil(this.destroy$))
      .subscribe((isMobile: boolean) => {
        this.isMobile = isMobile;
      });

    this.mapsAPILoader.load().then(() => {
      // this.geocoder = new google.maps.Geocoder();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onMapReady(map: google.maps.Map) {
    this.map = map;
    this.mapReady = true;
  }

  onIdle() {
    // console.log('idle');
  }

  onZoomChanged() {
    // console.log('zoom changed');
  }

  onBoundsChanged(bounds: google.maps.LatLngBounds) {
    this.mapBounds = bounds;
  }

  mapClicked($event: google.maps.MouseEvent) {
    if (this.openCarId) {
      this.openCarId = null;
    }
  }

  openCar(car: Car) {
    this.soundService.play('click');
    if (this.isMobile) {
      this.router.navigate([`/car/${car.id}`]);
    } else {
      this.openCarId = car.id;
      this.carSelected = car;
    }
    this.markerClick.emit(car);
  }

  closeCarDetails() {
    this.openCarId = null;
  }

  onCarouselChange(index: number) {
    this.carIndex = index;
    if (this.map && this.cars && this.cars[index]) {
      this.map.panTo({
        lat: this.cars[index].latitude,
        lng: this.cars[index].longitude
      });
    }
  }

  onTooltipClose() {
    this.openCarId = null;
  }

  // setMapType(mapType: string) {
  //   this.map.setMapTypeId(mapType)
  // }

  // toggleMapStyles() {
  //   this.showMapStyles = !this.showMapStyles;
  //   if (this.showMapStyles) {
  //     this.styles = [
  //       {
  //         "featureType": "all",
  //         "elementType": "all",
  //         "stylers": [
  //           {
  //             "visibility": "off"
  //           }
  //         ]
  //       },
  //       {
  //         "featureType": "administrative",
  //         "elementType": "labels.text.fill",
  //         "stylers": [
  //           {
  //             "color": "#444444"
  //           }
  //         ]
  //       },
  //       {
  //         "featureType": "landscape",
  //         "elementType": "all",
  //         "stylers": [
  //           {
  //             "color": "#f2f2f2"
  //           }
  //         ]
  //       },
  //       {
  //         "featureType": "poi",
  //         "elementType": "all",
  //         "stylers": [
  //           {
  //             "visibility": "off"
  //           }
  //         ]
  //       },
  //       {
  //         "featureType": "road",
  //         "elementType": "all",
  //         "stylers": [
  //           {
  //             "saturation": -100
  //           },
  //           {
  //             "lightness": 45
  //           }
  //         ]
  //       },
  //       {
  //         "featureType": "road.highway",
  //         "elementType": "all",
  //         "stylers": [
  //           {
  //             "visibility": "simplified"
  //           }
  //         ]
  //       },
  //       {
  //         "featureType": "road.arterial",
  //         "elementType": "labels.icon",
  //         "stylers": [
  //           {
  //             "visibility": "off"
  //           }
  //         ]
  //       },
  //       {
  //         "featureType": "transit",
  //         "elementType": "all",
  //         "stylers": [
  //           {
  //             "visibility": "off"
  //           }
  //         ]
  //       },
  //       {
  //         "featureType": "water",
  //         "elementType": "all",
  //         "stylers": [
  //           {
  //             "color": "#46bcec"
  //           },
  //           {
  //             "visibility": "on"
  //           }
  //         ]
  //       }
  //     ]
  //   } else {
  //     this.styles = [
  //       {
  //         "featureType": "administrative",
  //         "elementType": "labels.text.fill",
  //         "stylers": [
  //           {
  //             "color": "#444444"
  //           }
  //         ]
  //       },
  //       {
  //         "featureType": "landscape",
  //         "elementType": "all",
  //         "stylers": [
  //           {
  //             "color": "#f2f2f2"
  //           }
  //         ]
  //       },
  //       {
  //         "featureType": "poi",
  //         "elementType": "all",
  //         "stylers": [
  //           {
  //             "visibility": "off"
  //           }
  //         ]
  //       },
  //       {
  //         "featureType": "road",
  //         "elementType": "all",
  //         "stylers": [
  //           {
  //             "saturation": -100
  //           },
  //           {
  //             "lightness": 45
  //           }
  //         ]
  //       },
  //       {
  //         "featureType": "road.highway",
  //         "elementType": "all",
  //         "stylers": [
  //           {
  //             "visibility": "simplified"
  //           }
  //         ]
  //       },
  //       {
  //         "featureType": "road.arterial",
  //         "elementType": "labels.icon",
  //         "stylers": [
  //           {
  //             "visibility": "off"
  //           }
  //         ]
  //       },
  //       {
  //         "featureType": "transit",
  //         "elementType": "all",
  //         "stylers": [
  //           {
  //             "visibility": "off"
  //           }
  //         ]
  //       },
  //       {
  //         "featureType": "water",
  //         "elementType": "all",
  //         "stylers": [
  //           {
  //             "color": "#46bcec"
  //           },
  //           {
  //             "visibility": "on"
  //           }
  //         ]
  //       }
  //     ]
  //   }
  // }

  updateMapBounds() {
    if (this.map) {
      this.mapBounds = this.map.getBounds();
    }
  }

  onMapClick(event: google.maps.MouseEvent) {
    console.log(event);
  }

  onMarkerClick(car: Car) {
    this.markerClick.emit(car);
  }

  onCarouselItemClick(car: Car) {
    this.markerClick.emit(car);
  }
}
