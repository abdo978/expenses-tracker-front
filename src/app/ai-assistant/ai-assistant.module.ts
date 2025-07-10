import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';

// shared module
import { SharedModule } from 'src/shared.module';
import { AIAssistantComponent } from './ai-assistant';

const routes: Routes = [
    { path: '', component: AIAssistantComponent, data: { title: 'AI Assistant' } }
];

@NgModule({
    imports: [RouterModule.forChild(routes), CommonModule, SharedModule.forRoot()],
    declarations: [
        AIAssistantComponent,
    ],
})
export class AIAssistantModule {}