import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

interface SecurityData {
  /* define interface properties here */
}

@Injectable({
  providedIn: 'root',
})
export class SecurityService {
  // private environment = inject(EnvironmentService);
  // private carService = inject(CarService);
  // private toastService = inject(ToastService);
  // private photoService = inject(PhotoService);
  // private domSanitizer = inject(DomSanitizer);

  private _securityData = new BehaviorSubject<SecurityData | null>(null);
  securityData$ = this._securityData.asObservable();
  private apiUrl = '/api/security';
  constructor(private http: HttpClient) {}

  // Mock data for demonstration
  private mockSecurityData: SecurityData = {
    /* assign mock data here */
  };

  getSecurityData(): Observable<SecurityData> {
    // return this.http.get<SecurityData>(`${this.environment.apiURL}${this.apiUrl}`).pipe(
    return this.http.get<SecurityData>(`${this.apiUrl}`).pipe(
      tap((data) => {
        this._securityData.next(data);
      })
    );
  }

  getMockSecurityData(): Observable<SecurityData> {
    return new Observable<SecurityData>((observer) => {
      observer.next(this.mockSecurityData);
      observer.complete();
    }).pipe(
      tap((data) => {
        this._securityData.next(data);
      })
    );
  }

  // Example of a method that might use DomSanitizer to sanitize URLs
  // getSafeUrl(unsafeUrl: string): SafeUrl {
  //   return this.domSanitizer.bypassSecurityTrustUrl(unsafeUrl);
  // }

  // Example usage of other services (commented out to resolve unused variable warnings)
  // performSecurityCheck(): void {
  //   this.carService.getAllCars().subscribe(cars => {
  //     if (cars.length === 0) {
  //       this.toastService.showError('No cars found!');
  //     }
  //   });
  // }

  uploadFile(file: File): Observable<any> {
    const formData: FormData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post('/api/upload', formData);
  }

  analyzeImage(imageUrl: string): Observable<any> {
    return this.http.post('/api/analyze', { imageUrl });
  }
}
