import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable, tap } from 'rxjs';
import { Security } from '../../../../../../core/models/security.model';
import { environment } from '../../../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SecurityService {
  private _securityMissions = new BehaviorSubject<Security[]>([]);
  securityMissions$ = this._securityMissions.asObservable();
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getAllSecurityMission(): Observable<Security[]> {
    return this.http.get<Security[]>(`${this.apiUrl}/security`).pipe(
      tap((data) => {
        this._securityMissions.next(data);
      })
    );
  }

  getSecurityMissionById(id: string): Observable<Security> {
    return this.http.get<Security>(`${this.apiUrl}/security/${id}`);
  }

  createSecurityMission(security: Security): Observable<Security> {
    return this.http.post<Security>(`${this.apiUrl}/security`, security);
  }

  updateSecurityMission(security: Security): Observable<Security> {
    return this.http.put<Security>(`${this.apiUrl}/security/${security.id}`, security);
  }

  deleteSecurityMission(id: string): Observable<Security> {
    return this.http.delete<Security>(`${this.apiUrl}/security/${id}`);
  }

  getSecurityMissionByCarId(carId: string): Observable<Security[]> {
    return this.http.get<Security[]>(`${this.apiUrl}/security`).pipe(
      map((securityMissions) =>
        securityMissions.filter((securityMission) => securityMission.carId === carId)
      )
    );
  }

  startSecurityMission(id: string, body: unknown): Observable<unknown> {
    return this.http.post<unknown>(`${this.apiUrl}/security/${id}/start`, body);
  }

  stopSecurityMission(id: string): Observable<unknown> {
    return this.http.post<unknown>(`${this.apiUrl}/security/${id}/stop`, {});
  }

  pauseSecurityMission(id: string): Observable<Security> {
    return this.http.post<Security>(`${this.apiUrl}/security/${id}/pause`, {});
  }

  resumeSecurityMission(id: string): Observable<Security> {
    return this.http.post<Security>(`${this.apiUrl}/security/${id}/resume`, {});
  }

  sendSecurityMissionReport(id: string): Observable<Security> {
    return this.http.post<Security>(`${this.apiUrl}/security/${id}/report`, {});
  }

  addAttachment(id: string, file: File): Observable<unknown> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<unknown>(`${this.apiUrl}/security/${id}/attachment`, formData);
  }

  getAttachments(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/attachment`);
  }

  deleteAttachment(id: string, attachmentId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/security/${id}/attachment/${attachmentId}`);
  }

  sendSecurityMissionNotification(id: string, message: string): Observable<Security> {
    return this.http.post<Security>(`${this.apiUrl}/security/${id}/notification`, { message });
  }

  sendSecurityMissionSms(id: string, phone: string, message: string): Observable<Security> {
    return this.http.post<Security>(`${this.apiUrl}/security/${id}/sms`, { phone, message });
  }

  sendSecurityMissionEmail(id: string, email: string, message: string): Observable<Security> {
    return this.http.post<Security>(`${this.apiUrl}/security/${id}/email`, { email, message });
  }

  getSecurityMissionLogs(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/logs`);
  }

  getSecurityMissionStatistics(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/statistics`);
  }

  getSecurityMissionTimeline(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/timeline`);
  }

  getSecurityMissionMap(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/map`);
  }

  getSecurityMissionIncidents(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/incidents`);
  }

  getSecurityMissionTasks(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/tasks`);
  }

  getSecurityMissionAlerts(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/alerts`);
  }

  getSecurityMissionChat(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/chat`);
  }

  getSecurityMissionSettings(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/settings`);
  }

  updateSecurityMissionSettings(id: string, settings: any): Observable<Security> {
    return this.http.put<Security>(`${this.apiUrl}/security/${id}/settings`, settings);
  }

  getSecurityMissionBilling(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/billing`);
  }

  getSecurityMissionInvoices(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/invoices`);
  }

  getSecurityMissionPayments(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/payments`);
  }

  getSecurityMissionContracts(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/contracts`);
  }

  getSecurityMissionDocuments(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/documents`);
  }

  getSecurityMissionSupport(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/support`);
  }

  getSecurityMissionUpdates(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/updates`);
  }

  getSecurityMissionActivity(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/activity`);
  }

  getSecurityMissionNotes(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/notes`);
  }

  addSecurityMissionNote(id: string, note: string): Observable<Security> {
    return this.http.post<Security>(`${this.apiUrl}/security/${id}/notes`, { note });
  }

  getSecurityMissionChecklists(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/checklists`);
  }

  addSecurityMissionChecklist(id: string, checklist: string): Observable<Security> {
    return this.http.post<Security>(`${this.apiUrl}/security/${id}/checklists`, { checklist });
  }

  getSecurityMissionForms(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/forms`);
  }

  addSecurityMissionForm(id: string, form: string): Observable<Security> {
    return this.http.post<Security>(`${this.apiUrl}/security/${id}/forms`, { form });
  }

  getSecurityMissionContacts(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/contacts`);
  }

  addSecurityMissionContact(id: string, contact: string): Observable<Security> {
    return this.http.post<Security>(`${this.apiUrl}/security/${id}/contacts`, { contact });
  }

  getSecurityMissionVehicles(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/vehicles`);
  }

  addSecurityMissionVehicle(id: string, vehicle: string): Observable<Security> {
    return this.http.post<Security>(`${this.apiUrl}/security/${id}/vehicles`, { vehicle });
  }

  getSecurityMissionEquipment(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/equipment`);
  }

  addSecurityMissionEquipment(id: string, equipment: string): Observable<Security> {
    return this.http.post<Security>(`${this.apiUrl}/security/${id}/equipment`, { equipment });
  }

  getSecurityMissionPersonnel(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/personnel`);
  }

  addSecurityMissionPersonnel(id: string, personnel: string): Observable<Security> {
    return this.http.post<Security>(`${this.apiUrl}/security/${id}/personnel`, { personnel });
  }

  getSecurityMissionFinance(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/finance`);
  }

  getSecurityMissionFiles(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/files`);
  }

  addSecurityMissionFile(id: string, file: File): Observable<Security> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Security>(`${this.apiUrl}/security/${id}/files`, formData);
  }

  getSecurityMissionUpdatesList(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/updates-list`);
  }

  addSecurityMissionUpdatesList(id: string, updatesList: string): Observable<Security> {
    return this.http.post<Security>(`${this.apiUrl}/security/${id}/updates-list`, { updatesList });
  }

  getSecurityMissionBriefing(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/briefing`);
  }

  addSecurityMissionBriefing(id: string, briefing: string): Observable<Security> {
    return this.http.post<Security>(`${this.apiUrl}/security/${id}/briefing`, { briefing });
  }

  getSecurityMissionDebriefing(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/debriefing`);
  }

  addSecurityMissionDebriefing(id: string, debriefing: string): Observable<Security> {
    return this.http.post<Security>(`${this.apiUrl}/security/${id}/debriefing`, { debriefing });
  }

  getSecurityMissionRiskAssessment(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/risk-assessment`);
  }

  addSecurityMissionRiskAssessment(id: string, riskAssessment: string): Observable<Security> {
    return this.http.post<Security>(`${this.apiUrl}/security/${id}/risk-assessment`, { riskAssessment });
  }

  getSecurityMissionContingencyPlan(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/contingency-plan`);
  }

  addSecurityMissionContingencyPlan(id: string, contingencyPlan: string): Observable<Security> {
    return this.http.post<Security>(`${this.apiUrl}/security/${id}/contingency-plan`, { contingencyPlan });
  }

  getSecurityMissionInsurance(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/insurance`);
  }

  addSecurityMissionInsurance(id: string, insurance: string): Observable<Security> {
    return this.http.post<Security>(`${this.apiUrl}/security/${id}/insurance`, { insurance });
  }

  getSecurityMissionLegal(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/legal`);
  }

  addSecurityMissionLegal(id: string, legal: string): Observable<Security> {
    return this.http.post<Security>(`${this.apiUrl}/security/${id}/legal`, { legal });
  }

  getSecurityMissionCompliance(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/compliance`);
  }

  addSecurityMissionCompliance(id: string, compliance: string): Observable<Security> {
    return this.http.post<Security>(`${this.apiUrl}/security/${id}/compliance`, { compliance });
  }

  getSecurityMissionTraining(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/training`);
  }

  addSecurityMissionTraining(id: string, training: string): Observable<Security> {
    return this.http.post<Security>(`${this.apiUrl}/security/${id}/training`, { training });
  }

  getSecurityMissionDrills(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/drills`);
  }

  addSecurityMissionDrills(id: string, drills: string): Observable<Security> {
    return this.http.post<Security>(`${this.apiUrl}/security/${id}/drills`, { drills });
  }

  getSecurityMissionExercises(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/exercises`);
  }

  addSecurityMissionExercises(id: string, exercises: string): Observable<Security> {
    return this.http.post<Security>(`${this.apiUrl}/security/${id}/exercises`, { exercises });
  }

  getSecurityMissionLessonsLearned(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/lessons-learned`);
  }

  addSecurityMissionLessonsLearned(id: string, lessonsLearned: string): Observable<Security> {
    return this.http.post<Security>(`${this.apiUrl}/security/${id}/lessons-learned`, { lessonsLearned });
  }

  getSecurityMissionReviews(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/reviews`);
  }

  addSecurityMissionReview(id: string, review: string): Observable<Security> {
    return this.http.post<Security>(`${this.apiUrl}/security/${id}/reviews`, { review });
  }

  getSecurityMissionApprovals(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/approvals`);
  }

  addSecurityMissionApproval(id: string, approval: string): Observable<Security> {
    return this.http.post<Security>(`${this.apiUrl}/security/${id}/approvals`, { approval });
  }

  getSecurityMissionSignatures(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/signatures`);
  }

  addSecurityMissionSignature(id: string, signature: string): Observable<Security> {
    return this.http.post<Security>(`${this.apiUrl}/security/${id}/signatures`, { signature });
  }

  getSecurityMissionHistory(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/history`);
  }

  getSecurityMissionDependencies(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/dependencies`);
  }

  getSecurityMissionIntegration(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/integration`);
  }

  getSecurityMissionCommunication(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/communication`);
  }

  getSecurityMissionFeedback(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/feedback`);
  }

  getSecurityMissionStatus(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/status`);
  }

  getSecurityMissionProgress(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/progress`);
  }

  getSecurityMissionPerformance(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/performance`);
  }

  getSecurityMissionTrends(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/trends`);
  }

  getSecurityMissionAnomalies(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/anomalies`);
  }

  getSecurityMissionPredictions(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/predictions`);
  }

  getSecurityMissionRecommendations(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/recommendations`);
  }

  getSecurityMissionAutomation(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/automation`);
  }

  getSecurityMissionOrchestration(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/orchestration`);
  }

  getSecurityMissionResponse(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/response`);
  }

  getSecurityMissionRecovery(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/recovery`);
  }

  getSecurityMissionResilience(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/resilience`);
  }

  getSecurityMissionMetrics(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/metrics`);
  }

  getSecurityMissionReporting(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/reporting`);
  }

  getSecurityMissionVisualization(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/visualization`);
  }

  getSecurityMissionDashboard(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/dashboard`);
  }

  getSecurityMissionIntegrationWithOtherSystems(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/integration-with-other-systems`);
  }

  getSecurityMissionApi(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/api`);
  }

  getSecurityMissionMobileApp(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/mobile-app`);
  }

  getSecurityMissionCloudIntegration(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/cloud-integration`);
  }

  getSecurityMissionOnPremiseIntegration(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/on-premise-integration`);
  }

  getSecurityMissionHybridIntegration(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/hybrid-integration`);
  }

  getSecurityMissionThirdPartyIntegration(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/third-party-integration`);
  }

  getSecurityMissionCustomIntegration(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/custom-integration`);
  }

  getSecurityMissionDataSources(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/data-sources`);
  }

  getSecurityMissionDataAnalytics(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/data-analytics`);
  }

  getSecurityMissionDataVisualization(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/data-visualization`);
  }

  getSecurityMissionDataReporting(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/data-reporting`);
  }

  getSecurityMissionDataGovernance(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/data-governance`);
  }

  getSecurityMissionDataSecurity(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/data-security`);
  }

  getSecurityMissionDataPrivacy(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/data-privacy`);
  }

  getSecurityMissionDataCompliance(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/data-compliance`);
  }

  getSecurityMissionDataRetention(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/data-retention`);
  }

  getSecurityMissionDataDestruction(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/data-destruction`);
  }

  getSecurityMissionDataBackup(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/data-backup`);
  }

  getSecurityMissionDataRecovery(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/data-recovery`);
  }

  getSecurityMissionDataArchiving(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/data-archiving`);
  }

  getSecurityMissionDataAccessControl(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/data-access-control`);
  }

  getSecurityMissionDataEncryption(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/data-encryption`);
  }

  getSecurityMissionDataMasking(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/data-masking`);
  }

  getSecurityMissionDataTokenization(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/data-tokenization`);
  }

  getSecurityMissionDataRedaction(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/data-redaction`);
  }

  getSecurityMissionDataLossPrevention(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/data-loss-prevention`);
  }

  getSecurityMissionDataWatermarking(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/data-watermarking`);
  }

  getSecurityMissionDataAuditing(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/data-auditing`);
  }

  getSecurityMissionDataLineage(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/data-lineage`);
  }

  getSecurityMissionDataQuality(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/data-quality`);
  }

  getSecurityMissionDataValidation(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/data-validation`);
  }

  getSecurityMissionDataStandardization(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/data-standardization`);
  }

  getSecurityMissionDataEnrichment(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/data-enrichment`);
  }

  getSecurityMissionDataTransformation(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/data-transformation`);
  }

  getSecurityMissionDataIntegration(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/data-integration`);
  }

  getSecurityMissionDataMigration(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/data-migration`);
  }

  getSecurityMissionDataFederation(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/data-federation`);
  }

  getSecurityMissionDataVirtualization(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/data-virtualization`);
  }

  getSecurityMissionDataReplication(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/data-replication`);
  }

  getSecurityMissionDataDistribution(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/data-distribution`);
  }

  getSecurityMissionDataSharing(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/data-sharing`);
  }

  getSecurityMissionDataCollaboration(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/data-collaboration`);
  }

  getSecurityMissionDataMarketplace(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/data-marketplace`);
  }

  getSecurityMissionDataEcosystem(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/${id}/data-ecosystem`);
  }
}
