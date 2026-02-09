import { Pipe, PipeTransform } from '@angular/core';
import {
  VehicleDocumentKind,
  VehicleDocumentStatus,
} from '@core/services/verification/vehicle-documents.service';

@Pipe({
  name: 'documentKindLabel',
  standalone: true,
  pure: true,
})
export class DocumentKindLabelPipe implements PipeTransform {
  private readonly labels: Record<VehicleDocumentKind, string> = {
    registration: 'Cédula Verde / Título',
    insurance: 'Póliza de Seguro',
    technical_inspection: 'Revisión Técnica (VTV)',
    circulation_permit: 'Permiso de Circulación',
    ownership_proof: 'Comprobante de Titularidad',
  };

  transform(kind: VehicleDocumentKind): string {
    return this.labels[kind] || kind;
  }
}

@Pipe({
  name: 'documentStatusLabel',
  standalone: true,
  pure: true,
})
export class DocumentStatusLabelPipe implements PipeTransform {
  private readonly labels: Record<VehicleDocumentStatus, string> = {
    pending: 'Pendiente de Verificación',
    verified: 'Verificado',
    rejected: 'Rechazado',
  };

  transform(status: VehicleDocumentStatus | undefined | null): string {
    return this.labels[status || 'pending'] || 'Pendiente';
  }
}

@Pipe({
  name: 'documentKindIcon',
  standalone: true,
  pure: true,
})
export class DocumentKindIconPipe implements PipeTransform {
  private readonly icons: Record<VehicleDocumentKind, string> = {
    registration: '📋',
    insurance: '🛡️',
    technical_inspection: '🔧',
    circulation_permit: '🚦',
    ownership_proof: '📄',
  };

  transform(kind: VehicleDocumentKind): string {
    return this.icons[kind] || '📄';
  }
}
@Pipe({
  name: 'documentStatusColor',
  standalone: true,
  pure: true,
})
export class DocumentStatusColorPipe implements PipeTransform {
  private readonly colors: Record<string, string> = {
    pending: 'status-pending',
    verified: 'status-verified',
    rejected: 'status-rejected',
  };

  transform(status: VehicleDocumentStatus | string | undefined | null): string {
    return this.colors[status || 'pending'] || 'status-pending';
  }
}
