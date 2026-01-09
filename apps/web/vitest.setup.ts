import 'zone.js';
import 'zone.js/testing';
import { getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { vi } from 'vitest';

// Mock @ionic/angular to avoid ESM resolution issues
vi.mock('@ionic/angular', () => ({
  IonicModule: {
    forRoot: vi.fn().mockReturnValue({ ngModule: {} }),
  },
  AlertController: vi.fn().mockImplementation(() => ({
    create: vi.fn().mockResolvedValue({
      present: vi.fn(),
      onDidDismiss: vi.fn().mockResolvedValue({ role: 'cancel' }),
    }),
  })),
  ModalController: vi.fn().mockImplementation(() => ({
    create: vi.fn().mockResolvedValue({
      present: vi.fn(),
      onDidDismiss: vi.fn().mockResolvedValue({ data: null }),
    }),
  })),
  ToastController: vi.fn().mockImplementation(() => ({
    create: vi.fn().mockResolvedValue({ present: vi.fn() }),
  })),
  LoadingController: vi.fn().mockImplementation(() => ({
    create: vi.fn().mockResolvedValue({ present: vi.fn(), dismiss: vi.fn() }),
  })),
  Platform: vi.fn().mockImplementation(() => ({
    is: vi.fn().mockReturnValue(false),
    ready: vi.fn().mockResolvedValue(true),
  })),
  NavController: vi.fn().mockImplementation(() => ({
    navigateForward: vi.fn(),
    navigateBack: vi.fn(),
    navigateRoot: vi.fn(),
  })),
}));

// Mock @ionic/angular/standalone
vi.mock('@ionic/angular/standalone', () => ({
  IonIcon: {},
  IonButton: {},
  IonContent: {},
  IonHeader: {},
  IonToolbar: {},
  IonTitle: {},
  IonButtons: {},
  IonBackButton: {},
  IonInput: {},
  IonItem: {},
  IonLabel: {},
  IonList: {},
  IonCard: {},
  IonCardContent: {},
  IonCardHeader: {},
  IonCardTitle: {},
  IonSpinner: {},
  IonRefresher: {},
  IonRefresherContent: {},
  IonAvatar: {},
  IonThumbnail: {},
  IonBadge: {},
  IonChip: {},
  IonSegment: {},
  IonSegmentButton: {},
  IonToggle: {},
  IonCheckbox: {},
  IonRadio: {},
  IonRadioGroup: {},
  IonSelect: {},
  IonSelectOption: {},
  IonTextarea: {},
  IonDatetime: {},
  IonRange: {},
  IonNote: {},
  IonText: {},
  IonGrid: {},
  IonRow: {},
  IonCol: {},
  IonImg: {},
  IonSlides: {},
  IonSlide: {},
  IonTabs: {},
  IonTabBar: {},
  IonTabButton: {},
  IonFab: {},
  IonFabButton: {},
  IonFabList: {},
  IonSearchbar: {},
  IonInfiniteScroll: {},
  IonInfiniteScrollContent: {},
  IonSkeletonText: {},
  IonProgressBar: {},
  IonRippleEffect: {},
  IonModal: {},
  IonPopover: {},
  IonActionSheet: {},
  IonToast: {},
  IonLoading: {},
  IonAlert: {},
  IonPicker: {},
  IonNav: {},
  IonRouterOutlet: {},
  IonMenu: {},
  IonMenuButton: {},
  IonMenuToggle: {},
  IonSplitPane: {},
  IonApp: {},
  IonPage: {},
  IonFooter: {},
  IonAccordion: {},
  IonAccordionGroup: {},
  IonItemDivider: {},
  IonItemGroup: {},
  IonItemSliding: {},
  IonItemOption: {},
  IonItemOptions: {},
  IonReorder: {},
  IonReorderGroup: {},
  IonVirtualScroll: {},
}));

// Mock ionicons
vi.mock('ionicons', () => ({
  addIcons: vi.fn(),
}));

vi.mock('ionicons/icons', () => ({
  timeOutline: 'time-outline',
  checkmarkCircleOutline: 'checkmark-circle-outline',
  carSportOutline: 'car-sport-outline',
  flagOutline: 'flag-outline',
  closeCircleOutline: 'close-circle-outline',
  hourglassOutline: 'hourglass-outline',
  alertCircleOutline: 'alert-circle-outline',
  cardOutline: 'card-outline',
  searchOutline: 'search-outline',
  hammerOutline: 'hammer-outline',
  helpCircle: 'help-circle',
  arrowBackOutline: 'arrow-back-outline',
  arrowBack: 'arrow-back',
  documentTextOutline: 'document-text-outline',
  shieldCheckmarkOutline: 'shield-checkmark-outline',
  gitCompareOutline: 'git-compare-outline',
  warningOutline: 'warning-outline',
  chevronForward: 'chevron-forward',
  receiptOutline: 'receipt-outline',
  chatbubbleEllipsesOutline: 'chatbubble-ellipses-outline',
  arrowForward: 'arrow-forward',
  checkmarkDoneOutline: 'checkmark-done-outline',
  sparkles: 'sparkles',
  informationCircle: 'information-circle',
  alertCircle: 'alert-circle',
  closeCircle: 'close-circle',
  checkmarkCircle: 'checkmark-circle',
  mapOutline: 'map-outline',
  locationOutline: 'location-outline',
  calendarOutline: 'calendar-outline',
  idCardOutline: 'id-card-outline',
  carOutline: 'car-outline',
}));

const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
}
