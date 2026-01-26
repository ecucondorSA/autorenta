import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, IonContent } from '@ionic/angular/standalone';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { Subject, takeUntil } from 'rxjs';

import { AiPhotoGeneratorComponent } from '../../../shared/components/ai-photo-generator/ai-photo-generator.component';
import { HoverLiftDirective } from '../../../shared/directives/hover-lift.directive';
import { VisualSelectorComponent } from './components/visual-selector/visual-selector.component';

import { addOutline, cloudUploadOutline, imageOutline, locateOutline, trashOutline } from 'ionicons/icons';
import { addIcons } from 'ionicons';

@Component({
  selector: 'app-publish-car-v2',
  templateUrl: './publish-car-v2.page.html',
  styleUrls: ['./publish-car-v2.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, AiPhotoGeneratorComponent, VisualSelectorComponent, HoverLiftDirective],
})
export class PublishCarV2Page implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(IonContent) content!: IonContent;
  @ViewChild('map') mapRef!: ElementRef;

  private destroy$ = new Subject<void>();

  ngOnInit() {
    addIcons({
      'add-outline': addOutline,
      'cloud-upload-outline': cloudUploadOutline,
      'image-outline': imageOutline,
      'locate-outline': locateOutline,
      'trash-outline': trashOutline,
    });
  }

  ngAfterViewInit(): void {
    // this.initMap();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // async initMap() {
  //   const singapore = { lat: 1.3521, lng: 103.8198 };
  //   const map = new google.maps.Map(this.mapRef.nativeElement, {
  //     center: singapore,
  //     zoom: 12,
  //   });

  //   const marker = new google.maps.Marker({
  //     position: singapore,
  //     map,
  //     title: "Singapore",
  //   });
  // }

  currentImage: any;

  async takePicture() {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: true,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
    });

    this.currentImage = image.dataUrl;
  }

  async getLocation() {
    const coordinates = await Geolocation.getCurrentPosition();

    console.log('Current position:', coordinates);
  }

  aiResult = [
    {
      url: 'https://lexica-serve-encoded.usercontent.lexica.art/md/f299b794-54c4-4494-a94a-853599a39531',
    },
    {
      url: 'https://lexica-serve-encoded.usercontent.lexica.art/md/639354d3-592c-4797-85a3-49ca4393949a',
    },
    {
      url: 'https://lexica-serve-encoded.usercontent.lexica.art/md/acaf5741-5591-48d1-b4f5-3560c79f1494',
    },
  ];

  scrollToBottom() {
    this.content.scrollToBottom(500);
  }
}
