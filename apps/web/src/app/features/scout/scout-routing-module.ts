import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ScoutMapPage } from './pages/scout-map/scout-map';
import { ScoutReportPage } from './pages/scout-report/scout-report';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'map',
    pathMatch: 'full'
  },
  {
    path: 'map',
    component: ScoutMapPage
  },
  {
    path: 'report/:bookingId',
    component: ScoutReportPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ScoutRoutingModule { }